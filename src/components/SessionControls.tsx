'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SessionControlsProps {
  isConnected: boolean
  isConnecting: boolean
  onStart: () => void
  onStop: () => void
  onReset?: () => void
  facePhraseModelEnabled?: boolean
  faceKeyframesEnabled?: boolean
  strictPrivacyMode?: boolean
  onToggleFacePhraseModel?: (enabled: boolean) => void
  onToggleFaceKeyframes?: (enabled: boolean) => void
  onToggleStrictPrivacy?: (enabled: boolean) => void
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
  facePhraseModelEnabled,
  faceKeyframesEnabled,
  strictPrivacyMode,
  onToggleFacePhraseModel,
  onToggleFaceKeyframes,
  onToggleStrictPrivacy,
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
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Device selection Card */}
      {!isConnected && !isConnecting && (audioDevices || videoDevices) && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-slate-200 transition-colors">
          <div className="flex items-center justify-between mb-4 pl-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Device Setup</h3>
            {onRefreshDevices && (
              <button
                type="button"
                onClick={onRefreshDevices}
                className="text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 tracking-wider transition-colors"
              >
                Refresh
              </button>
            )}
          </div>

          <div className="space-y-4">
            {audioDevices && onSelectAudioDeviceId && (
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold pl-1">
                  Microphone
                </label>
                <div className="relative">
                    <select
                        className="w-full text-sm bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all appearance-none shadow-sm font-medium"
                        value={selectedAudioDeviceId ?? ''}
                        onChange={(e) =>
                            onSelectAudioDeviceId(e.target.value || null)
                        }
                    >
                    <option value="">Default System Microphone</option>
                    {audioDevices.map((d, idx) => (
                        <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${idx + 1}`}
                        </option>
                    ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
              </div>
            )}

            {videoDevices && onSelectVideoDeviceId && (
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold pl-1">
                  Camera
                </label>
                <div className="relative">
                 <select
                  className="w-full text-sm bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all appearance-none shadow-sm font-medium"
                  value={selectedVideoDeviceId ?? ''}
                  onChange={(e) =>
                    onSelectVideoDeviceId(e.target.value || null)
                  }
                 >
                  <option value="">Default System Camera</option>
                  {videoDevices.map((d, idx) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                 </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(onToggleFacePhraseModel || onToggleStrictPrivacy || onToggleFaceKeyframes) && (
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4 pl-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Face Coach</h3>
          </div>
          <div className="space-y-3">
            {onToggleFacePhraseModel && (
              <label className="flex items-center justify-between text-sm text-slate-700">
                <span className="font-medium">AI phrasing</span>
                <input
                  type="checkbox"
                  checked={!!facePhraseModelEnabled}
                  onChange={(e) => onToggleFacePhraseModel(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
              </label>
            )}
            {onToggleStrictPrivacy && (
              <label className="flex items-center justify-between text-sm text-slate-700">
                <span className="font-medium">Strict privacy mode</span>
                <input
                  type="checkbox"
                  checked={!!strictPrivacyMode}
                  onChange={(e) => onToggleStrictPrivacy(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
              </label>
            )}
            {onToggleFaceKeyframes && (
              <label className="flex items-center justify-between text-sm text-slate-700">
                <span className="font-medium">Allow keyframes (cropped face)</span>
                <input
                  type="checkbox"
                  checked={!!faceKeyframesEnabled}
                  disabled={!facePhraseModelEnabled || !!strictPrivacyMode}
                  onChange={(e) => onToggleFaceKeyframes(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:opacity-40"
                />
              </label>
            )}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Keyframes are opt-in and sent rarely for verification. No raw video upload.
            </p>
          </div>
        </div>
      )}

      {/* Main Buttons */}
      {!isConnected && !isConnecting && (
        <div className="space-y-2">
          <Button
            onClick={onStart}
            size="lg"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-2xl shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-all duration-300 active:scale-[0.98] h-14"
          >
            <span className="flex items-center gap-2">Start Live Session</span>
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Button>
          <p className="text-[11px] text-slate-400 leading-relaxed text-center">
            Sessions auto-end after 5 minutes for safety.
          </p>
        </div>
      )}

      {isConnecting && (
        <Button
          disabled
          size="lg"
          className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-2xl h-14"
        >
          <div className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-bold tracking-wide uppercase text-xs">Initializing...</span>
          </div>
        </Button>
      )}

      {isConnected && (
        <Button
          onClick={onStop}
          size="lg"
          variant="destructive"
          className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-100 hover:border-red-200 rounded-2xl shadow-sm hover:shadow-md transition-all group h-14"
        >
          <span className="flex items-center gap-2 font-bold tracking-wide text-xs uppercase">
             <div className="w-2 h-2 rounded-sm bg-red-500 group-hover:animate-pulse" />
             End Session
          </span>
        </Button>
      )}

      {onReset && !isConnected && !isConnecting && (
        <Button
          onClick={onReset}
          variant="ghost"
          size="lg"
          className="w-full text-slate-400 hover:text-slate-600 hover:bg-transparent uppercase tracking-widest text-[10px] font-bold h-auto py-2"
        >
          Reset Configuration
        </Button>
      )}
    </div>
  )
}
