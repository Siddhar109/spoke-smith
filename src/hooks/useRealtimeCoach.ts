'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import {
  createRealtimeClient,
  type RealtimeClient,
  type ConnectionStatus,
} from '@/lib/openai/realtimeClient'
import { useSessionStore } from '@/stores/sessionStore'
import { calculateMetrics, type WordTiming } from '@/lib/analysis/voiceMetrics'
import { createProsodyVarianceTracker } from '@/lib/analysis/prosody'
import { getApiBaseUrl } from '@/lib/runtimeEnv'

interface UseRealtimeCoachReturn {
  connect: (audioTrack: MediaStreamTrack) => Promise<void>
  disconnect: () => void
  isConnected: boolean
  isConnecting: boolean
  connectionStatus: ConnectionStatus
  error: Error | null
}

const API_URL = getApiBaseUrl()

export function useRealtimeCoach(): UseRealtimeCoachReturn {
  const clientRef = useRef<RealtimeClient | null>(null)
  const prosodyTrackerRef = useRef<ReturnType<typeof createProsodyVarianceTracker> | null>(null)
  const userSpeakingRef = useRef(false)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<Error | null>(null)

  const {
    setStatus,
    addNudge,
    addTranscriptSegment,
    updateMetrics,
    setAnswerStartTime,
    mode,
    scenarioId,
    counterparty,
    situation,
    companyUrl,
    companyNotes,
    companyBriefSummary,
    scenarioOverride,
  } = useSessionStore()

  const wordTimingsRef = useRef<WordTiming[]>([])
  const currentUtteranceTextRef = useRef<string>('')
  const currentUtteranceWordCountRef = useRef<number>(0)
  const currentUtteranceStartIndexRef = useRef<number>(0)
  const currentUtteranceStartSecRef = useRef<number | null>(null)

  // Create client on mount
  useEffect(() => {
    prosodyTrackerRef.current = createProsodyVarianceTracker((prosodyVariance) => {
      updateMetrics({ prosodyVariance })
    })

    clientRef.current = createRealtimeClient({
      onStatusChange: (status) => {
        setConnectionStatus(status)
        switch (status) {
          case 'connecting':
            setStatus('connecting')
            break
          case 'connected':
            setStatus('recording')
            setError(null)
            break
          case 'disconnected':
            userSpeakingRef.current = false
            prosodyTrackerRef.current?.setActive(false)
            void prosodyTrackerRef.current?.stop()
            break
          case 'failed':
            setStatus('idle')
            userSpeakingRef.current = false
            prosodyTrackerRef.current?.setActive(false)
            void prosodyTrackerRef.current?.stop()
            break
        }
      },
      onSpeechStart: () => {
        userSpeakingRef.current = true
        prosodyTrackerRef.current?.setActive(true)
        currentUtteranceTextRef.current = ''
        currentUtteranceWordCountRef.current = 0
        currentUtteranceStartIndexRef.current = wordTimingsRef.current.length
        currentUtteranceStartSecRef.current = Date.now() / 1000
        const { answerStartTime } = useSessionStore.getState()
        if (answerStartTime === null) setAnswerStartTime(Date.now())
      },
      onSpeechStop: () => {
        userSpeakingRef.current = false
        prosodyTrackerRef.current?.setActive(false)
      },
      onAIResponseStart: () => {
        // Reset answer timer when AI starts audible output.
        setAnswerStartTime(null)
        userSpeakingRef.current = false
        prosodyTrackerRef.current?.setActive(false)
      },
      onAIResponseDone: () => {
        // AI finished responding, user can start their next answer
      },
      onToolCall: (name, args) => {
        if (name === 'nudge') {
          const { text, severity, reason } = args as {
            text: string
            severity: 'gentle' | 'firm' | 'urgent'
            reason: string
          }
          addNudge({ text, severity, reason })
        }
      },
      onTranscript: (text, isFinal) => {
        const nowSec = Date.now() / 1000

        const syncCurrentUtteranceTimings = (utteranceWords: string[]) => {
          const startIndex = Math.max(
            0,
            Math.min(currentUtteranceStartIndexRef.current, wordTimingsRef.current.length)
          )

          // Replace the current-utterance region (keeps previous utterances intact).
          wordTimingsRef.current.splice(startIndex)

          const { answerStartTime } = useSessionStore.getState()
          const utteranceStart =
            currentUtteranceStartSecRef.current ??
            (answerStartTime !== null ? answerStartTime / 1000 : nowSec)

          const duration = Math.max(0.4, nowSec - utteranceStart)
          const step = duration / Math.max(1, utteranceWords.length)

          utteranceWords.forEach((word, index) => {
            const start = utteranceStart + index * step
            const end = utteranceStart + (index + 1) * step
            wordTimingsRef.current.push({ word, start, end })
          })
        }

        if (!isFinal) {
          const deltaText = text ?? ''
          if (!deltaText) return

          currentUtteranceTextRef.current += deltaText
          const words = currentUtteranceTextRef.current
            .trim()
            .split(/\s+/)
            .filter(Boolean)

          const prevCount = currentUtteranceWordCountRef.current
          if (words.length <= prevCount) return

          currentUtteranceWordCountRef.current = words.length
          syncCurrentUtteranceTimings(words)

          // Shorter window makes the UI feel more responsive.
          const { wpm, fillerCount, fillerRate } = calculateMetrics(
            wordTimingsRef.current,
            12,
            nowSec
          )
          updateMetrics({ wpm, fillerCount, fillerRate })
          return
        }

        if (!text.trim()) return

        const finalWords = text.trim().split(/\s+/).filter(Boolean)
        currentUtteranceWordCountRef.current = finalWords.length
        syncCurrentUtteranceTimings(finalWords)

        const { wpm, fillerCount, fillerRate } = calculateMetrics(
          wordTimingsRef.current,
          12,
          nowSec
        )
        updateMetrics({ wpm, fillerCount, fillerRate })

        currentUtteranceTextRef.current = ''
        currentUtteranceWordCountRef.current = 0
        currentUtteranceStartIndexRef.current = wordTimingsRef.current.length
        currentUtteranceStartSecRef.current = null

        addTranscriptSegment({
          text,
          speaker: 'user',
          startTime: Date.now(),
          endTime: Date.now(),
        })
      },
      onError: (err) => {
        console.error('[useRealtimeCoach] Error:', err)
        setError(err)
      },
    })

    return () => {
      clientRef.current?.disconnect()
      void prosodyTrackerRef.current?.stop()
      prosodyTrackerRef.current = null
    }
  }, [
    setStatus,
    addNudge,
    addTranscriptSegment,
    updateMetrics,
    setAnswerStartTime,
  ])

  const connect = useCallback(
    async (audioTrack: MediaStreamTrack) => {
      setError(null)
      wordTimingsRef.current = []
      currentUtteranceTextRef.current = ''
      currentUtteranceWordCountRef.current = 0
      currentUtteranceStartIndexRef.current = 0
      currentUtteranceStartSecRef.current = null
      setAnswerStartTime(null)
      updateMetrics({ wpm: 0, fillerCount: 0, fillerRate: 0, prosodyVariance: 0 })
      userSpeakingRef.current = false
      prosodyTrackerRef.current?.setActive(false)

      try {
        // Fetch ephemeral token from backend
        const response = await fetch(`${API_URL}/api/realtime/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode,
            scenario_id: scenarioId,
            scenario: scenarioOverride,
            counterparty,
            situation,
            company_url: companyUrl,
            company_notes: companyNotes,
            company_brief_summary: companyBriefSummary,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({} as any))
          throw new Error(
            errorData.detail ||
              errorData.error ||
              `Failed to get ephemeral token: ${response.status}`
          )
        }

        const { client_secret, model } = await response.json()

        // Connect to OpenAI Realtime
        await clientRef.current?.connect(client_secret, audioTrack, model)

        // Start local-only prosody tracking (best-effort; failures shouldn't block the session).
        try {
          await prosodyTrackerRef.current?.start(audioTrack)
        } catch (err) {
          console.warn('[useRealtimeCoach] Prosody tracker failed to start:', err)
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to connect')
        setError(error)
        throw error
      }
    },
    [
      mode,
      scenarioId,
      counterparty,
      situation,
      companyUrl,
      companyNotes,
      companyBriefSummary,
      scenarioOverride,
      setAnswerStartTime,
      updateMetrics,
    ]
  )

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect()
    void prosodyTrackerRef.current?.stop()
    wordTimingsRef.current = []
    currentUtteranceTextRef.current = ''
    currentUtteranceWordCountRef.current = 0
    currentUtteranceStartIndexRef.current = 0
    currentUtteranceStartSecRef.current = null
    setAnswerStartTime(null)
    updateMetrics({ wpm: 0, fillerCount: 0, fillerRate: 0, prosodyVariance: 0 })
  }, [setAnswerStartTime, updateMetrics])

  return {
    connect,
    disconnect,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    connectionStatus,
    error,
  }
}
