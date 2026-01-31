export type ScenarioCategory = 'crisis' | 'product' | 'earnings' | 'general'
export type QuestionDifficulty = 'soft' | 'medium' | 'hostile'
export type ScenarioDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface Question {
  id: string
  text: string
  followUps: string[]
  difficulty: QuestionDifficulty
  expectedDurationSeconds: number
  tags: string[]
}

export interface Scenario {
  id: string
  name: string
  description: string
  category: ScenarioCategory
  difficulty: ScenarioDifficulty
  context: string // Background info for AI journalist
  questions: Question[]
  keyMessages: string[] // What spokesperson should convey
  redLines: string[] // What to avoid saying
}

// UI helpers
export const categoryLabels: Record<ScenarioCategory, string> = {
  crisis: 'Crisis',
  product: 'Product',
  earnings: 'Earnings',
  general: 'General',
}

export const categoryColors: Record<ScenarioCategory, string> = {
  crisis: 'bg-red-500/20 text-red-400 border-red-500/30',
  product: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  earnings: 'bg-green-500/20 text-green-400 border-green-500/30',
  general: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export const difficultyLabels: Record<ScenarioDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export const difficultyColors: Record<ScenarioDifficulty, string> = {
  beginner: 'text-green-400',
  intermediate: 'text-yellow-400',
  advanced: 'text-red-400',
}
