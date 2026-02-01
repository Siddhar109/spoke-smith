# Plan: Live Horizontal Metric Bars for Session Page

## Overview
Add Spiky-style horizontal segmented progress bars for real-time coaching feedback during sessions. Bars will be shown in **both Coach and Interview modes** using a **vertical stack layout**.

## Metrics to Implement (Phase 1)

Using existing data from the voice metrics engine (plus local audio analysis for prosody):

| Metric | Source | Thresholds | Display |
|--------|--------|------------|---------|
| **Talking Speed** | WPM | <100 (slow), 100-130 (ok), 130-160 (ideal), 160-180 (fast), >180 (too fast) | Bi-directional bar (green center) |
| **Expressiveness (Prosody variance)** | Pitch (F0) variation, last ~5s | <1.2 st (monotone), 1.2-2.0 st (ok), 2.0-4.0 st (expressive), >5.5 st (wild/noisy) | Indicator bar (green center) |
| **Filler Rate** | Fillers/min | 0-3 (good), 3-6 (warning), >6 (high) | Left-to-right fill bar |

*Tone/Energy analysis deferred to future phase.*

## Visual Design

```
┌──────────────────────────────────────────────────────────────┐
│                                                    00:15:56  │
│                                                              │
│  TALKING SPEED                                    GOOD SPEED │
│  ▓▓▓▓░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓●▓▓▓▓▓░░░░░░░░░░░▓▓▓▓▓▓    │
│  too slow      ok      ideal       fast     too fast         │
│                                                              │
│  EXPRESSIVENESS                                   EXPRESSIVE │
│  ▓▓▓▓░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓●▓▓▓▓▓░░░░░░░░░░░▓▓▓▓▓▓    │
│  mono          ok      expressive        wild/noisy           │
│                                                              │
│  FILLER RATE                                         1.2/min │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓●░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │
│  0/min                   3/min              6/min    10/min  │
│                                                              │
│  ● REC                                                       │
└──────────────────────────────────────────────────────────────┘
```

### Design Specs
- **Background**: `bg-slate-900/80` with `backdrop-blur-sm` (matches current dark theme)
- **Bar segments**: Colored zones using Tailwind gradient classes
  - Green: `bg-green-500/60` (good zone)
  - Yellow: `bg-yellow-500/60` (warning zone)
  - Red: `bg-red-500/60` (danger zone)
- **Indicator**: White circle (`bg-white`) with subtle shadow
- **Labels**: Uppercase, tracking-wide, `text-xs text-slate-400`
- **Status text**: Right-aligned, color matches current zone
- **Transitions**: `transition-all duration-300 ease-out` for smooth indicator movement
- **Border radius**: `rounded-full` for bars

## Files to Modify

| File | Changes |
|------|---------|
| [src/components/LiveMeters.tsx](src/components/LiveMeters.tsx) | Replace numeric display with stacked MetricBar components |
| **src/components/ui/MetricBar.tsx** (new) | Reusable segmented bar with indicator |
| [src/stores/sessionStore.ts](src/stores/sessionStore.ts) | Add `prosodyVariance` to `VoiceMetrics` |
| [src/app/session/page.tsx](src/app/session/page.tsx) | Adjust layout for vertical metrics panel |

## Implementation Steps

### Step 1: Create MetricBar Component
Create `src/components/ui/MetricBar.tsx` with:
- Configurable colored segments (zones)
- Animated indicator position based on value
- Status label with dynamic color
- Optional threshold tick marks

```typescript
interface MetricBarProps {
  label: string
  value: number
  min: number
  max: number
  segments: { start: number; end: number; color: 'green' | 'yellow' | 'red' }[]
  statusText?: string
  statusColor?: string
}
```

### Step 2: Update LiveMeters Component
Replace current numeric display with vertical stack of 3 MetricBars:
1. **Talking Speed (WPM)** - bidirectional, green in center (130-160), yellow edges, red extremes
2. **Expressiveness (Prosody variance)** - indicator bar based on pitch variation (monotone → expressive)
3. **Filler Rate** - fills left to right

Keep REC indicator and total session duration.

### Step 3: Add Expressiveness Tracking (Local)
Compute a short-window pitch-variance score (in semitones) from the microphone stream and surface it as `metrics.prosodyVariance`.

### Step 4: Adjust Session Page Layout
Position the vertical metrics panel in top-right corner as a floating overlay, or integrate into the existing header area.

## Verification
- [ ] Start a session and confirm all 3 bars appear
- [ ] Speak and verify WPM indicator moves smoothly (green zone at ~140 WPM)
- [ ] Vary pitch/emphasis and verify expressiveness moves (monotone → expressive)
- [ ] Say filler words ("um", "like") and confirm filler rate bar updates
- [ ] Check bars appear in both Coach and Interview modes
- [ ] Test responsive behavior on smaller screens
- [ ] Confirm REC indicator and total duration still display
