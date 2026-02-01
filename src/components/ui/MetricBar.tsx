'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export interface Segment {
  start: number
  end: number
  color: 'green' | 'yellow' | 'red' | 'orange' 
}

export interface MetricBarProps {
  label: string
  value: number
  min: number
  max: number
  segments: Segment[]
  statusText?: string
  statusColor?: 'green' | 'yellow' | 'red' | 'orange' | 'slate'
  showValue?: boolean // deprecated usually, but kept for compat
  rightText?: ReactNode // Custom right side content
  axisZoneLabels?: string[] // Labels below the bar
}

// Map logical colors to Tailwind classes with neon glow effects
const colorClasses = {
  green: 'bg-green-400',
  yellow: 'bg-yellow-300', 
  red: 'bg-red-400',
  orange: 'bg-orange-400',
  slate: 'bg-slate-600',
}

const glowClasses = {
  green: 'shadow-[0_0_8px_rgba(74,222,128,0.6)]',
  yellow: 'shadow-[0_0_8px_rgba(253,224,71,0.6)]',
  red: 'shadow-[0_0_8px_rgba(248,113,113,0.6)]',
  orange: 'shadow-[0_0_8px_rgba(251,146,60,0.6)]',
  slate: '',
}

const textColors = {
  green: 'text-green-400',
  yellow: 'text-yellow-300',
  red: 'text-red-400',
  orange: 'text-orange-400',
  slate: 'text-slate-400',
}

export function MetricBar({
  label,
  value,
  min,
  max,
  segments,
  statusText,
  statusColor = 'green',
  axisZoneLabels,
}: MetricBarProps) {
  const range = max - min
  const clampedValue = Math.max(min, Math.min(max, value))
  const positionPercent = range > 0 ? ((clampedValue - min) / range) * 100 : 0
  
  // Determine which segment the value falls into
  const activeSegment = segments.find(seg => clampedValue >= seg.start && clampedValue <= seg.end)
  
  return (
    <div className="space-y-1 py-1">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          {label}
        </span>
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-widest",
          textColors[statusColor] || textColors.green
        )}>
          {statusText}
        </span>
      </div>

      {/* Bar Track */}
      {/* We use a flex container for the segments to create the "spaced pills" look if strictly segmented, or a continuous bar. 
          The screenshot shows segmented bars with gaps. 
          Let's implement the segmented look. 
      */}
      <div className="relative h-2 w-full flex gap-1 items-center">
        {/* Render background track segments */}
        {segments.map((segment, i) => {
            const segRange = segment.end - segment.start
            const widthPercent = (segRange / range) * 100
            const isActive = activeSegment === segment
            
            return (
                <div 
                    key={i}
                    className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        colorClasses[segment.color],
                        isActive 
                          ? cn("opacity-80", glowClasses[segment.color])
                          : "opacity-40"
                    )}
                    style={{ width: `${widthPercent}%` }}
                />
            )
        })}

        {/* Foreground Active State / Indicator */}
        {/* We need a simplified single track for the main fill or indicator movement if we want smooth animation over the gaps. 
            However, simpler approach: Absolute positioned indicator on top of the flex container.
        */}
        <div className="absolute inset-0 pointer-events-none flex items-center">
            {/* The white glow indicator */}
             <motion.div
                className="absolute w-1 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10"
                style={{ left: `calc(${positionPercent}% - 2px)` }}
                animate={{ left: `calc(${positionPercent}% - 2px)` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
            
            {/* 
               Optional: If we want the bar to "fill" up to the point (like Answer Time), 
               we need a different mode. But the screenshot mainly shows indicators or fills.
               Actually talking speed is indicator. Answer time is fill. 
               We can render a fill overlay masked by the gaps? 
               Too complex. Let's just use a simple full overlay for fill mode if needed. 
               But wait, the screenshot shows "Talking Speed" as just a track with an indicator.
               "Talking Time" (Answer Time) is a green bar that FILLS up.
               So we need 'mode' prop logic again.
            */}
        </div>
      </div>

       {/* Axis Labels */}
       {axisZoneLabels && (
        <div className="flex justify-between mt-1 px-1">
          {axisZoneLabels.map((l, i) => (
             <span key={i} className="text-[9px] text-slate-500 uppercase font-medium">{l}</span>
          ))}
        </div>
      )}
    </div>
  )
}


// --- Specialized Components ---

export interface TalkingSpeedBarProps {
  wpm: number
}

export function TalkingSpeedBar({ wpm }: TalkingSpeedBarProps) {
  let statusText = 'GOOD SPEED'
  let statusColor: MetricBarProps['statusColor'] = 'green'

  if (wpm <= 0) {
    statusText = 'LISTENING'
    statusColor = 'slate'
  } else if (wpm < 100) {
    statusText = 'TOO SLOW'
    statusColor = 'orange' // using orange for "bad" but not critical red
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

  // Visual Segments
  const segments: Segment[] = [
    { start: 50, end: 100, color: 'orange' }, // Too slow
    { start: 100, end: 130, color: 'yellow' }, // Slow
    { start: 130, end: 160, color: 'green' }, // Good
    { start: 160, end: 180, color: 'yellow' }, // Fast
    { start: 180, end: 250, color: 'red' }, // Too fast
  ]

  return (
    <MetricBar
      label="Talking Speed"
      value={wpm}
      min={50}
      max={250}
      segments={segments}
      statusText={statusText}
      statusColor={statusColor}
      axisZoneLabels={['Too Slow', 'Ok', 'Good', 'Fast', 'Too Fast']}
    />
  )
}

export interface AnswerTimeBarProps {
    seconds: number
}

export function AnswerTimeBar({ seconds }: AnswerTimeBarProps) {
    let statusText = 'GOOD SPEED' // Screenshot says "GOOD SPEED" for time? Maybe "GOOD PACE"?
    // Screenshot row 2: "TALKING TIME" ... "GOOD SPEED". 
    // Let's use "GOOD PACE" or "ON TRACK".
    
    let statusColor: MetricBarProps['statusColor'] = 'green'

    if (seconds < 30) {
        statusText = 'GOOD PACE'
        statusColor = 'green'
    } else if (seconds < 45) {
        statusText = 'WRAP UP'
        statusColor = 'yellow'
    } else {
        statusText = 'TOO LONG'
        statusColor = 'red'
    }

    // For "Fill" style bars, we can simulate it with the generic MetricBar by 
    // having the indicator move, but we might want the "filled" look.
    // The generic component I wrote above is "Indicator" style (dot on track).
    // Let's stick to indicator style for consistency with the screenshot's top bar,
    // OR modify MetricBar to support fill.
    // The second bar in screenshot looks like a green bar that is filled up to a point with a white thumb.
    // The "Gap" style I implemented supports this if we just obscure the right side?
    // Actually, let's just use the same "Indicator on Track" style for all of them for a unified look,
    // it's cleaner and "modern". 
    
    // BUT, for Time, it starts at 0.
    const segments: Segment[] = [
        { start: 0, end: 30, color: 'green' },
        { start: 30, end: 45, color: 'yellow' },
        { start: 45, end: 60, color: 'red' },
    ]

    return (
        <MetricBar
            label="Talking Time"
            value={seconds}
            min={0}
            max={60}
            segments={segments}
            statusText={statusText}
            statusColor={statusColor}
            axisZoneLabels={['0s', '', '30s', '', '60s']} // Minimal labels
        />
    )
}

export interface ProsodyVarianceBarProps {
  prosodyVariance: number
}

export function ProsodyVarianceBar({ prosodyVariance }: ProsodyVarianceBarProps) {
  let statusText = 'MONOTONE'
  let statusColor: MetricBarProps['statusColor'] = 'red'

  if (prosodyVariance >= 2.0 && prosodyVariance <= 4.0) {
    statusText = 'EXPRESSIVE'
    statusColor = 'green'
  } else if (prosodyVariance >= 1.2) {
    statusText = 'OK'
    statusColor = 'yellow'
  } else if (prosodyVariance > 0.2) {
    statusText = 'FLAT'
    statusColor = 'orange'
  }

  const segments: Segment[] = [
    { start: 0, end: 1.2, color: 'red' },
    { start: 1.2, end: 2.0, color: 'yellow' },
    { start: 2.0, end: 4.0, color: 'green' },
    { start: 4.0, end: 5.5, color: 'yellow' },
    { start: 5.5, end: 8.0, color: 'orange' },
  ]

  return (
    <MetricBar
      label="Expressiveness"
      value={prosodyVariance}
      min={0}
      max={8}
      segments={segments}
      statusText={statusText}
      statusColor={statusColor}
      axisZoneLabels={['Mono', '', 'Good', '', 'Wild']}
    />
  )
}


export interface ToneOfVoiceBarProps {
    fillerRate: number // Use filler rate as proxy for now
}

export function ToneOfVoiceBar({ fillerRate }: ToneOfVoiceBarProps) {
    // Inverse logic: Low filler rate = Good Tone
    let statusText = 'CONFIDENT'
    let statusColor: MetricBarProps['statusColor'] = 'green'

    if (fillerRate < 2) {
        statusText = 'CONFIDENT'
        statusColor = 'green'
    } else if (fillerRate < 5) {
        statusText = 'NEUTRAL'
        statusColor = 'yellow'
    } else {
        statusText = 'UNCERTAIN'
        statusColor = 'orange'
    }
    
    const segments: Segment[] = [
        { start: 0, end: 3, color: 'green' },
        { start: 3, end: 6, color: 'yellow' },
        { start: 6, end: 10, color: 'orange' },
    ]

    return (
        <MetricBar
            label="Tone of Voice"
            value={fillerRate}
            min={0}
            max={10}
            segments={segments}
            statusText={statusText}
            statusColor={statusColor}
            axisZoneLabels={['Clear', 'Ok', 'Shaky']}
        />
    )
}

export interface FacePresenceBarProps {
    value: number
}

export function FacePresenceBar({ value }: FacePresenceBarProps) {
    let statusText = 'NO FACE'
    let statusColor: MetricBarProps['statusColor'] = 'red'

    if (value >= 0.6) {
        statusText = 'GOOD'
        statusColor = 'green'
    } else if (value >= 0.25) {
        statusText = 'PARTIAL'
        statusColor = 'yellow'
    }

    const segments: Segment[] = [
        { start: 0, end: 0.3, color: 'red' },
        { start: 0.3, end: 0.6, color: 'yellow' },
        { start: 0.6, end: 1, color: 'green' },
    ]

    return (
        <MetricBar
            label="Face Presence"
            value={value}
            min={0}
            max={1}
            segments={segments}
            statusText={statusText}
            statusColor={statusColor}
            axisZoneLabels={['0%', '', '50%', '', '100%']}
        />
    )
}

export interface FramingBarProps {
    value: number
}

export function FramingBar({ value }: FramingBarProps) {
    let statusText = 'OFF CENTER'
    let statusColor: MetricBarProps['statusColor'] = 'red'

    if (value >= 0.7) {
        statusText = 'CENTERED'
        statusColor = 'green'
    } else if (value >= 0.45) {
        statusText = 'ADJUST'
        statusColor = 'yellow'
    }

    const segments: Segment[] = [
        { start: 0, end: 0.4, color: 'red' },
        { start: 0.4, end: 0.7, color: 'yellow' },
        { start: 0.7, end: 1, color: 'green' },
    ]

    return (
        <MetricBar
            label="Framing"
            value={value}
            min={0}
            max={1}
            segments={segments}
            statusText={statusText}
            statusColor={statusColor}
            axisZoneLabels={['Off', '', 'Ok', '', 'Centered']}
        />
    )
}

export interface LightingBarProps {
    value: number
}

export function LightingBar({ value }: LightingBarProps) {
    let statusText = 'DIM'
    let statusColor: MetricBarProps['statusColor'] = 'red'

    if (value >= 0.7) {
        statusText = 'GOOD'
        statusColor = 'green'
    } else if (value >= 0.45) {
        statusText = 'OK'
        statusColor = 'yellow'
    }

    const segments: Segment[] = [
        { start: 0, end: 0.4, color: 'red' },
        { start: 0.4, end: 0.7, color: 'yellow' },
        { start: 0.7, end: 1, color: 'green' },
    ]

    return (
        <MetricBar
            label="Lighting"
            value={value}
            min={0}
            max={1}
            segments={segments}
            statusText={statusText}
            statusColor={statusColor}
            axisZoneLabels={['Dim', '', 'Ok', '', 'Bright']}
        />
    )
}
