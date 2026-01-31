'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export interface CallMomentumProps {
  momentum: number // 0-100
  label?: string
}

export function CallMomentum({ momentum, label = "CALL MOMENTUM" }: CallMomentumProps) {
  // Generate 15 bars for the visualization
  const bars = Array.from({ length: 15 }, (_, i) => i)
  
  // Calculate threshold index based on momentum (0-15)
  // Higher momentum = more bars lit up
  // However, the screenshot shows a specific pattern:
  // - Left side has no bars or very faint ones
  // - Right side adds bars as momentum increases?
  // Let's assume standard "volume meter" style: simple threshold
  const activeIndex = Math.floor((momentum / 100) * 15)

  // Color gradient for the bars
  // Low momentum (left) -> Orange
  // High momentum (right) -> Green
  const getBarColor = (index: number, isActive: boolean) => {
    if (!isActive) return 'bg-slate-700/30'
    
    // Gradient from Orange (low index) to Green (high index)
    if (index < 5) return 'bg-orange-500' 
    if (index < 10) return 'bg-yellow-400'
    return 'bg-green-500'
  }

  // Determine global status text
  const getStatusText = (val: number) => {
    return `${Math.round(val)}% MOMENTUM`
  }
  
  return (
    <div className="space-y-2 p-4 bg-slate-800/40 rounded-xl border border-white/5 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          {label}
        </span>
      </div>
      
      <div className="flex items-end justify-between gap-1 h-12">
          {/* Main momentum percentage text on the left */}
          <div className="flex-1 flex items-center h-full">
               <span className="text-2xl font-light text-white tracking-tight">
                {getStatusText(momentum)}
               </span>
          </div>

          {/* Bars visualization on the right */}
          <div className="flex items-end gap-[3px] h-8">
            {bars.map((i) => {
                // Height pattern: sloping up or wave? Screenshot looks like wave or random heights.
                // Let's make them slightly variable height for "audio visualizer" look
                // Or just uniform ramping height? Screenshot: uniform height, maybe slightly taller at right?
                // Actually screenshot shows uniform height pills.
                const isActive = i <= activeIndex
                const heightClass = "h-6 md:h-8" // uniform for now
                
                return (
                    <motion.div
                        key={i}
                        className={cn(
                            "w-1.5 md:w-2 rounded-full transition-colors duration-300",
                            getBarColor(i, isActive),
                            isActive ? "shadow-[0_0_8px_rgba(255,255,255,0.3)]" : ""
                        )}
                        initial={{ opacity: 0.5, scaleY: 0.8 }}
                        animate={{ 
                            opacity: 1, 
                            scaleY: isActive ? 1 : 0.8,
                            height: isActive ? "100%" : "60%" // Dynamic height effect
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                )
            })}
          </div>
      </div>
    </div>
  )
}
