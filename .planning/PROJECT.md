# ExamGuard — Online Exam System

## What This Is

A production-ready, full-stack online examination platform built to handle **266 concurrent students** reliably. The system provides a secure, cheat-resistant exam experience with real-time admin monitoring. It combines a Next.js frontend, FastAPI backend, and Supabase (PostgreSQL) database with deployment on Vercel + Railway.

## Problem

Universities and institutions conducting online exams face three critical challenges:
1. **Scale** — Platforms crash under simultaneous login/submit spikes
2. **Integrity** — Students can switch tabs, copy text, or share questions
3. **Visibility** — Admins can't see real-time exam status for hundreds of students

## Core Value

A reliable exam that doesn't crash, actively deters cheating, and gives admins live oversight — all without requiring heavy infrastructure.

## Target Users

- **Students** — Roll number/password login, take MCQ exam in lockdown mode
- **Admins** — Real-time dashboard monitoring all 266+ students simultaneously

## Tech Stack (Mandatory)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (React) |
| Backend | FastAPI (Python, async) |
| Database | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth / JWT |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway |
| State Sync | Supabase Realtime subscriptions |

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Authentication**
- [ ] Student login with Roll Number + Password
- [ ] Prevent simultaneous multi-device login (single session enforcement)
- [ ] Secure JWT session management

**Exam Engine**
- [ ] MCQ question display with answer selection
- [ ] Client-side countdown timer, synced with server on load
- [ ] Auto-save answers every 15 seconds
- [ ] Manual submit button with confirmation
- [ ] Auto-submit when timer expires

**Anti-Cheating**
- [ ] Tab switch / window blur detection (visibilitychange + blur events)
- [ ] Warning escalation: 1st = Alert, 2nd = Strong warning, 3rd = Auto-submit
- [ ] Violation events sent to backend and stored
- [ ] Right-click disabled
- [ ] Copy/paste (Ctrl+C/V) disabled
- [ ] Force fullscreen on exam start
- [ ] Fullscreen exit detection triggers warning

**Backend API (FastAPI)**
- [ ] POST /login — authenticate student, return JWT
- [ ] GET /questions — return exam questions for authenticated student
- [ ] POST /save-answer — save/update answer for a question
- [ ] POST /submit-exam — finalize exam, calculate score
- [ ] POST /report-violation — log cheating event with type + timestamp

**Database Schema (Supabase)**
- [ ] `students` table: id, roll_number, password_hash, name, is_active_session, current_token
- [ ] `questions` table: id, text, options (JSON), correct_answer
- [ ] `exam_results` table: student_id, answers (JSON), score, submitted_at
- [ ] `exam_status` table: student_id, warnings, last_active, status (active/submitted)
- [ ] `violations` table: student_id, type, timestamp

**Admin Dashboard**
- [ ] Real-time list of all students with Name, Status, Warning count
- [ ] Supabase Realtime subscription for live updates
- [ ] Filter by status (Active / Submitted)

**Resilience**
- [ ] localStorage backup of current answers
- [ ] Restore exam state on page reload
- [ ] Graceful handling of network hiccups during auto-save

**Performance**
- [ ] Handle 266 concurrent users (login spike + auto-save traffic + submit spike)
- [ ] Async FastAPI with connection pooling for Supabase
- [ ] Rate limiting on critical endpoints
- [ ] Lightweight UI (no heavy animations)

### Out of Scope

- Webcam monitoring — future scope
- AI cheating detection — future scope
- Multiple exam sessions per student in v1
- Custom question types (essay, code) — MCQ only in v1
- Email notifications — future scope

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| FastAPI (not Django/Flask) | Async support critical for 266 concurrent users | — Pending |
| Supabase Realtime | Eliminates polling for admin dashboard; built-in CDN | — Pending |
| JWT in httpOnly cookie | More secure than localStorage for auth tokens | — Pending |
| Client-side timer | Reduces server load; synced on mount + reconnect | — Pending |
| 15-second auto-save interval | Balance between data safety and server load (266 × 4 req/min = ~1064 req/min) | — Pending |
| 3-strike warning system | Industry standard for online proctoring | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions

---
*Last updated: 2026-04-11 after initialization*
