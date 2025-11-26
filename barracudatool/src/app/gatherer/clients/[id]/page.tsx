'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  ArrowLeft, 
  User, 
  Globe, 
  Radar, 
  ExternalLink,
  Phone,
  Mail,
  BellRing,
  CheckCircle2,
  XCircle,
  Loader2 
} from 'lucide-react';
import MainHeader from '../../../../components/MainHeader';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Types ---
interface ClientDetails {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  created_at: string;
  client_search_criteria: {
    min_budget: number | null;
    max_budget: number | null;
    locations: string | null;
    min_surface: number | null;
    min_bedrooms: number | null;
    property_types: string[] | null;
    notes: string | null;
  }[];
}

// Mocking the "Scraped" properties for the visual demo
const MOCK_SCRAPED_RESULTS = [
  { id: 1, source: 'SeLoger', agency: 'Century 21', title: 'Appartement 3 pièces', price: 450000, location: 'Antibes', surface: 65, url: '#' },
  { id: 2, source: 'Leboncoin', agency: 'Particulier', title: 'Villa avec piscine', price: 480000, location: 'Antibes Heights', surface: 110, url: '#' },
  { id: 3, source: 'Agency Site', agency: 'Agence du Port', title: 'Beau T3 rénové', price: 445000, location: 'Juan-les-Pins', surface: 62, url: '#' },
];

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'market_scan' | 'shortlist'>('dashboard');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      const { data } = await supabase
        .from('clients')
        .select(`*, client_search_criteria (*)`)
        .eq('id', clientId)
        .single();
      
      if (data) setClient(data as unknown as ClientDetails);
      setLoading(false);
    };
    fetchClient();
  }, [clientId]);

  const handleScan = () => {
    setIsScanning(true);
    // Simulate a scan delay
    setTimeout(() => setIsScanning(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-[#0d0d21] flex items-center justify-center text-[#00ffff]">Loading Client...</div>;
  if (!client) return <div className="min-h-screen bg-[#0d0d21] flex items-center justify-center text-red-500">Client not found.</div>;

  const criteria = client.client_search_criteria?.[0];

  return (
    <div className="min-h-screen bg-[#0d0d21] text-[#00ffff] font-[Orbitron]">
      <MainHeader />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-[#00ffff]/30 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 border border-[#00ffff] rounded hover:bg-[#00ffff]/10 text-[#00ffff]">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider">
                  {client.first_name} {client.last_name}
                </h1>
                <span className="bg-[#00ff00]/10 text-[#00ff00] border border-[#00ff00] text-[0.65rem] px-2 py-0.5 rounded uppercase font-bold">
                  Active Buyer
                </span>
              </div>
              <div className="flex gap-4 text-sm text-[#a0a0ff] mt-1">
                <span className="flex items-center gap-1 hover:text-white cursor-pointer"><Mail size={12}/> {client.email || 'No Email'}</span>
                <span className="flex items-center gap-1 hover:text-white cursor-pointer"><Phone size={12}/> {client.mobile || 'No Mobile'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
             <button className="px-4 py-2 border border-[#ff00ff] text-[#ff00ff] hover:bg-[#ff00ff]/10 rounded uppercase text-xs font-bold flex items-center gap-2">
                <BellRing size={14} /> Alerts On
             </button>
             <button className="px-4 py-2 bg-[#00ffff] text-black hover:bg-[#00ffff]/80 rounded uppercase text-xs font-bold flex items-center gap-2">
                <User size={14} /> Edit File
             </button>
          </div>
        </div>

        {/* --- TABS --- */}
        <div className="flex gap-6 mb-6 overflow-x-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`pb-2 px-2 text-sm font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'text-[#00ffff] border-b-2 border-[#00ffff]' : 'text-gray-500 hover:text-[#00ffff]'}`}>
                Criteria & Configuration
            </button>
            <button onClick={() => setActiveTab('market_scan')} className={`pb-2 px-2 text-sm font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'market_scan' ? 'text-[#ff00ff] border-b-2 border-[#ff00ff]' : 'text-gray-500 hover:text-[#ff00ff]'}`}>
                External Market Feed <span className="ml-1 bg-[#ff00ff] text-black text-[0.6rem] px-1 rounded-full">3 New</span>
            </button>
            <button onClick={() => setActiveTab('shortlist')} className={`pb-2 px-2 text-sm font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'shortlist' ? 'text-[#00ff00] border-b-2 border-[#00ff00]' : 'text-gray-500 hover:text-[#00ff00]'}`}>
                Selection / Shortlist
            </button>
        </div>

        {/* --- TAB CONTENT: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT: CRITERIA CONFIG */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-[#00ffff]/5 border border-[#00ffff] rounded-lg p-6 relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg text-white font-bold uppercase flex items-center gap-2">
                                <Radar className="text-[#00ffff]"/> Search Configuration
                            </h3>
                            <button className="text-xs text-[#00ffff] underline hover:text-white">Modify Inputs</button>
                        </div>

                        {!criteria ? (
                            <div className="text-gray-500 italic text-sm">No search criteria set. Configure to start scanning.</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">Max Budget</label>
                                    <div className="text-xl text-white font-bold">€{criteria.max_budget ? criteria.max_budget.toLocaleString() : '∞'}</div>
                                </div>
                                <div>
                                    <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">Target Sector</label>
                                    <div className="text-lg text-white">{criteria.locations || 'Entire Region'}</div>
                                </div>
                                <div>
                                    <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">Min Surface</label>
                                    <div className="text-lg text-white">{criteria.min_surface ? `${criteria.min_surface} m²` : 'Any'}</div>
                                </div>
                                <div>
                                    <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">Min Bedrooms</label>
                                    <div className="text-lg text-white">{criteria.min_bedrooms || 'Any'}</div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">Property Types</label>
                                    <div className="flex flex-wrap gap-2">
                                        {criteria.property_types?.map(t => (
                                            <span key={t} className="text-xs border border-[#00ffff]/30 px-2 py-1 rounded bg-[#00ffff]/10">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ACTIVE SOURCES - Visual Only for now */}
                    <section className="bg-[#020222] border border-[#333] rounded-lg p-6">
                        <h3 className="text-sm text-[#a0a0ff] font-bold uppercase mb-4 flex items-center gap-2">
                            <Globe size={16}/> Active Data Sources
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {['SeLoger', 'Leboncoin', 'BienIci', 'Logic-Immo', 'Figaro Immo', 'Local Agencies (15)'].map(source => (
                                <div key={source} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded border border-white/10 text-xs text-white">
                                    <div className="w-2 h-2 rounded-full bg-[#00ff00] shadow-[0_0_5px_#00ff00]"></div>
                                    {source}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-[0.7rem] text-gray-500">
                            * System is currently monitoring these sources for new listings matching the criteria above.
                        </div>
                    </section>
                </div>

                {/* RIGHT: STATUS & ACTIONS */}
                <div className="space-y-6">
                    <div className="bg-[#ff00ff]/10 border border-[#ff00ff] rounded-lg p-6 text-center">
                        <h3 className="text-[#ff00ff] font-bold uppercase text-sm mb-4">Market Scanner Status</h3>
                        
                        {isScanning ? (
                            <div className="flex flex-col items-center py-4">
                                <Loader2 size={40} className="animate-spin text-[#ff00ff] mb-2"/>
                                <span className="text-white text-sm animate-pulse">Scraping 15 Sources...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-2">
                                <div className="text-3xl font-bold text-white mb-1">3</div>
                                <div className="text-xs text-[#ff00ff] uppercase mb-6">New Matches Found</div>
                                <button 
                                    onClick={handleScan}
                                    className="w-full py-3 bg-[#ff00ff] text-white font-bold uppercase text-sm rounded shadow-[0_0_15px_#ff00ff] hover:bg-[#ff00ff]/80 transition-all"
                                >
                                    Run Instant Scan
                                </button>
                            </div>
                        )}
                        <div className="text-[0.65rem] text-[#a0a0ff] mt-4">Last scan: 2 hours ago</div>
                    </div>
                </div>
            </div>
        )}

        {/* --- TAB CONTENT: MARKET SCAN --- */}
        {activeTab === 'market_scan' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-400 uppercase">
                        Showing external listings matching client criteria
                    </div>
                    <button className="text-xs text-[#ff00ff] border border-[#ff00ff] px-3 py-1 rounded uppercase hover:bg-[#ff00ff]/10">
                        Filter Results
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {MOCK_SCRAPED_RESULTS.map((item) => (
                        <div key={item.id} className="bg-[#020222] border border-[#333] hover:border-[#ff00ff] transition-colors rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                            {/* Image Placeholder */}
                            <div className="w-full md:w-48 h-32 bg-white/5 rounded flex items-center justify-center text-gray-600">
                                Photo
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex gap-2 mb-2">
                                    <span className="bg-[#ff00ff] text-white text-[0.6rem] font-bold px-2 py-0.5 rounded uppercase">{item.source}</span>
                                    <span className="bg-white/10 text-gray-300 text-[0.6rem] font-bold px-2 py-0.5 rounded uppercase">{item.agency}</span>
                                </div>
                                <h4 className="text-lg font-bold text-white">{item.title}</h4>
                                <div className="text-[#a0a0ff] text-sm mb-2">{item.location} • {item.surface} m²</div>
                                <div className="text-xl font-bold text-[#00ffff]">€{item.price.toLocaleString()}</div>
                            </div>

                            <div className="flex md:flex-col gap-2 w-full md:w-auto">
                                <button className="flex-1 md:w-40 py-2 border border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/10 rounded uppercase text-xs font-bold flex items-center justify-center gap-2">
                                    <CheckCircle2 size={14} /> Select
                                </button>
                                <button className="flex-1 md:w-40 py-2 border border-red-500 text-red-500 hover:bg-red-500/10 rounded uppercase text-xs font-bold flex items-center justify-center gap-2">
                                    <XCircle size={14} /> Discard
                                </button>
                                <button className="flex-1 md:w-40 py-2 bg-[#ff00ff]/10 text-[#ff00ff] hover:bg-[#ff00ff]/20 rounded uppercase text-xs font-bold flex items-center justify-center gap-2">
                                    <ExternalLink size={14} /> Source
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </main>
    </div>
  );
}
