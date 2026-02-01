'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export interface CallMomentumProps {
  momentum: number // 0-100
  label?: string
  isLive?: boolean
}

export function CallMomentum({
  momentum,
  label = "CALL MOMENTUM",
  isLive = true,
}: CallMomentumProps) {
  // Generate 20 bars for a denser "Equalizer" look
  const bars = Array.from({ length: 20 }, (_, i) => i)
  
  // Calculate threshold index based on momentum (0-20)
  const activeIndex = isLive ? Math.floor((momentum / 100) * 20) : -1

  // Neon gradients for the momentum bars
  const getBarColor = (index: number, isActive: boolean) => {
    if (!isActive) return 'bg-slate-700/30'
    
    // Gradient from Orange (low index) to Green (high index)
    // Using bright neon variants
    if (index < 6) return 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]' 
    if (index < 13) return 'bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.6)]'
    return 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]'
  }

  const getStatusText = (val: number) => {
    return `${Math.round(val)}%`
  }
  
  return (
    <div className="space-y-3 p-5 bg-slate-900/90 rounded-xl border border-white/10 backdrop-blur-md shadow-xl relative overflow-hidden group">
      {/* Subtle holo grid background effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-50" />

      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold text-shadow-sm">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {isLive ? (
            <>
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </div>
              <span className="text-[10px] font-bold text-green-400 tracking-wider">LIVE</span>
            </>
          ) : (
            <>
              <div className="relative inline-flex h-2 w-2 rounded-full bg-slate-500"></div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">READY</span>
            </>
          )}
        </div>
      </div>
      
      <div className="flex items-end justify-between gap-4 h-14 relative z-10">
          {/* Main momentum percentage text */}
          <div className="flex flex-col justify-end">
               <span className="text-4xl font-light text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {getStatusText(momentum)}
               </span>
               <span className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">Current Intensity</span>
          </div>

          {/* Bars visualization */}
          <div className="flex-1 flex items-end justify-end gap-[2px] h-10">
            {bars.map((i) => {
                const isActive = i <= activeIndex
                
                return (
                    <motion.div
                        key={i}
                        className={cn(
                            "w-1 md:w-1.5 rounded-t-sm transition-all duration-300",
                            getBarColor(i, isActive)
                        )}
                        initial={{ opacity: 0.5, scaleY: 0.5 }}
                        animate={
                          isLive
                            ? {
                                opacity: isActive ? 1 : 0.3,
                                height: isActive
                                  ? `${40 + Math.random() * 60}%`
                                  : '20%',
                              }
                            : { opacity: 0.25, height: '20%' }
                        }
                        transition={
                          isLive
                            ? {
                                type: 'spring',
                                stiffness: 300,
                                damping: 20,
                                repeat: Infinity,
                                repeatType: 'reverse',
                                duration: 0.5 + Math.random() * 0.5,
                              }
                            : { duration: 0.2 }
                        }
                    />
                )
            })}
          </div>
      </div>
    </div>
  )
}
