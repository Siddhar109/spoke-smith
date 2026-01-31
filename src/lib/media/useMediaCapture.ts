'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseMediaCaptureOptions {
  audio?: boolean
  video?: boolean
  audioDeviceId?: string | null
  videoDeviceId?: string | null
}

interface UseMediaCaptureReturn {
  stream: MediaStream | null
  isCapturing: boolean
  error: Error | null
  startCapture: () => Promise<MediaStream>
  stopCapture: () => void
  getAudioTrack: () => MediaStreamTrack | null
  getVideoTrack: () => MediaStreamTrack | null
  audioDevices: MediaDeviceInfo[]
  videoDevices: MediaDeviceInfo[]
  refreshDevices: () => Promise<void>
}

export function useMediaCapture(
  options: UseMediaCaptureOptions = { audio: true, video: true }
): UseMediaCaptureReturn {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    const devices = await navigator.mediaDevices.enumerateDevices()
    setAudioDevices(devices.filter((d) => d.kind === 'audioinput'))
    setVideoDevices(devices.filter((d) => d.kind === 'videoinput'))
  }, [])

  useEffect(() => {
    void refreshDevices()
    if (!navigator.mediaDevices?.addEventListener) return
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', refreshDevices)
    }
  }, [refreshDevices])

  const startCapture = useCallback(async () => {
    try {
      const baseConstraints: MediaStreamConstraints = {
        audio: options.audio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              ...(options.audioDeviceId
                ? { deviceId: { exact: options.audioDeviceId } }
                : {}),
            }
          : false,
        video: options.video
          ? {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30 },
              facingMode: 'user',
              ...(options.videoDeviceId
                ? { deviceId: { exact: options.videoDeviceId } }
                : {}),
            }
          : false,
      }

      let mediaStream: MediaStream
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(baseConstraints)
      } catch (err) {
        // If a selected device is no longer available, retry without deviceId constraints.
        const shouldRetry =
          !!options.audioDeviceId || !!options.videoDeviceId
        if (!shouldRetry) throw err

        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: options.audio
            ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            : false,
          video: options.video
            ? {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 30 },
                facingMode: 'user',
              }
            : false,
        })
      }

      streamRef.current = mediaStream
      setStream(mediaStream)
      setIsCapturing(true)
      setError(null)
      void refreshDevices()
      return mediaStream
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to capture media')
      setError(error)
      throw error
    }
  }, [
    options.audio,
    options.audioDeviceId,
    options.video,
    options.videoDeviceId,
    refreshDevices,
  ])

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setStream(null)
      setIsCapturing(false)
    }
  }, [])

  const getAudioTrack = useCallback(() => {
    return streamRef.current?.getAudioTracks()[0] ?? null
  }, [])

  const getVideoTrack = useCallback(() => {
    return streamRef.current?.getVideoTracks()[0] ?? null
  }, [])

  return {
    stream,
    isCapturing,
    error,
    startCapture,
    stopCapture,
    getAudioTrack,
    getVideoTrack,
    audioDevices,
    videoDevices,
    refreshDevices,
  }
}
