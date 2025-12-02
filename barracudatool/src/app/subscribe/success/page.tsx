'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SuccessPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Wait a moment for webhook to process
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

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
          className="border-2 border-[#00ff00] rounded-lg p-12 bg-[#1a1a3a]/80"
          style={{ boxShadow: '0 0 30px rgba(0, 255, 0, 0.4)' }}
        >
          {loading ? (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-6 text-[#00ff00] animate-spin" />
              <h1 className="text-2xl font-bold text-white mb-4">
                ACTIVATING SUBSCRIPTION...
              </h1>
              <p className="text-gray-400 text-sm">
                Please wait while we set up your account
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 
                className="w-20 h-20 mx-auto mb-6 text-[#00ff00]" 
                style={{ filter: 'drop-shadow(0 0 15px #00ff00)' }}
              />
              <h1 
                className="text-4xl font-bold text-[#00ff00] mb-4"
                style={{ textShadow: '0 0 15px #00ff00' }}
              >
                SUBSCRIPTION ACTIVE!
              </h1>
              <p className="text-gray-400 mb-8">
                Welcome to Barracuda Pro! Your account is now fully activated.
              </p>
              <Link
                href="/gatherer"
                className="inline-block px-8 py-4 bg-[#00ff00] text-black font-bold text-lg rounded uppercase transition-all hover:bg-[#00ff00]/80"
                style={{ boxShadow: '0 0 20px #00ff00' }}
              >
                [ ACCESS GATHERER ]
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
