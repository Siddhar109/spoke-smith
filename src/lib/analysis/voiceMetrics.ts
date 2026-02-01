/**
 * Voice Metrics Analysis
 *
 * Utilities for calculating speech metrics like WPM and filler word detection.
 */

const FILLER_WORDS = [
  'um',
  'uh',
  'like',
  'you know',
  'basically',
  'actually',
  'literally',
  'so',
  'well',
  'kind of',
  'sort of',
  'i mean',
  'right',
]

export interface WordTiming {
  word: string
  start: number
  end: number
}

export interface VoiceMetricsResult {
  wpm: number
  fillerCount: number
  fillerRate: number // fillers per minute
  averageWordLength: number
}

/**
 * Calculate voice metrics from word timings
 */
export function calculateMetrics(
  words: WordTiming[],
  windowSeconds: number = 30,
  nowSeconds: number = Date.now() / 1000
): VoiceMetricsResult {
  if (words.length === 0) {
    return { wpm: 0, fillerCount: 0, fillerRate: 0, averageWordLength: 0 }
  }

  const recentWords = words.filter((w) => nowSeconds - w.end < windowSeconds)

  if (recentWords.length < 2) {
    return { wpm: 0, fillerCount: 0, fillerRate: 0, averageWordLength: 0 }
  }

  // Use speaking-time rather than wall-clock time between first/last word,
  // to avoid long pauses (or transcription lag) incorrectly dragging WPM down.
  const speakingDurationSeconds = recentWords.reduce((sum, word) => {
    const raw = word.end - word.start
    if (!Number.isFinite(raw)) return sum
    // Clamp to reduce the impact of pauses being encoded as long word durations.
    const clamped = Math.min(1.0, Math.max(0.05, raw))
    return sum + clamped
  }, 0)

  if (speakingDurationSeconds <= 0.25) {
    return { wpm: 0, fillerCount: 0, fillerRate: 0, averageWordLength: 0 }
  }

  const wordCount = recentWords.length
  const wpm = Math.round((wordCount / speakingDurationSeconds) * 60)

  const normalizedWords = recentWords
    .map((w) =>
      w.word
        .toLowerCase()
        .replace(/[^\p{L}\p{N}'-]+/gu, '')
        .trim()
    )
    .filter(Boolean)

  const fillerTokens = FILLER_WORDS.map((f) => f.split(/\s+/).filter(Boolean))
  let fillerCount = 0

  for (let i = 0; i < normalizedWords.length; i++) {
    for (const tokens of fillerTokens) {
      if (tokens.length === 0) continue
      if (i + tokens.length > normalizedWords.length) continue
      let matches = true
      for (let j = 0; j < tokens.length; j++) {
        if (normalizedWords[i + j] !== tokens[j]) {
          matches = false
          break
        }
      }
      if (matches) fillerCount += 1
    }
  }

  const fillerRate =
    Math.round(((fillerCount / speakingDurationSeconds) * 60) * 10) / 10

  const avgLength =
    recentWords.reduce((sum, w) => sum + w.word.length, 0) / wordCount

  return {
    wpm,
    fillerCount,
    fillerRate,
    averageWordLength: Math.round(avgLength * 10) / 10,
  }
}

/**
 * Get WPM status classification
 */
export function getWpmStatus(wpm: number): 'slow' | 'good' | 'fast' {
  if (wpm === 0) return 'good'
  if (wpm < 100) return 'slow'
  if (wpm > 180) return 'fast'
  return 'good'
}

/**
 * Get filler word status classification
 */
export function getFillerStatus(
  fillerRate: number
): 'low' | 'moderate' | 'high' {
  if (fillerRate < 3) return 'low'
  if (fillerRate > 8) return 'high'
  return 'moderate'
}

/**
 * WPM thresholds and labels
 */
export const WPM_THRESHOLDS = {
  tooSlow: 100,
  ideal: { min: 130, max: 160 },
  tooFast: 180,
} as const

/**
 * Format duration as MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
