'use client'

import type { CSSProperties } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { cn } from '@/lib/utils'

export function NudgeMarquee({ className }: { className?: string }) {
  const status = useSessionStore((state) => state.status)
  const nudges = useSessionStore((state) => state.nudges)

  let text = ''
  for (let i = nudges.length - 1; i >= 0; i -= 1) {
    const t = nudges[i]?.text?.trim()
    if (t) {
      text = t
      break
    }
  }

  if (status !== 'connecting' && status !== 'recording') return null

  if (!text) return null

  const durationSec = Math.max(18, Math.min(52, Math.ceil(text.length / 4)))

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-20',
        'border-t border-white/10 bg-black/55 backdrop-blur-md',
        className
      )}
      aria-hidden="true"
    >
      <div className="overflow-hidden py-2">
        <div
          className="nudge-marquee-track"
          style={
            {
              ['--nudge-marquee-duration' as string]: `${durationSec}s`,
            } as CSSProperties
          }
        >
          <div className="nudge-marquee-content">{text}</div>
          <div className="nudge-marquee-content">{text}</div>
        </div>
      </div>
    </div>
  )
}
