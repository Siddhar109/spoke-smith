# Kawkai OpenAI Realtime API Upgrade Plan

This document outlines the migration from the current beta implementation to the GA (Generally Available) OpenAI Realtime API.

---

## Upgrade Overview

| Area | Current State | Target State |
|------|---------------|--------------|
| Model | `gpt-4o-realtime-preview` | `gpt-realtime` (GA) |
| SDK | `@openai/realtime-api-beta` | OpenAI Agents SDK |
| Transcription | Approximated from fragments | Native `input_audio_transcription` |
| Session Management | Basic start/stop | Persistent sessions with pause/resume |

**Expected Benefits:**
- ~20% cost reduction (GA pricing)
- More accurate WPM and filler detection
- Cleaner state management for coach logic
- Better production stability

---

## Phase 1: Model Migration

### 1.1 Update Backend Token Endpoint

**File:** `backend/api/realtime.py`

**Current Implementation:**
```python
response = await openai_client.realtime.sessions.create(
    model="gpt-4o-realtime-preview",
    voice="alloy",
    instructions=COACH_SYSTEM_PROMPT,
    tools=[NUDGE_TOOL],
)
return {"client_secret": response.client_secret.value}
```

**Target Implementation:**
```python
response = await openai_client.realtime.sessions.create(
    model="gpt-realtime",  # GA model
    voice="alloy",
    instructions=COACH_SYSTEM_PROMPT,
    tools=[NUDGE_TOOL],
    input_audio_transcription={
        "model": "gpt-4o-mini-transcribe"  # Enable native transcription
    }
)
return {"client_secret": response.client_secret.value}
```

**Tasks:**
- [ ] Update model string from `gpt-4o-realtime-preview` to `gpt-realtime`
- [ ] Add `input_audio_transcription` config
- [ ] Test token generation works with new model
- [ ] Verify WebRTC connection still establishes

**Verification:**
- Backend returns valid ephemeral token
- Browser console shows successful WebRTC connection
- No errors in OpenAI dashboard

---

### 1.2 Update Environment Configuration

**File:** `.env` / `.env.example`

Add model configuration for flexibility:

```env
# OpenAI Realtime
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
```

**File:** `backend/api/realtime.py`

```python
import os

REALTIME_MODEL = os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime")
TRANSCRIPTION_MODEL = os.getenv("OPENAI_TRANSCRIPTION_MODEL", "gpt-4o-mini-transcribe")
```

**Tasks:**
- [ ] Add environment variables to `.env.example`
- [ ] Update backend to read from env
- [ ] Document in README

---

## Phase 2: Native Transcription Integration

### 2.1 Understanding the Change

**Current approach (approximated):**
- Listen to realtime transcript fragments from WebRTC
- Estimate WPM by counting words over time windows
- Detect fillers by pattern matching transcript text

**New approach (native):**
- Enable `input_audio_transcription` in session config
- Receive `conversation.item.input_audio_transcription.completed` events
- Get accurate word-level timestamps from OpenAI

### 2.2 Update Frontend Event Handling

**File:** `src/lib/openai/realtimeClient.ts`

Add handler for transcription events:

```typescript
// New event types to handle
interface TranscriptionEvent {
  type: "conversation.item.input_audio_transcription.completed";
  item_id: string;
  transcript: string;
  // Word-level timing available in detailed response
}

// In your WebRTC event handler
peerConnection.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "conversation.item.input_audio_transcription.completed") {
    // Accurate transcript with timing
    handleTranscription(data);
  }
});
```

**Tasks:**
- [ ] Add transcription event type definitions
- [ ] Create `handleTranscription` function
- [ ] Wire up to session store

---

### 2.3 Improve Voice Metrics Accuracy

**File:** `src/lib/analysis/voiceMetrics.ts`

**Current Implementation (estimated):**
```typescript
interface VoiceMetrics {
  wpm: number;              // Estimated from transcript fragments
  fillerCount: number;      // Pattern matched
  currentAnswerLength: number;
  silenceDuration: number;
}
```

**Target Implementation:**
```typescript
interface VoiceMetrics {
  wpm: number;              // Calculated from word timestamps
  fillerCount: number;      // Detected with timing context
  currentAnswerLength: number;
  silenceDuration: number;

  // New fields from native transcription
  wordTimings: WordTiming[];
  lastTranscriptUpdate: number;
}

interface WordTiming {
  word: string;
  start: number;  // ms from session start
  end: number;
}

// More accurate WPM calculation
function calculateWPM(wordTimings: WordTiming[], windowMs: number = 15000): number {
  const now = Date.now();
  const recentWords = wordTimings.filter(w => now - w.end < windowMs);

  if (recentWords.length < 2) return 0;

  const durationMinutes = (recentWords[recentWords.length - 1].end - recentWords[0].start) / 60000;
  return Math.round(recentWords.length / durationMinutes);
}

// More accurate filler detection with context
const FILLER_PATTERNS = ["um", "uh", "like", "you know", "sort of", "kind of", "basically"];

function detectFillers(transcript: string): string[] {
  const words = transcript.toLowerCase().split(/\s+/);
  return words.filter(w => FILLER_PATTERNS.includes(w));
}
```

**Tasks:**
- [ ] Update `VoiceMetrics` interface
- [ ] Implement `calculateWPM` with word timings
- [ ] Improve filler detection accuracy
- [ ] Update `LiveMeters.tsx` to use new metrics

---

### 2.4 Update Session Store

**File:** `src/stores/sessionStore.ts`

Add transcription state:

```typescript
interface SessionState {
  status: 'idle' | 'recording' | 'paused' | 'completed';
  startTime: number | null;
  audioChunks: Blob[];
  transcript: TranscriptSegment[];
  nudges: Nudge[];

  // New: native transcription data
  wordTimings: WordTiming[];
  fullTranscript: string;

  // Actions
  addWordTimings: (timings: WordTiming[]) => void;
  appendTranscript: (text: string) => void;
}
```

**Tasks:**
- [ ] Add transcription fields to store
- [ ] Create actions for updating transcription
- [ ] Ensure proper cleanup on session end

---

## Phase 3: SDK Migration to Agents SDK

### 3.1 Assessment

The OpenAI Agents SDK provides:
- Declarative agent definition
- Built-in conversation state machine
- Cleaner tool orchestration
- Better error handling and retries

**Decision Point:** Full migration vs. incremental adoption

**Recommendation:** Incremental adoption - wrap existing logic in Agents SDK patterns without full rewrite.

### 3.2 Install Agents SDK

**File:** `package.json`

```json
{
  "dependencies": {
    "@openai/agents": "^1.0.0"  // Replace @openai/realtime-api-beta
  }
}
```

**Tasks:**
- [ ] Remove `@openai/realtime-api-beta` dependency
- [ ] Add `@openai/agents` dependency
- [ ] Run `npm install`
- [ ] Verify no TypeScript errors

---

### 3.3 Refactor Realtime Client

**File:** `src/lib/openai/realtimeClient.ts`

**Current pattern (beta SDK):**
```typescript
import { RealtimeClient } from '@openai/realtime-api-beta';

const client = new RealtimeClient({ ... });
client.connect();
client.on('message', handleMessage);
```

**Target pattern (Agents SDK):**
```typescript
import { Agent, VoiceSession } from '@openai/agents';

// Define the coach agent
const coachAgent = new Agent({
  name: "MediaCoach",
  model: "gpt-realtime",
  instructions: COACH_SYSTEM_PROMPT,
  tools: [nudgeTool, markTimelineTool],
  voice: {
    enabled: true,
    voice: "alloy",
    inputTranscription: {
      model: "gpt-4o-mini-transcribe"
    }
  }
});

// Create voice session
const session = await coachAgent.createVoiceSession({
  onToolCall: handleToolCall,
  onTranscript: handleTranscript,
  onAudioDelta: handleAudioDelta
});

// Connect WebRTC
await session.connectWebRTC(peerConnection);
```

**Tasks:**
- [ ] Create `coachAgent` definition
- [ ] Migrate WebRTC connection logic
- [ ] Update event handlers to new API
- [ ] Test bidirectional audio

---

### 3.4 Refactor Coach Hook

**File:** `src/hooks/useRealtimeCoach.ts`

**Target Implementation:**
```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { Agent, VoiceSession } from '@openai/agents';
import { useSessionStore } from '@/stores/sessionStore';

interface UseRealtimeCoachOptions {
  scenario: Scenario;
  mode: 'coach' | 'interview';
  onNudge: (nudge: Nudge) => void;
}

export function useRealtimeCoach(options: UseRealtimeCoachOptions) {
  const { scenario, mode, onNudge } = options;
  const sessionRef = useRef<VoiceSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const { addWordTimings, appendTranscript } = useSessionStore();

  const connect = useCallback(async (audioStream: MediaStream) => {
    // Fetch ephemeral token from backend
    const tokenResponse = await fetch('/api/realtime/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: scenario.id, mode })
    });
    const { client_secret } = await tokenResponse.json();

    // Create agent and session
    const agent = createCoachAgent(mode, scenario);
    const session = await agent.createVoiceSession({
      clientSecret: client_secret,

      onToolCall: (toolCall) => {
        if (toolCall.name === 'nudge') {
          onNudge(toolCall.arguments as Nudge);
        }
      },

      onTranscript: (transcript) => {
        appendTranscript(transcript.text);
        if (transcript.wordTimings) {
          addWordTimings(transcript.wordTimings);
        }
      },

      onSpeakingChange: (speaking) => {
        setIsAISpeaking(speaking);
      }
    });

    // Connect audio stream
    await session.connectAudioStream(audioStream);
    sessionRef.current = session;
    setIsConnected(true);
  }, [scenario, mode, onNudge, addWordTimings, appendTranscript]);

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      await sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsConnected(false);
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isAISpeaking
  };
}
```

**Tasks:**
- [ ] Refactor hook to use Agents SDK
- [ ] Update all components using the hook
- [ ] Test connection flow end-to-end
- [ ] Verify nudge tool calls work

---

## Phase 4: Session Persistence (Optional Enhancement)

### 4.1 Enable Pause/Resume

The GA Realtime API supports session persistence, allowing users to pause training and resume later.

**Backend Changes:**

**File:** `backend/api/realtime.py`

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class SessionCreate(BaseModel):
    scenario_id: str
    mode: str
    resume_session_id: str | None = None

@router.post("/token")
async def get_ephemeral_token(request: SessionCreate):
    """Generate or resume a realtime session"""

    session_config = {
        "model": REALTIME_MODEL,
        "voice": "alloy",
        "instructions": get_instructions(request.scenario_id, request.mode),
        "tools": [NUDGE_TOOL],
        "input_audio_transcription": {
            "model": TRANSCRIPTION_MODEL
        }
    }

    if request.resume_session_id:
        # Resume existing session
        response = await openai_client.realtime.sessions.retrieve(
            session_id=request.resume_session_id
        )
    else:
        # Create new session
        response = await openai_client.realtime.sessions.create(**session_config)

    return {
        "client_secret": response.client_secret.value,
        "session_id": response.id
    }

@router.post("/pause/{session_id}")
async def pause_session(session_id: str):
    """Pause a session for later resumption"""
    # Store session state in database
    # Return confirmation
    pass
```

**Frontend Changes:**

**File:** `src/stores/sessionStore.ts`

```typescript
interface SessionState {
  // ... existing fields

  sessionId: string | null;
  isPaused: boolean;

  pause: () => Promise<void>;
  resume: () => Promise<void>;
}
```

**Tasks:**
- [ ] Add session ID tracking
- [ ] Implement pause endpoint
- [ ] Implement resume flow
- [ ] Store session metadata in database
- [ ] Add pause/resume UI controls

---

## Phase 5: Testing & Verification

### 5.1 Unit Tests

**Files to create/update:**
- `src/lib/analysis/__tests__/voiceMetrics.test.ts`
- `src/hooks/__tests__/useRealtimeCoach.test.ts`

**Test cases:**
- [ ] WPM calculation with various word timings
- [ ] Filler detection accuracy
- [ ] Session state transitions
- [ ] Tool call handling

### 5.2 Integration Tests

**Test scenarios:**
- [ ] Complete coach mode session
- [ ] Complete interview mode session
- [ ] Pause and resume session
- [ ] Network interruption recovery

### 5.3 Manual Testing Checklist

- [ ] Start session → hear AI greeting
- [ ] Speak → see WPM update in real-time
- [ ] Speak with fillers → see filler count increase
- [ ] Trigger nudge condition → see nudge appear
- [ ] End session → verify transcript saved
- [ ] Play back session audio

---

## Migration Checklist

### Pre-Migration
- [ ] Back up current working implementation
- [ ] Create feature branch: `feature/realtime-api-upgrade`
- [ ] Document current API usage patterns

### Phase 1: Model Migration
- [ ] Update model string
- [ ] Add transcription config
- [ ] Test basic functionality
- [ ] Commit: "chore: migrate to gpt-realtime GA model"

### Phase 2: Native Transcription
- [ ] Update event handlers
- [ ] Improve voice metrics
- [ ] Update session store
- [ ] Test accuracy improvements
- [ ] Commit: "feat: integrate native transcription for accurate metrics"

### Phase 3: SDK Migration
- [ ] Install Agents SDK
- [ ] Refactor realtime client
- [ ] Refactor coach hook
- [ ] Update all consumers
- [ ] Commit: "refactor: migrate to OpenAI Agents SDK"

### Phase 4: Session Persistence (Optional)
- [ ] Implement pause/resume
- [ ] Add database storage
- [ ] Update UI
- [ ] Commit: "feat: add session pause/resume capability"

### Post-Migration
- [ ] Run full test suite
- [ ] Performance comparison (latency, accuracy)
- [ ] Update documentation
- [ ] Merge to main

---

## Rollback Plan

If issues arise during migration:

1. **Model rollback:** Change `gpt-realtime` back to `gpt-4o-realtime-preview`
2. **SDK rollback:** Revert to `@openai/realtime-api-beta` package
3. **Full rollback:** Revert entire feature branch

Keep the old implementation available until GA migration is stable in production.

---

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Phase 1: Model Migration | Small |
| Phase 2: Native Transcription | Medium |
| Phase 3: SDK Migration | Medium-Large |
| Phase 4: Session Persistence | Medium |
| Phase 5: Testing | Medium |

**Recommended approach:** Ship Phase 1 + 2 first for quick wins, then tackle Phase 3 as a separate effort.

---

## References

- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Agents SDK](https://platform.openai.com/docs/guides/agents)
- [Realtime WebRTC Guide](https://platform.openai.com/docs/guides/realtime-webrtc)
- [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
