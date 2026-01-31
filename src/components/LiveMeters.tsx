'use client'

import { useEffect, useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import {
  TalkingSpeedBar,
  AnswerTimeBar,
  ToneOfVoiceBar,
  FacePresenceBar,
  FramingBar,
  LightingBar,
} from '@/components/ui/MetricBar'
import { CallMomentum } from '@/components/ui/CallMomentum'
import { formatDuration } from '@/lib/analysis/voiceMetrics'

export function LiveMeters() {
  const { metrics, startTime, status, answerStartTime, faceMetrics } = useSessionStore()
  const [elapsed, setElapsed] = useState(0)

  // Update elapsed time every second
  useEffect(() => {
    if (status !== 'recording' || !startTime) {
      setElapsed(0)
      return
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [status, startTime])

  if (status !== 'recording' && status !== 'connecting') {
    return null
  }

  const answerDurationSeconds =
    status === 'recording' && answerStartTime !== null
      ? Math.max(0, Math.floor((Date.now() - answerStartTime) / 1000))
      : 0

  // Synthetic Momentum Calculation
  let momentum = 75
  if (metrics.wpm >= 130 && metrics.wpm <= 160) {
    momentum += 15
  } else if (metrics.wpm < 100 || metrics.wpm > 200) {
    momentum -= 15
  }
  if (metrics.fillerRate > 5) {
    momentum -= 20
  }
  momentum = Math.max(0, Math.min(100, momentum))


  return (
    <div className="w-full sm:w-80 space-y-4 font-sans text-slate-200">
       
      {/* Metrics Bars Group */}
      <div className="relative p-6 bg-slate-900/60 rounded-xl backdrop-blur-md border border-white/10 shadow-2xl space-y-5 overflow-hidden group">
         {/* Holo Grid Background */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-40" />
         
         {/* Top Accent Line */}
         <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

         {/* Header */}
         <div className="flex items-center justify-between relative z-10 mb-2">
           <div className="flex items-center gap-2">
             <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
             </span>
             <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold drop-shadow-sm">
               Live Analysis
             </span>
           </div>
           <div className="px-2 py-0.5 rounded bg-slate-800/50 border border-white/5 backdrop-blur-sm">
             <span className="text-[10px] text-slate-200 font-mono tracking-wider">
              {formatDuration(elapsed)}
             </span>
           </div>
         </div>

         {/* Individual Metric Bars */}
         <div className="space-y-4 relative z-10">
            <TalkingSpeedBar wpm={metrics.wpm} />
            <AnswerTimeBar seconds={answerDurationSeconds} />
            <ToneOfVoiceBar fillerRate={metrics.fillerRate} />
         </div>
      </div>

      {/* Call Momentum */}
      <CallMomentum momentum={momentum} />

      {/* Face Metrics */}
      <div className="relative p-5 bg-slate-900/55 rounded-xl backdrop-blur-md border border-white/10 shadow-2xl space-y-4 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:22px_22px] pointer-events-none opacity-40" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">
            Face Signals
          </span>
          {!faceMetrics.supported && (
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Unsupported
            </span>
          )}
        </div>

        <div className="relative z-10 space-y-4">
          {faceMetrics.supported ? (
            <>
              <FacePresenceBar value={faceMetrics.facePresent} />
              <FramingBar value={faceMetrics.framing} />
              <LightingBar value={faceMetrics.lighting} />
            </>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              Face tracking is not available in this browser.
            </p>
          )}
        </div>
      </div>
      
      {/* Active Playbook / Context */}
      <div className="p-4 bg-slate-900/40 rounded-xl border border-white/5 backdrop-blur-sm shadow-lg flex items-center justify-between">
        <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">
                Active Playbook
            </span>
            <span className="text-sm text-slate-200 font-medium tracking-wide text-shadow-sm">
                Discovery / MEDDPICC
            </span>
        </div>
        <div className="h-6 w-6 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.1)]">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)] animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
