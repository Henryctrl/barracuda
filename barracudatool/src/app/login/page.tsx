'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        // Success! Force page reload to update auth state
        window.location.href = '/gatherer';
      } else {
        setError('Login failed - please try again');
        setLoading(false);
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
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 
            className="text-5xl font-bold text-[#ff00ff] tracking-wider mb-2"
            style={{ textShadow: '0 0 15px #ff00ff, 0 0 5px #ffffff' }}
          >
            AGENT LOGIN
          </h1>
          <p className="text-sm text-[#00ffff] italic" style={{ textShadow: '0 0 8px #00ffff' }}>
            {'// SECURE ACCESS REQUIRED'}
          </p>
        </div>

        <div 
          className="border-2 border-[#ff00ff] rounded-lg p-8 bg-[#1a1a3a]/80"
          style={{ boxShadow: '0 0 20px rgba(255, 0, 255, 0.3)' }}
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs text-[#00ffff] uppercase mb-2 font-bold">
                {'// EMAIL ADDRESS'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-[#0d0d21] border border-[#00ffff] rounded text-white focus:outline-none focus:border-[#ff00ff] focus:shadow-[0_0_10px_#ff00ff] transition-all"
                placeholder="agent@barracuda.net"
                style={{ fontFamily: 'Courier New, monospace' }}
              />
            </div>

            <div>
              <label className="block text-xs text-[#00ffff] uppercase mb-2 font-bold">
                {'// ACCESS CODE'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 bg-[#0d0d21] border border-[#00ffff] rounded text-white focus:outline-none focus:border-[#ff00ff] focus:shadow-[0_0_10px_#ff00ff] transition-all"
                  placeholder="••••••••"
                  style={{ fontFamily: 'Courier New, monospace' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00ffff] hover:text-[#ff00ff] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500 rounded text-red-500 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#ff00ff] text-white font-bold text-lg rounded uppercase transition-all hover:bg-[#ff00ff]/80 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 0 20px #ff00ff' }}
            >
              {loading ? '[ AUTHENTICATING... ]' : '[ INITIATE ACCESS ]'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <div className="pt-4 border-t border-[#00ffff]/30">
              <p className="text-sm text-gray-400">
                New Agent?{' '}
                <Link href="/signup" className="text-[#00ff00] hover:text-white font-bold">
                  [ REGISTER HERE ]
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link 
            href="/" 
            className="text-sm text-gray-500 hover:text-[#00ffff] transition-colors"
          >
            ← Back to Mission Control
          </Link>
        </div>
      </div>
    </div>
  );
}
