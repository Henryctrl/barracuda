'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Palette, Building2, Phone, Mail, Image as ImageIcon, Save, Loader2 } from 'lucide-react';

interface BrandingData {
  company_name: string;
  contact_phone: string;
  contact_email: string;
  brand_color: string;
  logo_url: string | null;
}

export default function BrandingSettings({ userId }: { userId: string }) {
  const [branding, setBranding] = useState<BrandingData>({
    company_name: '',
    contact_phone: '',
    contact_email: '',
    brand_color: '#00ffff',
    logo_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchBranding();
  }, [userId]);

  const fetchBranding = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('company_name, contact_phone, contact_email, brand_color, logo_url')
      .eq('id', userId)
      .single();

    if (data) {
      setBranding({
        company_name: data.company_name || '',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        brand_color: data.brand_color || '#00ffff',
        logo_url: data.logo_url || null,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    const { error } = await supabase
      .from('user_profiles')
      .update(branding)
      .eq('id', userId);

    if (error) {
      alert('Failed to save branding settings');
    } else {
      alert('Branding settings saved successfully!');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-[#00ffff]" size={40} />
      </div>
    );
  }

  return (
    <div 
      className="border-2 border-[#ff00ff] rounded-lg p-8 bg-[#1a1a3a]/80"
      style={{ boxShadow: '0 0 20px rgba(255, 0, 255, 0.3)' }}
    >
      <div className="flex items-center gap-4 mb-6">
        <Palette size={32} className="text-[#ff00ff]" />
        <div>
          <h2 className="text-2xl font-bold text-white">PDF Branding Settings</h2>
          <p className="text-gray-400 text-sm">Customize how your property brochures look</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Company Name */}
        <div>
          <label className="flex items-center gap-2 text-sm text-[#00ffff] uppercase mb-2">
            <Building2 size={16} />
            Company Name
          </label>
          <input
            type="text"
            value={branding.company_name}
            onChange={(e) => setBranding({ ...branding, company_name: e.target.value })}
            placeholder="e.g., Barracuda Properties"
            className="w-full px-4 py-3 bg-[#0d0d21] border border-[#00ffff]/30 rounded text-white focus:border-[#00ffff] focus:outline-none"
          />
        </div>

        {/* Contact Email */}
        <div>
          <label className="flex items-center gap-2 text-sm text-[#00ffff] uppercase mb-2">
            <Mail size={16} />
            Contact Email
          </label>
          <input
            type="email"
            value={branding.contact_email}
            onChange={(e) => setBranding({ ...branding, contact_email: e.target.value })}
            placeholder="agent@yourcompany.com"
            className="w-full px-4 py-3 bg-[#0d0d21] border border-[#00ffff]/30 rounded text-white focus:border-[#00ffff] focus:outline-none"
          />
        </div>

        {/* Contact Phone */}
        <div>
          <label className="flex items-center gap-2 text-sm text-[#00ffff] uppercase mb-2">
            <Phone size={16} />
            Contact Phone
          </label>
          <input
            type="tel"
            value={branding.contact_phone}
            onChange={(e) => setBranding({ ...branding, contact_phone: e.target.value })}
            placeholder="+33 6 12 34 56 78"
            className="w-full px-4 py-3 bg-[#0d0d21] border border-[#00ffff]/30 rounded text-white focus:border-[#00ffff] focus:outline-none"
          />
        </div>

        {/* Brand Color */}
        <div>
          <label className="flex items-center gap-2 text-sm text-[#00ffff] uppercase mb-2">
            <Palette size={16} />
            Brand Color
          </label>
          <div className="flex gap-4 items-center">
            <input
              type="color"
              value={branding.brand_color}
              onChange={(e) => setBranding({ ...branding, brand_color: e.target.value })}
              className="w-20 h-12 rounded border-2 border-[#00ffff]/30 cursor-pointer bg-[#0d0d21]"
            />
            <input
              type="text"
              value={branding.brand_color}
              onChange={(e) => setBranding({ ...branding, brand_color: e.target.value })}
              placeholder="#00ffff"
              className="flex-1 px-4 py-3 bg-[#0d0d21] border border-[#00ffff]/30 rounded text-white focus:border-[#00ffff] focus:outline-none font-mono"
            />
            <div 
              className="w-12 h-12 rounded border-2 border-white"
              style={{ backgroundColor: branding.brand_color }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">This color will be used in PDF headers and accents</p>
        </div>

        {/* Logo URL (simple for now) */}
        <div>
          <label className="flex items-center gap-2 text-sm text-[#00ffff] uppercase mb-2">
            <ImageIcon size={16} />
            Logo URL (optional)
          </label>
          <input
            type="text"
            value={branding.logo_url || ''}
            onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
            placeholder="https://yourwebsite.com/logo.png"
            className="w-full px-4 py-3 bg-[#0d0d21] border border-[#00ffff]/30 rounded text-white focus:border-[#00ffff] focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-2">Add your company logo URL for PDF brochures</p>
        </div>

        {/* Preview */}
        <div className="p-4 bg-[#0d0d21] border border-[#00ffff]/30 rounded">
          <p className="text-xs text-gray-400 uppercase mb-3">Preview</p>
          <div 
            className="p-4 rounded"
            style={{ backgroundColor: branding.brand_color, color: '#ffffff' }}
          >
            <p className="font-bold text-lg">{branding.company_name || 'Your Company Name'}</p>
            <p className="text-sm mt-2">{branding.contact_email || 'contact@example.com'}</p>
            <p className="text-sm">{branding.contact_phone || '+33 X XX XX XX XX'}</p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-[#00ff00] text-black font-bold text-lg rounded uppercase transition-all hover:bg-[#00ff00]/80 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ boxShadow: '0 0 20px #00ff00' }}
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              [ SAVING... ]
            </>
          ) : (
            <>
              <Save size={20} />
              [ SAVE BRANDING ]
            </>
          )}
        </button>
      </div>
    </div>
  );
}
