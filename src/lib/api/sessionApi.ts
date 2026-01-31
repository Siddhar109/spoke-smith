import { AnalysisResult } from '@/stores/sessionStore'
import type { WordTiming } from '@/lib/analysis/voiceMetrics'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface UploadSessionRequest {
  sessionId: string
  scenarioId: string | null
  mode: 'coach' | 'journalist'
  transcript: Array<{
    text: string
    speaker: 'user' | 'ai'
    startTime: number
    endTime: number
  }>
}

export interface UploadSessionResponse {
  session_id: string
  status: 'pending' | 'processing' | 'complete' | 'error'
  transcript_text?: string
  word_timings?: WordTiming[]
}

export interface AnalysisResponse {
  session_id: string
  status: 'pending' | 'processing' | 'complete' | 'error'
  analysis?: AnalysisResult
  error?: string
}

function filenameForAudioBlob(audioBlob: Blob): string {
  const mimeType = (audioBlob.type || '').split(';', 1)[0].trim()
  const extension =
    mimeType === 'audio/webm' || mimeType === 'video/webm'
      ? 'webm'
      : mimeType === 'audio/mp4' || mimeType === 'video/mp4'
        ? 'mp4'
        : mimeType === 'audio/mpeg'
          ? 'mp3'
          : mimeType === 'audio/wav'
            ? 'wav'
            : mimeType === 'audio/ogg'
              ? 'ogg'
              : 'webm'

  return `session.${extension}`
}

export async function uploadSession(
  data: UploadSessionRequest,
  audioBlob: Blob
): Promise<UploadSessionResponse> {
  const formData = new FormData()
  formData.append('audio', audioBlob, filenameForAudioBlob(audioBlob))
  formData.append('metadata', JSON.stringify(data))

  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Upload failed: ${error}`)
  }

  return response.json()
}

export async function getAnalysis(sessionId: string): Promise<AnalysisResponse> {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}/analysis`)

  if (!response.ok) {
    throw new Error(`Failed to get analysis: ${response.status}`)
  }

  return response.json()
}

export async function pollAnalysis(
  sessionId: string,
  onProgress?: (status: string) => void,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<AnalysisResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getAnalysis(sessionId)

    if (result.status === 'complete' || result.status === 'error') {
      return result
    }

    onProgress?.(result.status)
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error('Analysis timed out')
}
