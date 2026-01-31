 **“Gong + media trainer + executive presence coach”**, but tuned for PR and high-stakes spokesperson moments.

## 1) What you’re actually building (3 signals → 1 coaching brain)

You have 3 parallel analyzers feeding one coaching agent:

### A) **Content / PR craft** (what they said)

* Are they on-message?
* Did they bridge back to key points?
* Did they answer the question?
* Did they over-disclose / speculate?
* Did they use safe, quotable lines?

### B) **Delivery / voice** (how they said it)

* Pace (wpm), pauses, filler words
* Tone / confidence / warmth
* Interruptions, rambling, sentence length
* “Sound bite-ness” (short, quotable lines)

### C) **Presence / face & body** (how they looked)

* Eye contact (camera gaze), micro-expressions
* Smiles at wrong times, tension, blink rate
* Head movement, nodding, “freeze” moments
* “Concern/empathy” alignment with topic

Then the coaching agent merges those into:

* **Live nudges** (1–2 short prompts at the right moment)
* **Post-session debrief** (structured feedback + drills)

---

## 2) MVP architecture (fast, practical, low-risk)

### Client app (web or desktop)

* Captures mic + webcam
* Shows “interview mode” UI
* Sends audio/video to your backend OR directly to OpenAI Realtime (recommended for latency)

### Realtime pipeline (live coaching)

Use **OpenAI Realtime API** for low-latency, multimodal conversation (speech-to-speech, text, image). ([OpenAI Platform][1])

* **WebRTC** from browser is the smoothest for voice coaching. ([OpenAI Platform][2])
* Newer “realtime” models are designed for production voice agents and can take multimodal inputs. ([OpenAI][3])

**Key design:** don’t stream full video at high FPS.

* Do **on-device CV** to extract *features* (gaze %, smile intensity, head movement) and send only that.
* Optionally send **1 frame every ~1–2 seconds** (or on detected “emotion spikes”) if you really need model interpretation.

### Post-session pipeline (deep analysis)

1. Run **speech-to-text** (for accurate transcript + timestamps)
   OpenAI supports newer transcription models (including diarization variants). ([OpenAI Platform][4])
2. Run **segmentation**: split into Q/A turns, interruptions, long answers
3. Run **rubric scoring** (structured JSON output)
4. Generate **drills + rewrites + “ideal answer” examples**
5. Store an anonymized session summary and trend progress per spokesperson

---

## 3) OpenAI APIs to use (and why)

### Live voice coaching

* **Realtime API** for “talking coach” that can interrupt, respond naturally, and adapt in real-time. ([OpenAI][5])
* You can also drive **real-time transcription** if you want subtitles and precise timing. ([OpenAI Platform][1])

### High-quality voice output (if not using realtime voice output)

* **gpt-4o-mini-tts** for natural TTS + controllable delivery (tone, pacing). ([OpenAI Platform][6])

### Vision (selective)

* Use the **Responses API** for image+text analysis and structured outputs (great for post-session frames). ([OpenAI Platform][7])

---

## 4) The secret sauce: a PR media-training rubric (make it “agency-grade”)

Build a rubric that matches how real media trainers think. Example categories:

### Message discipline (0–5)

* Stayed on-message
* Repeated key message (“three messages”)
* Avoided tangents

### Question handling (0–5)

* Answered directly first (no dodge)
* Bridged correctly (not evasive)
* Correctly handled hypothetical / speculation traps

### Risk & compliance (0–5)

* No speculation, no unverified claims
* No confidential info
* No over-promising / legal exposure

### Sound bites & clarity (0–5)

* 10–15 second quotable lines exist
* Low jargon, short sentences
* Clear “headline” first

### Tone & presence (0–5)

* Warmth + confidence appropriate to situation
* Facial expression matches topic gravity
* Calm under pressure

Then output:

* **Top 3 strengths**
* **Top 3 fixes**
* **2 custom drills**
* **A rewritten “best possible answer”**
* **A “bridging bank”** (safe lines tailored to company)

---

## 5) How to make it sound human (not robotic)

This is mostly prompt + response policy:

**Coaching style rules**

* Speak like a senior PR trainer, not an HR evaluator
* Give *one* instruction at a time
* Use short, natural phrasing (“Try that again, but lead with the headline.”)
* Avoid over-scoring in live mode — save scoring for debrief

**Two modes**

1. **Live mode**: only intervene when it matters
   Examples:

* “Pause. Answer the question in one sentence, then bridge.”
* “Slow down — land the point.”

2. **Debrief mode**: detailed, structured, tactical

---

## 6) A clean data contract (what your agent returns)

Have the model always return **structured JSON** for debrief. For example:

* overall_score
* section_scores {message_discipline, risk, soundbites, tone, presence}
* timestamped_flags: [{t_start, t_end, issue_type, evidence_quote, fix}]
* rewrites: [{question, your_answer, improved_answer, why_it’s_better}]
* drills: [{name, instructions, target_metric, repetitions}]
* “approved safe lines” / “bridges” bank

This makes UI + analytics trivial.

---

## 7) UI that will feel premium (and “training-ish”)

**During**

* A single live “nudge chip” (not a wall of text)
* A pace meter + filler counter
* Eye-contact meter (camera gaze %)

**After**

* Timeline with colored markers:

  * red: risk / dodge / ramble
  * yellow: weak bridge / unclear
  * green: quotable sound bite
* “Before / After” answer rewrites
* Progress over time (pace, filler words, message discipline)

---

## 8) Privacy / consent (important because you’re analyzing faces)

Since you’re processing biometric-ish signals (face/voice), bake in:

* Explicit consent
* Local-first processing for facial feature extraction when possible
* Short retention windows (or user-controlled deletion)
* Clear “we don’t train on your data” stance (your product-level policy)

---

## 9) Build plan in 3 iterations

### Iteration 1 (1–2 weeks): **Post-session coach**

* Record audio/video
* Transcribe
* Compute simple voice metrics (pace, filler, pauses)
* Manual face metrics (gaze via on-device landmarks)
* LLM generates rubric + rewrites + drills

### Iteration 2: **Realtime coach**

* WebRTC → Realtime API voice coach ([OpenAI Platform][8])
* Live nudges: pace + “answer then bridge”
* Keep it minimal

### Iteration 3: **Company-aware media trainer**

* Upload company messaging doc / Q&A / boilerplate statements
* “What we can / can’t say” constraints
* Scenario generator: hostile journalist, investor call, crisis, regulatory

-----------

Below is a concrete **implementation plan** (modules + architecture + phased roadmap) for an **AI media-training coaching agent** that analyzes **face + voice + PR language**, built on **OpenAI Realtime + Responses + Audio** APIs.

---

## 0) Target experience (what “done” feels like)

**Interview Mode (live)**

* User speaks to a simulated journalist (voice).
* The coach gives **minimal, well-timed nudges** (“Answer in 1 sentence, then bridge.” / “Slow down.”).
* UI shows only a few live meters: **pace**, **filler words**, **eye contact**.

**Debrief Mode (after)**

* A timeline of the session with markers:

  * **Message drift**, **overlong answers**, **risk phrases**, **awkward expression moments**
* **Before/after rewrites** and **drills**
* Progress over time per spokesperson

---

## 1) High-level architecture

```
[Web App]
  - Mic + Cam capture
  - On-device feature extraction (gaze, smile, head movement)
  - WebRTC connection to OpenAI Realtime (voice coach)
  - Sends feature vectors + optional low-rate frames

        | (WebRTC)
        v
[OpenAI Realtime Session]
  - Live conversation (speech-to-speech)
  - Optional realtime transcription session
  - Tool calls: "nudge", "mark_timeline", "request_clip"

        | (events + webhooks)
        v
[Your Backend (FastAPI)]
  - Issues ephemeral tokens for client
  - Stores session metadata + features
  - Post-session job runner (analysis + report)
  - Company config / messaging retrieval (RAG)

        | (batch)
        v
[Post-session Analyzer]
  - Audio transcription (Audio API)
  - Segment Q/A turns + compute voice metrics
  - LLM rubric scoring via Responses + Structured Outputs (JSON schema)
  - Generates debrief + drills + rewrites + shareable report
```

**Why this split:** Realtime gives low-latency “human” coaching, while Responses + Structured Outputs gives reliable JSON for scoring and UI. ([OpenAI Platform][1])

---

## 2) OpenAI building blocks (where each fits)

### A) Live coaching: Realtime API (WebRTC)

* Use OpenAI **Realtime API** over **WebRTC** for speech-to-speech coaching. ([OpenAI Platform][2])
* Keep your secret coaching logic server-side with **server controls / webhooks** patterns. ([OpenAI Platform][3])
* Follow realtime prompting guidance for “interrupt minimally, coach naturally.” ([OpenAI Platform][4])

### B) Live transcript (optional)

* For subtitles + timestamped coaching markers, use **Realtime transcription sessions**. ([OpenAI Platform][5])

### C) Post-session transcription

* Use Audio transcription models for clean transcripts (and diarization if you add interviewer + spokesperson). ([OpenAI Platform][6])

### D) Rubric scoring + structured debrief

* Use **Responses API + Structured Outputs** so your debrief is always valid JSON (no parsing hell). ([OpenAI Platform][7])

### E) Data controls

* Be explicit about storage/retention controls and use platform settings like `store: false` where appropriate. ([OpenAI Platform][8])
* If you go enterprise, note OpenAI’s enterprise-grade privacy options (e.g., “no training”, possible zero retention by request). ([OpenAI][9])

---

## 3) Core modules to build (in order)

### Module 1 — Session capture + replay (foundation)

**Deliverables**

* Web app records mic + cam
* Session playback with transcript timeline
* Basic metrics: WPM, pauses, filler words

**Implementation notes**

* Audio chunks → backend storage (or direct to transcription later)
* Keep raw video optional; prefer storing **derived signals** unless user opts in

---

### Module 2 — On-device facial/presence feature extractor

**Goal:** Don’t do “emotion detection.” Do **observable coaching signals**:

* camera gaze % (eye contact)
* smile intensity (over/under-smiling)
* head movement / nodding frequency
* blink rate spikes (stress proxy)
* “stillness” / freeze moments

**Implementation**

* Browser: MediaPipe / TFJS / OpenCV in WASM (fast + privacy)
* Stream **feature vectors** to backend / realtime session (e.g., 5–10 Hz)
* Optional: send **1 frame every 1–2s** only when something spikes

---

### Module 3 — Live coach agent (Realtime)

**Goal:** Natural conversation + minimal nudges.

**Realtime session behavior**

* The model talks like a senior media trainer.
* It calls your tool `nudge(text, severity, reason, timestamp)` when thresholds trigger.

**Nudge triggers (deterministic > model guesses)**

* WPM too high
* filler rate too high
* answer exceeds N seconds without landing a point
* gaze drops below threshold during key moments
* risky language patterns (“we guarantee”, “off the record”, speculation)

Use Realtime event flow patterns and tool-calling design from the docs. ([OpenAI Platform][10])

---

### Module 4 — PR rubric engine (Responses + Structured Outputs)

**Deliverables**

* A single rubric JSON per session:

  * section scores
  * timestamped flags with evidence quotes
  * rewritten “best answer”
  * drills (repeatable practice set)
  * “bridging bank” (approved transitions)

Structured Outputs ensures the JSON schema is always respected. ([OpenAI Platform][11])

---

### Module 5 — Company messaging + guardrails

**Inputs**

* key messages (3–5)
* proof points
* “red lines” (what not to say)
* approved boilerplate
* crisis stance templates

**How it works**

* Retrieval step: inject relevant message snippets for the scenario
* Style policy: “professional PR-trained language, human, not robotic”
* Safety policy: avoid legal claims, avoid speculation

---

### Module 6 — Analytics + progress tracking

Track improvements per spokesperson:

* pace distribution
* filler rate
* average answer length
* message alignment score
* “quotable sound-bite count”
* eye contact %

---

## 4) Phased roadmap (practical sequence)

### Phase A — MVP (post-session coach)

* Record → transcribe → rubric JSON → debrief UI
* No live coach yet
* Fastest path to “wow” because rewrites + drills feel magical

### Phase B — Realtime coach (limited nudges)

* Add Realtime voice coach over WebRTC ([OpenAI Platform][2])
* Only 3 nudge types at first: **pace**, **answer-then-bridge**, **wrap-up**

### Phase C — “Company image” trainer

* Company messaging ingestion + scenario library
* Roleplay modes: hostile journalist, investor Q&A, crisis, regulator, partner

### Phase D — Enterprise-grade

* Admin panel, team analytics, retention controls, audit logs
* Optional SSO + org policy settings

---

## 5) Data model (simple + scalable)

**Entities**

* `CompanyConfig`: messages, redlines, style, scenario packs
* `UserProfile`: role, baseline voice metrics, goals
* `Session`: timestamps, scenario, transcript, features, scores
* `Markers`: {t, type, severity, evidence, recommendation}
* `Drills`: {name, instructions, target_metric}

---

## 6) Acceptance criteria (so you know it’s working)

**Live**

* Nudges are rare and timely (not spammy)
* Voice feels calm, natural, “trainer-like”
* Latency is low enough to feel conversational (Realtime) ([OpenAI Platform][1])

**Debrief**

* JSON always valid (Structured Outputs) ([OpenAI Platform][11])
* Feedback is specific, timestamped, and actionable
* Rewrites are genuinely better and still “sound like the spokesperson”

---

## 7) Next: I can draft the concrete spec artifacts

If you want, I’ll produce (in your preferred format):

1. **Rubric JSON Schema** (Structured Outputs-ready)
2. **Realtime coach system prompt + tool definitions** (nudge/marker/clip)
3. **Scenario pack template** (crisis / product launch / layoff / security incident, etc.)
4. A minimal **API contract** between frontend ↔ backend ↔ OpenAI (events + payloads)

[1]: https://platform.openai.com/docs/guides/realtime?utm_source=chatgpt.com "Realtime API"
[2]: https://platform.openai.com/docs/guides/realtime-webrtc?utm_source=chatgpt.com "Realtime API with WebRTC"
[3]: https://platform.openai.com/docs/guides/realtime-server-controls?utm_source=chatgpt.com "Webhooks and server-side controls | OpenAI API"
[4]: https://platform.openai.com/docs/guides/realtime-models-prompting?utm_source=chatgpt.com "Using realtime models | OpenAI API"
[5]: https://platform.openai.com/docs/guides/realtime-transcription?utm_source=chatgpt.com "Realtime transcription - OpenAI API"
[6]: https://platform.openai.com/docs/guides/audio?utm_source=chatgpt.com "Audio and speech - OpenAI API"
[7]: https://platform.openai.com/docs/api-reference/responses?utm_source=chatgpt.com "Responses | OpenAI API Reference"
[8]: https://platform.openai.com/docs/guides/your-data?utm_source=chatgpt.com "Data controls in the OpenAI platform"
[9]: https://openai.com/api/?utm_source=chatgpt.com "API Platform"
[10]: https://platform.openai.com/docs/guides/realtime-conversations?utm_source=chatgpt.com "Realtime conversations | OpenAI API"
[11]: https://platform.openai.com/docs/guides/structured-outputs?utm_source=chatgpt.com "Structured model outputs | OpenAI API"



-----------
