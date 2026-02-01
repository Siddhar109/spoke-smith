'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import {
  createRealtimeClient,
  type RealtimeClient,
  type ConnectionStatus,
} from '@/lib/openai/realtimeClient'
import { useSessionStore } from '@/stores/sessionStore'
import { calculateMetrics, type WordTiming } from '@/lib/analysis/voiceMetrics'
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
  } = useSessionStore()

  const wordTimingsRef = useRef<WordTiming[]>([])
  const currentUtteranceTextRef = useRef<string>('')
  const currentUtteranceWordCountRef = useRef<number>(0)

  // Create client on mount
  useEffect(() => {
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
          case 'failed':
            setStatus('idle')
            break
        }
      },
      onSpeechStart: () => {
        currentUtteranceTextRef.current = ''
        currentUtteranceWordCountRef.current = 0
        const { answerStartTime } = useSessionStore.getState()
        if (answerStartTime === null) setAnswerStartTime(Date.now())
      },
      onSpeechStop: () => {},
      onAIResponseStart: () => {
        // Reset answer timer when AI starts audible output.
        setAnswerStartTime(null)
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
        const deltaText = text ?? ''
        if (!isFinal) {
          currentUtteranceTextRef.current += deltaText

          const words = currentUtteranceTextRef.current
            .trim()
            .split(/\s+/)
            .filter(Boolean)

          const prevCount = currentUtteranceWordCountRef.current
          if (words.length > prevCount) {
            const now = Date.now() / 1000
            for (let i = prevCount; i < words.length; i++) {
              wordTimingsRef.current.push({ word: words[i], start: now, end: now })
            }
            currentUtteranceWordCountRef.current = words.length

            const { wpm, fillerCount, fillerRate } = calculateMetrics(
              wordTimingsRef.current,
              30
            )
            updateMetrics({ wpm, fillerCount, fillerRate })
          }
          return
        }

        if (text.trim()) {
          const nowSec = Date.now() / 1000
          const finalWords = text.trim().split(/\s+/).filter(Boolean)
          const prevCount = currentUtteranceWordCountRef.current
          const newWords = finalWords.slice(prevCount)
          const lastTiming =
            wordTimingsRef.current.length > 0
              ? wordTimingsRef.current[wordTimingsRef.current.length - 1].end
              : null
          const { answerStartTime } = useSessionStore.getState()

          if (newWords.length > 0) {
            if (lastTiming !== null) {
              const duration = Math.max(0.1, nowSec - lastTiming)
              const step = duration / newWords.length
              newWords.forEach((word, index) => {
                const start = lastTiming + index * step
                wordTimingsRef.current.push({
                  word,
                  start,
                  end: start + step,
                })
              })
            } else {
              const utteranceStart =
                answerStartTime !== null ? answerStartTime / 1000 : nowSec
              const duration = Math.max(
                newWords.length * 0.35,
                nowSec - utteranceStart
              )
              const step = duration / newWords.length
              const startBase = nowSec - duration
              newWords.forEach((word, index) => {
                const start = startBase + index * step
                wordTimingsRef.current.push({
                  word,
                  start,
                  end: start + step,
                })
              })
            }
          }

          const { wpm, fillerCount, fillerRate } = calculateMetrics(
            wordTimingsRef.current,
            30
          )
          updateMetrics({ wpm, fillerCount, fillerRate })

          currentUtteranceTextRef.current = ''
          currentUtteranceWordCountRef.current = 0

          addTranscriptSegment({
            text,
            speaker: 'user',
            startTime: Date.now(),
            endTime: Date.now(),
          })
        }
      },
      onError: (err) => {
        console.error('[useRealtimeCoach] Error:', err)
        setError(err)
      },
    })

    return () => {
      clientRef.current?.disconnect()
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
      setAnswerStartTime(null)
      updateMetrics({ wpm: 0, fillerCount: 0, fillerRate: 0 })

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
            counterparty,
            situation,
            company_url: companyUrl,
            company_notes: companyNotes,
            company_brief_summary: companyBriefSummary,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.detail || `Failed to get ephemeral token: ${response.status}`
          )
        }

        const { client_secret, model } = await response.json()

        // Connect to OpenAI Realtime
        await clientRef.current?.connect(client_secret, audioTrack, model)
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
      setAnswerStartTime,
      updateMetrics,
    ]
  )

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect()
    wordTimingsRef.current = []
    currentUtteranceTextRef.current = ''
    currentUtteranceWordCountRef.current = 0
    setAnswerStartTime(null)
    updateMetrics({ wpm: 0, fillerCount: 0, fillerRate: 0 })
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
