import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Kawkai
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            AI-Powered Media Training Coach
          </p>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-12">
            Practice high-stakes interviews with real-time AI coaching.
            Get instant feedback on your pace, messaging, and delivery.
          </p>
          <Link
            href="/session"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-lg"
          >
            Start Practice Session
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
            <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Live Voice Coaching</h3>
            <p className="text-slate-400 text-sm">
              Real-time AI coach that listens and provides timely nudges during your practice.
            </p>
          </div>

          <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Live Metrics</h3>
            <p className="text-slate-400 text-sm">
              Track your speaking pace, filler words, and answer duration in real-time.
            </p>
          </div>

          <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
            <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Scenario Practice</h3>
            <p className="text-slate-400 text-sm">
              Practice crisis communications, product launches, and media interviews.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-8">How It Works</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-slate-300">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">1</span>
              <span>Choose a scenario</span>
            </div>
            <svg className="w-6 h-6 text-slate-600 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">2</span>
              <span>Practice with AI</span>
            </div>
            <svg className="w-6 h-6 text-slate-600 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">3</span>
              <span>Get real-time coaching</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
