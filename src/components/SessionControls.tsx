'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SessionControlsProps {
  isConnected: boolean
  isConnecting: boolean
  onStart: () => void
  onStop: () => void
  onReset?: () => void
  audioDevices?: MediaDeviceInfo[]
  videoDevices?: MediaDeviceInfo[]
  selectedAudioDeviceId?: string | null
  selectedVideoDeviceId?: string | null
  onSelectAudioDeviceId?: (deviceId: string | null) => void
  onSelectVideoDeviceId?: (deviceId: string | null) => void
  onRefreshDevices?: () => void
  className?: string
}

export function SessionControls({
  isConnected,
  isConnecting,
  onStart,
  onStop,
  onReset,
  audioDevices,
  videoDevices,
  selectedAudioDeviceId,
  selectedVideoDeviceId,
  onSelectAudioDeviceId,
  onSelectVideoDeviceId,
  onRefreshDevices,
  className,
}: SessionControlsProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Device selection */}
      {!isConnected && !isConnecting && (audioDevices || videoDevices) && (
        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Devices</h3>
            {onRefreshDevices && (
              <button
                type="button"
                onClick={onRefreshDevices}
                className="text-xs text-slate-400 hover:text-slate-300"
              >
                Refresh
              </button>
            )}
          </div>

          <div className="space-y-3">
            {audioDevices && onSelectAudioDeviceId && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Microphone
                </label>
                <select
                  className="w-full text-sm bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200"
                  value={selectedAudioDeviceId ?? ''}
                  onChange={(e) =>
                    onSelectAudioDeviceId(e.target.value || null)
                  }
                >
                  <option value="">Default</option>
                  {audioDevices.map((d, idx) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {videoDevices && onSelectVideoDeviceId && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Camera
                </label>
                <select
                  className="w-full text-sm bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-slate-200"
                  value={selectedVideoDeviceId ?? ''}
                  onChange={(e) =>
                    onSelectVideoDeviceId(e.target.value || null)
                  }
                >
                  <option value="">Default</option>
                  {videoDevices.map((d, idx) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-3">
            If device names are blank, click Start once to grant permissions.
          </p>
        </div>
      )}

      {!isConnected && !isConnecting && (
        <Button
          onClick={onStart}
          size="xl"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Start Session
        </Button>
      )}

      {isConnecting && (
        <Button
          disabled
          size="xl"
          className="w-full bg-yellow-600 text-white"
        >
          <svg
            className="w-5 h-5 mr-2 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Connecting...
        </Button>
      )}

      {isConnected && (
        <Button
          onClick={onStop}
          size="xl"
          variant="destructive"
          className="w-full"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            />
          </svg>
          End Session
        </Button>
      )}

      {onReset && !isConnected && !isConnecting && (
        <Button
          onClick={onReset}
          variant="outline"
          size="lg"
          className="w-full"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset
        </Button>
      )}

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            isConnected
              ? 'bg-green-500'
              : isConnecting
              ? 'bg-yellow-500 animate-pulse'
              : 'bg-slate-500'
          )}
        />
        <span className="text-slate-400">
          {isConnected
            ? 'Session active'
            : isConnecting
            ? 'Connecting to coach...'
            : 'Ready to start'}
        </span>
      </div>
    </div>
  )
}
