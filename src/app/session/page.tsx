'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useMediaCapture } from '@/lib/media/useMediaCapture'
import { useAudioRecorder } from '@/lib/media/useAudioRecorder'
import { useRealtimeCoach } from '@/hooks/useRealtimeCoach'
import { useFaceCoach } from '@/hooks/useFaceCoach'
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
  useFaceCoach(stream)
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
    facePhraseModelEnabled,
    faceKeyframesEnabled,
    strictPrivacyMode,
    setFacePhraseModelEnabled,
    setFaceKeyframesEnabled,
    setStrictPrivacyMode,
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

  // Dropdown state
  const [partnerRole, setPartnerRole] = useState<string>('Journalist')
  const [situation, setSituation] = useState<string>('Interview')

  // Pre-session: Scenario selection
  if (status === 'idle' && !selectedScenario) {
    return (
      <main className="min-h-screen overflow-hidden relative bg-[#FAFAFA]">
        {/* Background Dots */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)] opacity-100" />
        
        <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm mb-6 font-medium group">
                <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  ←
                </span>
                Back to Home
              </Link>
              <h1 className="text-4xl md:text-5xl font-light text-slate-900 tracking-tight leading-tight">
                Choose Your <br />
                <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900">
                  Practice Scenario
                </span>
              </h1>
              <p className="text-xl text-slate-500 mt-4 font-light max-w-2xl">
                Select a structured scenario to simulate real-world pressure, or choose free practice for open coaching.
              </p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-4 mb-12 p-2 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] w-fit backdrop-blur-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-4 mr-2">Mode</span>
            <div className="flex bg-slate-50 p-1 rounded-xl">
              <button
                onClick={() => setMode('coach')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  mode === 'coach'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Coach Mode
              </button>
              <button
                onClick={() => setMode('journalist')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  mode === 'journalist'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Interview Mode
              </button>
            </div>
            <span className="text-xs text-slate-400 font-light mx-4 hidden md:inline-block">
              {mode === 'coach'
                ? 'AI provides coaching feedback as you speak'
                : 'AI plays a journalist asking questions'}
            </span>
          </div>

          {/* Context Questions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Q1: Who is it with */}
            <div className="group relative px-8 py-6 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1 flex flex-col justify-center">
               <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                 <span className="text-xl font-light text-slate-800 tracking-tight">
                   Who is it with
                 </span>
                 <div className="relative inline-block">
                   <select
                     value={partnerRole}
                     onChange={(e) => setPartnerRole(e.target.value)}
                     className="appearance-none bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-blue-700 py-2 pl-4 pr-10 rounded-xl text-lg font-medium leading-tight focus:outline-none focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                   >
                     <option value="Journalist">Journalist</option>
                     <option value="Public">Public</option>
                     <option value="StakeHolder">StakeHolder</option>
                     <option value="Partner">Partner</option>
                     <option value="Customer">Customer</option>
                   </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-blue-500">
                     <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                       <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                     </svg>
                   </div>
                 </div>
                 <span className="text-xl font-light text-slate-800"></span>
               </div>
            </div>

            {/* Q2: What's the situation */}
             <div className="group relative px-8 py-6 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1 flex flex-col justify-center">
               <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                 <span className="text-xl font-light text-slate-800 tracking-tight">
                   What's the situation
                 </span>
                 <div className="relative inline-block">
                   <select
                     value={situation}
                     onChange={(e) => setSituation(e.target.value)}
                     className="appearance-none bg-purple-50/50 hover:bg-purple-50 border border-purple-100 text-purple-700 py-2 pl-4 pr-10 rounded-xl text-lg font-medium leading-tight focus:outline-none focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-500/10 transition-all cursor-pointer"
                   >
                     <option value="Interview">Interview</option>
                     <option value="Crisis">Crisis</option>
                     <option value="Demo">Demo</option>
                   </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-purple-500">
                     <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                       <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                     </svg>
                   </div>
                 </div>
                 <span className="text-xl font-light text-slate-800"></span>
               </div>
            </div>
          </div>
          {/* Scenario Selector */}
          <div className="bg-transparent">
            <ScenarioSelector
              onSelect={handleScenarioSelect}
            />
          </div>
        </div>
      </main>
    )
  }

  // Ready to start or in-session
  return (
    <main className="min-h-screen overflow-hidden relative bg-[#FAFAFA]">
      {/* Background Dots */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)] opacity-100" />

      {/* Live Nudge Overlay */}
      <LiveNudge />

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <button
              onClick={handleReset}
              className="group inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm mb-4 font-medium"
              disabled={isConnected || isConnecting}
            >
              <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                ←
              </span>
              Change Scenario
            </button>
            <h1 className="text-3xl font-light text-slate-900 tracking-tight">
              {selectedScenario?.name ?? 'Practice Session'}
            </h1>
            <p className="text-slate-500 mt-2 font-light text-lg">{selectedScenario?.description}</p>
          </div>
          
          {/* Status Badge */}
          <div className={`px-4 py-2 rounded-full border backdrop-blur-sm shadow-sm flex items-center gap-2 ${
            status === 'recording' || isConnected
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
              : 'bg-white border-slate-200 text-slate-600'
          }`}>
             <div className={`w-2 h-2 rounded-full ${status === 'recording' || isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
             <span className="text-xs font-bold uppercase tracking-widest">
               {status === 'recording' || isConnected ? 'Session Active' : 'Ready'}
             </span>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 shadow-sm animate-fade-in">
            <p className="font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Connection Error
            </p>
            <p className="text-sm mt-1 pl-3.5 slate-500">{error.message}</p>
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
          <div className="lg:col-span-2 space-y-6">
            <div className="relative group rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-200/50 bg-white">
               <VideoPreview stream={stream} className="aspect-video w-full" />
            </div>

            {/* Mode indicator */}
            <div className="flex items-center justify-between px-1">
               <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1.5 text-xs font-bold tracking-widest uppercase rounded-lg border ${
                      mode === 'coach'
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : 'bg-purple-50 text-purple-600 border-purple-100'
                    }`}
                  >
                    {mode === 'coach' ? 'Coach Mode' : 'Interview Mode'}
                  </span>
                  <span className="text-sm text-slate-500 font-light">
                    {mode === 'coach'
                      ? 'AI provides coaching feedback as you speak'
                      : 'AI will ask you interview questions'}
                  </span>
               </div>
            </div>

            {/* Post-session playback */}
            {status === 'completed' && audioUrl && (
              <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] animate-fade-in">
                <h3 className="font-light text-xl text-slate-800 mb-4 flex items-center gap-2">
                  Session Recording
                </h3>
                <audio
                  ref={audioRef}
                  controls
                  src={audioUrl}
                  className="w-full mt-2"
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
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-slate-500">
                        Analysis Events: <span className="text-slate-900 font-medium">{timelineMarkers.length}</span>
                      </p>
                      <p className="text-sm text-slate-500 tabular-nums">
                        {formatDuration(Math.floor(audioCurrentSeconds))} / {formatDuration(Math.floor(audioDurationSeconds))}
                      </p>
                    </div>
                    <Timeline
                      durationSeconds={audioDurationSeconds}
                      currentSeconds={audioCurrentSeconds}
                      markers={timelineMarkers}
                      onSeek={handleSeek}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Transcript preview */}
            {status === 'completed' && transcript.length > 0 && (
              <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] animate-fade-in">
                <h3 className="font-light text-xl text-slate-800 mb-4">
                  Transcript (Realtime)
                </h3>
                <div className="mt-4 max-h-64 overflow-auto space-y-3 pr-2">
                  {transcript.slice(-20).map((seg) => (
                    <div key={seg.id} className="text-sm text-slate-600 leading-relaxed">
                      <span className={`inline-block w-8 font-bold mr-2 ${seg.speaker === 'user' ? 'text-blue-500' : 'text-purple-500'}`}>
                        {seg.speaker === 'user' ? 'YOU' : 'AI'}
                      </span>
                      <span className="text-slate-600 font-light">{seg.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Post-session transcription */}
            {status === 'completed' && audioBlob && (
              <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] animate-fade-in">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-light text-xl text-slate-800">
                      Full Analysis
                    </h3>
                    <p className="text-sm text-slate-400 font-light mt-1">
                      Generate word-level timestamps and deeper insights
                    </p>
                  </div>
                  <Button
                    onClick={handleTranscribe}
                    disabled={
                      transcriptionStatus === 'uploading' ||
                      transcriptionStatus === 'transcribing'
                    }
                    className="bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200/50 hover:bg-slate-800 hover:shadow-xl transition-all"
                  >
                    {transcriptionStatus === 'uploading' ||
                    transcriptionStatus === 'transcribing'
                      ? 'Processing...'
                      : 'Start Analysis'}
                  </Button>
                </div>

                {transcriptionError && (
                  <p className="mt-3 text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
                    {transcriptionError}
                  </p>
                )}

                {timestampedLines.length > 0 && (
                  <div className="mt-4 max-h-80 overflow-auto space-y-1">
                    {timestampedLines.slice(0, 120).map((line, idx) => (
                      <div key={idx} className="text-sm group hover:bg-slate-50 p-2 rounded-lg transition-colors flex gap-4">
                        <span className="text-slate-400 font-mono text-xs pt-1 tabular-nums">
                          {formatDuration(Math.floor(line.start))}
                        </span>
                        <span className="text-slate-600 font-light leading-relaxed">{line.text}</span>
                      </div>
                    ))}
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
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] sticky top-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
                  Session Control
                </h3>
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
                facePhraseModelEnabled={facePhraseModelEnabled}
                faceKeyframesEnabled={faceKeyframesEnabled}
                strictPrivacyMode={strictPrivacyMode}
                onToggleFacePhraseModel={setFacePhraseModelEnabled}
                onToggleFaceKeyframes={setFaceKeyframesEnabled}
                onToggleStrictPrivacy={setStrictPrivacyMode}
                audioDevices={audioDevices}
                videoDevices={videoDevices}
                selectedAudioDeviceId={audioDeviceId}
                selectedVideoDeviceId={videoDeviceId}
                onSelectAudioDeviceId={setAudioDeviceId}
                onSelectVideoDeviceId={setVideoDeviceId}
                onRefreshDevices={refreshDevices}
                />
            </div>

            {/* Key Messages */}
            {selectedScenario && selectedScenario.keyMessages.length > 0 && (
              <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100/50 shadow-sm animate-fade-in">
                <h3 className="font-bold mb-4 text-xs uppercase tracking-widest text-emerald-700">
                  Key Talking Points
                </h3>
                <ul className="text-sm text-slate-700 space-y-3">
                  {selectedScenario.keyMessages.map((msg, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span className="leading-relaxed font-light">{msg}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red Lines */}
            {selectedScenario && selectedScenario.redLines.length > 0 && (
              <div className="p-6 bg-red-50/50 rounded-[2rem] border border-red-100/50 shadow-sm animate-fade-in">
                <h3 className="font-bold mb-4 text-xs uppercase tracking-widest text-red-700">
                  Topics to Avoid
                </h3>
                <ul className="text-sm text-slate-700 space-y-3">
                  {selectedScenario.redLines.map((line, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                      <span className="leading-relaxed font-light">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

             {/* Tips */}
             <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 shadow-sm">
              <h3 className="font-bold mb-4 text-xs uppercase tracking-widest text-blue-700">
                Pro Tips
              </h3>
              <ul className="text-sm text-slate-600 space-y-2 font-light">
                <li className="flex gap-2"><span className="text-blue-400">•</span> Speak at 130-160 WPM</li>
                <li className="flex gap-2"><span className="text-blue-400">•</span> Minimize filler words</li>
                <li className="flex gap-2"><span className="text-blue-400">•</span> Brief, direct answers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
