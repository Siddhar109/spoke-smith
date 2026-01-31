'use client'

import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/sessionStore'

interface UseFaceCoachOptions {
  fps?: number
  nudgeCooldownMs?: number
}

type FaceIssue = 'faceMissing' | 'framing' | 'lighting'

const DEFAULT_FPS = 6
const DEFAULT_NUDGE_COOLDOWN_MS = 12000
const ISSUE_PERSIST_MS = 2000

export function useFaceCoach(
  stream: MediaStream | null,
  options: UseFaceCoachOptions = {}
) {
  const updateFaceMetrics = useSessionStore((state) => state.updateFaceMetrics)
  const addNudge = useSessionStore((state) => state.addNudge)
  const statusRef = useRef(useSessionStore.getState().status)

  const facePresentRef = useRef(0)
  const framingRef = useRef(0)
  const distanceRef = useRef(0)
  const lightingRef = useRef(0)
  const lastNudgeAtRef = useRef(0)
  const issueSinceRef = useRef<Record<FaceIssue, number>>({
    faceMissing: 0,
    framing: 0,
    lighting: 0,
  })

  useEffect(() => {
    const unsubscribe = useSessionStore.subscribe((state) => {
      statusRef.current = state.status
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

    const maybeNudge = (issue: FaceIssue, message: string, reason: string) => {
      const now = Date.now()
      const cooldownMs = options.nudgeCooldownMs ?? DEFAULT_NUDGE_COOLDOWN_MS
      if (now - lastNudgeAtRef.current < cooldownMs) return
      if (!shouldNudge(issue, now)) return
      if (statusRef.current !== 'recording') return

      lastNudgeAtRef.current = now
      addNudge({ text: message, severity: 'gentle', reason })
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
        maybeNudge('faceMissing', 'Keep your face in frame', 'camera_presence')
      } else {
        maybeNudge('framing', 'Center yourself in frame', 'camera_framing')
        maybeNudge('lighting', 'Add a little more front light', 'lighting')
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
  }, [stream, updateFaceMetrics, addNudge, options.fps, options.nudgeCooldownMs])
}
