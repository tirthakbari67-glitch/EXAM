"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchQuestions, submitExam, fetchPublicExamConfig, type Question } from "@/lib/api";
import { useExamState, clearExamStorage } from "@/hooks/useExamState";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useFullscreen } from "@/hooks/useFullscreen";
import ExamTimer from "@/components/ExamTimer";
import QuestionCard from "@/components/QuestionCard";
import AntiCheat from "@/components/AntiCheat";
import styles from "./exam.module.css";

interface StudentInfo {
  id: string;
  name: string;
  examStartTime: string | null;
  examDurationMinutes: number;
}

const FINAL_THEMES = ["glass-aura", "glass-galaxy", "glass-ocean"];

export default function ExamPage() {
  const router = useRouter();
  const { enter: enterFullscreen } = useFullscreen();

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    score: number; total: number; percentage: number;
  } | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [examInactive, setExamInactive] = useState(false);
  const [examScheduled, setExamScheduled] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState("Exam Assessment");
  const [saveIndicator, setSaveIndicator] = useState<"idle" | "saving" | "saved">("idle");

  // Pagination state
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());

  // Randomized final theme for this student's session
  const [finalTheme, setFinalTheme] = useState("glass-aura");

  const { answers, dirtyIds, selectAnswer, clearDirty, getAnsweredCount } = useExamState();
  const saveIndicatorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { flush } = useAutoSave({
    answers,
    dirtyIds,
    clearDirty,
    isSubmitted,
  });

  // ── Load student + questions ──────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("exam_student");
    const token = sessionStorage.getItem("exam_token");

    if (!raw || !token) {
      router.replace("/login");
      return;
    }

    const info: StudentInfo = JSON.parse(raw);
    setStudent(info);
    
    // Pick random final theme on mount
    setFinalTheme(FINAL_THEMES[Math.floor(Math.random() * FINAL_THEMES.length)]);

    fetchQuestions()
      .then((qs) => {
        setQuestions(qs);
        setLoading(false);
        enterFullscreen();
      })
      .catch(() => {
        setError("Failed to load exam questions. Please refresh.");
        setLoading(false);
      });
  }, [router, enterFullscreen]);

  // ── Exam config polling (inactive guard) ──────────────────
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const cfg = await fetchPublicExamConfig();
        setExamTitle(cfg.exam_title || "Exam Assessment");
        if (!cfg.is_active) {
          setExamInactive(true);
          setExamScheduled(null);
        } else if (cfg.scheduled_start) {
          const start = new Date(cfg.scheduled_start);
          if (start > new Date()) {
            setExamScheduled(cfg.scheduled_start);
            setExamInactive(false);
          } else {
            setExamInactive(false);
            setExamScheduled(null);
          }
        } else {
          setExamInactive(false);
          setExamScheduled(null);
        }
      } catch {
        // Silently ignore — default to active
      }
    };
    checkConfig();
    const id = setInterval(checkConfig, 15_000);
    return () => clearInterval(id);
  }, []);

  // ── Handle answer select (with save indicator) ────────────
  const handleSelect = useCallback(
    (qId: string, option: string) => {
      selectAnswer(qId, option);
      setSaveIndicator("saving");
      clearTimeout(saveIndicatorTimer.current);
      saveIndicatorTimer.current = setTimeout(() => {
        setSaveIndicator("saved");
        setTimeout(() => setSaveIndicator("idle"), 2000);
      }, 500);
    },
    [selectAnswer]
  );

  const toggleFlag = () => {
    const newFlags = new Set(flagged);
    if (newFlags.has(activeQuestionIndex)) newFlags.delete(activeQuestionIndex);
    else newFlags.add(activeQuestionIndex);
    setFlagged(newFlags);
  };

  // ── Submit handler ────────────────────────────────────────
  const handleSubmit = useCallback(
    async (auto = false) => {
      if (isSubmitted || submitting) return;
      setSubmitting(true);
      setConfirmSubmit(false);
      setError("");

      try {
        await flush(); // Save any dirty answers first
        const res = await submitExam(answers);
        clearExamStorage();
        sessionStorage.removeItem("exam_token");
        sessionStorage.removeItem("exam_student");
        setIsSubmitted(true);
        setSubmitResult({
          score: res.score,
          total: res.total_marks,
          percentage: res.percentage,
        });
        setSubmitting(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Submission failed.";
        setError(auto ? `Auto-submit error: ${msg}` : msg);
        setSubmitting(false);
      }
    },
    [isSubmitted, submitting, flush, answers]
  );

  const handleAutoSubmit = useCallback(() => {
    handleSubmit(true);
  }, [handleSubmit]);

  // ── Derived State (must be before early returns) ──────────
  const answeredCount = getAnsweredCount(questions.length);
  const progressPercentage = questions.length > 0 ? (activeQuestionIndex + 1) / questions.length : 0;

  // Calculate dynamic theme based on chunks of 20%
  const activeTheme = useMemo(() => {
    if (progressPercentage < 0.2) return "phase-1";
    if (progressPercentage < 0.4) return "ocean";
    if (progressPercentage < 0.6) return "galaxy";
    if (progressPercentage < 0.8) return "nebula";
    return finalTheme;
  }, [progressPercentage, finalTheme]);

  const activeQuestion = questions[activeQuestionIndex];

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-center">
        <div className={styles.loadingBox}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p>Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error && !isSubmitted) {
    return (
      <div className="page-center">
        <div className={styles.errorBox}>
          <p className="text-danger">{error}</p>
          <button 
            className="btn btn-primary" 
            disabled={submitting}
            onClick={() => {
              if (error.includes("Failed to load") || error.includes("refresh")) {
                window.location.reload();
              } else {
                handleSubmit(error.toLowerCase().includes("auto-submit"));
              }
            }}
          >
            {submitting ? "Retrying..." : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="page-center">
        <div className={styles.loadingBox}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p>Submitting exam...</p>
        </div>
      </div>
    );
  }

  // ── Results screen ────────────────────────────────────────
  if (isSubmitted && submitResult) {
    const pct = submitResult.percentage;
    const grade = pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : pct >= 40 ? "Average" : "Below Average";
    const gradeColor = pct >= 80 ? "var(--success)" : pct >= 60 ? "var(--accent)" : pct >= 40 ? "var(--warning)" : "var(--danger)";

    return (
      <div className="page-center">
        <div className={styles.resultCard}>
          <div className={styles.resultIcon}>✅</div>
          <h1 className={styles.resultTitle}>Exam Submitted</h1>
          <p className={styles.resultSub}>Your answers have been recorded successfully.</p>

          <div className={styles.scoreRing} style={{ "--pct": `${pct}%`, "--color": gradeColor } as React.CSSProperties}>
            <div className={styles.scoreInner}>
              <span className={styles.scoreNum} style={{ color: gradeColor }}>{submitResult.score}</span>
              <span className={styles.scoreTotal}>/ {submitResult.total}</span>
            </div>
          </div>

          <div className={styles.resultStats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Percentage</span>
              <span className={styles.statValue} style={{ color: gradeColor }}>{pct}%</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Grade</span>
              <span className={styles.statValue} style={{ color: gradeColor }}>{grade}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Answered</span>
              <span className={styles.statValue}>{getAnsweredCount(questions.length)}/{questions.length}</span>
            </div>
          </div>

          <p className={styles.resultFooter}>You may close this window now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} no-select`} data-theme={activeTheme}>
      {/* ── Weightless Exam Overlay (inactive / scheduled) ── */}
      {(examInactive || examScheduled) && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          background: "rgba(10, 10, 20, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          animation: "fadeIn 0.5s ease forwards",
          gap: 16,
          padding: 24,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 64, marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(139,92,246,0.6))" }}>
            {examInactive ? "🛸" : "⏳"}
          </div>
          <h2 style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            {examInactive ? "Exam Unavailable" : "Exam Not Started Yet"}
          </h2>
          <p style={{ color: "rgba(148,163,184,0.8)", fontSize: 15, maxWidth: 360 }}>
            {examInactive
              ? "The exam has been temporarily deactivated by your administrator. Please wait for further instructions."
              : `Your exam is scheduled to begin at ${examScheduled ? new Date(examScheduled).toLocaleString() : "—"}. Please stand by.`
            }
          </p>
        </div>
      )}

      {/* Anti-cheat: all proctoring attached here */}
      <AntiCheat isSubmitted={isSubmitted} onAutoSubmit={handleAutoSubmit} />

      {/* ── Welcome Banner (always visible, matching mockup) ── */}
      <div style={{ padding: "16px 28px 0", zIndex: 2, position: "relative" }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.65)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          padding: "16px 28px",
          borderRadius: "20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: "1px solid rgba(255,255,255,0.7)",
        }}>
          <h2 style={{ fontSize: "16px", margin: 0, fontWeight: 700, color: "#1e293b" }}>
            Welcome, {student?.name || "Student"}!{" "}
            <span style={{ fontWeight: 400, opacity: 0.7, color: "#475569" }}>
              Deep breaths and stay focused. You&apos;ve got this.
            </span>
          </h2>
          {/* Avatar circle */}
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "linear-gradient(135deg, #0d9488, #5eead4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: "16px",
            boxShadow: "0 4px 12px rgba(13,148,136,0.3)",
            flexShrink: 0
          }}>
            {(student?.name || "S").charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────── */}
      <main className={styles.main}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
          {/* Exam Title & Timer Row */}
          <div style={{
             display: "flex",
             alignItems: "center",
             justifyContent: "space-between",
             background: "rgba(255, 255, 255, 0.65)",
             backdropFilter: "blur(40px)",
             WebkitBackdropFilter: "blur(40px)",
             padding: "16px 28px",
             borderRadius: "20px",
             boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
             border: "1px solid rgba(255,255,255,0.7)",
          }}>
             <h1 style={{ margin: 0, fontSize: "20px", color: "#1e293b", fontWeight: 700 }}>
               {examTitle}
             </h1>
             {student && (
               <ExamTimer
                 startTime={student.examStartTime || new Date().toISOString()}
                 durationMinutes={student.examDurationMinutes}
                 onExpire={handleAutoSubmit}
               />
             )}
          </div>

          <div className={styles.questionList}>
            {activeQuestion && (
              <QuestionCard
                key={activeQuestion.id}
                question={activeQuestion}
                questionNumber={activeQuestionIndex + 1}
                totalQuestions={questions.length}
                selectedAnswer={answers[activeQuestion.id]}
                onSelect={handleSelect}
                isSubmitted={isSubmitted}
              >
                {/* Previous */}
                <button
                  type="button"
                  style={{
                    background: "rgba(13, 148, 136, 0.08)",
                    border: "1.5px solid rgba(13, 148, 136, 0.3)",
                    color: "#0d9488",
                    padding: "12px 24px",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    opacity: activeQuestionIndex === 0 ? 0.3 : 1,
                    pointerEvents: activeQuestionIndex === 0 ? "none" : "auto",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                >
                  Previous
                </button>

                {/* Mark for Review */}
                <button
                  type="button"
                  style={{
                    background: flagged.has(activeQuestionIndex) ? "rgba(234,179,8,0.08)" : "transparent",
                    border: flagged.has(activeQuestionIndex) ? "1.5px solid #eab308" : "1.5px solid rgba(0,0,0,0.1)",
                    color: flagged.has(activeQuestionIndex) ? "#ca8a04" : "#475569",
                    padding: "12px 24px",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onClick={toggleFlag}
                >
                  {flagged.has(activeQuestionIndex) ? "🚩 Marked" : "Mark for Review"}
                </button>

                {/* Save & Next / Submit */}
                {activeQuestionIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    style={{
                      background: "#0d9488",
                      color: "#fff",
                      border: "none",
                      padding: "12px 28px",
                      borderRadius: "12px",
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(13,148,136,0.3)",
                      transition: "all 0.3s ease",
                    }}
                    onClick={() => setActiveQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  >
                    Save &amp; Next
                  </button>
                ) : (
                  <button
                    id="submit-exam-btn"
                    type="button"
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      padding: "12px 28px",
                      borderRadius: "12px",
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(239,68,68,0.3)",
                    }}
                    onClick={() => setConfirmSubmit(true)}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Exam"}
                  </button>
                )}
              </QuestionCard>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          {/* Progress Card */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideTitle}>Progress</h3>
            <div className={styles.navGrid}>
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id];
                const isActive = i === activeQuestionIndex;
                const isFlagged = flagged.has(i);

                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionIndex(i)}
                    className={`${styles.navBtn} ${isAnswered ? styles.navAnswered : ""} ${isActive ? styles.navActive : ""} ${isFlagged ? styles.navFlagged : ""}`}
                    aria-label={`Question ${i + 1}`}
                  >
                    {isAnswered ? (
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      i + 1
                    )}
                    {isFlagged && (
                       <span style={{ position: "absolute", top: -3, right: -3, width: 10, height: 10, background: "#eab308", borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 0 6px rgba(234,179,8,0.6)" }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#0d9488" }} />
                <span>Current</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#0d9488", opacity: 0.4 }} />
                <span>Answered</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#eab308" }} />
                <span>Flagged</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "rgba(0,0,0,0.08)" }} />
                <span>Not Visited</span>
              </div>
            </div>
          </div>

          {/* Moon / Cloud Decorative Card (matching mockup) */}
          <div style={{
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.7)",
            padding: "24px",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}>
             {/* Moon */}
             <div style={{
               width: 60, height: 60, borderRadius: "50%",
               background: "radial-gradient(circle at 30% 30%, #f0fdfa, #ccfbf1)",
               boxShadow: "0 0 30px rgba(13,148,136,0.2)",
               marginBottom: 12,
             }} />
             {/* Clouds */}
             <div style={{ position: "absolute", bottom: -5, left: "-5%", opacity: 0.15, filter: "blur(8px)", fontSize: "36px" }}>☁️</div>
             <div style={{ position: "absolute", bottom: 15, right: "8%", opacity: 0.2, filter: "blur(4px)", fontSize: "18px" }}>☁️</div>
             {/* Sparkle stars */}
             <div style={{ position: "absolute", top: 14, right: 20, fontSize: "14px", opacity: 0.5 }}>✦</div>
             <div style={{ position: "absolute", top: 30, right: 35, fontSize: "10px", opacity: 0.3 }}>✦</div>
          </div>
        </aside>
      </main>

      {/* ── Submit confirmation dialog ──────────────────────── */}
      {confirmSubmit && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal}>
            <h2 style={{color: "var(--text-primary)"}}>Submit Exam?</h2>
            <p style={{color: "var(--text-secondary)"}}>
              You have answered <strong style={{color:"var(--accent)"}}>{answeredCount}</strong> out of{" "}
              <strong>{questions.length}</strong> questions.
            </p>
            {answeredCount < questions.length && (
              <p className={styles.confirmWarn}>
                ⚠️ {questions.length - answeredCount} question(s) still unanswered.
              </p>
            )}
            <p style={{color: "var(--text-secondary)"}}>This action cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button className="btn" style={{ background: "rgba(255,255,255,0.1)", color: "var(--text-primary)" }} onClick={() => setConfirmSubmit(false)}>
                Cancel — Keep Exam
              </button>
              <button
                id="confirm-submit-btn"
                className="btn btn-danger btn-lg"
                onClick={() => handleSubmit(false)}
              >
                Yes, Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
