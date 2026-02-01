'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { WordTiming } from '@/lib/analysis/voiceMetrics'
import type { CounterpartyId, SituationId, Scenario } from '@/lib/scenarios/types'
import type { CompanyBriefSummary } from '@/lib/company/types'
import { isFacePhraseModelEnabled } from '@/lib/runtimeEnv'

export type SessionStatus = 'idle' | 'connecting' | 'recording' | 'paused' | 'completed'
export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'
export type TranscriptionStatus =
  | 'idle'
  | 'uploading'
  | 'transcribing'
  | 'complete'
  | 'error'

// Analysis result types
export interface SectionScores {
  message_discipline: number
  question_handling: number
  risk_compliance: number
  soundbites: number
  tone_presence: number
}

export interface TimestampedFlag {
  start_time: number
  end_time: number
  issue_type: string
  severity: 'low' | 'medium' | 'high'
  evidence_quote: string
  recommendation: string
}

export interface Rewrite {
  question: string
  original_answer: string
  improved_answer: string
  explanation: string
}

export interface Drill {
  name: string
  instructions: string
  target_metric: string
}

export interface AnalysisResult {
  overall_score: number
  section_scores: SectionScores
  timestamped_flags: TimestampedFlag[]
  rewrites: Rewrite[]
  drills: Drill[]
}

export interface Nudge {
  id: string
  text: string
  severity: 'gentle' | 'firm' | 'urgent'
  reason: string
  timestamp: number
}

export interface VoiceMetrics {
  wpm: number
  fillerCount: number
  fillerRate: number // fillers per minute (windowed)
  /**
   * Standard deviation of estimated pitch (F0) over a short recent window,
   * expressed in semitones. Lower ~= more monotone.
   */
  prosodyVariance: number
}

export interface FaceMetrics {
  facePresent: number
  framing: number
  distance: number
  lighting: number
  faceDetected: boolean
  supported: boolean
  lastUpdated: number | null
}

export interface TranscriptSegment {
  id: string
  text: string
  speaker: 'user' | 'ai'
  startTime: number
  endTime: number
}

export interface PostSessionTranscript {
  text: string
  words: WordTiming[]
}

export type CompanyContextStatus = 'idle' | 'loading' | 'ready' | 'error' | 'skipped'

interface SessionState {
  // Client hydration
  companyContextHydrated: boolean

  // Session lifecycle
  status: SessionStatus
  startTime: number | null
  sessionId: string | null

  // Answer timing (user answer since last AI turn)
  answerStartTime: number | null

  // Real-time data
  nudges: Nudge[]
  currentNudge: Nudge | null

  // Voice metrics
  metrics: VoiceMetrics

  // Face metrics (local-only)
  faceMetrics: FaceMetrics

  // Face coaching settings
  facePhraseModelEnabled: boolean
  faceKeyframesEnabled: boolean
  strictPrivacyMode: boolean

  // Transcript
  transcript: TranscriptSegment[]

  // Audio data for playback
  audioChunks: Blob[]
  audioBlob: Blob | null

  // Selected scenario
  scenarioId: string | null
  scenarioOverride: Scenario | null
  mode: 'coach' | 'journalist'
  counterparty: CounterpartyId
  situation: SituationId

  // Company context (client-carried)
  companyUrl: string | null
  companyNotes: string | null
  companyBriefSummary: CompanyBriefSummary | null
  companyContextStatus: CompanyContextStatus

  // Post-session analysis
  analysisStatus: AnalysisStatus
  analysis: AnalysisResult | null
  analysisError: string | null

  // Post-session transcription
  transcriptionStatus: TranscriptionStatus
  transcriptionError: string | null

  // Post-session transcription
  postSessionTranscript: PostSessionTranscript | null
}

interface SessionActions {
  // Hydration actions
  setCompanyContextHydrated: (hydrated: boolean) => void

  // Status actions
  setStatus: (status: SessionStatus) => void
  markStartTime: (timestampMs?: number) => void
  setAnswerStartTime: (timestampMs: number | null) => void

  // Nudge actions
  addNudge: (nudge: Omit<Nudge, 'id' | 'timestamp'>) => string
  updateNudgeText: (id: string, text: string) => void
  clearCurrentNudge: () => void

  // Metrics actions
  updateMetrics: (metrics: Partial<VoiceMetrics>) => void

  // Face metrics actions
  updateFaceMetrics: (metrics: Partial<FaceMetrics>) => void

  // Face coach settings actions
  setFacePhraseModelEnabled: (enabled: boolean) => void
  setFaceKeyframesEnabled: (enabled: boolean) => void
  setStrictPrivacyMode: (enabled: boolean) => void

  // Transcript actions
  addTranscriptSegment: (segment: Omit<TranscriptSegment, 'id'>) => void

  // Audio actions
  addAudioChunk: (chunk: Blob) => void
  setAudioBlob: (blob: Blob) => void

  // Session config
  setScenario: (scenarioId: string | null) => void
  setScenarioOverride: (scenario: Scenario | null) => void
  setMode: (mode: 'coach' | 'journalist') => void
  setCounterparty: (counterparty: CounterpartyId) => void
  setSituation: (situation: SituationId) => void
  setCompanyUrl: (companyUrl: string | null) => void
  setCompanyNotes: (companyNotes: string | null) => void
  setCompanyBriefSummary: (summary: CompanyBriefSummary | null) => void
  setCompanyContextStatus: (status: CompanyContextStatus) => void

  // Session lifecycle
  initSession: () => string // Generate and return sessionId

  // Analysis actions
  setAnalysisStatus: (status: AnalysisStatus) => void
  setAnalysis: (analysis: AnalysisResult) => void
  setAnalysisError: (error: string) => void
  clearAnalysisError: () => void

  // Transcription status actions
  setTranscriptionStatus: (status: TranscriptionStatus) => void
  setTranscriptionError: (error: string) => void
  clearTranscriptionError: () => void

  // Transcript data actions
  setPostSessionTranscript: (transcript: PostSessionTranscript | null) => void

  // Reset
  reset: () => void
}

const initialState: SessionState = {
  companyContextHydrated: false,
  status: 'idle',
  startTime: null,
  sessionId: null,
  answerStartTime: null,
  nudges: [],
  currentNudge: null,
  metrics: { wpm: 0, fillerCount: 0, fillerRate: 0, prosodyVariance: 0 },
  faceMetrics: {
    facePresent: 0,
    framing: 0,
    distance: 0,
    lighting: 0,
    faceDetected: false,
    supported: true,
    lastUpdated: null,
  },
  facePhraseModelEnabled:
    isFacePhraseModelEnabled(),
  faceKeyframesEnabled: false,
  strictPrivacyMode: true,
  transcript: [],
  audioChunks: [],
  audioBlob: null,
  scenarioId: null,
  scenarioOverride: null,
  mode: 'coach',
  counterparty: 'journalist',
  situation: 'interview',
  companyUrl: null,
  companyNotes: null,
  companyBriefSummary: null,
  companyContextStatus: 'idle',
  analysisStatus: 'idle',
  analysis: null,
  analysisError: null,
  transcriptionStatus: 'idle',
  transcriptionError: null,
  postSessionTranscript: null,
}

export const useSessionStore = create<SessionState & SessionActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCompanyContextHydrated: (companyContextHydrated) =>
        set({ companyContextHydrated }),

      setStatus: (status) => {
        const now = Date.now()
        set((state) => ({
          status,
          startTime:
            status === 'recording' && !state.startTime ? now : state.startTime,
        }))
      },

      markStartTime: (timestampMs) => {
        set((state) => ({
          startTime: state.startTime ?? (timestampMs ?? Date.now()),
        }))
      },

      setAnswerStartTime: (timestampMs) => set({ answerStartTime: timestampMs }),

      addNudge: (nudge) => {
        const newNudge: Nudge = {
          ...nudge,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        }

        set((state) => ({
          nudges: [...state.nudges, newNudge],
          currentNudge: newNudge,
        }))

        // Auto-clear current nudge after 5 seconds
        setTimeout(() => {
          set((state) =>
            state.currentNudge?.id === newNudge.id
              ? { currentNudge: null }
              : {}
          )
        }, 5000)

        return newNudge.id
      },

      updateNudgeText: (id, text) => {
        const trimmed = text.trim()
        if (!trimmed) return
        set((state) => ({
          nudges: state.nudges.map((nudge) =>
            nudge.id === id ? { ...nudge, text: trimmed } : nudge
          ),
          currentNudge:
            state.currentNudge?.id === id
              ? { ...state.currentNudge, text: trimmed }
              : state.currentNudge,
        }))
      },

      clearCurrentNudge: () => set({ currentNudge: null }),

      updateMetrics: (metrics) => {
        set((state) => ({
          metrics: { ...state.metrics, ...metrics },
        }))
      },

      updateFaceMetrics: (metrics) => {
        set((state) => ({
          faceMetrics: { ...state.faceMetrics, ...metrics },
        }))
      },

      setFacePhraseModelEnabled: (enabled) =>
        set((state) => ({
          facePhraseModelEnabled: enabled,
          faceKeyframesEnabled: enabled ? state.faceKeyframesEnabled : false,
        })),

      setFaceKeyframesEnabled: (enabled) =>
        set((state) => ({
          faceKeyframesEnabled:
            state.strictPrivacyMode || !state.facePhraseModelEnabled
              ? false
              : enabled,
        })),

      setStrictPrivacyMode: (enabled) =>
        set((state) => ({
          strictPrivacyMode: enabled,
          faceKeyframesEnabled: enabled ? false : state.faceKeyframesEnabled,
        })),

      addTranscriptSegment: (segment) => {
        const newSegment: TranscriptSegment = {
          ...segment,
          id: crypto.randomUUID(),
        }
        set((state) => ({
          transcript: [...state.transcript, newSegment],
        }))
      },

      addAudioChunk: (chunk) => {
        set((state) => ({
          audioChunks: [...state.audioChunks, chunk],
        }))
      },

      setAudioBlob: (blob) => set({ audioBlob: blob }),

      setScenario: (scenarioId) => set({ scenarioId }),

      setScenarioOverride: (scenarioOverride) => set({ scenarioOverride }),

      setMode: (mode) => set({ mode }),

      setCounterparty: (counterparty) => set({ counterparty }),

      setSituation: (situation) => set({ situation }),

      setCompanyUrl: (companyUrl) => set({ companyUrl }),

      setCompanyNotes: (companyNotes) => set({ companyNotes }),

      setCompanyBriefSummary: (companyBriefSummary) =>
        set({ companyBriefSummary }),

      setCompanyContextStatus: (companyContextStatus) =>
        set({ companyContextStatus }),

      initSession: () => {
        const sessionId = crypto.randomUUID()
        set(() => ({
          sessionId,
          status: 'idle',
          startTime: null,
          answerStartTime: null,
          nudges: [],
          currentNudge: null,
          metrics: { ...initialState.metrics },
          faceMetrics: { ...initialState.faceMetrics },
          transcript: [],
          audioChunks: [],
          audioBlob: null,
          analysisStatus: 'idle',
          analysis: null,
          analysisError: null,
          transcriptionStatus: 'idle',
          transcriptionError: null,
          postSessionTranscript: null,
        }))
        return sessionId
      },

      setAnalysisStatus: (status) => set({ analysisStatus: status }),

      setAnalysis: (analysis) => set({ analysis, analysisStatus: 'complete' }),

      setAnalysisError: (error) =>
        set({ analysisError: error, analysisStatus: 'error' }),

      clearAnalysisError: () => set({ analysisError: null }),

      setTranscriptionStatus: (status) => set({ transcriptionStatus: status }),

      setTranscriptionError: (error) =>
        set({ transcriptionError: error, transcriptionStatus: 'error' }),

      clearTranscriptionError: () => set({ transcriptionError: null }),

      setPostSessionTranscript: (postSessionTranscript) =>
        set({ postSessionTranscript }),

      reset: () =>
        set((state) => ({
          ...initialState,
          // Keep company context across new sessions by default.
          companyContextHydrated: state.companyContextHydrated,
          companyUrl: state.companyUrl,
          companyNotes: state.companyNotes,
          companyBriefSummary: state.companyBriefSummary,
          companyContextStatus: state.companyContextStatus,
        })),
    }),
    {
      name: 'kawkai-company-context-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        companyUrl: state.companyUrl,
        companyNotes: state.companyNotes,
        companyBriefSummary: state.companyBriefSummary,
        companyContextStatus: state.companyContextStatus,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setCompanyContextHydrated(true)

        if (!state) return

        // Never revive transient states.
        if (state.companyContextStatus === 'loading') {
          state.setCompanyContextStatus('idle')
        }

        // If we have a summary, consider it ready.
        if (state.companyBriefSummary) {
          state.setCompanyContextStatus('ready')
        }
      },
    }
  )
)

// Selectors for common derived state
export const selectElapsedTime = (state: SessionState) => {
  if (!state.startTime) return 0
  return Math.floor((Date.now() - state.startTime) / 1000)
}

export const selectIsActive = (state: SessionState) => {
  return state.status === 'recording' || state.status === 'connecting'
}
