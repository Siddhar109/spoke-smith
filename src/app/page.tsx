import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden relative bg-[#FAFAFA]">
       {/* Background Dots - Minimalist Dot Grid Theme */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)] opacity-100" />
      
      <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        
        {/* Navigation / Header - Clean & Minimal */}
        <nav className="flex justify-between items-center mb-20 opacity-0 animate-[fade-in_1s_ease-out_forwards]">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <div className="w-4 h-4 bg-gradient-to-tr from-emerald-400 to-cyan-500 rounded-[4px]" />
                 </div>
                 <span className="font-light text-xl tracking-tight text-slate-800">KAWKAI</span>
             </div>
        </nav>

        {/* Hero Section - Aurora Effect */}
        <div className="text-center mb-24 relative max-w-4xl mx-auto">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/60 shadow-sm mb-8 animate-[slide-in-from-top_0.8s_ease-out_forwards]">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
             <span className="text-[11px] font-light text-slate-500 uppercase tracking-widest">System Online</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-light mb-8 text-slate-900 tracking-tight animate-[fade-in_1s_ease-out_0.2s_forwards] opacity-0 leading-[1.1]">
            Master Your <br />
            <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900">
               Media Presence
            </span>
          </h1>
          
          <p className="text-lg md:text-2xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed font-light animate-[fade-in_1s_ease-out_0.4s_forwards] opacity-0">
            The advanced AI coach for high-stakes interviews. <br />
            <span className="font-thin text-slate-400">Real-time analysis, HUD feedback, and instant replay.</span>
          </p>

          <Link
            href="/session"
            className="group relative inline-flex items-center justify-center transform transition-all duration-500 hover:scale-[1.02] animate-[fade-in_1s_ease-out_0.6s_forwards] opacity-0"
          >
            {/* Outer Glow - Subtle neutral shadow */}
            <div className="absolute inset-0 bg-slate-300/30 rounded-[3rem] blur-3xl opacity-40 group-hover:opacity-60 transition-all duration-700" />
            
            {/* Button Container - Clean white glassmorphic */}
            <div className="relative flex items-center justify-center gap-2.5 px-12 py-6 rounded-[3rem] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_12px_rgba(0,0,0,0.04)]">
               
               {/* White/Light Background with subtle gradient */}
               <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 group-hover:from-slate-50 group-hover:to-white transition-all duration-500" />
               
               {/* Frosted Glass Overlay */}
               <div className="absolute inset-0 backdrop-blur-xl bg-white/40" />
               
               {/* Shimmer Effect on Hover */}
               <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                 <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.8)_50%,transparent_70%)] bg-[length:200%_200%] animate-[shimmer_2s_ease-in-out_infinite]" />
               </div>

               <span className="relative z-10 text-2xl font-medium text-slate-600 tracking-tight">Start</span>
               <span className="relative z-10 text-2xl font-bold text-slate-800 tracking-tight">
                 Practice Session
               </span>
            </div>
          </Link>
        </div>

        {/* Features Grid - Clean Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-24 animate-[fade-in_1s_ease-out_0.8s_forwards] opacity-0">
          
          {/* Card 1 */}
          <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)] transition-all duration-300 group">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-light mb-3 text-slate-800">Voice Coaching</h3>
            <p className="text-slate-500 leading-relaxed text-sm font-thin">
              Real-time analysis of your tone, pace, and clarity with instant HUD nudges.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)] transition-all duration-300 group">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-light mb-3 text-slate-800">Live Metrics</h3>
            <p className="text-slate-500 leading-relaxed text-sm font-thin">
              Track filler words, momentum, and answer duration on a futuristic dashboard.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.05)] transition-all duration-300 group">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-light mb-3 text-slate-800">Simulations</h3>
            <p className="text-slate-500 leading-relaxed text-sm font-thin">
              Practice rigorous scenarios like crisis comms and product launches safely.
            </p>
          </div>
        </div>

        {/* Powered By */}
        <div className="text-center animate-[fade-in_1s_ease-out_1s_forwards] opacity-0 pb-10">
           <p className="text-xs text-slate-300 font-light tracking-widest uppercase">Powered by Advanced Audio Intelligence</p>
        </div>

      </div>
    </main>
  )
}
