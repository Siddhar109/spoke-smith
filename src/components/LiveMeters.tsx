'use client'

import { useEffect, useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { formatDuration } from '@/lib/analysis/voiceMetrics'
import { TalkingSpeedBar, AnswerTimeBar, FillerRateBar } from '@/components/ui/MetricBar'

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
    status === 'recording' && answerStartTime
      ? Math.floor((Date.now() - answerStartTime) / 1000)
      : 0

  return (
    <div className="w-full sm:w-72 mb-6 lg:mb-0 p-4 bg-slate-900/80 rounded-lg backdrop-blur border border-slate-800 space-y-4">
      {/* Total session duration */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">REC</span>
        </div>
        <span className="text-xl font-mono text-white">
          {formatDuration(elapsed)}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-700" />

      {/* Metric bars */}
      <div className="space-y-4">
        <TalkingSpeedBar wpm={metrics.wpm} />
        <AnswerTimeBar seconds={answerDurationSeconds} />
        <FillerRateBar fillersPerMinute={metrics.fillerRate} />
      </div>
    </div>
  )
}
