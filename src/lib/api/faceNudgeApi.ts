const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface FaceNudgePhraseRequest {
  t_ms: number
  reason: string
  severity: 'gentle' | 'firm' | 'urgent'
  fallback_text: string
  context?: {
    scenario_id?: string | null
    user_goal?: string | null
    mode?: 'coach' | 'journalist' | string | null
  }
  signals?: {
    face_present?: number
    framing?: number
    lighting?: number
    tracking_confidence?: number
  }
}

export interface FaceNudgePhraseResponse {
  abstain: boolean
  text: string
  cooldown_ms?: number
}

export interface FaceNudgeVerifyRequest {
  t_ms: number
  reason: string
  severity: 'gentle' | 'firm' | 'urgent'
  fallback_text: string
  signals?: {
    face_present?: number
    framing?: number
    lighting?: number
    tracking_confidence?: number
  }
  image: {
    mime_type: string
    base64: string
  }
}

export interface FaceNudgeVerifyResponse {
  verified: boolean
  abstain: boolean
  text: string
  cooldown_ms?: number
}

async function postJson<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Request failed: ${error || response.status}`)
  }

  return response.json()
}

export function requestFaceNudgePhrase(
  data: FaceNudgePhraseRequest,
  signal?: AbortSignal
): Promise<FaceNudgePhraseResponse> {
  return postJson<FaceNudgePhraseResponse>('/api/face/nudge/phrase', data, signal)
}

export function requestFaceNudgeVerify(
  data: FaceNudgeVerifyRequest,
  signal?: AbortSignal
): Promise<FaceNudgeVerifyResponse> {
  return postJson<FaceNudgeVerifyResponse>('/api/face/nudge/verify', data, signal)
}
