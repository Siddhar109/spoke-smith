/**
 * Prosody (expressiveness) analysis
 *
 * Provides a lightweight, local-only estimate of "monotone-ness" by tracking
 * short-window pitch (F0) variation from the microphone audio stream.
 *
 * The output is a standard deviation in semitones over a recent window:
 * - Lower values ~= more monotone
 * - Higher values ~= more pitch variation / expressiveness
 */

export interface ProsodyVarianceTrackerOptions {
  intervalMs?: number
  windowMs?: number
  minHz?: number
  maxHz?: number
  minRms?: number
  smoothingAlpha?: number
  minSamples?: number
  emitEpsilon?: number
}

export interface ProsodyVarianceTracker {
  start: (audioTrack: MediaStreamTrack) => Promise<void>
  stop: () => Promise<void>
  setActive: (active: boolean) => void
}

type PitchSample = { tMs: number; hz: number }

const DEFAULTS: Required<ProsodyVarianceTrackerOptions> = {
  intervalMs: 120,
  windowMs: 5000,
  minHz: 75,
  maxHz: 320,
  minRms: 0.01,
  smoothingAlpha: 0.25,
  minSamples: 10,
  emitEpsilon: 0.05,
}

export function createProsodyVarianceTracker(
  onUpdate: (varianceSemitones: number) => void,
  options: ProsodyVarianceTrackerOptions = {}
): ProsodyVarianceTracker {
  const opts = { ...DEFAULTS, ...options }

  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let sink: GainNode | null = null
  let intervalId: number | null = null

  let active = false
  let smoothed = 0
  let lastEmitted = Number.NaN

  const history: PitchSample[] = []
  let buffer: Float32Array<ArrayBuffer> | null = null

  const emit = (value: number) => {
    const clamped = Number.isFinite(value) ? Math.max(0, Math.min(8, value)) : 0
    if (!Number.isFinite(lastEmitted) || Math.abs(clamped - lastEmitted) >= opts.emitEpsilon) {
      lastEmitted = clamped
      onUpdate(clamped)
    }
  }

  const tick = () => {
    if (!audioContext || !analyser || !buffer) return
    if (audioContext.state === 'suspended') {
      // Best-effort; resume might still be blocked without user gesture.
      void audioContext.resume().catch(() => {})
    }

    analyser.getFloatTimeDomainData(buffer)

    if (!active) {
      // When the user isn't speaking, gently decay toward 0 so we don't leave stale "expressiveness" up.
      smoothed *= 0.92
      emit(smoothed)
      return
    }

    const hz = estimatePitchHz(buffer, audioContext.sampleRate, opts)
    const now = Date.now()

    // Prune history first
    const cutoff = now - opts.windowMs
    while (history.length && history[0].tMs < cutoff) history.shift()

    if (hz !== null) {
      // Simple outlier guard: ignore abrupt jumps that are likely noise.
      const last = history.length ? history[history.length - 1].hz : null
      if (last === null || semitoneDistance(last, hz) <= 10) {
        history.push({ tMs: now, hz })
      }
    }

    const variance = computeSemitoneStdDev(history, opts.minSamples)
    smoothed = smoothed + opts.smoothingAlpha * (variance - smoothed)
    emit(smoothed)
  }

  const start = async (audioTrack: MediaStreamTrack) => {
    await stop()

    audioContext = new AudioContext({ latencyHint: 'interactive' })
    const stream = new MediaStream([audioTrack])
    source = audioContext.createMediaStreamSource(stream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0

    // Some DOM lib typings require `Float32Array<ArrayBuffer>` specifically.
    buffer = new Float32Array(new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT))

    // Keep the graph "live" without audible output.
    sink = audioContext.createGain()
    sink.gain.value = 0

    source.connect(analyser)
    analyser.connect(sink)
    sink.connect(audioContext.destination)

    await audioContext.resume().catch(() => {})

    intervalId = window.setInterval(tick, opts.intervalMs)
  }

  const stop = async () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId)
      intervalId = null
    }

    history.length = 0
    buffer = null
    smoothed = 0
    lastEmitted = Number.NaN

    try {
      sink?.disconnect()
    } catch {}
    try {
      analyser?.disconnect()
    } catch {}
    try {
      source?.disconnect()
    } catch {}

    sink = null
    analyser = null
    source = null

    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close().catch(() => {})
    }
    audioContext = null
  }

  const setActive = (next: boolean) => {
    active = next
  }

  return { start, stop, setActive }
}

function estimatePitchHz(
  input: Float32Array,
  sampleRate: number,
  opts: Required<ProsodyVarianceTrackerOptions>
): number | null {
  // Remove DC offset and compute RMS.
  let mean = 0
  for (let i = 0; i < input.length; i++) mean += input[i]
  mean /= input.length

  let rms = 0
  for (let i = 0; i < input.length; i++) {
    const v = input[i] - mean
    rms += v * v
  }
  rms = Math.sqrt(rms / input.length)
  if (rms < opts.minRms) return null

  // Autocorrelation across plausible voice pitch range.
  const minLag = Math.floor(sampleRate / opts.maxHz)
  const maxLag = Math.floor(sampleRate / opts.minHz)
  if (maxLag <= minLag) return null

  let bestLag = -1
  let bestCorr = 0

  // Normalize by energy to reduce dependency on loudness.
  let energy = 0
  for (let i = 0; i < input.length; i++) {
    const v = input[i] - mean
    energy += v * v
  }
  if (energy <= 0) return null

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0
    for (let i = 0; i < input.length - lag; i++) {
      sum += (input[i] - mean) * (input[i + lag] - mean)
    }
    const corr = sum / energy
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }

  // Quality gate: ignore weak peaks.
  if (bestLag === -1 || bestCorr < 0.18) return null

  // Parabolic interpolation for sub-sample precision.
  const refinedLag = refinePeakLag(input, mean, energy, bestLag, minLag, maxLag)
  if (!Number.isFinite(refinedLag) || refinedLag <= 0) return null

  const hz = sampleRate / refinedLag
  if (!Number.isFinite(hz) || hz < opts.minHz || hz > opts.maxHz) return null
  return hz
}

function refinePeakLag(
  input: Float32Array,
  mean: number,
  energy: number,
  bestLag: number,
  minLag: number,
  maxLag: number
): number {
  if (bestLag <= minLag || bestLag >= maxLag) return bestLag

  const c0 = normalizedCorrelationAtLag(input, mean, energy, bestLag - 1)
  const c1 = normalizedCorrelationAtLag(input, mean, energy, bestLag)
  const c2 = normalizedCorrelationAtLag(input, mean, energy, bestLag + 1)

  const denom = 2 * c1 - c0 - c2
  if (denom === 0) return bestLag

  const shift = (c2 - c0) / (2 * denom)
  // Clamp shift to a reasonable range.
  return bestLag + Math.max(-0.5, Math.min(0.5, shift))
}

function normalizedCorrelationAtLag(
  input: Float32Array,
  mean: number,
  energy: number,
  lag: number
): number {
  let sum = 0
  for (let i = 0; i < input.length - lag; i++) {
    sum += (input[i] - mean) * (input[i + lag] - mean)
  }
  return sum / energy
}

function computeSemitoneStdDev(history: PitchSample[], minSamples: number): number {
  if (history.length < minSamples) return 0

  // Convert to semitone scale (relative reference cancels out for variance).
  const values = history.map((s) => 12 * Math.log2(s.hz))

  let mean = 0
  for (const v of values) mean += v
  mean /= values.length

  let variance = 0
  for (const v of values) {
    const d = v - mean
    variance += d * d
  }
  variance /= values.length
  return Math.sqrt(Math.max(0, variance))
}

function semitoneDistance(hzA: number, hzB: number): number {
  if (hzA <= 0 || hzB <= 0) return Infinity
  return Math.abs(12 * Math.log2(hzA / hzB))
}
