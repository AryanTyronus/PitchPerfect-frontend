# PitchPerfect

AI-powered pitch and interview practice with real-time speech signals, calibrated scoring, and actionable feedback.

## The Problem

High-stakes pitches and interviews are difficult to rehearse because candidates rarely get immediate, structured feedback. Generic practice tools capture answers, but they do not combine transcript quality, delivery metrics, rubric scoring, and follow-up coaching in one workflow.

PitchPerfect closes that loop: users record realistic responses, receive live speech feedback during the session, and get a concise post-session evaluation they can use to improve before the real moment.

## Key Features

- Real-time audio streaming and transcription readiness over WebSocket.
- Timed interview and pitch practice sessions with warning states and recording controls.
- Question banks for job interviews, technical interviews, behavioral interviews, public speaking, and college interviews.
- Rubric-based AI evaluation across clarity, relevance, professionalism, structure, and impact.
- Speech metrics for words per minute, filler words, pauses, and transcript-derived delivery signals.
- Feedback engine with strict disqualification handling for silence, unusable transcripts, and non-serious responses.
- Supabase-backed session persistence with in-memory fallback for local demos.
- Mock API mode for frontend-only demos when backend credentials are unavailable.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Vitest, Testing Library, Oxlint.

**Backend:** FastAPI, Pydantic, Uvicorn, Groq SDK, HTTPX, python-dotenv.

**AI / LLM:** Groq Whisper for speech-to-text, Groq-hosted LLM evaluation, OpenRouter fallback for transcription and evaluation, local heuristic fallback.

**Database / Auth:** Supabase for session storage, optional bearer-token API protection.

## System Architecture

1. The React client guides the user through setup, question selection, recording, processing, and results.
2. During practice, the browser captures composite media for playback and a lightweight audio stream for transcription.
3. The FastAPI backend validates audio, runs speech-to-text, normalizes transcripts, and calculates delivery metrics.
4. Completed answers are scored by the AI evaluator against a calibrated rubric with deterministic JSON output.
5. Session results are stored in Supabase when configured and retained in memory as a local fallback.
6. The frontend maps backend records into the results UI, including sub-scores, delivery metrics, and improvement feedback.

## Quickstart

### Prerequisites

- Node.js 20+
- Python 3.11+
- npm
- Groq API key
- Optional: OpenRouter API key for fallback models
- Optional: Supabase project for persisted sessions

### Environment

Create local env files from the templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Update `backend/.env` with API keys, Supabase values, and `ALLOWED_ORIGINS`. If `API_TOKEN` is set, mirror the same value in `frontend/.env` as `VITE_API_TOKEN`.

For a frontend-only demo, set `VITE_USE_MOCK_API=true`.

### Backend Development

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### Production Build

```bash
cd frontend
npm run build
npm run preview
```

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Quality Checks

```bash
cd frontend
npm run lint
npm run test
npm run build
```

```bash
cd backend
python3 -m compileall app eval
```

## Repository Layout

```text
backend/
  app/              FastAPI application, models, endpoints, and evaluation services
  eval/             Evaluation dataset scaffolding and runner
  supabase/         Database schema
frontend/
  public/           Static assets
  src/              React app, hooks, services, styles, and tests
```

## Hackathon Submission

Built for AI YES 2026.

PitchPerfect is packaged as a clean full-stack demo with mock-mode support, local fallbacks, documented environment setup, and reproducible validation commands for judges and reviewers.
