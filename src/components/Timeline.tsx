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
      return 'bg-red-500'
    case 'yellow':
      return 'bg-yellow-400'
    case 'green':
      return 'bg-green-500'
    case 'blue':
      return 'bg-blue-500'
    case 'slate':
    default:
      return 'bg-slate-400'
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
    <div className={cn('w-full', className)}>
      <div
        role="slider"
        aria-label="Timeline"
        aria-valuemin={0}
        aria-valuemax={safeDuration}
        aria-valuenow={clamp(currentSeconds, 0, safeDuration)}
        tabIndex={0}
        onClick={handleBarClick}
        className="relative h-3 rounded bg-slate-800 cursor-pointer select-none"
      >
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
                'absolute top-0 h-3 rounded',
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
          className="absolute -top-1 h-5 w-0.5 bg-white/80 rounded"
          style={{ left: playheadLeft }}
        />
      </div>
    </div>
  )
}
