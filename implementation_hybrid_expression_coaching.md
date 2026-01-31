# Hybrid Facial-Expression Coaching During Calls (Implementation Doc)

## Goal

Provide **real-time, low-distraction coaching during calls** by combining:
- **On-device face tracking** for high-FPS, low-latency signals
- **OpenAI (Realtime/Responses)** for higher-level interpretation + wording of nudges
- **Keyframe verification** (optional) to reduce false positives without streaming video continuously

This doc assumes we only analyze the **local user’s camera feed** (self-coaching), not other participants.

---

## Non-goals / Guardrails

- **No “mind-reading.”** Avoid claims about hidden emotions or mental state. Prefer observable cues: *smile intensity*, *brow raise*, *gaze direction*, *blink rate*, *head pose*, *expressiveness variability*.
- **No “emotion detection” product positioning.** Treat face signals as delivery/communication cues; avoid workplace/education “emotion inference” use cases and wording.
- **No identity.** Do not identify who the person is, match to a database, or store biometrics.
- **No constant raw video upload.** Default to local feature extraction; send images only as explicit keyframes when needed.
- **No high-stakes automated decisions.** Coaching suggestions are optional UX nudges; user remains in control.

---

## User Experience (Product Spec)

### What the user sees
- A call UI (or practice-call UI) with:
  - self-view preview
  - live metrics (simple, stable)
  - occasional nudge chips (subtle, timed)
  - optional “coach whisper” audio (off by default)

### Nudge principles
- **Minimal + actionable:** “Look at the camera for 2 seconds” vs “Be confident.”
- **Rate-limited:** max 1 nudge / 8–15s (tunable).
- **Context-aware:** fewer nudges while user is answering rapid-fire; more during pauses.
- **Positive framing:** default to reinforcement when doing well.

---

## System Architecture (Hybrid)

### High-level data flow
1. **Capture** self camera stream (already required for the session UI).
2. **On-device face pipeline** runs continuously and emits:
   - per-frame landmarks/blendshapes (internal)
   - low-rate “feature packets” (exported)
3. **Local smoothing + event detection** converts features → stable signals + “events”.
4. **OpenAI coaching loop**:
   - receives feature packets and conversation context (transcript snippets)
   - returns human-friendly nudges + explanation (optional)
5. **Optional keyframe verification**:
   - when a high-impact event triggers, send a **cropped face image** to confirm.

### Two control loops (recommended)
- **Fast local loop (10–30 Hz internal):** smoothing, confidence scoring, immediate metric updates.
- **Slow model loop (0.2–1 Hz):** nudge selection, phrasing, strategy (less frequent, cheaper).

---

## On-Device Face Pipeline

### Tracker options (choose per platform)
- **Web:** MediaPipe Face Landmarker / FaceMesh-style landmarks (WebAssembly/WebGL)
- **iOS:** ARKit blendshapes (if native)
- **Android:** ML Kit / MediaPipe (if native)

### Core outputs (normalized)
Normalize to [0..1] where possible, plus confidence.

**Head pose**
- `yaw`, `pitch`, `roll` (degrees or normalized)
- `pose_confidence`

**Gaze proxy (web-friendly)**
- `gaze_left_right`, `gaze_up_down` (approx)
- `gaze_confidence`

**Expression / action proxies**
- `smile`, `jaw_open`, `lip_press`
- `brow_raise`, `brow_furrow`
- `eye_open_left`, `eye_open_right`
- `blink_rate_10s` (computed)
- `micro_expression_rate_10s` (computed; optional)
- `expression_confidence`

**Quality signals**
- `face_detected` (bool)
- `tracking_confidence`
- `lighting_ok` (bool heuristic)
- `occlusion` (glasses/mask/hand; heuristic)

### Smoothing & stability
Use temporal smoothing to prevent UI flicker:
- Exponential moving average (EMA) per feature
- Hysteresis thresholds for “stateful” signals (e.g., “smiling”)
- Minimum duration for events (e.g., “gaze away” must persist > 400ms)

### Event detection (examples)
Emit events only when meaningful:
- `GAZE_AWAY_START / END` (with duration)
- `SMILE_ONSET / OFFSET` (with intensity delta)
- `BROW_RAISE_SPIKE` (surprise-looking cue; be careful with interpretation)
- `LOW_EXPRESSIVITY_WINDOW` (e.g., flat affect over 15–30s)
- `HIGH_BLINK_RATE_WINDOW` (possible strain; phrase as “blink rate increased”)

---

## Feature Packet Schema (What We Send to OpenAI)

### Design goals
- Small payloads, predictable, time-aligned
- Carry confidence so the model can abstain
- Make it easy to aggregate in “windows”

### Suggested packet (sent every 1–2 seconds)
- `t_ms`: monotonic timestamp since session start
- `window_ms`: duration of aggregation window (e.g., 1000–2000)
- `face_present_pct`: % of frames with face detected in window
- `signals`: smoothed averages (smile, brow_raise, gaze, head pose)
- `deltas`: changes vs prior window (useful for onsets)
- `quality`: tracking_confidence avg/min, lighting_ok %, occlusion %
- `events`: any discrete events fired in window

### Suggested “conversation context” bundle (sent less often, e.g., every 5–10 seconds)
- `t_ms`
- `transcript_excerpt`: last 1–3 utterances (or last ~20–40 words)
- `speaker_state`: {speaking, listening, interrupted, long_pause}
- `scenario`: crisis/product/general/security (existing)
- `user_goal`: e.g., “calm + credible”, “energetic + persuasive”

### Time alignment (important)
- Use a single **session clock** (`t_ms since start`) for *all* signals (audio transcript, face events, nudges).
- When sending transcript excerpts, include approximate timestamps or “last N seconds” context so the model can relate delivery cues to what was just said.

---

## OpenAI Integration (Coaching Loop)

### Recommended pattern: OpenAI for *language + strategy*, not raw tracking
Let the model:
- decide whether an event warrants a nudge
- pick the best nudge type (visual, delivery, verbal structure)
- phrase it in the chosen tone
- respect rate limits + user preferences

Keep:
- event detection + smoothing local
- UI rendering local

### Output format (structured)
Have the model produce a single structured response per “coaching tick”:
- `should_nudge`: boolean
- `nudge_type`: `camera_contact | warmth | emphasis | calm | pace | clarity | posture | listening | none`
- `message`: short user-facing text (<= 80 chars ideal)
- `reason`: optional internal rationale (not always shown)
- `confidence`: 0..1
- `cooldown_ms`: suggested minimum time before next nudge
- `requires_keyframe`: boolean (only if ambiguity is high)

### Fit with the existing `nudge` tool (recommended)
If you already use a `nudge(text, severity, reason)` tool for realtime chips:
- Keep `text` ultra-short (the UI works better with < 10 words).
- Extend `reason` to cover face/delivery cues (e.g., `camera_contact`, `warmth`, `posture`, `listening`, `expressiveness`) or add a second tool like `face_nudge(...)` to avoid mixing with verbal categories.
- Treat face events as “delivery cues”, not emotion labels.

### Choosing Realtime vs Responses
- **Realtime**: best for continuous, interactive coaching; can deliver nudges instantly.
- **Responses**: best for periodic analysis with stricter JSON enforcement and batching.

Practical hybrid:
- Use **Realtime** for the live session “nudge stream”
- Use **Responses** for:
  - post-call debrief
  - periodic “checkpoint summaries” (every 60–120s)
  - calibration (first 20s baseline)

---

## Optional Keyframe Verification (Face Crop Images)

### When to send a keyframe
Only when:
- `requires_keyframe=true`, AND
- event severity is high, AND
- tracking_confidence is low or conflicting signals exist

Examples:
- “You look away frequently” but gaze confidence low due to lighting
- “Smile looks forced” (avoid wording like this; prefer “smile intensity is high but doesn’t sustain”)

### What to send
- **Single cropped face image** (not full frame)
- Optional 2–3 frame burst over 300–500ms (only if needed)
- Include the same feature packet + quality metrics alongside the image

Practical tips:
- Downscale aggressively (e.g., 256–512px) and compress; you want “expression legibility”, not photo quality.
- Prefer tight crops around the face to avoid capturing background/others.

### Privacy defaults
- Do not store keyframes unless user explicitly enables “save session for debrief”
- If stored, encrypt at rest and auto-expire

### Security basics
- Issue **ephemeral credentials** to the client; never expose long-lived API keys in the browser.
- Apply server-side gating so only authenticated sessions can start realtime coaching.

---

## Prompting Strategy (Model Behavior)

### System instruction themes
- Use **observable descriptors** only
- Be **brief and actionable**
- Respect **cooldowns** and **user sensitivity level**
- Abstain when `face_present_pct` low or `quality` poor
- Never mention protected traits; avoid judgmental language

### Coaching heuristics to bake in (model-side or local)
- Don’t nudge on every small deviation; prioritize:
  - gaze/camera contact for trust
  - expressiveness matching scenario (calm vs energetic)
  - listening cues (micro nods, neutral face during listening, not frowning)
- Prefer positive reinforcement if the user improved in last ~20s

---

## Calibration & Personalization

### First 15–30s baseline
Collect a baseline while user listens/speaks:
- neutral face range
- typical blink rate
- typical gaze variance
- typical smile intensity

Use baseline to:
- avoid calling “low expressivity” on naturally calm users
- adapt thresholds by scenario and user goal

### User controls (important)
- Sensitivity: low/medium/high
- Nudge modalities: visual only / audio allowed
- Nudge categories: on/off per type
- “Strict privacy mode”: never send images

---

## Latency, Rate Limits, and Cost Controls

- Feature packets: every **1–2 seconds** (tiny text payloads)
- Context bundles: every **5–10 seconds**
- Keyframes: rare (aim < 1 per minute, ideally far less)
- Nudge output: rate-limit UI (e.g., 1 per 8–15s) regardless of model output
- Use local gating to avoid calling the model when nothing changed (no events + stable signals)

---

## Failure Modes & Fallbacks

- **No face detected:** hide face-based metrics; nudge “adjust lighting / camera angle” once.
- **Low confidence:** reduce nudge frequency; rely more on voice/transcript coaching.
- **User looks at notes (gaze away):** interpret neutrally; suggest “briefly return to camera after reading.”
- **Glasses / occlusion:** down-weight gaze signals; focus on head pose + smile/brow.

---

## Safety, Compliance, and UX Wording

### Wording constraints (examples)
Prefer:
- “Camera contact dropped for ~6s; try looking back for 2s.”
- “Smile intensity decreased; add a quick warm opener.”
Avoid:
- “You look nervous/anxious/angry.”
- “You’re lying / untrustworthy.”

### Consent & transparency
- Clear “This analyzes your self-view to coach delivery” notice
- Explicit toggle for image uploads (keyframes)
- Explicit toggle for saving sessions

---

## Observability (What to Log)

Log event-level data (not raw video):
- timestamps of feature packets + events
- nudges shown (type, message, t_ms, whether user dismissed)
- quality metrics (face_present_pct, tracking_confidence)
- keyframe send count (and whether enabled)

This supports debugging “why did it nudge me?” without storing sensitive imagery.

---

## Rollout Plan

1. **Phase A (local-only):** show stable face metrics + simple local nudges, no OpenAI usage.
2. **Phase B (model phrasing):** send feature packets; model returns nudge text only.
3. **Phase C (keyframes):** opt-in; confirm ambiguous cues with cropped images.
4. **Phase D (personalization):** baseline calibration + per-user sensitivity.

---

## Acceptance Criteria (MVP)

- Nudge chips are stable and rate-limited (no flicker, no spam).
- Face-based coaching automatically disables when tracking quality is poor.
- Model outputs are structured and never claim mental state; nudges remain actionable.
- Keyframes are opt-in and rare; session works well without them.
