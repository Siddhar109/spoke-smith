'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useMediaCapture } from '@/lib/media/useMediaCapture'
import { useAudioRecorder } from '@/lib/media/useAudioRecorder'
import { useRealtimeCoach } from '@/hooks/useRealtimeCoach'
import { useSessionStore } from '@/stores/sessionStore'
import { ScenarioSelector } from '@/components/ScenarioSelector'
import { SessionControls } from '@/components/SessionControls'
import { VideoPreview } from '@/components/VideoPreview'
import { LiveMeters } from '@/components/LiveMeters'
import { LiveNudge } from '@/components/LiveNudge'
import { Button } from '@/components/ui/button'
import { Scenario } from '@/lib/scenarios/types'
import Link from 'next/link'
import { uploadSession } from '@/lib/api/sessionApi'
import type { WordTiming } from '@/lib/analysis/voiceMetrics'
import { formatDuration } from '@/lib/analysis/voiceMetrics'
import { Timeline, type TimelineMarker } from '@/components/Timeline'

export default function SessionPage() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioDeviceId, setAudioDeviceId] = useState<string | null>(null)
  const [videoDeviceId, setVideoDeviceId] = useState<string | null>(null)
  const [audioDurationSeconds, setAudioDurationSeconds] = useState<number>(0)
  const [audioCurrentSeconds, setAudioCurrentSeconds] = useState<number>(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const {
    stream,
    startCapture,
    stopCapture,
    getAudioTrack,
    audioDevices,
    videoDevices,
    refreshDevices,
  } = useMediaCapture({ audio: true, video: true, audioDeviceId, videoDeviceId })
  const { startRecording, stopRecording } = useAudioRecorder()
  const { connect, disconnect, isConnected, isConnecting, error } =
    useRealtimeCoach()
  const {
    status,
    setStatus,
    reset,
    mode,
    setMode,
    setScenario,
    initSession,
    markStartTime,
    transcript,
    setAudioBlob,
    audioBlob,
    sessionId,
    scenarioId,
    startTime,
    nudges,
    analysis,
    transcriptionStatus,
    transcriptionError,
    setTranscriptionStatus,
    clearTranscriptionError,
    setTranscriptionError,
    postSessionTranscript,
    setPostSessionTranscript,
  } = useSessionStore()

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const handleStart = useCallback(async () => {
    try {
      setAudioUrl(null)
      setAudioDurationSeconds(0)
      setAudioCurrentSeconds(0)

      // Initialize session with unique ID
      initSession()

      // Start media capture
      const mediaStream = await startCapture()
      const audioTrack = getAudioTrack()
      if (!audioTrack || !mediaStream) throw new Error('No audio track available')

      // Record audio-only for lightweight playback
      markStartTime()
      startRecording(new MediaStream([audioTrack]))

      // Connect to realtime coach
      await connect(audioTrack)
    } catch (err) {
      console.error('Failed to start session:', err)
      await stopRecording().catch(() => null)
      disconnect()
      stopCapture()
    }
  }, [
    connect,
    disconnect,
    getAudioTrack,
    initSession,
    markStartTime,
    setAudioUrl,
    startCapture,
    startRecording,
    stopRecording,
    stopCapture,
  ])

  const handleStop = useCallback(async () => {
    // Stop recording before stopping the underlying track.
    const blobPromise = stopRecording().catch(() => null)

    disconnect()
    stopCapture()

    const blob = await blobPromise

    if (blob) {
      setAudioBlob(blob)
      setAudioUrl(URL.createObjectURL(blob))
    }

    setStatus('completed')
  }, [
    disconnect,
    stopCapture,
    stopRecording,
    setAudioBlob,
    setStatus,
  ])

  const handleReset = useCallback(() => {
    setAudioUrl(null)
    setAudioDurationSeconds(0)
    setAudioCurrentSeconds(0)
    reset()
    setSelectedScenario(null)
  }, [reset, setAudioUrl, setSelectedScenario])

  const handleScenarioSelect = useCallback(
    (scenario: Scenario) => {
      setSelectedScenario(scenario)
      setScenario(scenario.id)
    },
    [setScenario]
  )

  const handleTranscribe = useCallback(async () => {
    if (!audioBlob || !sessionId) return

    clearTranscriptionError()
    setTranscriptionStatus('transcribing')
    setPostSessionTranscript(null)

    try {
      const response = await uploadSession(
        {
          sessionId,
          scenarioId: scenarioId ?? null,
          mode,
          transcript: transcript.map(({ id, ...rest }) => rest),
        },
        audioBlob
      )

      const words = (response.word_timings ?? []) as WordTiming[]
      const text = response.transcript_text ?? ''
      setPostSessionTranscript({ text, words })
      setTranscriptionStatus('complete')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to transcribe'
      setTranscriptionError(message)
    }
  }, [
    audioBlob,
    clearTranscriptionError,
    mode,
    scenarioId,
    sessionId,
    setTranscriptionError,
    setTranscriptionStatus,
    setPostSessionTranscript,
    transcript,
  ])

  const timestampedLines = useMemo(() => {
    if (!postSessionTranscript?.words?.length) return []
    const words = postSessionTranscript.words

    const lines: Array<{ start: number; end: number; text: string }> = []
    let current: { start: number; end: number; text: string; wordCount: number } | null = null

    const appendWord = (base: string, token: string) => {
      if (!token) return base
      if (!base) return token

      // Some providers include leading spaces in `token`. Preserve that as-is.
      if (/^\s/.test(token)) return base + token
      if (/\s$/.test(base)) return base + token

      // Don't add spaces before closing punctuation or contraction suffixes.
      if (/^[,.;:!?%)\]}»”’]/.test(token)) return base + token
      if (/^['’]/.test(token)) return base + token

      // Don't add spaces right after opening punctuation.
      if (/[({[\u201c\u2018]$/.test(base)) return base + token

      return `${base} ${token}`
    }

    const maxWords = 18
    const maxSeconds = 6

    for (const w of words) {
      if (!current) {
        current = { start: w.start, end: w.end, text: w.word, wordCount: 1 }
        continue
      }

      const nextEnd = w.end
      const duration = nextEnd - current.start

      if (current.wordCount >= maxWords || duration >= maxSeconds) {
        lines.push({
          start: current.start,
          end: current.end,
          text: current.text.trim(),
        })
        current = { start: w.start, end: w.end, text: w.word, wordCount: 1 }
        continue
      }

      current.text = appendWord(current.text, w.word)
      current.end = w.end
      current.wordCount += 1
    }

    if (current) {
      lines.push({
        start: current.start,
        end: current.end,
        text: current.text.trim(),
      })
    }

    return lines
  }, [postSessionTranscript])

  const plainTranscriptText = postSessionTranscript?.text?.trim() ?? ''

  const timelineMarkers = useMemo<TimelineMarker[]>(() => {
    const markers: TimelineMarker[] = []

    if (analysis?.timestamped_flags?.length) {
      analysis.timestamped_flags.forEach((f, idx) => {
        const severity = (f.severity || '').toLowerCase()
        const color =
          severity === 'high'
            ? 'red'
            : severity === 'medium'
              ? 'yellow'
              : severity === 'low'
                ? 'green'
                : 'slate'

        markers.push({
          id: `${f.start_time}-${f.issue_type}-${idx}`,
          startSeconds: f.start_time,
          endSeconds: f.end_time,
          color,
          label: `${f.issue_type} (${f.severity}): ${f.recommendation}`,
        })
      })

      return markers
    }

    if (!startTime) return []

    nudges.forEach((n) => {
      const offsetSeconds = (n.timestamp - startTime) / 1000
      const color =
        n.severity === 'urgent' ? 'red' : n.severity === 'firm' ? 'red' : 'yellow'
      markers.push({
        id: n.id,
        startSeconds: offsetSeconds,
        color,
        label: `${n.reason}: ${n.text}`,
      })
    })

    return markers
  }, [analysis?.timestamped_flags, nudges, startTime])

  const handleSeek = useCallback((seconds: number) => {
    const el = audioRef.current
    if (!el || !Number.isFinite(seconds)) return
    el.currentTime = Math.max(0, seconds)
  }, [])

  // Pre-session: Scenario selection
  if (status === 'idle' && !selectedScenario) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-2 block">
                ← Back to Home
              </Link>
              <h1 className="text-3xl font-bold">Choose Your Practice Scenario</h1>
              <p className="text-slate-400 mt-2">
                Select a scenario to practice, or choose free practice for open coaching
              </p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-4 mb-8 p-4 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-sm text-slate-400">Mode:</span>
            <div className="flex gap-2">
              <Button
                onClick={() => setMode('coach')}
                variant={mode === 'coach' ? 'default' : 'outline'}
                size="sm"
              >
                Coach Mode
              </Button>
              <Button
                onClick={() => setMode('journalist')}
                variant={mode === 'journalist' ? 'default' : 'outline'}
                size="sm"
              >
                Interview Mode
              </Button>
            </div>
            <span className="text-xs text-slate-500 ml-4">
              {mode === 'coach'
                ? 'AI provides coaching feedback as you speak'
                : 'AI plays a journalist asking questions'}
            </span>
          </div>

          {/* Scenario Selector */}
          <ScenarioSelector
            onSelect={handleScenarioSelect}
          />
        </div>
      </div>
    )
  }

  // Ready to start or in-session
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Live Nudge Overlay */}
      <LiveNudge />

      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleReset}
            className="text-blue-400 hover:text-blue-300 text-sm mb-2 block"
            disabled={isConnected || isConnecting}
          >
            ← Change Scenario
          </button>
          <h1 className="text-2xl font-bold">
            {selectedScenario?.name ?? 'Practice Session'}
          </h1>
          <p className="text-slate-400">{selectedScenario?.description}</p>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            <p className="font-medium">Connection Error</p>
            <p className="text-sm mt-1">{error.message}</p>
            <p className="text-xs text-red-300 mt-2">
              Make sure the backend server is running and your OpenAI API key is configured.
            </p>
          </div>
        )}

        {/* Live Meters (in-flow on mobile, floating on desktop) */}
        <div className="z-40 lg:fixed lg:top-4 lg:right-4 lg:pointer-events-none">
          <div className="lg:pointer-events-auto">
            <LiveMeters />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <VideoPreview stream={stream} className="aspect-video w-full" />

            {/* Mode indicator */}
            <div className="mt-4 flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  mode === 'coach'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-purple-500/20 text-purple-400'
                }`}
              >
                {mode === 'coach' ? 'Coach Mode' : 'Interview Mode'}
              </span>
              <span className="text-xs text-slate-500">
                {mode === 'coach'
                  ? 'Speak freely - the AI will coach you on delivery'
                  : 'The AI will ask interview questions'}
              </span>
            </div>

            {/* Post-session playback */}
            {status === 'completed' && audioUrl && (
              <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-800">
                <h3 className="font-semibold text-sm text-slate-300">
                  Session Recording
                </h3>
                <audio
                  ref={audioRef}
                  controls
                  src={audioUrl}
                  className="w-full mt-3"
                  onLoadedMetadata={() => {
                    const el = audioRef.current
                    if (!el || !Number.isFinite(el.duration)) return
                    setAudioDurationSeconds(el.duration)
                  }}
                  onTimeUpdate={() => {
                    const el = audioRef.current
                    if (!el) return
                    setAudioCurrentSeconds(el.currentTime || 0)
                  }}
                />

                {audioDurationSeconds > 0 && timelineMarkers.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400">
                        Timeline issues: <span className="text-slate-200">{timelineMarkers.length}</span>
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {formatDuration(Math.floor(audioCurrentSeconds))} / {formatDuration(Math.floor(audioDurationSeconds))}
                      </p>
                    </div>
                    <Timeline
                      durationSeconds={audioDurationSeconds}
                      currentSeconds={audioCurrentSeconds}
                      markers={timelineMarkers}
                      onSeek={handleSeek}
                    />
                    <p className="mt-2 text-[11px] text-slate-500">
                      Click a marker to jump; hover for details.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Transcript preview */}
            {status === 'completed' && transcript.length > 0 && (
              <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                <h3 className="font-semibold text-sm text-slate-300">
                  Transcript (Realtime)
                </h3>
                <div className="mt-3 max-h-64 overflow-auto space-y-2">
                  {transcript.slice(-20).map((seg) => (
                    <div key={seg.id} className="text-sm text-slate-400">
                      <span className="text-slate-500 mr-2">
                        {seg.speaker === 'user' ? 'You:' : 'AI:'}
                      </span>
                      <span>{seg.text}</span>
                    </div>
                  ))}
                </div>
                {transcript.length > 20 && (
                  <p className="mt-3 text-xs text-slate-500">
                    Showing last 20 lines.
                  </p>
                )}
              </div>
            )}

            {/* Post-session transcription */}
            {status === 'completed' && audioBlob && (
              <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-300">
                      Transcript (Timestamped)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Generates word-level timestamps from the recording.
                    </p>
                  </div>
                  <Button
                    onClick={handleTranscribe}
                    disabled={
                      transcriptionStatus === 'uploading' ||
                      transcriptionStatus === 'transcribing'
                    }
                    size="sm"
                  >
                    {transcriptionStatus === 'uploading' ||
                    transcriptionStatus === 'transcribing'
                      ? 'Transcribing…'
                      : 'Transcribe'}
                  </Button>
                </div>

                {transcriptionError && (
                  <p className="mt-3 text-xs text-red-300">
                    {transcriptionError}
                  </p>
                )}

                {timestampedLines.length > 0 && (
                  <div className="mt-4 max-h-64 overflow-auto space-y-2">
                    {timestampedLines.slice(0, 120).map((line, idx) => (
                      <div key={idx} className="text-sm text-slate-400">
                        <span className="text-slate-500 mr-2 tabular-nums">
                          {formatDuration(Math.floor(line.start))}
                        </span>
                        <span>{line.text}</span>
                      </div>
                    ))}
                    {timestampedLines.length > 120 && (
                      <p className="mt-3 text-xs text-slate-500">
                        Showing first 120 lines.
                      </p>
                    )}
                  </div>
                )}

                {timestampedLines.length === 0 && plainTranscriptText.length > 0 && (
                  <div className="mt-4 max-h-64 overflow-auto space-y-2">
                    <p className="text-xs text-slate-500">
                      No word timings returned — showing plain transcript.
                    </p>
                    <p className="text-sm text-slate-400 whitespace-pre-wrap">
                      {plainTranscriptText}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls & Info Panel */}
          <div className="space-y-6">
            {/* Session Controls */}
            <SessionControls
              isConnected={isConnected}
              isConnecting={isConnecting}
              onStart={handleStart}
              onStop={handleStop}
              onReset={
                status !== 'recording' && status !== 'connecting'
                  ? handleReset
                  : undefined
              }
              audioDevices={audioDevices}
              videoDevices={videoDevices}
              selectedAudioDeviceId={audioDeviceId}
              selectedVideoDeviceId={videoDeviceId}
              onSelectAudioDeviceId={setAudioDeviceId}
              onSelectVideoDeviceId={setVideoDeviceId}
              onRefreshDevices={refreshDevices}
            />

            {/* Key Messages (if scenario selected) */}
            {selectedScenario && selectedScenario.keyMessages.length > 0 && (
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                <h3 className="font-semibold mb-3 text-sm text-slate-300">
                  Key Messages
                </h3>
                <ul className="text-sm text-slate-400 space-y-2">
                  {selectedScenario.keyMessages.map((msg, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">•</span>
                      <span>{msg}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red Lines (if scenario has them) */}
            {selectedScenario && selectedScenario.redLines.length > 0 && (
              <div className="p-4 bg-slate-900 rounded-lg border border-red-900/50">
                <h3 className="font-semibold mb-3 text-sm text-red-400">
                  Avoid Saying
                </h3>
                <ul className="text-sm text-slate-400 space-y-2">
                  {selectedScenario.redLines.map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">✕</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
              <h3 className="font-semibold mb-3 text-sm text-slate-300">
                Tips
              </h3>
              <ul className="text-xs text-slate-500 space-y-1.5">
                <li>• Speak at 130-160 WPM for best clarity</li>
                <li>• Watch for filler words like &quot;um&quot; and &quot;like&quot;</li>
                <li>• Answer questions directly, then bridge to your message</li>
                <li>• Keep answers under 30 seconds when possible</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
