'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { 
  User, 
  CreditCard, 
  LogOut, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Crown,
  Mail,
  Calendar
} from 'lucide-react';
import BrandingSettings from '@/components/BrandingSettings';

interface UserProfile {
  id: string;
  email: string;
  subscription_status: string;
  customer_id: string | null;
  subscription_id: string | null;
  created_at: string;
}

export default function AccountPage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    setUser(user);

    // Fetch profile
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    setLoading(false);
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);

    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
      });

      const { url, error } = await response.json();

      if (error) {
        alert(error);
        setPortalLoading(false);
        return;
      }

      // Redirect to Stripe portal
      window.location.href = url;
    } catch (err) {
      alert('Failed to open billing portal');
      setPortalLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d21] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00ffff]" size={40} />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-[#00ff00] border-[#00ff00] bg-[#00ff00]/10';
      case 'trialing':
        return 'text-[#00ffff] border-[#00ffff] bg-[#00ffff]/10';
      default:
        return 'text-gray-500 border-gray-500 bg-gray-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'active' ? <CheckCircle2 size={16} /> : <XCircle size={16} />;
  };

  return (
    <div 
      className="min-h-screen bg-[#0d0d21] font-[Orbitron] text-[#00ffff] px-4 py-8"
      style={{
        backgroundImage: `
          linear-gradient(rgba(13, 13, 33, 0.95), rgba(13, 13, 33, 0.95)),
          repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0, 255, 255, 0.1) 1px, rgba(0, 255, 255, 0.1) 2px),
          repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0, 255, 255, 0.1) 1px, rgba(0, 255, 255, 0.1) 2px)
        `,
        backgroundSize: '100%, 50px 50px, 50px 50px',
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center mb-8">
            <h1 
                className="text-4xl font-bold text-[#ff00ff] tracking-wider mb-2"
                style={{ textShadow: '0 0 15px #ff00ff' }}
            >
                ACCOUNT CONTROL
            </h1>
                <p className="text-sm text-[#00ffff] italic">
                {`// MANAGE YOUR PROFILE & SUBSCRIPTION`}
                </p>
            </div>

          <Link
            href="/gatherer"
            className="px-4 py-2 border border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff]/10 rounded uppercase text-xs font-bold"
          >
            ← Back to Gatherer
          </Link>
        </div>

        {/* Profile Card */}
        <div 
          className="border-2 border-[#ff00ff] rounded-lg p-8 bg-[#1a1a3a]/80 mb-6"
          style={{ boxShadow: '0 0 20px rgba(255, 0, 255, 0.3)' }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#ff00ff]/20 border-2 border-[#ff00ff] flex items-center justify-center">
              <User size={32} className="text-[#ff00ff]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Agent Profile</h2>
              <p className="text-gray-400 text-sm">ID: {user?.id?.slice(0, 8)}...</p>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-[#0d0d21]/50 rounded border border-[#00ffff]/30">
              <Mail size={20} className="text-[#00ffff]" />
              <div>
                <p className="text-xs text-gray-400 uppercase">Email Address</p>
                <p className="text-white font-bold">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-[#0d0d21]/50 rounded border border-[#00ffff]/30">
              <Calendar size={20} className="text-[#00ffff]" />
              <div>
                <p className="text-xs text-gray-400 uppercase">Member Since</p>
                <p className="text-white font-bold">
                  {new Date(profile?.created_at || '').toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div 
          className="border-2 border-[#00ff00] rounded-lg p-8 bg-[#1a1a3a]/80 mb-6"
          style={{ boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Crown size={32} className="text-[#00ff00]" />
              <div>
                <h2 className="text-2xl font-bold text-white">Subscription Status</h2>
                <p className="text-gray-400 text-sm">Manage your billing and subscription</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded border font-bold text-sm uppercase flex items-center gap-2 ${getStatusColor(profile?.subscription_status || 'inactive')}`}>
              {getStatusIcon(profile?.subscription_status || 'inactive')}
              {profile?.subscription_status || 'Inactive'}
            </div>
          </div>

          {profile?.subscription_status === 'active' ? (
            <>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between p-3 bg-[#0d0d21]/50 rounded">
                  <span className="text-gray-400">Plan</span>
                  <span className="text-white font-bold">Barracuda Pro</span>
                </div>
                <div className="flex justify-between p-3 bg-[#0d0d21]/50 rounded">
                  <span className="text-gray-400">Price</span>
                  <span className="text-white font-bold">€49.00 / month</span>
                </div>
                {profile?.customer_id && (
                  <div className="flex justify-between p-3 bg-[#0d0d21]/50 rounded">
                    <span className="text-gray-400">Customer ID</span>
                    <span className="text-white font-mono text-sm">{profile.customer_id}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="w-full py-4 bg-[#00ff00] text-black font-bold text-lg rounded uppercase transition-all hover:bg-[#00ff00]/80 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ boxShadow: '0 0 20px #00ff00' }}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    [ LOADING... ]
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    [ MANAGE SUBSCRIPTION ]
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-500 mt-3">
                Update payment method, view invoices, or cancel subscription
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-6">You don't have an active subscription</p>
              <Link
                href="/subscribe"
                className="inline-block px-8 py-4 bg-[#ff00ff] text-white font-bold text-lg rounded uppercase transition-all hover:bg-[#ff00ff]/80"
                style={{ boxShadow: '0 0 20px #ff00ff' }}
              >
                [ UPGRADE TO PRO ]
              </Link>
            </div>
          )}
        </div>

{/* PDF Branding Settings - NEW */}
{user && <BrandingSettings userId={user.id} />}


        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleLogout}
            className="flex-1 py-3 border border-red-500 text-red-500 hover:bg-red-500/10 rounded uppercase text-sm font-bold flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
