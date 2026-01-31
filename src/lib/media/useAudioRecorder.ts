'use client'

import { useCallback, useRef, useState } from 'react'

interface UseAudioRecorderReturn {
  isRecording: boolean
  startRecording: (stream: MediaStream) => void
  stopRecording: () => Promise<Blob | null>
  audioBlob: Blob | null
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback((stream: MediaStream) => {
    chunksRef.current = []
    setAudioBlob(null)

    // Use webm/opus - widely supported and good quality
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    const recorder = new MediaRecorder(stream, { mimeType })

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    recorder.start(1000) // Collect data every second
    mediaRecorderRef.current = recorder
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(null)
        return
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        setAudioBlob(blob)
        setIsRecording(false)
        mediaRecorderRef.current = null
        resolve(blob)
      }

      recorder.stop()
    })
  }, [])

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
  }
}
