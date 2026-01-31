'use client'

import { useCallback, useMemo, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'

export type TimelineMarkerColor = 'red' | 'yellow' | 'green' | 'blue' | 'slate'

export interface TimelineMarker {
  id: string
  startSeconds: number
  endSeconds?: number
  color?: TimelineMarkerColor
  label: string
}

interface TimelineProps {
  durationSeconds: number
  currentSeconds?: number
  markers?: TimelineMarker[]
  onSeek?: (seconds: number) => void
  className?: string
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

function colorClass(color: TimelineMarkerColor) {
  switch (color) {
    case 'red':
      return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
    case 'yellow':
      return 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
    case 'green':
      return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
    case 'blue':
      return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
    case 'slate':
    default:
      return 'bg-slate-400 shadow-[0_0_5px_rgba(148,163,184,0.4)]'
  }
}

export function Timeline({
  durationSeconds,
  currentSeconds = 0,
  markers = [],
  onSeek,
  className,
}: TimelineProps) {
  const safeDuration = Math.max(0, durationSeconds || 0)

  const normalized = useMemo(() => {
    if (!safeDuration) return []
    return markers
      .map((m) => {
        const start = clamp(m.startSeconds, 0, safeDuration)
        const end =
          typeof m.endSeconds === 'number'
            ? clamp(m.endSeconds, 0, safeDuration)
            : undefined
        return { ...m, startSeconds: start, endSeconds: end }
      })
      .filter((m) => Number.isFinite(m.startSeconds))
  }, [markers, safeDuration])

  const handleBarClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!onSeek || !safeDuration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const pct = clamp((e.clientX - rect.left) / rect.width, 0, 1)
      onSeek(pct * safeDuration)
    },
    [onSeek, safeDuration]
  )

  const playheadLeft = safeDuration
    ? `${clamp(currentSeconds, 0, safeDuration) / safeDuration * 100}%`
    : '0%'

  return (
    <div className={cn('w-full py-4', className)}>
      <div
        role="slider"
        aria-label="Timeline"
        aria-valuemin={0}
        aria-valuemax={safeDuration}
        aria-valuenow={clamp(currentSeconds, 0, safeDuration)}
        tabIndex={0}
        onClick={handleBarClick}
        className="relative h-2 rounded-full bg-slate-800/60 border border-white/5 cursor-pointer select-none group backdrop-blur-sm"
      >
        {/* Glow Track (on hover) */}
        <div className="absolute inset-0 rounded-full bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors duration-300" />

        {/* Markers */}
        {normalized.map((m) => {
          const left = safeDuration ? (m.startSeconds / safeDuration) * 100 : 0
          const hasRange =
            typeof m.endSeconds === 'number' && m.endSeconds > m.startSeconds
          const width = hasRange
            ? ((m.endSeconds! - m.startSeconds) / safeDuration) * 100
            : 0

          return (
            <button
              key={m.id}
              type="button"
              title={m.label}
              onClick={(e) => {
                e.stopPropagation()
                onSeek?.(m.startSeconds)
              }}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 h-3 rounded-full transition-transform hover:scale-125 hover:z-10',
                hasRange ? 'opacity-40' : 'w-1.5 opacity-90',
                colorClass(m.color ?? 'slate')
              )}
              style={{
                left: `${left}%`,
                width: hasRange ? `${Math.max(width, 0.5)}%` : undefined,
              }}
            />
          )
        })}

        {/* Playhead */}
        <div
          className="absolute -top-1.5 h-5 w-0.5 bg-white z-20 shadow-[0_0_10px_rgba(255,255,255,0.8)] rounded-full transition-all duration-75"
          style={{ left: playheadLeft }}
        >
             <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
        </div>
        
        {/* Progress Fill (Optional: simple gradient from left to playhead) */}
        <div 
            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500/40 to-blue-400/60 pointer-events-none"
            style={{ width: playheadLeft }}
        />
      </div>
    </div>
  )
}
