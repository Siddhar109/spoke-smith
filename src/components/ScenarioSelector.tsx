'use client'

import { defaultScenarios } from '@/lib/scenarios/defaultScenarios'
import {
  Scenario,
  categoryLabels,
  categoryColors,
  difficultyLabels,
  difficultyColors,
} from '@/lib/scenarios/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ScenarioSelectorProps {
  onSelect: (scenario: Scenario) => void
  selectedId?: string
}

export function ScenarioSelector({ onSelect, selectedId }: ScenarioSelectorProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {defaultScenarios.map((scenario) => (
        <Card
          key={scenario.id}
          className={cn(
            'cursor-pointer transition-all hover:border-blue-500/50 hover:bg-slate-800/50',
            selectedId === scenario.id && 'border-blue-500 bg-slate-800/50'
          )}
          onClick={() => onSelect(scenario)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">{scenario.name}</CardTitle>
              <span
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded border',
                  categoryColors[scenario.category]
                )}
              >
                {categoryLabels[scenario.category]}
              </span>
            </div>
            <CardDescription>{scenario.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Difficulty:</span>
                <span className={cn('font-medium', difficultyColors[scenario.difficulty])}>
                  {difficultyLabels[scenario.difficulty]}
                </span>
              </div>
              <div className="text-slate-500">
                {scenario.questions.length} questions
              </div>
            </div>

            {/* Key messages preview */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2">Key messages to practice:</p>
              <ul className="text-xs text-slate-400 space-y-1">
                {scenario.keyMessages.slice(0, 2).map((msg, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span className="line-clamp-1">{msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Free Practice Option */}
      <Card
        className={cn(
          'cursor-pointer transition-all hover:border-purple-500/50 hover:bg-slate-800/50',
          selectedId === 'free-practice' && 'border-purple-500 bg-slate-800/50'
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
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">Free Practice</CardTitle>
            <span className="px-2 py-1 text-xs font-medium rounded border bg-purple-500/20 text-purple-400 border-purple-500/30">
              Open
            </span>
          </div>
          <CardDescription>
            Practice speaking freely with AI coaching on pace, clarity, and delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">No specific scenario - just talk and get feedback</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
