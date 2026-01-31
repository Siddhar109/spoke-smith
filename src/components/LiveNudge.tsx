'use client'

import { useSessionStore } from '@/stores/sessionStore'
import { cn } from '@/lib/utils'

export function LiveNudge() {
  const currentNudge = useSessionStore((state) => state.currentNudge)

  if (!currentNudge) return null

  const severityStyles = {
    gentle: 'bg-blue-500/90 border-blue-400 text-white',
    firm: 'bg-amber-500/90 border-amber-400 text-white',
    urgent: 'bg-red-500/90 border-red-400 text-white animate-pulse',
  }

  const severityIcons = {
    gentle: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    firm: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    urgent: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  }

  return (
    <div
      className={cn(
        'fixed top-8 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-6 py-3 rounded-full border-2 backdrop-blur',
        'font-medium text-lg shadow-2xl',
        'animate-in fade-in slide-in-from-top-4 duration-300',
        severityStyles[currentNudge.severity]
      )}
    >
      {severityIcons[currentNudge.severity]}
      <span>{currentNudge.text}</span>
    </div>
  )
}
