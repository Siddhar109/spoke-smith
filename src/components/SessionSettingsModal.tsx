'use client'

import { Button } from '@/components/ui/button'

interface SessionSettingsModalProps {
  isOpen: boolean
  onClose: () => void
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
}

export function SessionSettingsModal({
  isOpen,
  onClose,
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
}: SessionSettingsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-[0_30px_120px_rgba(15,23,42,0.35)] border border-slate-100 p-6 sm:p-8 max-h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h2 className="text-2xl font-light text-slate-900 tracking-tight">
              Session Settings
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Configure devices and coaching options
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition flex items-center justify-center"
            aria-label="Close settings"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current">
              <path d="M11.06 10l4.24-4.24-1.06-1.06L10 8.94 5.76 4.7 4.7 5.76 8.94 10l-4.24 4.24 1.06 1.06L10 11.06l4.24 4.24 1.06-1.06z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">
          {/* Device Selection */}
          {(audioDevices || videoDevices) && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
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
                        onChange={(e) => onSelectAudioDeviceId(e.target.value || null)}
                      >
                        <option value="">Default System Microphone</option>
                        {audioDevices.map((d, idx) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Microphone ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
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
                        onChange={(e) => onSelectVideoDeviceId(e.target.value || null)}
                      >
                        <option value="">Default System Camera</option>
                        {videoDevices.map((d, idx) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Camera ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Face Coach Settings */}
          {(onToggleFacePhraseModel || onToggleStrictPrivacy || onToggleFaceKeyframes) && (
            <div className="p-4 bg-white rounded-2xl border border-slate-100">
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
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end">
          <Button
            onClick={onClose}
            className="rounded-xl px-6"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
