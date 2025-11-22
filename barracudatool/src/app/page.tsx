'use client'

import Link from 'next/link'
import Image from 'next/image' // Import Next.js Image component
import { useEffect, useState } from 'react';

// --- System Ticker Component ---
const SystemTicker = () => {
    const messages = [
        "// INITIATING DEEP DATA DIVE...", "// MARKET VOLATILITY: +3.14%...", "// NEW ASSET DETECTED: SECTOR 7G...",
        "// AGENT ONLINE: CODENAME 'VIPER'...", "// SYNCHRONIZING WITH GLOBAL MATRIX...", "// AUTHENTICATION SECURE...",
    ];

    return (
        <div className="fixed top-0 left-0 z-10 w-full overflow-hidden whitespace-nowrap border-b border-[#00ff00] bg-black p-[5px] font-courier text-[#00ff00]" style={{ boxShadow: '0 0 10px #00ff00' }}>
            <div className="inline-block animate-scroll-left pl-[100%]">
                {messages.join(' ')}&nbsp;&nbsp;&nbsp;{messages.join(' ')}&nbsp;&nbsp;&nbsp;
            </div>
        </div>
    );
};

// --- Main HomePage Component ---
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
    <div className="min-h-screen bg-background-dark font-orbitron text-text-primary px-4" style={{
        backgroundImage: `
            linear-gradient(rgba(13, 13, 33, 0.95), rgba(13, 13, 33, 0.95)),
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0, 255, 255, 0.1) 1px, rgba(0, 255, 255, 0.1) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0, 255, 255, 0.1) 1px, rgba(0, 255, 255, 0.1) 2px)
        `,
        backgroundSize: '100%, 50px 50px, 50px 50px',
        paddingTop: '110px',
        paddingBottom: '40px',
    }}>

      <SystemTicker />
      
      <div className="fixed top-12 right-7 z-50 flex items-center gap-4">
        <Link href="/signup" className="px-6 py-2.5 text-base font-bold text-background-dark bg-accent-green rounded-md shadow-glow-green transition-all hover:shadow-glow-green-hover hover:scale-105 no-underline">
            [ SIGN UP ]
        </Link>
        <Link href="/login" className="px-6 py-2.5 text-base font-bold text-background-dark bg-accent-magenta rounded-md shadow-glow-magenta-hover transition-all hover:scale-105 no-underline" style={{ boxShadow: '0 0 20px #ff00ff' }}>
            [ AGENT LOGIN ]
        </Link>
      </div>

      <main className="max-w-7xl w-full mx-auto border-2 border-accent-magenta rounded-lg p-6 sm:p-10 bg-container-dark shadow-glow-magenta text-center">
        
        <h1 className="relative text-5xl sm:text-7xl font-bold text-accent-magenta tracking-wider mb-2.5" style={{ textShadow: '0 0 15px #ff00ff, 0 0 5px #ffffff' }}>
            BARRACUDA
            <span className={`absolute top-0 left-0 w-full h-full text-accent-cyan ${glitch ? 'animate-glitch-1' : ''}`} style={{textShadow: '-2px 0 #00ff00'}}>BARRACUDA</span>
            <span className={`absolute top-0 left-0 w-full h-full text-accent-magenta ${glitch ? 'animate-glitch-2' : ''}`} style={{textShadow: '2px 0 #ff00ff'}}>BARRACUDA</span>
        </h1>
        <p className="text-lg text-accent-cyan italic mb-10" style={{ textShadow: '0 0 8px #00ffff' }}>{'// THE DEEP DATA DIVE PROTOCOL'}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 my-20">
            <Link href="/hunter" className="w-full sm:w-auto px-10 py-4 text-2xl font-bold text-background-dark bg-accent-cyan rounded-md shadow-glow-cyan transition-all hover:shadow-glow-cyan-hover hover:scale-105 no-underline">
              [ INITIATE HUNTER ]
            </Link>
            <Link href="/gatherer" className="w-full sm:w-auto px-10 py-4 text-2xl font-bold text-background-dark bg-accent-magenta rounded-md shadow-glow-magenta transition-all hover:shadow-glow-magenta-hover hover:scale-105 no-underline">
              [ ACCESS GATHERER ]
            </Link>
        </div>

        <div className="border-t border-dashed border-accent-cyan pt-8 mt-8">
            <h2 className="text-3xl font-bold text-accent-magenta uppercase mb-8">{'// PRIORITY TARGETS'}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                {/* Target 1 */}
                <div className="border border-accent-cyan rounded-lg bg-accent-cyan/5 overflow-hidden shadow-inner-cyan transition-all duration-300 hover:scale-105 hover:shadow-card-hover">
                    <div className="relative w-full h-48 border-b border-accent-cyan">
                      <Image 
                        src="https://via.placeholder.com/400x250/0d0d21/ff00ff?text=TARGET+IMAGE" 
                        alt="Skybreaker Loft" 
                        fill 
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-5">
                        <h3 className="text-xl font-bold text-accent-magenta mb-4">TARGET: SKYBREAKER LOFT</h3>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            PRICE: €1,200,000<br/>
                            LOCATION: NEO-PARIS SECTOR 7<br/>
                            CLASS: PENTHOUSE
                        </p>
                    </div>
                </div>
                {/* Target 2 */}
                <div className="border border-accent-cyan rounded-lg bg-accent-cyan/5 overflow-hidden shadow-inner-cyan transition-all duration-300 hover:scale-105 hover:shadow-card-hover">
                    <div className="relative w-full h-48 border-b border-accent-cyan">
                      <Image 
                        src="https://via.placeholder.com/400x250/0d0d21/00ffff?text=TARGET+IMAGE" 
                        alt="Aetherium Villa" 
                        fill 
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-5">
                        <h3 className="text-xl font-bold text-accent-magenta mb-4">TARGET: AETHERIUM VILLA</h3>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            PRICE: €3,500,000<br/>
                            LOCATION: CYBER-MONACO<br/>
                            CLASS: ROOFTOP ESTATE
                        </p>
                    </div>
                </div>
                {/* Target 3 */}
                <div className="border border-accent-cyan rounded-lg bg-accent-cyan/5 overflow-hidden shadow-inner-cyan transition-all duration-300 hover:scale-105 hover:shadow-card-hover">
                    <div className="relative w-full h-48 border-b border-accent-cyan">
                      <Image 
                        src="https://via.placeholder.com/400x250/1a1a3a/ff00ff?text=TARGET+IMAGE" 
                        alt="Data Haven" 
                        fill 
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-5">
                        <h3 className="text-xl font-bold text-accent-magenta mb-4">TARGET: DATA HAVEN 42</h3>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            PRICE: €450,000<br/>
                            LOCATION: GRID-CITY CENTRAL<br/>
                            CLASS: SMART APARTMENT
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  )
}
