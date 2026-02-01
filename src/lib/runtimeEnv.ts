export type RuntimeEnv = {
  NEXT_PUBLIC_API_URL?: string
  NEXT_PUBLIC_FACE_PHRASE_MODEL_ENABLED?: string
}

declare global {
  interface Window {
    __RUNTIME_ENV__?: RuntimeEnv
  }
}

export function getRuntimeEnv(): RuntimeEnv {
  if (typeof window !== 'undefined') return window.__RUNTIME_ENV__ ?? {}

  return {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_FACE_PHRASE_MODEL_ENABLED:
      process.env.NEXT_PUBLIC_FACE_PHRASE_MODEL_ENABLED,
  }
}

export function getApiBaseUrl(): string {
  // In the browser, always use same-origin requests and rely on the Next.js
  // `/api/*` proxy route to reach the backend. This avoids CORS in production.
  if (typeof window !== 'undefined') return ''

  const runtimeEnv = getRuntimeEnv()
  return (
    runtimeEnv.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000'
  )
}

export function isFacePhraseModelEnabled(): boolean {
  const runtimeEnv = getRuntimeEnv()
  const value =
    runtimeEnv.NEXT_PUBLIC_FACE_PHRASE_MODEL_ENABLED ||
    process.env.NEXT_PUBLIC_FACE_PHRASE_MODEL_ENABLED ||
    ''
  return value.toLowerCase() === 'true'
}
