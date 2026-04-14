"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { loginStudent } from "@/lib/api";
import { BRANCHES } from "@/lib/constants";

// ── Particle burst on evaporation ──────────────────────────
const PARTICLE_COUNT = 56;

function generateParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: (360 / PARTICLE_COUNT) * i + (Math.random() - 0.5) * 12,
    distance: 80 + Math.random() * 180,
    size: 2 + Math.random() * 5,
    hue: 200 + Math.random() * 60, // cyan-blue range
    delay: Math.random() * 0.15,
  }));
}

export default function LoginPage() {
  const router = useRouter();
  const [usn, setUsn] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branch, setBranch] = useState("CS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [evaporating, setEvaporating] = useState(false);
  const [particles] = useState(generateParticles);
  const [usnFocused, setUsnFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Floating orb aurora
  useEffect(() => {
    let frame: number;
    let t = 0;
    const orbs = containerRef.current?.querySelectorAll("[data-orb]");
    const animate = () => {
      t += 0.003;
      orbs?.forEach((orb, i) => {
        const el = orb as HTMLElement;
        const phase = i * (Math.PI * 2) / 3;
        el.style.transform = `translate(${Math.sin(t + phase) * 30}px, ${Math.cos(t * 0.7 + phase) * 20}px)`;
      });
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const usnRegex = /^[A-Z0-9]{5}[A-Z]{2}[0-9]{3}$/;
    if (!usn.trim() || !password.trim()) {
      setError("Please enter both USN and password.");
      return;
    }
    if (!usnRegex.test(usn.trim())) {
      setError("Invalid USN format. Example: 1RM25XY000");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await loginStudent(usn.trim(), password, {
        name: name.trim(),
        email: email.trim(),
        branch,
      });

      // Store session
      sessionStorage.setItem("exam_token", data.access_token);
      sessionStorage.setItem("exam_student", JSON.stringify({
        id: data.student_id,
        name: data.student_name,
        branch: data.branch || branch,
        examStartTime: data.exam_start_time,
        examDurationMinutes: data.exam_duration_minutes,
      }));

      // ── Evaporation transition ──
      setEvaporating(true);
      await new Promise(r => setTimeout(r, 900));
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed.";
      setError(msg);
      setLoading(false);
      controls.start({
        x: [0, -12, 12, -8, 8, 0],
        transition: { duration: 0.4, ease: "easeInOut" },
      });
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #06080f 0%, #0d1117 50%, #080c18 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, -apple-system, sans-serif",
      }}
    >
      {/* ── Floating Aurora Orbs ── */}
      <div
        data-orb=""
        style={{
          position: "fixed", top: "10%", left: "15%",
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
          willChange: "transform",
          transition: "transform 0.1s linear",
        }}
      />
      <div
        data-orb=""
        style={{
          position: "fixed", top: "40%", right: "10%",
          width: 350, height: 350,
          background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
          willChange: "transform",
        }}
      />
      <div
        data-orb=""
        style={{
          position: "fixed", bottom: "5%", left: "30%",
          width: 300, height: 300,
          background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
          willChange: "transform",
        }}
      />

      {/* ── Grid Overlay ── */}
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: `
          linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "50px 50px",
        pointerEvents: "none",
      }} />

      {/* ── Particle Burst on Evaporation ── */}
      <AnimatePresence>
        {evaporating && particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{
              opacity: 0,
              x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
              y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
              scale: 0,
            }}
            transition={{ duration: 0.8, delay: p.delay, ease: "easeOut" }}
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: `hsl(${p.hue}, 80%, 65%)`,
              boxShadow: `0 0 ${p.size * 2}px hsl(${p.hue}, 80%, 65%)`,
              pointerEvents: "none",
              zIndex: 999,
            }}
          />
        ))}
      </AnimatePresence>

      {/* ── Login Card ── */}
      <AnimatePresence>
        {!evaporating && (
          <motion.div
            animate={controls}
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 0.6,
              filter: "blur(20px)",
              transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
            }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 420,
              margin: "24px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 28,
              padding: "48px 40px",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.08)",
              zIndex: 10,
            }}
          >
            {/* Corner accent lines */}
            <div style={{
              position: "absolute", top: 0, left: 0,
              width: 60, height: 60,
              borderTop: "2px solid rgba(6,182,212,0.5)",
              borderLeft: "2px solid rgba(6,182,212,0.5)",
              borderRadius: "28px 0 0 0",
            }} />
            <div style={{
              position: "absolute", bottom: 0, right: 0,
              width: 60, height: 60,
              borderBottom: "2px solid rgba(139,92,246,0.5)",
              borderRight: "2px solid rgba(139,92,246,0.5)",
              borderRadius: "0 0 28px 0",
            }} />

            {/* ── Header ── */}
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(6,182,212,0.2))",
                  border: "1px solid rgba(6,182,212,0.3)",
                  marginBottom: 20,
                  boxShadow: "0 0 30px rgba(6,182,212,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
                  <path d="M8 12h16M8 16h10M8 20h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="24" cy="20" r="4" fill="#06b6d4" stroke="white" strokeWidth="1.5" />
                  <path d="M22.5 20l1 1 2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <defs>
                    <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  background: "linear-gradient(135deg, #e2e8f0, #94a3b8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  marginBottom: 8,
                }}
              >
                ExamGuard
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ fontSize: 13, color: "rgba(148,163,184,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" }}
              >
                Identity Handshake Protocol
              </motion.p>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }} autoComplete="off">
              {/* USN Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
              >
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(6,182,212,0.8)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  ⊕ USN — Identity Anchor
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="usn"
                    type="text"
                    value={usn}
                    onChange={e => setUsn(e.target.value.toUpperCase())}
                    onFocus={() => setUsnFocused(true)}
                    onBlur={() => setUsnFocused(false)}
                    placeholder="e.g. 1RM25CS001"
                    disabled={loading}
                    autoFocus
                    spellCheck={false}
                    style={{
                      width: "100%",
                      padding: "14px 18px",
                      background: usnFocused ? "rgba(6,182,212,0.06)" : "rgba(255,255,255,0.03)",
                      border: usnFocused ? "1px solid rgba(6,182,212,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                      color: "#e2e8f0",
                      fontSize: 15,
                      fontFamily: "JetBrains Mono, monospace",
                      outline: "none",
                      transition: "all 0.25s ease",
                      boxShadow: usnFocused ? "0 0 0 3px rgba(6,182,212,0.1), 0 0 20px rgba(6,182,212,0.08)" : "none",
                    }}
                  />
                  {usnFocused && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      style={{
                        position: "absolute", bottom: 0, left: 14, right: 14,
                        height: 1, background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.5), transparent)",
                        transformOrigin: "left",
                      }}
                    />
                  )}
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.42, duration: 0.5 }}
              >
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(139,92,246,0.8)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  ⊗ Security Key
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setPwFocused(true)}
                    onBlur={() => setPwFocused(false)}
                    placeholder="Enter your password"
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "14px 18px",
                      background: pwFocused ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.03)",
                      border: pwFocused ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                      color: "#e2e8f0",
                      fontSize: 15,
                      outline: "none",
                      transition: "all 0.25s ease",
                      boxShadow: pwFocused ? "0 0 0 3px rgba(139,92,246,0.1), 0 0 20px rgba(139,92,246,0.08)" : "none",
                    }}
                  />
                  {pwFocused && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      style={{
                        position: "absolute", bottom: 0, left: 14, right: 14,
                        height: 1, background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)",
                        transformOrigin: "left",
                      }}
                    />
                  )}
                </div>
              </motion.div>

              {/* Optional fields: name + email collapsed */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.47, duration: 0.5 }}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
              >
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(148,163,184,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                    Name <span style={{ opacity: 0.5 }}>(opt)</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Full name"
                    disabled={loading}
                    style={{
                      width: "100%", padding: "11px 14px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12,
                      color: "#e2e8f0", fontSize: 13, outline: "none",
                      transition: "border-color 0.2s",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(148,163,184,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                    Branch
                  </label>
                  <select
                    id="branch"
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    disabled={loading}
                    style={{
                      width: "100%", padding: "11px 14px",
                      background: "rgba(10,10,20,0.8)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12,
                      color: "#e2e8f0", fontSize: 13, outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 14px",
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      borderRadius: 10,
                      color: "#f87171", fontSize: 13,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="#f87171" strokeWidth="1.5" />
                      <path d="M8 5v3M8 10.5v.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                id="login-submit"
                type="submit"
                disabled={loading}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.5, type: "spring", stiffness: 180 }}
                whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(6,182,212,0.3), 0 8px 30px rgba(0,0,0,0.4)" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%",
                  padding: "15px 24px",
                  background: loading ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #06b6d4)",
                  border: "none",
                  borderRadius: 16,
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
                  transition: "background 0.3s ease",
                  marginTop: 4,
                }}
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                      style={{
                        width: 18, height: 18,
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                      }}
                    />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span>Initiate Handshake</span>
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    >→</motion.span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Footer strip */}
            <div style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              justifyContent: "center",
              gap: 24,
            }}>
              {[
                { color: "#22c55e", label: "Encrypted" },
                { color: "#f59e0b", label: "Single Device" },
                { color: "#06b6d4", label: "Proctored" },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(148,163,184,0.6)" }}>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: Math.random() }}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version tag */}
      <div style={{
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        fontSize: 11, color: "rgba(100,116,139,0.5)",
        letterSpacing: "0.06em", textTransform: "uppercase",
      }}>
        ExamGuard v1.0 · Antigravity Interface
      </div>

      <style>{`
        input::placeholder { color: rgba(100,116,139,0.5) !important; }
        input:focus { border-color: rgba(6,182,212,0.4) !important; }
        select option { background: #0d1117; color: #e2e8f0; }
      `}</style>
    </div>
  );
}
