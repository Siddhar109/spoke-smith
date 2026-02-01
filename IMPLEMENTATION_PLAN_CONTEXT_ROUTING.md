# Implementation Plan (2 Phases): Company Context + “Who is it with?” + “What’s the situation?”

This plan connects:
1) **Company context** (captured at session start), and
2) the two dropdowns on `src/app/session/page.tsx` (“Who is it with” + “What’s the situation”)

…to:
1) scenario card recommendation (show 2–3 cards per selection), and  
2) prompt assembly (custom behavior per selection) across the whole system (frontend → token request → backend prompt builder → Realtime session instructions).

It is intentionally **two phases**:
- **Phase 1 = Wire + ship value fast** (minimal data model + deterministic prompt composition + scenario recommendation)
- **Phase 2 = Scale + de-duplicate + content ops** (single source of truth for scenarios, richer profiles/modifiers, better QA)

---

## Current State (as of this repo)

- Dropdowns exist only as local React state in `src/app/session/page.tsx`:
  - `partnerRole` defaults to `"Journalist"`
  - `situation` defaults to `"Interview"`
  - Neither value currently affects scenario cards or backend prompts.
- There is no company context intake (website/brief) at session start.
- Scenario cards are static (`src/lib/scenarios/defaultScenarios.ts`) and shown unfiltered by `src/components/ScenarioSelector.tsx`.
- Realtime token request (`src/hooks/useRealtimeCoach.ts`) sends only `{ mode, scenario_id }`.
- Backend token endpoint (`backend/api/realtime.py`) accepts only `{ mode, scenario_id }` and builds:
  - Coach mode: `backend/prompts/coach_system.py` (`COACH_SYSTEM_PROMPT`)
  - Journalist mode: `backend/prompts/journalist_system.py` + `backend/prompts/scenario_library.py`
- Scenario data is duplicated:
  - Frontend: `src/lib/scenarios/defaultScenarios.ts`
  - Backend: `backend/prompts/scenario_library.py`

---

## Desired End State

Given session inputs (company context + dropdown selections):
- **On entering `/session`**, user is prompted for **company website URL** (or chooses to skip) and the app generates a **Company Brief** used throughout the session.
- **UI** shows **2–3 recommended scenario cards** (plus Free Practice) tailored to `{ counterparty, situation }`.
- **Backend** assembles a **single instructions prompt** for Realtime that incorporates:
  - Mode (`coach` vs `journalist`)
  - Company Brief (if provided)
  - Counterparty (“who”)
  - Situation (“what”)
  - Selected scenario (if any)
- The assembled prompt produces visibly different behavior:
  - Journalist + Crisis: probing, quote-seeking, presses on accountability, avoids speculation prompts.
  - Customer + Crisis: empathy, remediation steps, clear customer impact, support actions.
  - Partner + Demo: integration/timeline/commitment focus, commercial next-steps.
  - Stakeholder + Interview: metrics, governance, strategy, risks.

---

## Canonical Terms (use these everywhere)

### Company Context (“What company is this for?”)
We want a small, structured artifact we can reuse across token requests.

**Hackathon note (Cloud Run, no DB):** treat company context as **client-carried** session data. The backend generates a brief, but the frontend stores it and sends it with token requests (no server-side persistence required).

**Fields** (proposed):
- `company_url` (string, optional)
- `company_brief_summary` (short structured text; stored client-side and sent with token requests)
- `company_notes` (optional user-provided notes; stored client-side and sent with token requests)

**Company Brief contents (Phase 1)**
- `one_liner` (what the company does)
- `products_services`
- `customers_users`
- `positioning_claims`
- `risk_areas` (likely sensitive topics)
- `unknowns` (explicit “we didn’t find / don’t know” list)
- `generated_at`

### Counterparty (“Who is it with?”)
We should store a stable ID (machine-friendly) and label (display).

**IDs** (proposed):
- `journalist`
- `public`
- `stakeholder` (note: current UI uses `"StakeHolder"`; we should normalize)
- `partner`
- `customer`

### Situation (“What’s the situation?”)
**IDs** (proposed):
- `interview`
- `crisis`
- `demo`

### Scenario (card)
Already exists via `scenario.id` (e.g., `crisis-layoffs`, `product-launch`, …).

---

# Phase 1 (Ship): Wire + Recommend + Compose Prompts

## Phase 1 Goals
- Capture company context at session start (website → Company Brief) and thread it through prompt assembly.
- Persist dropdown selections in shared state (Zustand) and include them in backend requests.
- Use selections to show 2–3 scenario cards (plus Free Practice).
- Backend: build **instructions** via composition:
  - `base(mode)` + `companyBrief` + `counterpartyProfile` + `situationModifier` + `scenarioContext/questions`
- Keep changes incremental and low-risk; do not attempt a full scenario framework rewrite.

## Phase 1 Non-Goals
- No “single source of truth” refactor for scenario data (we tolerate duplication for now).
- No complex ranking ML; simple deterministic filtering/ranking is fine.
- No new database schema required.
- No deep personalization beyond the Company Brief (e.g., per-user voice profiles).

---

## Phase 1 Work Breakdown

### 0) Frontend: Company context modal + loading flow
**Why**: media coaching is far more useful if the system knows what the company does; collecting this once per session avoids repeated “what do you do?” questions.

**UX proposal**
- On entering `/session`, open a modal that asks for:
  - `Company website` (URL input)
  - Optional: “Anything we should know?” (free text notes)
- Buttons:
  - **Continue** (starts analysis)
  - **Skip** (no company context; user can still practice)
- Loading state:
  - Show progress (“Reading site… summarizing… preparing interview context…”)
  - Timeout + retry + “Continue without it”

**State/storage**
- Store in Zustand:
  - `companyUrl?: string`
  - `companyNotes?: string`
  - `companyBriefSummary?: CompanyBriefSummary` (small)
  - `companyContextStatus: idle|loading|ready|error|skipped`

**Acceptance Criteria**
- User can’t accidentally start a session thinking company context loaded when it didn’t (clear status).
- Failure modes don’t block usage (skip / retry always available).

---

### 1) Backend: Create Company Brief from website URL (stateless)
**Why**: keep the “web understanding” server-side, but return a brief the client can carry (Cloud Run friendly; no DB needed).

**Tasks**
- Add endpoint (example): `POST /api/company_brief`
  - Input: `{ company_url, notes? }`
  - Output: `{ company_brief_summary }` (optionally also return a fuller `company_brief` for future use)
- Backend generates a Company Brief using an OpenAI tool-enabled call (web browse/search) with strict guardrails:
  - No inventing facts; if uncertain, put it in `unknowns`.
  - Prefer official pages (homepage, about, product, pricing, docs, newsroom).
  - Produce structured output with explicit `generated_at`.
- Do not rely on server-side storage (multiple instances + scale-to-zero). If caching is desired, make it an optional best-effort in-memory cache only.

**Acceptance Criteria**
- Given a valid URL, endpoint returns a usable brief summary.
- Given an invalid URL, endpoint returns a clear error and the frontend can continue without it.

---

### 2) Frontend: Add stable enums + store fields
**Why**: avoid brittle string matching and keep types consistent.

**Tasks**
- Add types:
  - `CounterpartyId` and `SituationId` (front-end types file; location is flexible but keep it discoverable).
- Update dropdown values in `src/app/session/page.tsx` to use stable IDs.
  - Example: `<option value="stakeholder">Stakeholder</option>` instead of `"StakeHolder"`.
- Update Zustand store (`src/stores/sessionStore.ts`) to include:
  - `counterparty: CounterpartyId`
  - `situation: SituationId`
  - actions: `setCounterparty`, `setSituation`
- Replace local `useState` in `src/app/session/page.tsx` with store-backed values.

**Acceptance Criteria**
- Refreshing the page resets to defaults (OK for Phase 1), but the values are now in the session store and accessible app-wide.
- No TypeScript errors.

---

### 3) Frontend: Scenario recommendation (show 2–3)
**Why**: UI should react to dropdown combo; reduce choice overload.

**Approach**
- Add lightweight metadata to each scenario in `src/lib/scenarios/defaultScenarios.ts`:
  - `recommendedForCounterparties?: CounterpartyId[]`
  - `recommendedForSituations?: SituationId[]`
  - (Optional) `priority?: number`
- Update `src/components/ScenarioSelector.tsx`:
  - Accept props: `counterparty`, `situation`
  - Compute recommended list:
    1) Filter by situation match if provided
    2) Filter by counterparty match if provided
    3) Fallback to a sensible default set if filtering yields <2
    4) Cap to 2–3 scenarios
  - Always render “Free Practice” as the final card.

**Ranking Rule (simple + deterministic)**
- Score each scenario:
  - +2 if situation matches
  - +1 if counterparty matches
  - +`priority` (default 0)
- Sort desc score, then stable tie-breaker (existing order).

**Acceptance Criteria**
- Selecting different dropdown combos changes which 2–3 scenario cards are shown.
- Free Practice always visible.

---

### 4) Frontend → Backend contract: Send selections with token request
**Why**: backend must assemble prompt based on same selections.

**Tasks**
- Update `src/hooks/useRealtimeCoach.ts` request body:
  - from `{ mode, scenario_id }`
  - to `{ mode, scenario_id, counterparty, situation, company_url, company_notes, company_brief_summary }`
- Ensure values are read from Zustand store (single source on the client).

**Acceptance Criteria**
- Token request includes `company_brief_summary`, `counterparty`, and `situation`.

---

### 5) Backend: Accept fields + prompt composition builder
**Why**: avoid hardcoding per-combo prompts; compose from small “blocks”.

**Tasks**
- Extend `TokenRequest` model in `backend/api/realtime.py`:
  - `counterparty: str | None = None`
  - `situation: str | None = None`
  - `company_url: str | None = None`
  - `company_notes: str | None = None`
  - `company_brief_summary: str | None = None` (or structured object)
- Add new prompt module(s), for example:
  - `backend/prompts/counterparty_profiles.py` (maps id → short behavior block)
  - `backend/prompts/situation_modifiers.py` (maps id → constraints + tone block)
  - `backend/prompts/instructions_builder.py` (single function assembling full instructions)
- Update token endpoint logic:
  - Always use `instructions_builder.build_instructions(mode, scenario_id, counterparty, situation, company_url, company_notes, company_brief_summary)`
  - Keep current behavior as fallback if fields are missing/unknown.

**Implementation Details**
- Company Brief integration should be short and practical:
  - Provide “what the company does” in 1–2 lines for grounding.
  - Include a small “message map” style block (Phase 1: minimal).
  - Explicitly label unknowns and instruct the assistant to ask clarifying questions rather than guessing.
- Counterparty profile blocks should be **short and high-leverage**, e.g.:
  - Journalist: quote-seeking, follow-ups, “what did you know/when”, asks for numbers, pushes on contradictions.
  - Customer: empathy + impact + what they should do now, avoids combative framing.
  - Partner: commercial + integration + commitments, pushes on roadmap and dependencies.
  - Stakeholder: metrics + governance + risk management.
  - Public: values + reassurance + clarity, avoid jargon.
- Situation modifier blocks should define **constraints**:
  - Crisis: uncertainty rules (no speculation), “what we know / what we’re doing / next update”, empathy calibration.
  - Demo: clarity + product flow + value prop + handling objections, timeboxing.
  - Interview: balanced, story + vision, friendly but probing.
- Mode base blocks:
  - `coach`: must use nudge tool sparingly, one instruction, short nudges (align with `COACH_SYSTEM_PROMPT`).
  - `journalist`: asks questions, no coaching; uses scenario question list.

**Acceptance Criteria**
- Backend returns a token successfully for all combinations (including missing fields).
- Journalist mode behavior changes based on `counterparty` + `situation`.
- Coach mode nudges reflect `situation` constraints (e.g., crisis -> “don’t speculate”, “lead with empathy”).

---

### 6) Manual QA script (Phase 1)
Run these quick flows in the UI:
- Company context flow:
  - Enter a real company URL → brief loads → session starts with fewer “what do you do?” clarifiers.
  - Invalid URL → error shown → user can skip and continue.
- Journalist + Crisis + `crisis-layoffs`: AI starts with Q1 immediately; presses on accountability; avoids coaching language.
- Customer + Crisis + `crisis-security`: AI frames questions around customer impact and actions; less combative.
- Partner + Demo + `product-launch`: AI asks about integration/timelines/pricing in a partner-like way.
- Stakeholder + Interview + `general-profile`: AI asks strategy/metrics/governance style questions.
- Unknown field safety: temporarily send `counterparty="bogus"` and confirm backend falls back gracefully.

---

## Phase 1 Deliverables Checklist
- [ ] `/session` modal captures `company_url` (or skip) and shows load state
- [ ] Backend endpoint returns `company_brief_summary`
- [ ] Store-backed `counterparty` + `situation` in `src/stores/sessionStore.ts`
- [ ] Dropdowns updated to stable IDs in `src/app/session/page.tsx`
- [ ] `ScenarioSelector` recommends 2–3 cards based on selections
- [ ] Token request includes `company_brief_summary` + `counterparty` + `situation`
- [ ] Backend token endpoint accepts the fields
- [ ] New prompt blocks + builder compose instructions
- [ ] Manual QA passes for 4–5 key combos

---

# Phase 2 (Scale): Single Source of Truth + Better Content System

## Phase 2 Goals
- Remove scenario duplication and centralize scenario definitions.
- Upgrade scenarios from “static questions” to “question intents” + rendering per counterparty/situation.
- Add maintainable content authoring workflow (adding scenarios without touching multiple files).
- Add lightweight automated checks so prompt assembly doesn’t regress.
- Make Company Brief generation faster, safer, and more controllable (caching, provenance, optional persistence if needed later).

## Phase 2 Non-Goals
- No heavy UI redesign; we keep the current selection flow.
- No deep personalization beyond company + session inputs unless explicitly prioritized.

---

## Phase 2 Work Breakdown

### 1) Single source of truth for scenarios
**Problem**: scenarios exist in both TS and Python.

**Option A (recommended): JSON scenarios loaded by both FE and BE**
- Create `shared/scenarios.json` (or `src/lib/scenarios/scenarios.json` and copy to backend during build).
- Frontend:
  - Load JSON and map into `Scenario` type.
- Backend:
  - Load same JSON on startup to serve scenario contexts/questions.

**Option B: Backend owns scenarios; frontend fetches**
- Backend exposes `/api/scenarios` returning list + metadata.
- Frontend scenario selector uses API.

**Decision Criteria**
- If offline/static is preferred → Option A.
- If rapid iteration and admin tooling is coming → Option B.

**Acceptance Criteria**
- Scenario content defined in exactly one place.
- Frontend cards + backend prompts use the same data.

---

### 2) Convert “questions” into “question intents”
**Why**: Enables real per-combo variation without multiplying authored text.

**Example**
- Intent: `impact_customers`, `timeline`, `accountability`, `pricing`, `differentiation`, `future_commitment`
- Scenario provides:
  - `facts` (structured)
  - `intents` (ordered list)
  - `redLines`, `keyMessages`
- Prompt builder renders intents into natural language questions using:
  - counterparty profile (tone + tactics)
  - situation modifier (constraints)

**Acceptance Criteria**
- Same scenario feels different for Journalist vs Customer vs Partner without authoring 3 separate question lists.

---

### 3) Stronger typing and normalization (end-to-end)
**Tasks**
- Validate `counterparty` and `situation` against allowlists on backend.
- Normalize old values:
  - `"StakeHolder"` → `stakeholder`
  - `"Interview"` → `interview`, etc.
- Ensure all persisted session metadata uses stable IDs.

**Acceptance Criteria**
- No inconsistent casing/typos across FE/BE.

---

### 4) Lightweight automated checks
**Add small tests or scripts that:**
- Build prompt for a set of golden combos and snapshot key substrings:
  - Must include “Crisis constraints” block when `situation=crisis`
  - Must include “journalist role” block when `mode=journalist`
- Validate scenario schema (JSON schema or Pydantic model).
- Validate Company Brief schema + “unknowns present when data missing”.

**Acceptance Criteria**
- CI/local run catches prompt-builder regressions.

---

## Phase 2 Deliverables Checklist
- [ ] Scenarios moved to single source of truth
- [ ] Prompt builder uses intents + rendering per selection
- [ ] FE/BE use stable IDs everywhere (normalized)
- [ ] Automated checks for prompt assembly and scenario schema

---

## Recommended Execution Order

1) Phase 1: company context intake + brief generation  
2) Phase 1: store + request contract + backend prompt builder  
3) Phase 1: scenario recommendation in UI  
4) Phase 1: manual QA + tune blocks  
5) Phase 2: unify scenario source of truth  
6) Phase 2: intents + rendering + automated checks

---

## Open Questions (answer before Phase 2)

1) “Public” vs “Customer”: should “Public” behave like social scrutiny, or town-hall/community Q&A?
2) For `demo`, should the AI ask questions, or act like an evaluator interrupting with objections?
3) Should dropdowns affect coach mode nudges as strongly as interview mode behavior, or lightly?
4) Naming: do we rename `mode` to avoid confusion with `counterparty=journalist` (e.g., `experience=coach|roleplay`)?
5) Company Brief provenance: do we need citations/URLs stored and optionally shown in UI for trust?
6) If we later add persistence: Firestore vs signed “context token” vs client-carry forever?
