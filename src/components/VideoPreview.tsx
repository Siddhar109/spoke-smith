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
          'flex items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-[inset_0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden relative group',
          className
        )}
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
        
        <div className="text-center p-8 relative z-10 transition-transform duration-500 group-hover:scale-105">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center relative">
             {/* Pulse ring */}
             <div className="absolute inset-0 rounded-2xl border border-slate-200 animate-ping opacity-20" />
            
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-slate-800 text-sm font-medium tracking-wide">Camera Offline</p>
          <p className="text-slate-400 text-[11px] font-light mt-2 max-w-[200px] mx-auto leading-relaxed">
            Start a session to activate your video feed and coach
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-slate-200 bg-black shadow-2xl',
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
      
      {/* HUD Overlay - Minimalist Corners */}
      <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-white/40 rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-white/40 rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-white/40 rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-white/40 rounded-br-lg" />

      {/* Recording indicator */}
      <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-black/60 rounded-full backdrop-blur-md border border-white/10 shadow-sm">
        <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
        </span>
        <span className="text-[10px] text-white font-bold tracking-widest uppercase">LIVE</span>
      </div>
    </div>
  )
}
