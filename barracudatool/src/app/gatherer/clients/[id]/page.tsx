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
  Loader2,
  TrendingUp,
  MapPin,
  Home,
  Maximize2,
  Bed
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
    min_rooms: number | null;
  }[];
}

interface PropertyMatch {
  id: string;
  match_score: number;
  status: string;
  matched_at: string;
  property_id: string;
  properties: {
    id: string;
    title: string;
    price: string;
    location_city: string;
    location_department: string;
    surface: string;
    rooms: number;
    bedrooms: number;
    property_type: string;
    url: string;
    source: string;
    images: string[];
  } | null;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetails | null>(null);
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'market_scan' | 'shortlist'>('dashboard');
  const [isScanning, setIsScanning] = useState(false);
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null);

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
  setLoading(true);
  
  console.log('🔍 Fetching data for client:', clientId);
  
  // Fetch client details
  const { data: clientData } = await supabase
    .from('clients')
    .select(`*, client_search_criteria (*)`)
    .eq('id', clientId)
    .single();
  
  if (clientData) {
    console.log('✅ Client loaded:', clientData.first_name, clientData.last_name);
    setClient(clientData as unknown as ClientDetails);
  }

  // Fetch matches first
  const { data: matchesData, error: matchError } = await supabase
    .from('property_matches')
    .select('*')
    .eq('client_id', clientId)
    .order('match_score', { ascending: false });

  console.log('📊 Matches found:', matchesData?.length || 0);
  console.log('📊 Matches data:', matchesData);
  console.log('❌ Match error:', matchError);

  if (matchesData && matchesData.length > 0) {
    // Get all property IDs
    const propertyIds = matchesData.map(m => m.property_id);
    console.log('🔑 Property IDs to fetch:', propertyIds);
    
    // Fetch properties separately
    const { data: propertiesData, error: propError } = await supabase
      .from('properties')
      .select('*')
      .in('id', propertyIds);

    console.log('🏠 Properties found:', propertiesData?.length || 0);
    console.log('🏠 Properties data:', propertiesData);
    console.log('❌ Properties error:', propError);

    // Merge the data manually
    const mergedMatches = matchesData.map(match => {
      const matchedProperty = propertiesData?.find(p => p.id === match.property_id);
      console.log(`🔗 Matching property ${match.property_id}:`, matchedProperty ? '✓ Found' : '✗ Missing');
      return {
        ...match,
        properties: matchedProperty || null,
      };
    }).filter(m => m.properties !== null);

    console.log('✨ Final merged matches:', mergedMatches.length);
    console.log('✨ Merged data:', mergedMatches);
    setMatches(mergedMatches as unknown as PropertyMatch[]);
  } else {
    console.log('⚠️ No matches found for this client');
    setMatches([]);
  }

  setLoading(false);
};


  const handleRunScan = async () => {
    setIsScanning(true);
    
    // Call the matching API for this specific client
    const response = await fetch('/api/match-properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    });

    const result = await response.json();
    
    // Refresh matches after scan
    await fetchClientData();
    setIsScanning(false);
  };

  const updateMatchStatus = async (matchId: string, newStatus: 'shortlisted' | 'rejected') => {
    setUpdatingMatchId(matchId);
    
    const { error } = await supabase
      .from('property_matches')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (!error) {
      // Update local state
      setMatches(prev => 
        prev.map(m => m.id === matchId ? { ...m, status: newStatus } : m)
      );
    }
    
    setUpdatingMatchId(null);
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#00ff00] border-[#00ff00] bg-[#00ff00]/10';
    if (score >= 60) return 'text-[#00ffff] border-[#00ffff] bg-[#00ffff]/10';
    if (score >= 50) return 'text-[#ff00ff] border-[#ff00ff] bg-[#ff00ff]/10';
    return 'text-gray-500 border-gray-500 bg-gray-500/10';
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0d0d21] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#00ffff]" size={40} />
    </div>
  );
  
  if (!client) return (
    <div className="min-h-screen bg-[#0d0d21] flex items-center justify-center text-red-500">
      Client not found.
    </div>
  );

  const criteria = client.client_search_criteria?.[0];
  const newMatches = matches.filter(m => m.status === 'new');
  const shortlistedMatches = matches.filter(m => m.status === 'shortlisted');
  const displayedMatches = activeTab === 'shortlist' ? shortlistedMatches : newMatches;

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
                <span className="flex items-center gap-1 hover:text-white cursor-pointer">
                  <Mail size={12}/> {client.email || 'No Email'}
                </span>
                <span className="flex items-center gap-1 hover:text-white cursor-pointer">
                  <Phone size={12}/> {client.mobile || 'No Mobile'}
                </span>
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
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`pb-2 px-2 text-sm font-bold uppercase transition-all whitespace-nowrap ${
                activeTab === 'dashboard' ? 'text-[#00ffff] border-b-2 border-[#00ffff]' : 'text-gray-500 hover:text-[#00ffff]'
              }`}
            >
                Criteria & Configuration
            </button>
            <button 
              onClick={() => setActiveTab('market_scan')} 
              className={`pb-2 px-2 text-sm font-bold uppercase transition-all whitespace-nowrap ${
                activeTab === 'market_scan' ? 'text-[#ff00ff] border-b-2 border-[#ff00ff]' : 'text-gray-500 hover:text-[#ff00ff]'
              }`}
            >
                External Market Feed 
                {newMatches.length > 0 && (
                  <span className="ml-1 bg-[#ff00ff] text-black text-[0.6rem] px-1 rounded-full">
                    {newMatches.length} New
                  </span>
                )}
            </button>
            <button 
              onClick={() => setActiveTab('shortlist')} 
              className={`pb-2 px-2 text-sm font-bold uppercase transition-all whitespace-nowrap ${
                activeTab === 'shortlist' ? 'text-[#00ff00] border-b-2 border-[#00ff00]' : 'text-gray-500 hover:text-[#00ff00]'
              }`}
            >
                Selection / Shortlist
                {shortlistedMatches.length > 0 && (
                  <span className="ml-1 bg-[#00ff00] text-black text-[0.6rem] px-1 rounded-full">
                    {shortlistedMatches.length}
                  </span>
                )}
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
                            <button className="text-xs text-[#00ffff] underline hover:text-white">
                              Modify Inputs
                            </button>
                        </div>

                        {!criteria ? (
                            <div className="text-gray-500 italic text-sm">
                              No search criteria set. Configure to start scanning.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">
                                      Budget Range
                                    </label>
                                    <div className="text-xl text-white font-bold">
                                      €{criteria.min_budget?.toLocaleString() || '0'} - €{criteria.max_budget?.toLocaleString() || '∞'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">
                                      Target Sector
                                    </label>
                                    <div className="text-lg text-white">
                                      {criteria.locations || 'Entire Region'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">
                                      Min Surface
                                    </label>
                                    <div className="text-lg text-white">
                                      {criteria.min_surface ? `${criteria.min_surface} m²` : 'Any'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">
                                      Min Rooms/Bedrooms
                                    </label>
                                    <div className="text-lg text-white">
                                      {criteria.min_rooms || 'Any'} / {criteria.min_bedrooms || 'Any'}
                                    </div>
                                </div>
                                {criteria.property_types && criteria.property_types.length > 0 && (
                                  <div className="col-span-2">
                                      <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">
                                        Property Types
                                      </label>
                                      <div className="flex flex-wrap gap-2">
                                          {criteria.property_types.map(t => (
                                              <span key={t} className="text-xs border border-[#00ffff]/30 px-2 py-1 rounded bg-[#00ffff]/10">
                                                {t}
                                              </span>
                                          ))}
                                      </div>
                                  </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* ACTIVE SOURCES */}
                    <section className="bg-[#020222] border border-[#333] rounded-lg p-6">
                        <h3 className="text-sm text-[#a0a0ff] font-bold uppercase mb-4 flex items-center gap-2">
                            <Globe size={16}/> Active Data Sources
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {['CAD-IMMO', 'SeLoger (Soon)', 'Leboncoin (Soon)', 'Local Agencies (Coming)'].map((source, idx) => (
                                <div key={source} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded border border-white/10 text-xs text-white">
                                    <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-[#00ff00] shadow-[0_0_5px_#00ff00]' : 'bg-gray-500'}`}></div>
                                    {source}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-[0.7rem] text-gray-500">
                            * System is currently monitoring active sources for new listings matching criteria.
                        </div>
                    </section>
                </div>

                {/* RIGHT: STATUS & ACTIONS */}
                <div className="space-y-6">
                    <div className="bg-[#ff00ff]/10 border border-[#ff00ff] rounded-lg p-6 text-center">
                        <h3 className="text-[#ff00ff] font-bold uppercase text-sm mb-4">
                          Market Scanner Status
                        </h3>
                        
                        {isScanning ? (
                            <div className="flex flex-col items-center py-4">
                                <Loader2 size={40} className="animate-spin text-[#ff00ff] mb-2"/>
                                <span className="text-white text-sm animate-pulse">
                                  Scanning Properties...
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-2">
                                <div className="text-3xl font-bold text-white mb-1">
                                  {newMatches.length}
                                </div>
                                <div className="text-xs text-[#ff00ff] uppercase mb-6">
                                  New Matches Found
                                </div>
                                <button 
                                    onClick={handleRunScan}
                                    className="w-full py-3 bg-[#ff00ff] text-white font-bold uppercase text-sm rounded shadow-[0_0_15px_#ff00ff] hover:bg-[#ff00ff]/80 transition-all"
                                >
                                    Run Instant Scan
                                </button>
                            </div>
                        )}
                        <div className="text-[0.65rem] text-[#a0a0ff] mt-4">
                          {matches.length} total matches in database
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-[#020222] border border-[#333] rounded-lg p-4">
                      <h4 className="text-xs text-gray-400 uppercase mb-3">Quick Stats</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">New Matches:</span>
                          <span className="text-[#ff00ff] font-bold">{newMatches.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Shortlisted:</span>
                          <span className="text-[#00ff00] font-bold">{shortlistedMatches.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Matches:</span>
                          <span className="text-white font-bold">{matches.length}</span>
                        </div>
                      </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- TAB CONTENT: MARKET SCAN & SHORTLIST --- */}
        {(activeTab === 'market_scan' || activeTab === 'shortlist') && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-400 uppercase">
                        {activeTab === 'market_scan' 
                          ? `Showing ${displayedMatches.length} new matches` 
                          : `${displayedMatches.length} shortlisted properties`
                        }
                    </div>
                    <button 
                      onClick={handleRunScan}
                      disabled={isScanning}
                      className="text-xs text-[#ff00ff] border border-[#ff00ff] px-3 py-1 rounded uppercase hover:bg-[#ff00ff]/10 disabled:opacity-50"
                    >
                      {isScanning ? 'Scanning...' : 'Refresh Matches'}
                    </button>
                </div>

                {displayedMatches.length === 0 ? (
                  <div className="bg-[#020222] border border-[#333] rounded-lg p-12 text-center">
                    <p className="text-gray-500 text-lg mb-4">
                      {activeTab === 'market_scan' 
                        ? 'No new matches found yet.' 
                        : 'No properties shortlisted yet.'
                      }
                    </p>
                    {activeTab === 'market_scan' && (
                      <button 
                        onClick={handleRunScan}
                        className="px-6 py-3 bg-[#ff00ff] text-white font-bold uppercase text-sm rounded hover:bg-[#ff00ff]/80"
                      >
                        Run First Scan
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                      {displayedMatches.map((match) => {
                        // Safety check
                        if (!match.properties) return null;

                        const prop = match.properties;
                        const firstImage = Array.isArray(prop.images) ? prop.images[0] : null;
                        
                        return (
                          <div 
                            key={match.id} 
                            className="bg-[#020222] border border-[#333] hover:border-[#ff00ff] transition-colors rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center"
                          >
                              {/* Image */}
                              <div className="w-full md:w-48 h-32 bg-white/5 rounded overflow-hidden flex items-center justify-center text-gray-600 relative">
                                {firstImage ? (
                                  <img src={firstImage} alt={prop.title} className="w-full h-full object-cover" />
                                ) : (
                                  <Home size={40} className="text-gray-600" />
                                )}
                                
                                {/* Match Score Badge */}
                                <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold border ${getMatchScoreColor(match.match_score)}`}>
                                  <TrendingUp size={10} className="inline mr-1" />
                                  {match.match_score}%
                                </div>
                              </div>
                              
                              <div className="flex-1">
                                  <div className="flex gap-2 mb-2">
                                      <span className="bg-[#ff00ff] text-white text-[0.6rem] font-bold px-2 py-0.5 rounded uppercase">
                                        {prop.source}
                                      </span>
                                      <span className="bg-white/10 text-gray-300 text-[0.6rem] font-bold px-2 py-0.5 rounded uppercase">
                                        {prop.property_type || 'Property'}
                                      </span>
                                  </div>
                                  <h4 className="text-lg font-bold text-white mb-1">
                                    {prop.title}
                                  </h4>
                                  <div className="flex flex-wrap gap-3 text-[#a0a0ff] text-sm mb-2">
                                    <span className="flex items-center gap-1">
                                      <MapPin size={12} /> {prop.location_city}
                                    </span>
                                    {prop.surface && (
                                      <span className="flex items-center gap-1">
                                        <Maximize2 size={12} /> {prop.surface} m²
                                      </span>
                                    )}
                                    {prop.rooms && (
                                      <span className="flex items-center gap-1">
                                        <Home size={12} /> {prop.rooms} rooms
                                      </span>
                                    )}
                                    {prop.bedrooms && (
                                      <span className="flex items-center gap-1">
                                        <Bed size={12} /> {prop.bedrooms} bed
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xl font-bold text-[#00ffff]">
                                    €{parseInt(prop.price || '0').toLocaleString()}
                                  </div>
                              </div>

                              <div className="flex md:flex-col gap-2 w-full md:w-auto">
                                  {match.status !== 'shortlisted' && (
                                    <button 
                                      onClick={() => updateMatchStatus(match.id, 'shortlisted')}
                                      disabled={updatingMatchId === match.id}
                                      className="flex-1 md:w-40 py-2 border border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/10 rounded uppercase text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                      {updatingMatchId === match.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle2 size={14} /> Select
                                        </>
                                      )}
                                    </button>
                                  )}
                                  {match.status !== 'rejected' && (
                                    <button 
                                      onClick={() => updateMatchStatus(match.id, 'rejected')}
                                      disabled={updatingMatchId === match.id}
                                      className="flex-1 md:w-40 py-2 border border-red-500 text-red-500 hover:bg-red-500/10 rounded uppercase text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                      {updatingMatchId === match.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <>
                                          <XCircle size={14} /> Discard
                                        </>
                                      )}
                                    </button>
                                  )}
                                  <a 
                                    href={prop.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex-1 md:w-40 py-2 bg-[#ff00ff]/10 text-[#ff00ff] hover:bg-[#ff00ff]/20 rounded uppercase text-xs font-bold flex items-center justify-center gap-2"
                                  >
                                      <ExternalLink size={14} /> Source
                                  </a>
                              </div>
                          </div>
                        );
                      })}
                  </div>
                )}
            </div>
        )}

      </main>
    </div>
  );
}
