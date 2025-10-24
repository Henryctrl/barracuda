'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react';

// --- System Ticker Component (Now using Tailwind) ---
const SystemTicker = () => {
    const messages = [
        "// INITIATING DEEP DATA DIVE...", "// MARKET VOLATILITY: +3.14%...", "// NEW ASSET DETECTED: SECTOR 7G...",
        "// AGENT ONLINE: CODENAME 'VIPER'...", "// SYNCHRONIZING WITH GLOBAL MATRIX...", "// AUTHENTICATION SECURE...",
    ];

    return (
        <div className="bg-black text-accent-green font-courier p-1.5 overflow-hidden whitespace-nowrap border-b border-accent-green shadow-glow-cyan w-full z-10">
            <div className="inline-block animate-scroll-left pl-[100%]">
                {messages.join(' ')}&nbsp;&nbsp;&nbsp;{messages.join(' ')}&nbsp;&nbsp;&nbsp;
            </div>
        </div>
    );
};

// --- Main HomePage Component (Refactored for Tailwind & Mobile-First) ---
export default function HomePage() {
  
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    // Main container with background grid effect (best applied via global CSS on body)
    <div className="min-h-screen bg-background-dark font-orbitron text-text-primary p-4">

      {/* Ticker and Auth buttons are now part of the normal flow for mobile */}
      <SystemTicker />
      
      <div className="flex justify-end items-center gap-4 py-4">
        <Link href="/signup" className="px-4 py-2 text-sm font-bold text-background-dark bg-accent-green rounded-md shadow-glow-green transition-all hover:scale-105">
            [ SIGN UP ]
        </Link>
        <Link href="/login" className="px-4 py-2 text-sm font-bold text-background-dark bg-accent-magenta rounded-md shadow-glow-magenta transition-all hover:scale-105">
            [ AGENT LOGIN ]
        </Link>
      </div>

      <main className="max-w-7xl w-full mx-auto my-8 border-2 border-accent-magenta rounded-lg p-6 sm:p-10 bg-background-dark/80 shadow-glow-magenta text-center">
        
        <h1 className="relative text-4xl sm:text-6xl lg:text-7xl font-bold text-accent-magenta tracking-widest mb-2" style={{ textShadow: '0 0 15px #ff00ff, 0 0 5px #ffffff' }}>
            BARRACUDA
            {/* Glitch Effect Layers */}
            <span className={`absolute top-0 left-0 w-full h-full text-accent-cyan ${glitch ? 'animate-glitch-1' : ''}`} style={{textShadow: '-2px 0 #00ff00'}}>BARRACUDA</span>
            <span className={`absolute top-0 left-0 w-full h-full text-accent-magenta ${glitch ? 'animate-glitch-2' : ''}`} style={{textShadow: '2px 0 #ff00ff'}}>BARRACUDA</span>
        </h1>
        <p className="text-base sm:text-lg text-accent-cyan italic mb-10" style={{ textShadow: '0 0 8px #00ffff' }}>{'// THE DEEP DATA DIVE PROTOCOL'}</p>

        {/* Main Action Buttons: Vertical on mobile, horizontal on larger screens */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-12 sm:my-20">
            <Link href="/hunter" className="w-full sm:w-auto px-8 py-4 text-xl font-bold text-background-dark bg-accent-cyan rounded-md shadow-glow-cyan transition-all hover:scale-105">
              [ INITIATE HUNTER ]
            </Link>
            <Link href="/gatherer" className="w-full sm:w-auto px-8 py-4 text-xl font-bold text-background-dark bg-accent-magenta rounded-md shadow-glow-magenta transition-all hover:scale-105">
              [ ACCESS GATHERER ]
            </Link>
        </div>

        <div className="border-t border-dashed border-accent-cyan pt-8 mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-accent-magenta uppercase mb-8">{'// PRIORITY TARGETS'}</h2>
            
            {/* Priority Targets Grid: Single column on mobile, multi-column on larger screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                {/* Target 1 */}
                <div className="border border-accent-cyan rounded-lg bg-accent-cyan/5 overflow-hidden shadow-inner-cyan transition-all hover:scale-105 hover:shadow-glow-cyan">
                    <img src="https://via.placeholder.com/400x250/0d0d21/ff00ff?text=TARGET+IMAGE" alt="Skybreaker Loft" className="w-full h-48 object-cover border-b border-accent-cyan" />
                    <div className="p-5">
                        <h3 className="text-lg font-bold text-accent-magenta mb-3">TARGET: SKYBREAKER LOFT</h3>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            PRICE: €1,200,000<br/>
                            LOCATION: NEO-PARIS SECTOR 7<br/>
                            CLASS: PENTHOUSE
                        </p>
                    </div>
                </div>
                {/* Add Target 2 and 3 here with the same structure */}
            </div>
        </div>
      </main>
    </div>
  )
}
