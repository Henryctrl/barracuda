'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Check, Loader2, Crown } from 'lucide-react';

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
      } else {
        router.push('/login');
      }
    };
    getUser();
  }, [router]);

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');

    try {
      // Call your API to create Checkout Session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { url, error: apiError } = await response.json();

      if (apiError) {
        setError(apiError);
        setLoading(false);
        return;
      }

      // Redirect to Stripe Checkout URL
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

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
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Crown size={60} className="text-[#ff00ff]" style={{ filter: 'drop-shadow(0 0 10px #ff00ff)' }} />
          </div>
          <h1 
            className="text-5xl font-bold text-[#ff00ff] tracking-wider mb-2"
            style={{ textShadow: '0 0 15px #ff00ff, 0 0 5px #ffffff' }}
          >
            UPGRADE TO PRO
          </h1>
          <p className="text-sm text-[#00ffff] italic" style={{ textShadow: '0 0 8px #00ffff' }}>
            {'// UNLOCK FULL BARRACUDA POWER'}
          </p>
        </div>

        {/* Pricing Card */}
        <div 
          className="border-2 border-[#ff00ff] rounded-lg p-8 bg-[#1a1a3a]/80 mb-6"
          style={{ boxShadow: '0 0 30px rgba(255, 0, 255, 0.4)' }}
        >
          {/* Price */}
          <div className="text-center mb-8 pb-8 border-b border-[#00ffff]/30">
            <div className="text-6xl font-bold text-white mb-2">
              €49
              <span className="text-2xl text-gray-400">/month</span>
            </div>
            <p className="text-[#00ffff] text-sm">Full access to all features</p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <Check size={24} className="text-[#00ff00] mt-1 flex-shrink-0" />
              <div>
                <p className="text-white font-bold">Unlimited Property Scraping</p>
                <p className="text-sm text-gray-400">Scan all French property sites automatically</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check size={24} className="text-[#00ff00] mt-1 flex-shrink-0" />
              <div>
                <p className="text-white font-bold">Smart Matching Engine</p>
                <p className="text-sm text-gray-400">AI-powered property-to-client matching</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check size={24} className="text-[#00ff00] mt-1 flex-shrink-0" />
              <div>
                <p className="text-white font-bold">Unlimited Clients</p>
                <p className="text-sm text-gray-400">Manage as many clients as you need</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check size={24} className="text-[#00ff00] mt-1 flex-shrink-0" />
              <div>
                <p className="text-white font-bold">Real-Time Alerts</p>
                <p className="text-sm text-gray-400">Get notified when new matches appear</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check size={24} className="text-[#00ff00] mt-1 flex-shrink-0" />
              <div>
                <p className="text-white font-bold">Priority Support</p>
                <p className="text-sm text-gray-400">Direct access to our support team</p>
              </div>
            </div>
          </div>

          {/* Subscribe Button */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded text-red-500 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-4 bg-[#ff00ff] text-white font-bold text-lg rounded uppercase transition-all hover:bg-[#ff00ff]/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ boxShadow: '0 0 20px #ff00ff' }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                [ PROCESSING... ]
              </>
            ) : (
              '[ ACTIVATE SUBSCRIPTION ]'
            )}
          </button>

          <p className="text-center text-xs text-gray-500 mt-4">
            Secure payment powered by Stripe • Cancel anytime
          </p>
        </div>

        {/* Logged in as */}
        {userEmail && (
          <p className="text-center text-sm text-gray-400">
            Subscribing as: <span className="text-[#00ffff]">{userEmail}</span>
          </p>
        )}
      </div>
    </div>
  );
}
