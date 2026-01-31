'use client'

import { defaultScenarios } from '@/lib/scenarios/defaultScenarios'
import {
  Scenario,
  categoryLabels,
  categoryColors,
  difficultyLabels,
  difficultyColors,
} from '@/lib/scenarios/types'
import { cn } from '@/lib/utils'

interface ScenarioSelectorProps {
  onSelect: (scenario: Scenario) => void
  selectedId?: string
}

export function ScenarioSelector({ onSelect, selectedId }: ScenarioSelectorProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {defaultScenarios.map((scenario) => (
        <div
          key={scenario.id}
          className={cn(
            'group relative p-8 bg-white rounded-[2rem] border transition-all duration-300 cursor-pointer',
            'shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1',
            selectedId === scenario.id 
              ? 'border-blue-500/50 ring-1 ring-blue-500/20 shadow-blue-500/5' 
              : 'border-slate-100 hover:border-blue-200/50'
          )}
          onClick={() => onSelect(scenario)}
        >
          <div className="mb-4 flex items-start justify-between">
            <h3 className="text-xl font-light text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">
                {scenario.name}
            </h3>
            <span
                className={cn(
                'px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border',
                categoryColors[scenario.category]
                )}
            >
                {categoryLabels[scenario.category]}
            </span>
          </div>
          
          <p className="text-slate-500 font-light text-sm leading-relaxed mb-6">
            {scenario.description}
          </p>

          <div className="flex items-center justify-between text-xs text-slate-400 font-medium tracking-wide uppercase border-t border-slate-50 pt-4">
              <div className="flex items-center gap-2">
                <span>Difficulty:</span>
                <span className={cn('font-bold', difficultyColors[scenario.difficulty])}>
                  {difficultyLabels[scenario.difficulty]}
                </span>
              </div>
              <div>
                {scenario.questions.length} questions
              </div>
          </div>
        </div>
      ))}

      {/* Free Practice Option */}
      <div
        className={cn(
          'group relative p-8 bg-white rounded-[2rem] border transition-all duration-300 cursor-pointer',
          'shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1',
          selectedId === 'free-practice'
            ? 'border-purple-500/50 ring-1 ring-purple-500/20 shadow-purple-500/5' 
            : 'border-slate-100 hover:border-purple-200/50'
        )}
        onClick={() =>
          onSelect({
            id: 'free-practice',
            name: 'Free Practice',
            description: 'Open practice session with the AI coach',
            category: 'general',
            difficulty: 'beginner',
            context: 'Open practice session. The user wants to practice speaking with general coaching.',
            questions: [],
            keyMessages: [],
            redLines: [],
          })
        }
      >
        <div className="mb-4 flex items-start justify-between">
            <h3 className="text-xl font-light text-slate-800 tracking-tight group-hover:text-purple-600 transition-colors">
                Free Practice
            </h3>
            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border bg-purple-50 text-purple-600 border-purple-100">
                Open
            </span>
          </div>
          
          <p className="text-slate-500 font-light text-sm leading-relaxed mb-6">
            Practice speaking freely with AI coaching on pace, clarity, and delivery. No specific questions.
          </p>

          <div className="flex items-center justify-between text-xs text-slate-400 font-medium tracking-wide uppercase border-t border-slate-50 pt-4">
              <span>Unstructured Session</span>
              <span className="text-purple-400">∞</span>
          </div>
      </div>
    </div>
  )
}
