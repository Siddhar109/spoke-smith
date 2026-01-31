'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface VideoPreviewProps {
  stream: MediaStream | null
  className?: string
  muted?: boolean
}

export function VideoPreview({ stream, className, muted = true }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  if (!stream) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-slate-900 rounded-xl border border-slate-800',
          className
        )}
      >
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">Camera preview will appear here</p>
          <p className="text-slate-500 text-xs mt-1">
            Click &quot;Start Session&quot; to begin
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-800',
        className
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />
      {/* Recording indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 rounded-full backdrop-blur">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-xs text-white font-medium">LIVE</span>
      </div>
    </div>
  )
}
