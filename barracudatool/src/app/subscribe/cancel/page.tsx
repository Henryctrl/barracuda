'use client';

import { XCircle } from 'lucide-react';
import Link from 'next/link';

export default function CancelPage() {
  return (
    <div 
      className="min-h-screen bg-[#0d0d21] font-[Orbitron] text-[#00ffff] px-4 flex items-center justify-center"
      style={{
        backgroundImage: `
          linear-gradient(rgba(13, 13, 33, 0.95), rgba(13, 13, 33, 0.95)),
          repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0, 255, 255, 0.1) 1px, rgba(0, 255, 255, 0.1) 2px),
          repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0, 255, 255, 0.1) 1px, rgba(0, 255, 255, 0.1) 2px)
        `,
        backgroundSize: '100%, 50px 50px, 50px 50px',
      }}
    >
      <div className="w-full max-w-md text-center">
        <div 
          className="border-2 border-[#ff00ff] rounded-lg p-12 bg-[#1a1a3a]/80"
          style={{ boxShadow: '0 0 30px rgba(255, 0, 255, 0.4)' }}
        >
          <XCircle 
            className="w-20 h-20 mx-auto mb-6 text-[#ff00ff]" 
            style={{ filter: 'drop-shadow(0 0 15px #ff00ff)' }}
          />
          <h1 
            className="text-4xl font-bold text-[#ff00ff] mb-4"
            style={{ textShadow: '0 0 15px #ff00ff' }}
          >
            PAYMENT CANCELLED
          </h1>
          <p className="text-gray-400 mb-8">
            Your subscription was not activated. You can try again anytime.
          </p>
          <div className="space-y-3">
            <Link
              href="/subscribe"
              className="block px-8 py-4 bg-[#ff00ff] text-white font-bold text-lg rounded uppercase transition-all hover:bg-[#ff00ff]/80"
              style={{ boxShadow: '0 0 20px #ff00ff' }}
            >
              [ TRY AGAIN ]
            </Link>
            <Link
              href="/"
              className="block px-8 py-4 border border-[#00ffff] text-[#00ffff] font-bold text-sm rounded uppercase transition-all hover:bg-[#00ffff]/10"
            >
              [ BACK TO HOME ]
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
