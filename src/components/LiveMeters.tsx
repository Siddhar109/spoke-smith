'use client'

import { useEffect, useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { TalkingSpeedBar, AnswerTimeBar, ToneOfVoiceBar } from '@/components/ui/MetricBar'
import { CallMomentum } from '@/components/ui/CallMomentum'
import { formatDuration } from '@/lib/analysis/voiceMetrics'

export function LiveMeters() {
  const { metrics, startTime, status, answerStartTime } = useSessionStore()
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
  // 1. Base momentum 75%
  // 2. Adjust based on WPM (sweet spot 130-160)
  // 3. Adjust penalty for fillers
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
    <div className="w-full sm:w-80 space-y-4">
       {/* 
          Container for the metrics. 
          The screenshot shows a glass card effect for the WHOLE panel or individual cards.
          The previous implementation had one big card.
          The screenshot implies:
          1. Top card: Call Host info (Keep separate or ignore for now)
          2. Group of metric bars
          3. Call momentum card
          
          I will render:
          - A group of Metric Bars in one "Clean" panel or just stacked.
          - Call Momentum below it.
       */}
       
      {/* Metrics Bars Group */}
      <div className="p-5 bg-slate-900/60 rounded-xl backdrop-blur-md border border-white/5 shadow-2xl space-y-6">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <span
               className="inline-block h-2 w-2 rounded-full bg-red-500"
               aria-hidden="true"
             />
             <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
               REC
             </span>
           </div>
           <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold tabular-nums">
             {formatDuration(elapsed)}
           </span>
         </div>
         <TalkingSpeedBar wpm={metrics.wpm} />
         <AnswerTimeBar seconds={answerDurationSeconds} />
         <ToneOfVoiceBar fillerRate={metrics.fillerRate} />
      </div>

      {/* Call Momentum */}
      <CallMomentum momentum={momentum} />
      
      {/* Active Playbook / Context (Optional placeholder from screenshot) */}
      <div className="p-4 bg-slate-800/40 rounded-xl border border-white/5 backdrop-blur-sm">
        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">
            Active Playbook
        </div>
        <div className="flex items-center justify-between text-sm text-slate-300 font-medium">
            <span>Discovery / MEDDPICC</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
