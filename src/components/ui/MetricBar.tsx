'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface Segment {
  start: number
  end: number
  color: 'green' | 'yellow' | 'red'
}

export interface AxisTick {
  value: number
  label: string
}

export interface MetricBarProps {
  label: string
  value: number
  min: number
  max: number
  segments: Segment[]
  mode?: 'indicator' | 'fill'
  statusText?: string
  statusColor?: 'green' | 'yellow' | 'red'
  showValue?: boolean
  valueFormatter?: (v: number) => string
  rightText?: ReactNode
  axisTicks?: AxisTick[]
  axisZoneLabels?: string[]
}

const colorClasses = {
  green: 'bg-green-500/60',
  yellow: 'bg-yellow-500/60',
  red: 'bg-red-500/60',
}

const statusColorClasses = {
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
}

const indicatorRingClasses = {
  green: 'ring-2 ring-green-400/60',
  yellow: 'ring-2 ring-yellow-400/60',
  red: 'ring-2 ring-red-400/60',
}

export function MetricBar({
  label,
  value,
  min,
  max,
  segments,
  mode = 'indicator',
  statusText,
  statusColor,
  showValue = true,
  valueFormatter,
  rightText,
  axisTicks,
  axisZoneLabels,
}: MetricBarProps) {
  // Calculate indicator position (0-100%)
  const range = max - min
  const clampedValue = Math.max(min, Math.min(max, value))
  const position = range > 0 ? ((clampedValue - min) / range) * 100 : 0

  // Determine current segment color for the indicator glow
  const currentSegment =
    segments.find((s) => clampedValue >= s.start && clampedValue < s.end) ??
    segments[segments.length - 1]

  const effectiveStatusColor = statusColor ?? currentSegment?.color ?? 'green'

  const formattedValue = valueFormatter
    ? valueFormatter(clampedValue)
    : clampedValue.toString()

  const rightContent =
    rightText ??
    (showValue || statusText ? (
      <>
        {showValue && formattedValue}
        {showValue && statusText && ' '}
        {statusText}
      </>
    ) : null)

  return (
    <div className="space-y-1">
      {/* Header row: label and status */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">
          {label}
        </span>
        <span
          className={cn(
            'text-xs font-medium uppercase tracking-wide',
            statusColorClasses[effectiveStatusColor]
          )}
        >
          {rightContent}
        </span>
      </div>

      {/* Bar container */}
      <div className="relative h-2 rounded-full overflow-hidden bg-slate-800">
        {mode === 'fill' ? (
          <>
            {/* Filled portion (clipped to current value) */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: `inset(0 ${Math.max(0, 100 - position)}% 0 0)`,
              }}
            >
              {segments.map((segment, index) => {
                const segmentStart =
                  range > 0 ? ((segment.start - min) / range) * 100 : 0
                const segmentEnd =
                  range > 0 ? ((segment.end - min) / range) * 100 : 0
                const segmentWidth = segmentEnd - segmentStart

                return (
                  <div
                    key={index}
                    className={cn(
                      'absolute top-0 h-full',
                      colorClasses[segment.color]
                    )}
                    style={{
                      left: `${segmentStart}%`,
                      width: `${segmentWidth}%`,
                    }}
                  />
                )
              })}
            </div>
          </>
        ) : (
          <>
            {/* Colored segments */}
            {segments.map((segment, index) => {
              const segmentStart =
                range > 0 ? ((segment.start - min) / range) * 100 : 0
              const segmentEnd =
                range > 0 ? ((segment.end - min) / range) * 100 : 0
              const segmentWidth = segmentEnd - segmentStart

              return (
                <div
                  key={index}
                  className={cn(
                    'absolute top-0 h-full',
                    colorClasses[segment.color]
                  )}
                  style={{
                    left: `${segmentStart}%`,
                    width: `${segmentWidth}%`,
                  }}
                />
              )
            })}
          </>
        )}

        {/* Position indicator */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-300 ease-out',
            currentSegment?.color
              ? indicatorRingClasses[currentSegment.color]
              : null
          )}
          style={{
            left: `calc(${position}% - 6px)`,
          }}
        />
      </div>

      {/* Axis ticks / labels */}
      {axisTicks && axisTicks.length > 0 ? (
        <div className="relative h-4 mt-1">
          {axisTicks.map((tick, index) => {
            const tickPos =
              range > 0 ? ((tick.value - min) / range) * 100 : 0
            const isFirst = index === 0
            const isLast = index === axisTicks.length - 1
            const translateX = isFirst ? '0%' : isLast ? '-100%' : '-50%'

            return (
              <span
                key={`${tick.value}-${tick.label}`}
                className="absolute top-0 text-[10px] text-slate-500 whitespace-nowrap"
                style={{
                  left: `${tickPos}%`,
                  transform: `translateX(${translateX})`,
                }}
              >
                {tick.label}
              </span>
            )
          })}
        </div>
      ) : axisZoneLabels && axisZoneLabels.length > 0 ? (
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
          {axisZoneLabels.map((labelText) => (
            <span key={labelText} className="whitespace-nowrap">
              {labelText}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// Pre-configured metric bars for common use cases

export interface TalkingSpeedBarProps {
  wpm: number
}

export function TalkingSpeedBar({ wpm }: TalkingSpeedBarProps) {
  // Determine status text and color based on WPM
  let statusText: string
  let statusColor: 'green' | 'yellow' | 'red'

  if (wpm === 0) {
    statusText = '—'
    statusColor = 'green'
  } else if (wpm < 100) {
    statusText = 'TOO SLOW'
    statusColor = 'red'
  } else if (wpm < 130) {
    statusText = 'SLOW'
    statusColor = 'yellow'
  } else if (wpm <= 160) {
    statusText = 'GOOD SPEED'
    statusColor = 'green'
  } else if (wpm <= 180) {
    statusText = 'FAST'
    statusColor = 'yellow'
  } else {
    statusText = 'TOO FAST'
    statusColor = 'red'
  }

  // Segments: red (too slow) -> yellow -> green (ideal) -> yellow -> red (too fast)
  const segments: Segment[] = [
    { start: 50, end: 100, color: 'red' },
    { start: 100, end: 130, color: 'yellow' },
    { start: 130, end: 160, color: 'green' },
    { start: 160, end: 180, color: 'yellow' },
    { start: 180, end: 220, color: 'red' },
  ]

  return (
    <MetricBar
      label="Talking Speed"
      value={wpm}
      min={50}
      max={220}
      segments={segments}
      statusText={statusText}
      statusColor={statusColor}
      showValue={false}
      axisZoneLabels={['too slow', 'ok', 'ideal', 'fast', 'too fast']}
    />
  )
}

export interface AnswerTimeBarProps {
  seconds: number
}

export function AnswerTimeBar({ seconds }: AnswerTimeBarProps) {
  // Determine status text and color based on duration
  let statusText: string
  let statusColor: 'green' | 'yellow' | 'red'

  if (seconds < 30) {
    statusText = 'OK'
    statusColor = 'green'
  } else if (seconds < 45) {
    statusText = 'WRAP'
    statusColor = 'yellow'
  } else {
    statusText = 'TOO LONG'
    statusColor = 'red'
  }

  // Segments: green (0-30s) -> yellow (30-45s) -> red (45-60s+)
  const segments: Segment[] = [
    { start: 0, end: 30, color: 'green' },
    { start: 30, end: 45, color: 'yellow' },
    { start: 45, end: 60, color: 'red' },
  ]

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = Math.floor(s % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <MetricBar
      label="Answer Time"
      value={seconds}
      min={0}
      max={60}
      segments={segments}
      mode="fill"
      statusText={statusText}
      statusColor={statusColor}
      valueFormatter={formatTime}
      axisTicks={[
        { value: 0, label: '0s' },
        { value: 15, label: '15s' },
        { value: 30, label: '30s' },
        { value: 45, label: '45s' },
        { value: 60, label: '60s' },
      ]}
    />
  )
}

export interface FillerRateBarProps {
  fillersPerMinute: number
}

export function FillerRateBar({ fillersPerMinute }: FillerRateBarProps) {
  // Determine status color based on filler rate
  let statusColor: 'green' | 'yellow' | 'red'

  if (fillersPerMinute < 3) {
    statusColor = 'green'
  } else if (fillersPerMinute < 6) {
    statusColor = 'yellow'
  } else {
    statusColor = 'red'
  }

  // Segments: green (0-3) -> yellow (3-6) -> red (6-10+)
  const segments: Segment[] = [
    { start: 0, end: 3, color: 'green' },
    { start: 3, end: 6, color: 'yellow' },
    { start: 6, end: 10, color: 'red' },
  ]

  return (
    <MetricBar
      label="Filler Rate"
      value={fillersPerMinute}
      min={0}
      max={10}
      segments={segments}
      mode="fill"
      statusColor={statusColor}
      valueFormatter={(v) => `${v.toFixed(1)}/min`}
      axisTicks={[
        { value: 0, label: '0/min' },
        { value: 3, label: '3/min' },
        { value: 6, label: '6/min' },
        { value: 10, label: '10/min' },
      ]}
    />
  )
}
