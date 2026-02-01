# 🎙️ SpokeSmith

**AI-powered media training coach** for high-stakes spokesperson moments (interviews, crisis comms, product launches).

## 🔗 Demo

- Product live demo: https://spoke-smith-87008435117.us-central1.run.app/
- Demo video: https://www.loom.com/share/4c660e0fe125402a9a045dbfdf5b1518

---

## What problem are we solving?

In front of a camera, people juggle **content + delivery + composure**. In high-stakes moments, even strong operators can:
- Ramble instead of landing a crisp message
- Speak too fast / too flat
- Lose framing/lighting and look unprepared
- Miss opportunities to bridge back to the headline

Traditional media training helps, but it’s expensive and not always available “on demand”.

---

## What is SpokeSmith?

SpokeSmith is a practice environment where you can:
- Run a live voice session with an AI journalist or coach (OpenAI Realtime)
- See a live metrics HUD (pace, fillers, prosody)
- Get short, structured nudges (typed tool calls) while you practice
- Generate scenarios from company context (Responses API + web search)
- Export a timestamped transcript after the session (Whisper)

---

## ✨ Key features

### 🎧 Voice-first practice (Realtime API via WebRTC)
- Low-latency speech-to-speech session with `gpt-4o-realtime-*`
- Two modes: **journalist** (interview) or **coach** (feedback + drills)
- Nudges arrive as a typed tool call: `nudge(text, severity, reason)`

### 📊 Live metrics HUD (local)
- Pace (WPM), filler rate, prosody variance (expressiveness)
- Lightweight “momentum” score for at-a-glance feedback

### 👤 Presence signals (local, privacy-first)
- On-device MediaPipe face tracking: `face_present`, `framing`, `lighting`
- Optional: use Responses API to rewrite/verify face nudges (off by default)

### 🎭 Company-aware scenarios (Responses API)
- Company brief summarization using the `web_search` tool
- Scenario generation with **Structured Outputs** (strict JSON schema)

### 🧾 Post-session transcript (Whisper)
- Word-level timestamps (`verbose_json`) for timeline scrubbing
- (Planned) deeper post-session analysis and rewrites

---

## 🧠 How it works (end-to-end)

```
1) (Optional) Add company context
   Browser ──▶ POST /api/company_brief ──▶ OpenAI Responses + web_search ──▶ brief JSON

2) Generate a scenario
   Browser ──▶ POST /api/scenario/generate ──▶ OpenAI Responses (strict json_schema) ──▶ scenario JSON

3) Start a live session (voice-first)
   Browser ──▶ POST /api/realtime/token ──▶ FastAPI ──▶ OpenAI /v1/realtime/sessions
                                 ◀────────────── ephemeral client_secret

4) Practice (no audio proxying through our servers)
   Browser ──(WebRTC, Bearer: client_secret)──▶ OpenAI /v1/realtime?model=...
   Browser ◀──────────── AI audio replies + tool calls (nudges) ─────────── OpenAI Realtime

5) End session → transcript with timestamps
   Browser ──▶ POST /api/sessions (audio blob) ──▶ whisper-1 (verbose_json) ──▶ words[] timestamps

6) (Optional) Face nudges: local thresholds + optional LLM phrasing/verify
   Browser ──▶ POST /api/face/nudge/phrase (json_schema) ──▶ short rewritten nudge text
   Browser ──▶ POST /api/face/nudge/verify (json_schema + cropped keyframe) ──▶ verified/abstain
```

---

## 🏗️ Architecture

```
┌──────────────────────────────┐       same-origin `/api/*` proxy       ┌──────────────────────────┐
│          Next.js UI           │ ─────────────────────────────────────▶ │        FastAPI API        │
│ - mic/cam capture             │                                         │ - /api/realtime/token     │
│ - local voice metrics (HUD)   │                                         │ - /api/company_brief      │
│ - local face metrics (WASM)   │                                         │ - /api/scenario/generate  │
│ - session store (Zustand)     │                                         │ - /api/sessions           │
└───────────────┬──────────────┘                                         │ - /api/face/nudge/*       │
                │                                                        └─────────────┬────────────┘
                │ WebRTC (ephemeral token; live audio never hits our backend)          │
                ▼                                                                       ▼
     ┌──────────────────────┐                                            ┌──────────────────────────┐
     │    OpenAI Realtime    │                                            │ OpenAI Responses + Audio │
     │  - speech ↔ speech    │                                            │ - json_schema outputs    │
     │  - input transcription│                                            │ - web_search tool        │
     │  - tool calls (nudges)│                                            │ - whisper-1 transcription│
     └──────────────────────┘                                            └──────────────────────────┘
```

---

## 🔌 OpenAI services (and why)

### Realtime API (WebRTC) — voice coaching + interview mode
- **Default model**: `OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17`
- **Realtime transcription**: `OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe`
- **Why**: low-latency speech-to-speech makes practice feel like a real conversation.

### Responses API (Structured Outputs) — UI-safe generation
We use `text.format.type=json_schema` so the UI doesn’t parse fragile JSON:
- **Company brief**: `OPENAI_COMPANY_BRIEF_MODEL` (default: `gpt-5-mini`) with `tools: [{ "type": "web_search" }]`
- **Scenario generation**: `OPENAI_SCENARIO_MODEL` (default: `gpt-5-mini`) with strict JSON schema
- **Face nudge phrasing/verify (optional)**: `OPENAI_FACE_PHRASE_MODEL` (default: `gpt-4o-mini`) + optional `OPENAI_FACE_VERIFY_MODEL` (image input supported)

### Audio Transcriptions — post-session timestamps
- **Model**: `whisper-1` with `verbose_json` + `timestamp_granularities: ["word"]`

---

## 🎯 Nudge design

### Voice nudges (Realtime tool calls)
- The realtime model emits `nudge()` tool calls in **coach** mode based on prompt guardrails (keep it rare, keep it short).
- Nudges are structured: `text` (<= ~10 words), `severity` (`gentle|firm|urgent`), `reason` (e.g. `pace`, `filler`, `risk`).

### Face nudges (deterministic + optional LLM help)
- Face signals are computed on-device; issues must persist ~2s before nudging.
- A session-level cooldown reduces spam (default ~12s between face nudges).
- If enabled:
  - **Phase B (text-only)**: rewrite the nudge via `POST /api/face/nudge/phrase`
  - **Phase C (optional)**: verify with a **cropped, rate-limited keyframe** via `POST /api/face/nudge/verify`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 18, TypeScript |
| **Styling** | Tailwind CSS, Framer Motion |
| **State** | Zustand (with persistence) |
| **Face Detection** | MediaPipe FaceLandmarker (WASM) |
| **Audio Analysis** | Web Audio API (browser-native) |
| **Backend** | FastAPI, Python 3.11+ |
| **AI Models** | OpenAI (Realtime, Responses, Whisper) |
| **Real-time Comms** | WebRTC |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- OpenAI API key

### 1. Clone the repository

```bash
git clone https://github.com/Siddhar109/spoke-smith
cd spoke-smith
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe

# Used by the Next.js `/api/*` proxy route (server-side). Either works:
NEXT_PUBLIC_API_URL=http://localhost:8000
# BACKEND_API_URL=http://localhost:8000
```

### 3. Install and run the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Install and run the frontend

```bash
npm install
npm run dev
```

### 5. Open in browser

Navigate to `http://localhost:3000` and start practicing!

---

## 🔧 Configuration

### Backend env vars (FastAPI)

- `OPENAI_API_KEY` (required)
- `OPENAI_REALTIME_MODEL` (optional)
- `OPENAI_TRANSCRIPTION_MODEL` (optional)
- `OPENAI_COMPANY_BRIEF_MODEL`, `OPENAI_COMPANY_BRIEF_MAX_OUTPUT_TOKENS`, `OPENAI_COMPANY_BRIEF_LIST_LIMIT` (optional)
- `OPENAI_SCENARIO_MODEL`, `OPENAI_SCENARIO_MAX_OUTPUT_TOKENS` (optional)
- `OPENAI_FACE_PHRASE_MODEL`, `OPENAI_FACE_VERIFY_MODEL`, `FACE_NUDGE_DEFAULT_COOLDOWN_MS` (optional)
- `KAWKAI_KEEP_SESSION_AUDIO` (optional; defaults to deleting uploads after transcription)
- `CORS_ALLOW_ORIGINS`, `CORS_ALLOW_ORIGIN_REGEX` (optional; mostly for direct-calling backend)

### Frontend env vars (Next.js)

- `NEXT_PUBLIC_API_URL` or `BACKEND_API_URL` (where the backend lives; used by the server-side `/api/*` proxy)
- `NEXT_PUBLIC_FACE_PHRASE_MODEL_ENABLED` (optional; enables LLM phrasing for face nudges)

---

## 🧩 API surface (backend)

- `POST /api/realtime/token` → ephemeral Realtime client secret
- `POST /api/company_brief` → company brief summary (structured JSON)
- `POST /api/scenario/generate` → one generated scenario (structured JSON)
- `POST /api/sessions` → upload audio + receive transcript + `word_timings`
- `GET /api/sessions/{session_id}/transcript` → fetch stored transcript (if present)
- `POST /api/face/nudge/phrase` → short, rephrased face nudge (optional feature)
- `POST /api/face/nudge/verify` → keyframe-based verification (optional feature)
- `GET /health` → healthcheck
- `GET /docs` → Swagger UI

---

## 📦 Deployment

- Cloud Run (2 services): see `DEPLOY_CLOUD_RUN.md`

---

## 📚 More docs

- `implementation.md`
- `IMPLEMENTATION_PLAN_CONTEXT_ROUTING.md`
- `UPGRADE_PLAN.md`

---

## 📁 Project Structure

```
spoke-smith/
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── page.tsx            # Landing page
│   │   └── session/            # Main coaching interface
│   │
│   ├── components/             # React components
│   │   ├── LiveMeters.tsx      # Real-time metric visualizations
│   │   ├── LiveNudge.tsx       # Floating nudge overlay
│   │   ├── VideoPreview.tsx    # Webcam feed with face tracking
│   │   ├── ScenarioSelector.tsx # Scenario browser
│   │   └── Timeline.tsx        # Post-session playback
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useRealtimeCoach.ts # WebRTC + Realtime API
│   │   ├── useFaceCoach.ts     # MediaPipe face detection
│   │   ├── useMediaCapture.ts  # Mic + cam management
│   │   └── useAudioRecorder.ts # Audio blob recording
│   │
│   ├── lib/
│   │   ├── analysis/           # Metric calculations
│   │   │   ├── voiceMetrics.ts # WPM, filler detection
│   │   │   └── prosody.ts      # Pitch variance analysis
│   │   └── scenarios/          # Scenario definitions
│   │
│   └── stores/
│       └── sessionStore.ts     # Zustand state management
│
├── backend/
│   ├── api/                    # FastAPI routers
│   │   ├── realtime.py         # Ephemeral token generation
│   │   ├── sessions.py         # Audio upload + transcription
│   │   ├── face_nudge.py       # Face nudge phrase/verify
│   │   ├── company_brief.py    # Company context summarizer
│   │   └── scenario.py         # Custom scenario generator
│   │
│   ├── prompts/                # AI prompt templates
│   │   ├── coach_system.py     # Coaching mode prompt
│   │   ├── journalist_system.py # Interview mode prompt
│   │   └── nudge_tools.py      # Tool definitions
│   │
│   └── services/
│       └── transcription.py    # Whisper integration
│
└── public/
    └── models/                 # MediaPipe model files
```

---

## 🔒 Privacy & Data

- **Face analysis is local-only** — MediaPipe runs in browser WASM.
- **No face images uploaded by default** — keyframe verification is opt-in, cropped, and rate-limited.
- **Session audio is deleted by default** after `whisper-1` transcription (set `KAWKAI_KEEP_SESSION_AUDIO=true` to keep uploads).
- **Responses API calls use `store: false`** in this repo; OpenAI policies still apply to any data you send.

---

## 🏆 Built for OpenAI Hackathon

This repo is intentionally “API-forward”: Realtime for the session, Responses for structured generation (plus web search), and Whisper for word-level timestamps — stitched together with a UX that tries to feel like a real coach.

---

<p align="center">
  <b>Stop losing deals, damaging reputations, and missing opportunities.</b><br>
  <i>Train like the pros. Sound like a leader.</i>
</p>
