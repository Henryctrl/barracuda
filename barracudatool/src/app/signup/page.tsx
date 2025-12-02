'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('Access codes do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Access code must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
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
            className="text-5xl font-bold text-[#00ff00] tracking-wider mb-2"
            style={{ textShadow: '0 0 15px #00ff00, 0 0 5px #ffffff' }}
          >
            AGENT REGISTRATION
          </h1>
          <p className="text-sm text-[#00ffff] italic" style={{ textShadow: '0 0 8px #00ffff' }}>
            {'// JOIN THE BARRACUDA NETWORK'}
          </p>
        </div>

        <div 
          className="border-2 border-[#00ff00] rounded-lg p-8 bg-[#1a1a3a]/80"
          style={{ boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)' }}
        >
          {success ? (
            <div className="text-center py-8">
              <div className="mb-4 text-6xl">✓</div>
              <h2 className="text-2xl font-bold text-[#00ff00] mb-4">
                REGISTRATION SUCCESSFUL
              </h2>
              <p className="text-gray-400 mb-4">
                Your account has been created!
              </p>
              <p className="text-sm text-[#00ffff]">
                Redirecting to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
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
                  className="w-full px-4 py-3 bg-[#0d0d21] border border-[#00ffff] rounded text-white focus:outline-none focus:border-[#00ff00] focus:shadow-[0_0_10px_#00ff00] transition-all"
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
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-12 bg-[#0d0d21] border border-[#00ffff] rounded text-white focus:outline-none focus:border-[#00ff00] focus:shadow-[0_0_10px_#00ff00] transition-all"
                    // placeholder="••••••••"
                    style={{ fontFamily: 'Courier New, monospace' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00ffff] hover:text-[#00ff00] transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label className="block text-xs text-[#00ffff] uppercase mb-2 font-bold">
                  {'// CONFIRM ACCESS CODE'}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-12 bg-[#0d0d21] border border-[#00ffff] rounded text-white focus:outline-none focus:border-[#00ff00] focus:shadow-[0_0_10px_#00ff00] transition-all"
                    // placeholder="••••••••"
                    style={{ fontFamily: 'Courier New, monospace' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00ffff] hover:text-[#00ff00] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
                className="w-full py-4 bg-[#00ff00] text-black font-bold text-lg rounded uppercase transition-all hover:bg-[#00ff00]/80 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '0 0 20px #00ff00' }}
              >
                {loading ? '[ REGISTERING... ]' : '[ CREATE AGENT PROFILE ]'}
              </button>
            </form>
          )}

          {!success && (
            <div className="mt-6 text-center">
              <div className="pt-4 border-t border-[#00ffff]/30">
                <p className="text-sm text-gray-400">
                  Already registered?{' '}
                  <Link href="/login" className="text-[#ff00ff] hover:text-white font-bold">
                    [ LOGIN HERE ]
                  </Link>
                </p>
              </div>
            </div>
          )}
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
