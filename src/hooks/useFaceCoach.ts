'use client'

import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import {
  requestFaceNudgePhrase,
  requestFaceNudgeVerify,
} from '@/lib/api/faceNudgeApi'

interface UseFaceCoachOptions {
  fps?: number
  nudgeCooldownMs?: number
}

type FaceIssue = 'faceMissing' | 'framing' | 'lighting'

const DEFAULT_FPS = 6
const DEFAULT_NUDGE_COOLDOWN_MS = 12000
const DEFAULT_PHRASE_TIMEOUT_MS = 3000
const DEFAULT_VERIFY_TIMEOUT_MS = 4500
const ISSUE_PERSIST_MS = 2000
const MAX_PHRASE_CALLS_PER_SESSION = 40
const KEYFRAME_MIN_INTERVAL_MS = 180000
const KEYFRAME_MARGIN = 0.28
const KEYFRAME_MIN_LONG_SIDE = 256
const KEYFRAME_MAX_LONG_SIDE = 512
const KEYFRAME_JPEG_QUALITY = 0.72

export function useFaceCoach(
  stream: MediaStream | null,
  options: UseFaceCoachOptions = {}
) {
  const updateFaceMetrics = useSessionStore((state) => state.updateFaceMetrics)
  const addNudge = useSessionStore((state) => state.addNudge)
  const updateNudgeText = useSessionStore((state) => state.updateNudgeText)
  const statusRef = useRef(useSessionStore.getState().status)
  const settingsRef = useRef({
    facePhraseModelEnabled: useSessionStore.getState().facePhraseModelEnabled,
    faceKeyframesEnabled: useSessionStore.getState().faceKeyframesEnabled,
    strictPrivacyMode: useSessionStore.getState().strictPrivacyMode,
    scenarioId: useSessionStore.getState().scenarioId,
    mode: useSessionStore.getState().mode,
    startTime: useSessionStore.getState().startTime,
    sessionId: useSessionStore.getState().sessionId,
  })
  const sessionIdRef = useRef(useSessionStore.getState().sessionId)

  const facePresentRef = useRef(0)
  const framingRef = useRef(0)
  const distanceRef = useRef(0)
  const lightingRef = useRef(0)
  const lastNudgeAtRef = useRef(0)
  const cooldownUntilRef = useRef(0)
  const issueSinceRef = useRef<Record<FaceIssue, number>>({
    faceMissing: 0,
    framing: 0,
    lighting: 0,
  })
  const inFlightRef = useRef(false)
  const phraseCallCountRef = useRef(0)
  const lastKeyframeAtRef = useRef(0)
  const activeAbortRef = useRef<AbortController | null>(null)
  const lastFaceBoxRef = useRef<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  useEffect(() => {
    const unsubscribe = useSessionStore.subscribe((state) => {
      statusRef.current = state.status
      settingsRef.current = {
        facePhraseModelEnabled: state.facePhraseModelEnabled,
        faceKeyframesEnabled: state.faceKeyframesEnabled,
        strictPrivacyMode: state.strictPrivacyMode,
        scenarioId: state.scenarioId,
        mode: state.mode,
        startTime: state.startTime,
        sessionId: state.sessionId,
      }
      if (state.sessionId !== sessionIdRef.current) {
        sessionIdRef.current = state.sessionId
        phraseCallCountRef.current = 0
        lastKeyframeAtRef.current = 0
        lastNudgeAtRef.current = 0
        cooldownUntilRef.current = 0
        issueSinceRef.current = {
          faceMissing: 0,
          framing: 0,
          lighting: 0,
        }
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!stream) {
      updateFaceMetrics({
        facePresent: 0,
        framing: 0,
        distance: 0,
        lighting: 0,
        faceDetected: false,
        lastUpdated: null,
      })
      return
    }

    let rafId = 0
    let stopped = false
    let lastSample = 0
    let faceLandmarker:
      | import('@mediapipe/tasks-vision').FaceLandmarker
      | null = null

    const video = document.createElement('video')
    video.playsInline = true
    video.muted = true
    video.srcObject = stream

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const keyframeCanvas = document.createElement('canvas')
    const keyframeCtx = keyframeCanvas.getContext('2d')

    const fps = options.fps ?? DEFAULT_FPS
    const intervalMs = 1000 / fps
    const wasmBaseUrl =
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
    const modelUrl =
      'https://storage.googleapis.com/mediapipe-assets/face_landmarker.task'

    const updateIssueSince = (issue: FaceIssue, isBad: boolean, now: number) => {
      if (isBad) {
        if (!issueSinceRef.current[issue]) {
          issueSinceRef.current[issue] = now
        }
      } else {
        issueSinceRef.current[issue] = 0
      }
    }

    const shouldNudge = (issue: FaceIssue, now: number) => {
      const since = issueSinceRef.current[issue]
      return since > 0 && now - since >= ISSUE_PERSIST_MS
    }

    const emitNudge = (
      message: string,
      reason: string,
      cooldownMsOverride?: number
    ) => {
      if (stopped) return
      if (statusRef.current !== 'recording') return
      const trimmed = message.trim()
      if (!trimmed) return
      const now = Date.now()
      const cooldownMs = options.nudgeCooldownMs ?? DEFAULT_NUDGE_COOLDOWN_MS
      const nextCooldown = Math.max(cooldownMs, cooldownMsOverride ?? 0)
      cooldownUntilRef.current = now + nextCooldown
      lastNudgeAtRef.current = now
      const nudgeId = addNudge({ text: trimmed, severity: 'gentle', reason })
      return { id: nudgeId, at: now, cooldownMs: nextCooldown }
    }

    const getSessionTMs = (nowMs: number) => {
      const startTime = settingsRef.current.startTime
      return startTime ? Math.max(0, nowMs - startTime) : 0
    }

    const buildSignals = (
      faceDetected: boolean,
      facePresent: number,
      framing: number,
      lighting: number,
      distance: number
    ) => {
      const baseConfidence = faceDetected
        ? (facePresent + framing + lighting + distance) / 4
        : facePresent * 0.6
      return {
        face_present: Number(facePresent.toFixed(3)),
        framing: Number(framing.toFixed(3)),
        lighting: Number(lighting.toFixed(3)),
        tracking_confidence: Number(
          Math.min(1, Math.max(0, baseConfidence)).toFixed(3)
        ),
      }
    }

    const shouldSendKeyframe = (
      issue: FaceIssue,
      signals: ReturnType<typeof buildSignals>
    ) => {
      const settings = settingsRef.current
      if (!settings.facePhraseModelEnabled) return false
      if (!settings.faceKeyframesEnabled) return false
      if (settings.strictPrivacyMode) return false
      if (!lastFaceBoxRef.current) return false
      if (Date.now() - lastKeyframeAtRef.current < KEYFRAME_MIN_INTERVAL_MS)
        return false

      const ambiguous =
        (signals.face_present ?? 0) < 0.35 ||
        (signals.tracking_confidence ?? 0) < 0.45 ||
        (signals.lighting ?? 0) < 0.35
      const highImpact = issue === 'faceMissing' || issue === 'framing'
      return ambiguous && highImpact
    }

    const captureKeyframe = () => {
      if (!keyframeCtx) return null
      const box = lastFaceBoxRef.current
      if (!box) return null
      const width = video.videoWidth
      const height = video.videoHeight
      if (!width || !height) return null

      const marginX = box.width * KEYFRAME_MARGIN
      const marginY = box.height * KEYFRAME_MARGIN
      const cropX = Math.max(0, box.x - marginX)
      const cropY = Math.max(0, box.y - marginY)
      const cropW = Math.min(width - cropX, box.width + marginX * 2)
      const cropH = Math.min(height - cropY, box.height + marginY * 2)

      if (cropW <= 0 || cropH <= 0) return null

      const longSide = Math.max(cropW, cropH)
      const targetLong = Math.max(
        KEYFRAME_MIN_LONG_SIDE,
        Math.min(KEYFRAME_MAX_LONG_SIDE, longSide)
      )
      const scale = targetLong / longSide
      const targetW = Math.max(1, Math.round(cropW * scale))
      const targetH = Math.max(1, Math.round(cropH * scale))

      keyframeCanvas.width = targetW
      keyframeCanvas.height = targetH
      keyframeCtx.drawImage(
        video,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        targetW,
        targetH
      )

      const dataUrl = keyframeCanvas.toDataURL(
        'image/jpeg',
        KEYFRAME_JPEG_QUALITY
      )
      const base64 = dataUrl.split(',', 2)[1]
      if (!base64) return null

      return { mime_type: 'image/jpeg', base64 }
    }

    const withTimeout = async <T,>(
      request: (signal: AbortSignal) => Promise<T>,
      timeoutMs: number
    ) => {
      const controller = new AbortController()
      activeAbortRef.current = controller
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      try {
        return await request(controller.signal)
      } finally {
        clearTimeout(timeoutId)
        if (activeAbortRef.current === controller) {
          activeAbortRef.current = null
        }
      }
    }

    const maybeNudge = async (
      issue: FaceIssue,
      message: string,
      reason: string,
      signals: ReturnType<typeof buildSignals>,
      nowMs: number
    ) => {
      if (stopped) return
      const now = Date.now()
      const cooldownMs = options.nudgeCooldownMs ?? DEFAULT_NUDGE_COOLDOWN_MS
      if (now < cooldownUntilRef.current) return
      if (!shouldNudge(issue, now)) return
      if (statusRef.current !== 'recording') return
      if (now - lastNudgeAtRef.current < cooldownMs) return

      const settings = settingsRef.current
      const payload = {
        t_ms: getSessionTMs(nowMs),
        reason,
        severity: 'gentle' as const,
        fallback_text: message,
        context: {
          scenario_id: settings.scenarioId ?? undefined,
          mode: settings.mode ?? undefined,
        },
        signals,
      }

      const emitFallback = () => emitNudge(message, reason)

      if (
        !settings.facePhraseModelEnabled ||
        inFlightRef.current ||
        phraseCallCountRef.current >= MAX_PHRASE_CALLS_PER_SESSION
      ) {
        emitFallback()
        return
      }

      inFlightRef.current = true
      phraseCallCountRef.current += 1

      let fallbackAlreadyEmitted = false
      try {
        if (shouldSendKeyframe(issue, signals)) {
          const image = captureKeyframe()
          if (!image) {
            emitFallback()
            return
          }
          lastKeyframeAtRef.current = now
          const response = await withTimeout(
            (signal) =>
              requestFaceNudgeVerify(
                {
                  ...payload,
                  image,
                },
                signal
              ),
            DEFAULT_VERIFY_TIMEOUT_MS
          )

          if (!response.verified) return
          const text = response.abstain ? message : response.text || message
          emitNudge(text, reason, response.cooldown_ms)
          return
        }

        const fallback = emitFallback()
        fallbackAlreadyEmitted = true
        if (!fallback) return

        const response = await withTimeout(
          (signal) => requestFaceNudgePhrase(payload, signal),
          DEFAULT_PHRASE_TIMEOUT_MS
        )

        if (!response.abstain) {
          const text = response.text?.trim()
          if (text) updateNudgeText(fallback.id, text)
        }

        const override = response.cooldown_ms
        if (typeof override === 'number' && override > 0) {
          const extended = fallback.at + Math.max(fallback.cooldownMs, override)
          cooldownUntilRef.current = Math.max(cooldownUntilRef.current, extended)
        }
      } catch (err) {
        if (!fallbackAlreadyEmitted) emitFallback()
      } finally {
        inFlightRef.current = false
      }
    }

    const computeFaceBox = (
      landmarks: Array<{ x: number; y: number }> | undefined,
      width: number,
      height: number
    ) => {
      if (!landmarks || landmarks.length === 0) return null
      let minX = 1
      let minY = 1
      let maxX = 0
      let maxY = 0
      for (const lm of landmarks) {
        minX = Math.min(minX, lm.x)
        minY = Math.min(minY, lm.y)
        maxX = Math.max(maxX, lm.x)
        maxY = Math.max(maxY, lm.y)
      }

      const x = Math.max(0, minX) * width
      const y = Math.max(0, minY) * height
      const w = Math.min(1, maxX) * width - x
      const h = Math.min(1, maxY) * height - y
      if (w <= 0 || h <= 0) return null
      return { x, y, width: w, height: h }
    }

    const analyze = async (now: number) => {
      if (stopped) return

      if (now - lastSample < intervalMs) {
        rafId = requestAnimationFrame(analyze)
        return
      }
      lastSample = now

      if (video.readyState < 2 || !faceLandmarker) {
        rafId = requestAnimationFrame(analyze)
        return
      }

      const width = video.videoWidth
      const height = video.videoHeight
      if (!width || !height) {
        rafId = requestAnimationFrame(analyze)
        return
      }

      let faceDetected = false
      let framingScore = 0
      let distanceScore = 0

      try {
        const results = faceLandmarker.detectForVideo(video, now)
        const landmarks = results.faceLandmarks?.[0]
        if (landmarks?.length) {
          faceDetected = true
          const box = computeFaceBox(landmarks, width, height)
          if (box) {
            lastFaceBoxRef.current = box
            const faceCenterX = box.x + box.width / 2
            const faceCenterY = box.y + box.height / 2
            const centerX = width / 2
            const centerY = height / 2
            const dx = (faceCenterX - centerX) / width
            const dy = (faceCenterY - centerY) / height
            const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 1.6)
            framingScore = Math.max(0, 1 - dist)

            const areaRatio = (box.width * box.height) / (width * height)
            const idealMin = 0.08
            const idealMax = 0.18
            if (areaRatio < idealMin) {
              distanceScore = Math.max(0, areaRatio / idealMin)
            } else if (areaRatio > idealMax) {
              distanceScore = Math.max(0, idealMax / areaRatio)
            } else {
              distanceScore = 1
            }
          }
        }
      } catch (err) {
        faceDetected = false
      }
      if (!faceDetected) {
        lastFaceBoxRef.current = null
      }

      let lightingScore = lightingRef.current
      if (ctx) {
        const sampleWidth = 160
        const sampleHeight = Math.max(90, Math.round((height / width) * sampleWidth))
        if (canvas.width !== sampleWidth || canvas.height !== sampleHeight) {
          canvas.width = sampleWidth
          canvas.height = sampleHeight
        }
        ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight)
        const image = ctx.getImageData(0, 0, sampleWidth, sampleHeight)
        const data = image.data
        let sum = 0
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
          sum += lum
        }
        const avgLum = sum / (data.length / 4)
        lightingScore = 1 - Math.min(1, Math.abs(avgLum - 0.55) / 0.35)
      }

      const smoothing = 0.25
      const nextFacePresent =
        facePresentRef.current +
        smoothing * ((faceDetected ? 1 : 0) - facePresentRef.current)
      const nextFraming =
        framingRef.current + smoothing * (framingScore - framingRef.current)
      const nextDistance =
        distanceRef.current + smoothing * (distanceScore - distanceRef.current)
      const nextLighting =
        lightingRef.current + smoothing * (lightingScore - lightingRef.current)

      facePresentRef.current = nextFacePresent
      framingRef.current = nextFraming
      distanceRef.current = nextDistance
      lightingRef.current = nextLighting

      const nowMs = Date.now()

      updateFaceMetrics({
        facePresent: nextFacePresent,
        framing: nextFraming,
        distance: nextDistance,
        lighting: nextLighting,
        faceDetected,
        lastUpdated: nowMs,
      })

      updateIssueSince('faceMissing', nextFacePresent < 0.2, nowMs)
      updateIssueSince('framing', faceDetected && nextFraming < 0.45, nowMs)
      updateIssueSince(
        'lighting',
        nextFacePresent >= 0.2 && nextLighting < 0.35,
        nowMs
      )

      if (nextFacePresent < 0.2) {
        void maybeNudge(
          'faceMissing',
          'Keep your face in frame',
          'camera_presence',
          buildSignals(
            faceDetected,
            nextFacePresent,
            nextFraming,
            nextLighting,
            nextDistance
          ),
          nowMs
        )
      } else {
        const signals = buildSignals(
          faceDetected,
          nextFacePresent,
          nextFraming,
          nextLighting,
          nextDistance
        )
        void maybeNudge(
          'framing',
          'Center yourself in frame',
          'camera_framing',
          signals,
          nowMs
        )
        void maybeNudge(
          'lighting',
          'Add a little more front light',
          'lighting',
          signals,
          nowMs
        )
      }

      rafId = requestAnimationFrame(analyze)
    }

    const start = async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import(
          '@mediapipe/tasks-vision'
        )
        const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl)
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
          },
          runningMode: 'VIDEO',
          numFaces: 1,
        })
        if (stopped) {
          faceLandmarker.close()
          return
        }
        updateFaceMetrics({ supported: true })
        await video.play().catch(() => null)
        rafId = requestAnimationFrame(analyze)
      } catch (err) {
        updateFaceMetrics({ supported: false })
      }
    }

    void start()

    return () => {
      stopped = true
      activeAbortRef.current?.abort()
      inFlightRef.current = false
      cancelAnimationFrame(rafId)
      video.pause()
      video.srcObject = null
      faceLandmarker?.close()
      updateFaceMetrics({
        facePresent: 0,
        framing: 0,
        distance: 0,
        lighting: 0,
        faceDetected: false,
        lastUpdated: null,
      })
    }
  }, [
    stream,
    updateFaceMetrics,
    addNudge,
    updateNudgeText,
    options.fps,
    options.nudgeCooldownMs,
  ])
}
