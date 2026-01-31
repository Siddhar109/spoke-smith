/**
 * OpenAI Realtime API WebRTC Client
 *
 * This module provides a WebRTC client wrapper for connecting to the
 * OpenAI Realtime API for speech-to-speech communication.
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed'

export interface RealtimeClientOptions {
  onStatusChange?: (status: ConnectionStatus) => void
  onAudioOutput?: (audio: HTMLAudioElement) => void
  onToolCall?: (name: string, args: Record<string, unknown>) => void
  onTranscript?: (text: string, isFinal: boolean) => void
  onSpeechStart?: () => void
  onSpeechStop?: () => void
  onAIResponseStart?: () => void
  onAIResponseDone?: () => void
  onError?: (error: Error) => void
}

export interface RealtimeClient {
  connect: (token: string, audioTrack: MediaStreamTrack) => Promise<void>
  disconnect: () => void
  sendEvent: (event: Record<string, unknown>) => void
  status: ConnectionStatus
}

export function createRealtimeClient(options: RealtimeClientOptions): RealtimeClient {
  let peerConnection: RTCPeerConnection | null = null
  let dataChannel: RTCDataChannel | null = null
  let status: ConnectionStatus = 'disconnected'
  let audioElement: HTMLAudioElement | null = null

  const setStatus = (newStatus: ConnectionStatus) => {
    status = newStatus
    options.onStatusChange?.(newStatus)
  }

  const handleServerEvent = (message: Record<string, unknown>) => {
    const eventType = message.type as string

    switch (eventType) {
      // Tool call completed
      case 'response.function_call_arguments.done': {
        const { name, arguments: argsStr } = message as {
          name: string
          arguments: string
        }
        try {
          const args = JSON.parse(argsStr)
          console.log('[RealtimeClient] Tool call:', name, args)
          options.onToolCall?.(name, args)
        } catch (err) {
          console.error('[RealtimeClient] Failed to parse tool args:', err)
        }
        break
      }

      // Input audio transcription
      case 'conversation.item.input_audio_transcription.completed': {
        const { transcript } = message as { transcript: string }
        options.onTranscript?.(transcript, true)
        break
      }

      // Partial transcription
      case 'conversation.item.input_audio_transcription.delta': {
        const { delta } = message as { delta: string }
        options.onTranscript?.(delta, false)
        break
      }

      // Session created
      case 'session.created': {
        console.log('[RealtimeClient] Session created')
        break
      }

      // Session updated
      case 'session.updated': {
        console.log('[RealtimeClient] Session updated')
        break
      }

      // Error
      case 'error': {
        const { error } = message as { error: { message: string; code?: string } }
        console.error('[RealtimeClient] Error:', error)
        options.onError?.(new Error(error.message))
        break
      }

      // Speech started
      case 'input_audio_buffer.speech_started': {
        console.log('[RealtimeClient] Speech started')
        options.onSpeechStart?.()
        break
      }

      // Speech stopped
      case 'input_audio_buffer.speech_stopped': {
        console.log('[RealtimeClient] Speech stopped')
        options.onSpeechStop?.()
        break
      }

      // Response started
      case 'response.created': {
        console.log('[RealtimeClient] Response created')
        options.onAIResponseStart?.()
        break
      }

      // Response done
      case 'response.done': {
        console.log('[RealtimeClient] Response done')
        options.onAIResponseDone?.()
        break
      }

      // Response audio started
      case 'response.audio.delta': {
        // Audio is handled via WebRTC track, not data channel
        break
      }

      default:
        // Log other events for debugging
        console.log('[RealtimeClient] Event:', eventType)
    }
  }

  const connect = async (token: string, audioTrack: MediaStreamTrack) => {
    try {
      setStatus('connecting')

      // Create peer connection
      peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })

      // Handle remote audio
      audioElement = new Audio()
      audioElement.autoplay = true
      peerConnection.ontrack = (event) => {
        console.log('[RealtimeClient] Received remote track')
        audioElement!.srcObject = event.streams[0]
        options.onAudioOutput?.(audioElement!)
      }

      // Add local audio track
      peerConnection.addTrack(audioTrack)

      // Create data channel for events
      dataChannel = peerConnection.createDataChannel('oai-events')

      dataChannel.onopen = () => {
        console.log('[RealtimeClient] Data channel opened')
      }

      dataChannel.onclose = () => {
        console.log('[RealtimeClient] Data channel closed')
      }

      dataChannel.onerror = (event) => {
        console.error('[RealtimeClient] Data channel error:', event)
      }

      dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleServerEvent(message)
        } catch (err) {
          console.error('[RealtimeClient] Failed to parse message:', err)
        }
      }

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(
          '[RealtimeClient] Connection state:',
          peerConnection?.connectionState
        )
        if (peerConnection?.connectionState === 'failed') {
          setStatus('failed')
          options.onError?.(new Error('WebRTC connection failed'))
        }
      }

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log(
          '[RealtimeClient] ICE connection state:',
          peerConnection?.iceConnectionState
        )
      }

      // Create and set local description
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      // Wait for ICE gathering to complete
      await waitForIceGathering(peerConnection)

      // Send SDP to OpenAI
      const sdp = peerConnection.localDescription?.sdp
      if (!sdp) {
        throw new Error('No local SDP available')
      }

      console.log('[RealtimeClient] Sending SDP offer to OpenAI')
      const response = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/sdp',
          },
          body: sdp,
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to connect: ${response.status} - ${errorText}`)
      }

      // Set remote description
      const answerSdp = await response.text()
      await peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      })

      console.log('[RealtimeClient] Remote description set')

      // Wait for connection to establish
      await waitForConnection(peerConnection)

      setStatus('connected')
      console.log('[RealtimeClient] Connected successfully')
    } catch (err) {
      console.error('[RealtimeClient] Connection error:', err)
      setStatus('failed')
      options.onError?.(
        err instanceof Error ? err : new Error('Connection failed')
      )
      throw err
    }
  }

  const disconnect = () => {
    console.log('[RealtimeClient] Disconnecting')

    if (audioElement) {
      audioElement.pause()
      audioElement.srcObject = null
      audioElement = null
    }

    if (dataChannel) {
      dataChannel.close()
      dataChannel = null
    }

    if (peerConnection) {
      peerConnection.close()
      peerConnection = null
    }

    setStatus('disconnected')
  }

  const sendEvent = (event: Record<string, unknown>) => {
    if (dataChannel?.readyState === 'open') {
      dataChannel.send(JSON.stringify(event))
    } else {
      console.warn('[RealtimeClient] Data channel not open, cannot send event')
    }
  }

  return {
    connect,
    disconnect,
    sendEvent,
    get status() {
      return status
    },
  }
}

// Helper functions

async function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return

  return new Promise((resolve) => {
    const checkState = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', checkState)
        resolve()
      }
    }
    pc.addEventListener('icegatheringstatechange', checkState)
    // Timeout after 5 seconds
    setTimeout(resolve, 5000)
  })
}

async function waitForConnection(pc: RTCPeerConnection): Promise<void> {
  if (pc.connectionState === 'connected') return

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'))
    }, 15000)

    const handleStateChange = () => {
      if (pc.connectionState === 'connected') {
        clearTimeout(timeout)
        pc.removeEventListener('connectionstatechange', handleStateChange)
        resolve()
      } else if (pc.connectionState === 'failed') {
        clearTimeout(timeout)
        pc.removeEventListener('connectionstatechange', handleStateChange)
        reject(new Error('Connection failed'))
      }
    }

    pc.addEventListener('connectionstatechange', handleStateChange)
  })
}
