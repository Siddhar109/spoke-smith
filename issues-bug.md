# Issues / Bugs: Live Metric Bars

Source doc: `live_metric_bars.md`

## Major issues / likely bugs
- Unused var: `currentSegment` is computed but never used (`src/components/ui/MetricBar.tsx:52`). This can fail `no-unused-vars` lint; either remove it or use it (e.g., indicator glow/ring derived from segment).
- Filler rate math mismatch: `LiveMeters` computes `fillerRate` as `metrics.fillerCount / elapsed * 60` (`src/components/LiveMeters.tsx:31`), but the metrics engine already computes a windowed `fillerRate` (last `windowSeconds`) in `calculateMetrics` (`src/lib/analysis/voiceMetrics.ts:39`, `src/lib/analysis/voiceMetrics.ts:90`). The current approach will drift toward ~0 as the session grows and won’t reflect recent speech.
- Answer Time doesn’t tick continuously: `answerDuration` updates only when transcript deltas/finals arrive (`src/hooks/useRealtimeCoach.ts:88-144`), so it can freeze during pauses/silence. The spec expects Answer Time to “fill over time” (`live_metric_bars.md:102`), which requires a timer-driven update or store-driven “now - start” computation.

## Spec mismatches / things missed
- “Fill bar” vs “moving dot”: Spec calls for “Left-to-right fill bar” for Answer Time and Filler Rate (`live_metric_bars.md:13-14`), but current implementation renders static colored zones plus a moving indicator (`src/components/ui/MetricBar.tsx:77-104`).
- Tick marks / axis labels missing: Mock shows labels under bars (“0s 15s 30s…”, “too slow / ok / ideal…”) (`live_metric_bars.md:24-35`), but `MetricBar` does not support ticks/labels yet (despite mentioning “Optional threshold tick marks” in the plan) (`live_metric_bars.md:68`).
- Plan mismatch on state location: Plan says to add `answerStartTime` in the store (`live_metric_bars.md:58`, `live_metric_bars.md:90-95`), but implementation tracks this via `answerStartTimeRef` in the hook (`src/hooks/useRealtimeCoach.ts:41-74`). Either update the plan/doc or move timing state to the store for consistent ticking and UI updates.

## Behavior / UX nitpicks
- Right-side value+status diverges from the mock: `MetricBar` concatenates value + status text (`src/components/ui/MetricBar.tsx:71-74`). The mock shows e.g. “GOOD SPEED” (Talking Speed) and “1.2/min” (Filler Rate) without extra words (`live_metric_bars.md:24-34`). Decide the desired formatting per metric.
- Clamp mismatch: the indicator clamps to `min..max`, but formatted text uses the raw `value` (`src/components/ui/MetricBar.tsx:48-56`). If values can exceed range, the dot and text can disagree.
- Fixed overlay risk on small screens: `LiveMeters` is `fixed top-4 right-4` (`src/app/session/page.tsx:349`) and can cover other controls/content. Consider responsive placement/sizing and/or `pointer-events` behavior.

## Suggested follow-ups
- Use `calculateMetrics(...).fillerRate` instead of recomputing from session elapsed (`src/lib/analysis/voiceMetrics.ts:90`, `src/components/LiveMeters.tsx:31`).
- Make Answer Time update on a timer (e.g., `setInterval`) while “in answer”, or store `answerStartTime` and compute derived duration in the UI.
- Decide whether to implement “fill” rendering and tick labels (to match `live_metric_bars.md`) or update `live_metric_bars.md` to reflect the “segmented zones + dot” design.

