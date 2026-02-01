# Hybrid Facial-Expression Coaching — Phase B & C (Implementation)

This doc extends `implementation_hybrid_expression_coaching.md` with concrete build details for:

- **Phase B:** model-assisted **phrasing only** (no images; Responses API)
- **Phase C:** **optional keyframe verification** (cropped face images; Responses API)

Project context: `CLAUDE.md` (AI media training coach: content + voice + presence).

---

## Guiding Principles (B + C)

- **Local decides, model phrases.** The browser decides *when* to nudge using stable signals + cooldowns; the model only rewrites the nudge text.
- **No “emotion detection” language.** Use observable cues (“camera contact”, “framing”, “lighting”, “smile intensity”) and avoid mental-state claims.
- **Privacy by default.** No raw video upload. Images are **Phase C only**, **opt-in**, and **rare**.
- **Cost-aware.** Model calls are **event-driven**, not periodic.

---

## Phase B — Model Phrasing (Responses, No Images)

### Goal
Keep your existing local nudges (cooldown + persistence gating) but replace hardcoded copy with **short, coach-like phrasing** tailored to:
- nudge category (`reason`)
- severity (`gentle|firm|urgent`)
- scenario / user goal (optional)

### Non-goals
- Do not have the model decide whether to nudge.
- Do not stream continuous feature packets to the model.
- Do not upload images in Phase B.

---

## Phase B — Data Contract

### Client → Backend: `FaceNudgePhraseRequest`
Send **only when a local nudge is about to fire** (i.e., after persistence + cooldown passes).

```json
{
  "t_ms": 123456,
  "reason": "camera_presence",
  "severity": "gentle",
  "fallback_text": "Keep your face in frame",
  "context": {
    "scenario_id": "crisis",
    "user_goal": "calm + credible",
    "mode": "coach"
  },
  "signals": {
    "face_present": 0.12,
    "framing": 0.40,
    "lighting": 0.20,
    "tracking_confidence": 0.55
  }
}
```

Notes:
- `fallback_text` is required so the UI never blocks on the model.
- Keep `signals` minimal; do not send long histories in Phase B.

### Backend → Client: `FaceNudgePhraseResponse`

```json
{
  "abstain": false,
  "text": "Quick camera check—center up for 2s.",
  "cooldown_ms": 12000
}
```

Rules:
- `text` must be **<= 10 words** (or an 80-char cap if you prefer).
- If `abstain=true`, client uses `fallback_text`.

---

## Phase B — Backend API

### Endpoint
Add a small endpoint (example):
- `POST /api/face/nudge/phrase`

### OpenAI integration (Responses API)
Use Responses with **structured output** so you never parse free-form text.

**System prompt requirements**
- “You are a senior media trainer.”
- “Return JSON only.”
- “Phrase the nudge; do not decide whether to nudge.”
- “No mental-state or trait inference.”
- “Keep it short and actionable.”

**Model selection**
- Use a small/cheap text-capable model (env-driven), e.g. `OPENAI_FACE_PHRASE_MODEL`.

**Storage**
- Set `store: false` (or equivalent) for privacy defaults.

---

## Phase B — Client Wiring (Frontend)

### Where it hooks in
In `src/hooks/useFaceCoach.ts` (or a sibling helper), when a local nudge is about to fire:
1. Build `FaceNudgePhraseRequest`.
2. Call backend `POST /api/face/nudge/phrase`.
3. If success and not abstained, use returned `text`; else use `fallback_text`.
4. Call `addNudge({ text, severity, reason })` as you do today.

### Concurrency / UX
- Don’t send overlapping phrase requests; keep a single in-flight request and drop new ones until it completes.
- If phrase request exceeds a short timeout (e.g., 400–800ms), fall back immediately and log the timeout.

---

## Phase B — Rate Limiting & Cost Defaults

### Recommended sending frequency
**Only when a local nudge triggers.** With your current cooldown (`~12s`), worst case is:
- `<= 5` phrase calls / minute, but typical should be `0–2` / minute.

### Additional caps (recommended)
- **Per-session phrase budget:** e.g., `max_phrase_calls_per_session = 40`
- **Per-reason cooldown multiplier:** e.g., lighting nudges can be more sparse than framing

### Logging
Log counts (no images, no raw video):
- phrase calls attempted / succeeded
- fallbacks used (abstain, timeout, error)
- average latency

---

## Phase C — Optional Keyframe Verification (Responses + Cropped Face Images)

### Goal
Reduce false positives in ambiguous conditions by sending a **single cropped face keyframe** *only when needed*.

Phase C adds a second Responses call type:
- verify cue from the keyframe + minimal signals
- return `verified=true/false` and optional rewritten nudge text

### Opt-in + privacy gates (required)
- “Allow keyframes” toggle (default **off**)
- “Strict privacy mode” disables keyframes entirely
- Never store keyframes unless user explicitly enables “save session”

---

## Phase C — When to Send a Keyframe

Only send a keyframe if **all** are true:
- user enabled keyframes
- local nudge would fire (Phase A gates passed)
- quality/confidence suggests ambiguity, e.g.:
  - `face_present` borderline
  - lighting is poor
  - tracker confidence low
  - gaze proxy unreliable (glasses/occlusion heuristics)
- event is “high impact” (you decide locally), e.g. repeated camera-contact drops during an answer

**Hard limit:** aim for `< 1 keyframe/min`, ideally `< 1 per 3–5 minutes`.

---

## Phase C — Keyframe Capture (Client)

### Crop strategy
- Compute face bounding box from landmarks.
- Expand by a margin (e.g., 20–35%) to include expression context.
- Clamp to frame boundaries.

### Image format
- Downscale to **256–512 px** (long side).
- Encode as JPEG/WebP with moderate quality (e.g., 0.6–0.8).
- Send **one frame**, not a burst (unless you have a specific bug you’re addressing).

---

## Phase C — Data Contract

### Client → Backend: `FaceNudgeVerifyRequest`

```json
{
  "t_ms": 123456,
  "reason": "camera_presence",
  "severity": "gentle",
  "fallback_text": "Keep your face in frame",
  "signals": {
    "face_present": 0.18,
    "framing": 0.52,
    "lighting": 0.28,
    "tracking_confidence": 0.35
  },
  "image": {
    "mime_type": "image/jpeg",
    "base64": "..."
  }
}
```

### Backend → Client: `FaceNudgeVerifyResponse`

```json
{
  "verified": true,
  "abstain": false,
  "text": "Quick camera check—look up for 2s.",
  "cooldown_ms": 15000
}
```

Rules:
- If `verified=false`, client should skip the nudge entirely (or downgrade to a non-face nudge).
- If `abstain=true`, use `fallback_text` only if you still want to nudge without verification.

---

## Phase C — Backend API

### Endpoint
Add an endpoint (example):
- `POST /api/face/nudge/verify`

### OpenAI integration (Responses API, multimodal)
Use structured output again:
- `verified: boolean`
- `abstain: boolean`
- `text: string`
- `cooldown_ms: number`

Safety requirements:
- The model must never claim identity or emotional/mental state.
- The model should ground feedback in what’s visible (framing/lighting/camera contact).

---

## Acceptance Criteria (Phase B)

- Local face nudges behave exactly as Phase A (same gating + cooldown behavior).
- Model only changes wording; it cannot increase nudge frequency.
- If model errors/timeouts, the UI uses `fallback_text` without visible delays.

## Acceptance Criteria (Phase C)

- Keyframes are strictly opt-in and rare (measured in logs).
- Keyframes are cropped + downscaled; no background/other people are captured intentionally.
- Verification can suppress false-positive face nudges under poor tracking conditions.

---

## Suggested Rollout

1. Ship Phase B behind a feature flag (`face_phrase_model_enabled`).
2. Add observability dashboards (phrase latency, fallback rate, nudge frequency).
3. Ship Phase C behind a separate flag + explicit UI consent (`face_keyframes_enabled`).
4. Iterate thresholds to keep keyframes rare while improving precision.

