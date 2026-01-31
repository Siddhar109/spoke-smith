# Kawkai - AI Media Training Coach Implementation Plan

## Overview

An AI-powered "Gong + media trainer + executive presence coach" for PR and high-stakes spokesperson moments. The system analyzes face + voice + PR language to provide real-time coaching and post-session debriefs.

---

## ✅ Completed Features (Phase 1)

- **Scenario Selection** - 4 scenarios (Crisis Communication, Product Launch, General Media, Security Incident)
- **Two Session Modes** - Coach mode (real-time feedback) and Interview mode (AI asks questions)
- **Live Metrics** - WPM meter, filler word counter, session duration timer
- **Live Nudges** - Floating coaching chips from the AI coach
- **WebRTC Integration** - Real-time bidirectional audio with OpenAI Realtime API

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **WebRTC**: OpenAI Realtime SDK (`@openai/realtime-api-beta`)
- **State Management**: Zustand
- **UI**: Tailwind CSS + shadcn/ui
- **Audio Processing**: Web Audio API

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **LLM SDK**: OpenAI SDK (`openai>=1.0`)
- **Database**: PostgreSQL (via SQLAlchemy)
- **Background Jobs**: Celery or ARQ
- **Storage**: S3-compatible (for recordings)

---

## Architecture

```
[Web App (Next.js)]
    │
    ├── Captures: Mic + Camera via MediaDevices API
    ├── Feature extraction: On-device (future: MediaPipe)
    └── WebRTC: Direct connection to OpenAI Realtime
            │
            v
[OpenAI Realtime API]
    │
    ├── Live voice coaching (speech-to-speech)
    ├── Tool calls: nudge(), mark_timeline()
    └── Real-time transcription (optional)
            │
            v
[FastAPI Backend]
    │
    ├── Ephemeral token issuance for WebRTC
    ├── Session metadata storage
    ├── Post-session analysis jobs
    └── Company config / messaging retrieval
            │
            v
[Post-Session Pipeline]
    │
    ├── Audio transcription (OpenAI Audio API)
    ├── Q/A segmentation
    ├── Rubric scoring (Structured Outputs)
    └── Debrief generation (rewrites + drills)
```

---

## Phase 1: Foundation + Live Coaching MVP

### Step 1.1: Project Scaffolding

**Goal**: Initialize project structure with Next.js frontend and FastAPI backend.

**Tasks**:
1. Initialize Next.js 14 with App Router, TypeScript
2. Set up Tailwind CSS + shadcn/ui
3. Create FastAPI backend skeleton
4. Configure environment variables
5. Set up basic routing and layout

**Files to Create**:
```
kawkai/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── components/
│       └── ui/          # shadcn components
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── api/
│       └── __init__.py
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

**Verification**:
- [ ] `npm run dev` starts frontend on localhost:3000
- [ ] `uvicorn main:app --reload` (from `backend/`) starts backend on localhost:8000
- [ ] Basic page renders with Tailwind styling

---

### Step 1.2: Session Recording Module

**Goal**: Capture mic + camera, manage session state, basic UI controls.

**Tasks**:
1. Create `useMediaCapture` hook for mic/camera access
2. Build Zustand store for session state
3. Create SessionControls component (start/stop, device selector)
4. Implement audio chunk collection for playback

**Files to Create**:
```
src/
├── lib/
│   └── media/
│       └── useMediaCapture.ts
├── stores/
│   └── sessionStore.ts
├── components/
│   └── SessionControls.tsx
└── app/
    └── session/
        └── page.tsx
```

**Key Interfaces**:
```typescript
// sessionStore.ts
interface SessionState {
  status: 'idle' | 'recording' | 'paused' | 'completed';
  startTime: number | null;
  audioChunks: Blob[];
  transcript: TranscriptSegment[];
  nudges: Nudge[];
}

// useMediaCapture.ts
interface MediaCaptureOptions {
  audio: boolean;
  video: boolean;
  onAudioData?: (data: Float32Array) => void;
}
```

**Verification**:
- [x] Camera preview shows in UI
- [x] Start/stop recording toggles session state
- [x] Mic/camera device selector available before starting session
- [x] Audio recording is available for post-session playback

---

### Step 1.3: OpenAI Realtime Integration

**Goal**: Establish WebRTC connection for live voice coaching.

**Tasks**:
1. Create ephemeral token endpoint on backend
2. Build realtimeClient wrapper for WebRTC connection
3. Implement useRealtimeCoach hook for React integration
4. Create coach system prompt with tool definitions
5. Handle bidirectional audio streaming

**Files to Create**:
```
src/
├── lib/
│   └── openai/
│       └── realtimeClient.ts
└── hooks/
    └── useRealtimeCoach.ts

backend/
├── api/
│   └── realtime.py
└── prompts/
    └── coach_system.py
```

**Backend Endpoint** (`/api/realtime/token`):
```python
@router.post("/token")
async def get_ephemeral_token():
    """Generate ephemeral token for client-side WebRTC connection"""
    response = await openai_client.realtime.sessions.create(
        model="gpt-4o-realtime-preview",
        voice="alloy",
        instructions=COACH_SYSTEM_PROMPT,
        tools=[NUDGE_TOOL],
    )
    return {"client_secret": response.client_secret.value}
```

**Notes**:
- Backend reads `OPENAI_API_KEY` from environment (recommended: repo-root `.env` which is gitignored).

**Coach System Prompt** (key elements):
- Persona: Senior media trainer, calm, supportive
- Style: Give one instruction at a time, natural phrasing
- Tools: `nudge(text, severity, reason)` for coaching interventions
- Behavior: Intervene sparingly, save detailed feedback for debrief

**Verification**:
- [x] ~~Token endpoint returns valid ephemeral token~~
- [x] ~~WebRTC connection established in browser~~
- [x] ~~User can speak and hear AI coach respond~~
- [x] ~~Console shows tool calls when AI wants to nudge~~

---

### Step 1.4: Interview Modes

**Goal**: Support AI journalist mode and scripted question banks.

**Tasks**:
1. Define scenario and question type interfaces
2. Create default scenario library (crisis, product launch, etc.)
3. Build ScenarioSelector UI component
4. Implement journalist system prompt for AI interviewer
5. Add mode toggle to session page

**Files to Create**:
```
src/
├── lib/
│   └── scenarios/
│       ├── types.ts
│       └── defaultScenarios.ts
└── components/
    └── ScenarioSelector.tsx

backend/
└── prompts/
    └── journalist_system.py
    └── scenario_library.py
```

**Scenario Types**:
```typescript
interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'crisis' | 'product' | 'earnings' | 'general';
  questions: Question[];
}

interface Question {
  id: string;
  text: string;
  followUps: string[];
  difficulty: 'soft' | 'medium' | 'hostile';
  expectedDuration: number; // seconds
}
```

**Default Scenarios**:
1. **Crisis Communication** - layoffs, security breach, product recall
2. **Product Launch** - new feature, market expansion
3. **Earnings Call** - revenue questions, guidance
4. **General Media** - company profile, executive interview

**Verification**:
- [x] ~~Scenario selector shows available options~~
- [x] ~~AI journalist asks questions from selected scenario~~ (scenario passed to backend token endpoint)
- [ ] Scripted mode plays questions in sequence
- [ ] Follow-up questions trigger based on responses

---

### Step 1.5: Live Nudge System

**Goal**: Detect coaching moments and display minimal, timely nudges.

**Tasks**:
1. Implement real-time voice metrics (WPM, filler detection)
2. Define nudge tool schema for Realtime API
3. Create LiveNudge component (single chip display)
4. Create LiveMeters component (pace, filler counter)
5. Wire up tool calls to UI updates

**Files to Create**:
```
src/
├── lib/
│   └── analysis/
│       └── voiceMetrics.ts
└── components/
    ├── LiveNudge.tsx
    └── LiveMeters.tsx

backend/
└── prompts/
    └── nudge_tools.py
```

**Nudge Tool Definition**:
```python
NUDGE_TOOL = {
    "type": "function",
    "name": "nudge",
    "description": "Give a brief coaching nudge to the spokesperson",
    "parameters": {
        "type": "object",
        "properties": {
            "text": {
                "type": "string",
                "description": "Short coaching instruction (max 10 words)"
            },
            "severity": {
                "type": "string",
                "enum": ["gentle", "firm", "urgent"]
            },
            "reason": {
                "type": "string",
                "enum": ["pace", "filler", "bridge", "answer_length", "off_message", "risk"]
            }
        },
        "required": ["text", "severity", "reason"]
    }
}
```

**Voice Metrics**:
```typescript
interface VoiceMetrics {
  wpm: number;              // Words per minute (target: 130-160)
  fillerCount: number;      // "um", "uh", "like", "you know"
  currentAnswerLength: number; // seconds
  silenceDuration: number;  // current pause length
}
```

**Nudge Triggers**:
| Trigger | Threshold | Nudge Example |
|---------|-----------|---------------|
| Pace too fast | >180 WPM | "Slow down, take a breath" |
| Pace too slow | <100 WPM | "Pick up the pace slightly" |
| Too many fillers | >5 in 30s | "Watch the fillers" |
| Answer too long | >45 seconds | "Time to land the point" |
| Off-message | AI detected | "Bridge back to your message" |

**Verification**:
- [x] ~~WPM meter updates in real-time as user speaks~~ (approx. from realtime transcript)
- [x] ~~Filler counter increments on detected fillers~~ (approx. from realtime transcript)
- [x] ~~Nudge chip appears when AI calls nudge tool~~
- [x] ~~Nudge auto-dismisses after 5 seconds~~

---

## Phase 2: Post-Session Analysis

### Step 2.1: Transcription Pipeline

**Goal**: Transcribe session audio with timestamps, segment into Q/A turns.

**Tasks**:
1. Send session audio to OpenAI Audio API (Whisper)
2. Parse transcript with word-level timestamps
3. Segment transcript into Q/A turns
4. Store in database

**Files to Create**:
```
backend/
├── services/
│   ├── transcription.py
│   └── segmentation.py
└── models/
    └── transcript.py
```

**Transcript Model**:
```python
class TranscriptSegment(BaseModel):
    start_time: float
    end_time: float
    speaker: Literal["interviewer", "spokesperson"]
    text: str
    words: list[WordTiming]

class WordTiming(BaseModel):
    word: str
    start: float
    end: float
```

**Verification**:
- [ ] Audio uploaded to API successfully
- [ ] Transcript returned with timestamps
- [ ] Q/A turns correctly identified
- [ ] Stored in database with session ID

---

### Step 2.2: Rubric Scoring Engine

**Goal**: Generate structured feedback using PR media training rubric.

**Tasks**:
1. Define JSON schema for rubric output
2. Create scoring prompt with rubric criteria
3. Call Responses API with Structured Outputs
4. Parse and store results

**Files to Create**:
```
backend/
├── schemas/
│   └── rubric.py
├── prompts/
│   └── rubric_system.py
└── services/
    └── rubric_scorer.py
```

**Rubric JSON Schema**:
```python
class RubricScore(BaseModel):
    overall_score: int  # 0-100
    section_scores: SectionScores
    timestamped_flags: list[Flag]
    rewrites: list[Rewrite]
    drills: list[Drill]
    top_strengths: list[str]
    top_improvements: list[str]

class SectionScores(BaseModel):
    message_discipline: int  # 0-5
    question_handling: int   # 0-5
    risk_compliance: int     # 0-5
    soundbites: int          # 0-5
    tone_presence: int       # 0-5

class Flag(BaseModel):
    start_time: float
    end_time: float
    issue_type: str
    severity: str
    evidence_quote: str
    recommendation: str

class Rewrite(BaseModel):
    question: str
    original_answer: str
    improved_answer: str
    explanation: str
```

**Rubric Criteria**:
| Category | What It Measures |
|----------|------------------|
| Message Discipline | Stayed on-message, repeated key points, avoided tangents |
| Question Handling | Answered directly, bridged correctly, handled traps |
| Risk & Compliance | No speculation, no confidential info, no over-promising |
| Sound Bites | 10-15 second quotable lines, low jargon, headline first |
| Tone & Presence | Warmth, confidence, calm under pressure |

**Verification**:
- [ ] Responses API returns valid JSON matching schema
- [ ] All rubric sections scored
- [ ] Timestamped flags have valid time ranges
- [ ] Rewrites provide meaningful improvements

---

### Step 2.3: Debrief UI

**Goal**: Display analysis results with timeline, rewrites, and progress tracking.

**Tasks**:
1. Create debrief page with session playback
2. Build Timeline component with colored markers
3. Build RewriteCard for before/after display
4. Build ScoreBreakdown for rubric visualization
5. Sync playback position with timeline

**Files to Create**:
```
src/
├── app/
│   └── debrief/
│       └── [sessionId]/
│           └── page.tsx
└── components/
    ├── Timeline.tsx
    ├── RewriteCard.tsx
    └── ScoreBreakdown.tsx
```

**Timeline Marker Colors**:
- **Red**: Risk issues, dodged questions, rambling
- **Yellow**: Weak bridges, unclear points
- **Green**: Strong sound bites, good bridges

**Verification**:
- [ ] Session playback works with audio
- [ ] Timeline shows markers at correct positions
- [ ] Clicking marker jumps to that point
- [ ] Rewrites display side-by-side comparison
- [ ] Scores visualized clearly

---

## Phase 3: Company Customization (Future)

### Planned Features
1. **Company Messaging Upload** - Key messages, proof points, approved boilerplate
2. **Red Lines** - Topics/phrases to avoid, legal constraints
3. **Scenario Generator** - Custom scenarios for specific situations
4. **Team Analytics** - Progress tracking across multiple spokespeople
5. **Bridging Bank** - Company-specific safe transition phrases

---

## File Structure (Complete)

```
kawkai/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── session/
│   │   │   └── page.tsx
│   │   └── debrief/
│   │       └── [sessionId]/
│   │           └── page.tsx
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── SessionControls.tsx
│   │   ├── ScenarioSelector.tsx
│   │   ├── LiveNudge.tsx
│   │   ├── LiveMeters.tsx
│   │   ├── Timeline.tsx
│   │   ├── RewriteCard.tsx
│   │   └── ScoreBreakdown.tsx
│   ├── hooks/
│   │   └── useRealtimeCoach.ts
│   ├── lib/
│   │   ├── openai/
│   │   │   └── realtimeClient.ts
│   │   ├── media/
│   │   │   └── useMediaCapture.ts
│   │   ├── scenarios/
│   │   │   ├── types.ts
│   │   │   └── defaultScenarios.ts
│   │   └── analysis/
│   │       └── voiceMetrics.ts
│   └── stores/
│       └── sessionStore.ts
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── api/
│   │   ├── __init__.py
│   │   └── realtime.py
│   ├── prompts/
│   │   ├── coach_system.py
│   │   ├── journalist_system.py
│   │   ├── nudge_tools.py
│   │   └── rubric_system.py
│   ├── services/
│   │   ├── transcription.py
│   │   ├── segmentation.py
│   │   └── rubric_scorer.py
│   ├── schemas/
│   │   └── rubric.py
│   └── models/
│       └── transcript.py
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
├── CLAUDE.md
└── implementation.md
```

---

## Verification Checklist

### Milestone 1: Live Coaching Works
- [x] ~~Can start/stop session with mic/camera~~
- [x] ~~WebRTC connection to OpenAI Realtime established~~
- [x] ~~AI coach responds conversationally~~
- [x] ~~Live WPM meter updates in real-time~~
- [x] ~~Filler word counter updates in real-time~~
- [x] ~~Recorded audio playable after session~~

### Milestone 2: AI Journalist Mode Works
- [x] ~~AI asks interview questions~~
- [x] ~~User answers, AI evaluates and asks follow-up~~
- [x] ~~Nudges appear at appropriate moments~~
- [x] ~~Scenarios are selectable~~
- [x] ~~Selected scenario is passed to backend journalist prompt~~

### Milestone 3: Post-Session Debrief Works
- [x] Session audio transcribed with timestamps
- [ ] Rubric JSON generated with scores and flags
- [x] Timeline displays markers for issues
- [ ] Rewrites shown for improvable answers

### End-to-End Test
1. Start session in AI Journalist mode with "Crisis Communication" scenario
2. Complete 3-5 question mock interview
3. Receive 2-3 live nudges during session
4. End session and review the session playback + transcript preview
5. Verify:
   - WPM and filler counters changed during speaking
   - At least 2 nudges appeared during the session
   - Audio playback works at end of session

---

## Environment Variables

```env
# .env.example

# OpenAI
OPENAI_API_KEY=sk-...

# Database (optional for MVP)
DATABASE_URL=postgresql://...

# Storage (optional for MVP)
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# App
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Getting Started

```bash
# Frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
