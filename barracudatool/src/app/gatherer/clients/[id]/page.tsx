// src/app/gatherer/clients/[id]/page.tsx

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
  Bed,
  AlertTriangle,
  Droplets,
  Flame,
  Wrench,
  Calendar,
  Bath
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
  last_matched_at?: string; // ✅ ADD THIS
  client_search_criteria: {
    min_budget: number | null;
    max_budget: number | null;
    locations: string | null;
    selected_places: any;
    radius_searches: any;
    min_surface: number | null;
    min_bedrooms: number | null;
    max_bedrooms: number | null;
    property_types: string[] | null;
    notes: string | null;
    min_rooms: number | null;
    max_rooms: number | null;
    min_land_surface: number | null;
    max_land_surface: number | null;
    pool_preference: string | null;
    heating_system: string | null;
    drainage_system: string | null;
    property_condition: string | null;
    min_year_built: number | null;
    max_year_built: number | null;
    min_bathrooms: number | null;
  }[];
}

interface PropertyMatch {
  id: string;
  match_score: number;
  status: string;
  matched_at: string;
  updated_at: string;
  property_id: string;
  properties: {
    id: string;
    title: string;
    price: string;
    location_city: string;
    location_department: string;
    location_postal_code: string;
    location_lat: number | null;
    location_lng: number | null;
    surface: string;
    rooms: number;
    bedrooms: number;
    property_type: string;
    url: string;
    source: string;
    reference: string;
    images: string[];
    description: string | null;
    data_quality_score: string;
    validation_errors: string[];
    land_surface: number | null;
    building_surface: number | null;
    floors: number | null;
    pool: boolean | null;
    heating_system: string | null;
    drainage_system: string | null;
    property_condition: string | null;
    year_built: number | null;
    bathrooms: number | null;
    wc_count: number | null;
    energy_consumption: number | null;
    co2_emissions: number | null;
    previous_price: number | null;
    price_changed_at: string | null;
    price_drop_amount: number | null;
    scraped_at: string;
    last_seen_at: string;
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasAutoMatched, setHasAutoMatched] = useState(false);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    setLoading(true);
  
    // 1) Fetch client + criteria
    const { data, error: clientError } = await supabase
      .from('clients')
      .select('*, client_search_criteria (*)')
      .eq('id', clientId)
      .single();
  
    if (!clientError && data) {
      setClient(data as unknown as ClientDetails);
      
      // ✅ SET lastUpdated from last_matched_at field
      if (data.last_matched_at) {
        setLastUpdated(new Date(data.last_matched_at));
      }
    } else {
      setClient(null);
    }
  
    // 2) Fetch matches for this client
    const matchesResponse = await supabase
      .from('property_matches')
      .select('*')
      .eq('client_id', clientId)
      .order('match_score', { ascending: false });
  
    if (!matchesResponse.error && matchesResponse.data && matchesResponse.data.length > 0) {
      const propertyIds = matchesResponse.data.map((m: any) => m.property_id);
  
      // 3) Fetch properties for those matches
      const propertiesResponse = await supabase
        .from('properties')
        .select('*')
        .in('id', propertyIds);
  
      let parsedProperties: any[] | undefined = propertiesResponse.data ?? undefined;
  
      if (!propertiesResponse.error && propertiesResponse.data) {
        parsedProperties = propertiesResponse.data.map((p: any) => {
          let images: string[] = [];
          let validation_errors: string[] = [];
  
          try {
            if (p.images) {
              if (typeof p.images === 'string') {
                images = JSON.parse(p.images);
              } else if (Array.isArray(p.images)) {
                images = p.images;
              }
            }
          } catch {
            // ignore
          }
  
          try {
            if (p.validation_errors) {
              if (typeof p.validation_errors === 'string') {
                const parsed = JSON.parse(p.validation_errors);
                validation_errors = Array.isArray(parsed) ? parsed : [];
              } else if (Array.isArray(p.validation_errors)) {
                validation_errors = p.validation_errors;
              }
            }
          } catch {
            // ignore
          }
  
          return {
            ...p,
            images,
            validation_errors,
            data_quality_score: p.data_quality_score || '1.0',
          };
        });
      }
  
      const mergedMatches = matchesResponse.data
        .map((match: any) => {
          const matchedProperty = parsedProperties?.find((p: any) => p.id === match.property_id);
          return {
            ...match,
            properties: matchedProperty || null,
          };
        })
        .filter((m: any) => m.properties !== null);
  
      setMatches(mergedMatches as PropertyMatch[]);
    } else {
      setMatches([]);
    }
  
    setLoading(false);
  };

  // Auto-match once on first load if there are criteria
  useEffect(() => {
    if (!loading && !hasAutoMatched && client && matches.length === 0) {
      const criteria = client.client_search_criteria?.[0];

      const hasLocation = !!(
        criteria?.locations ||
        criteria?.selected_places ||
        criteria?.radius_searches
      );
      const hasBudget = !!(criteria?.min_budget || criteria?.max_budget);

      if (hasLocation || hasBudget) {
        setHasAutoMatched(true);
        handleRunScan();
      }
    }
  }, [loading, hasAutoMatched, client, matches.length]);

  const handleRunScan = async () => {
    setIsScanning(true);

    await fetch('/api/match-properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    });

    // ✅ UPDATE: Fetch fresh data which will include updated last_matched_at
    await fetchClientData();
    
    setIsScanning(false);
  };

  const updateMatchStatus = async (
    matchId: string,
    newStatus: 'shortlisted' | 'rejected' | 'new'
  ) => {
    setUpdatingMatchId(matchId);

    const { error } = await supabase
      .from('property_matches')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (!error) {
      setMatches(prev =>
        prev.map(m => (m.id === matchId ? { ...m, status: newStatus } : m))
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

  const getQualityBadge = (score: string, errors: string[]) => {
    const numScore = parseFloat(score);
    if (numScore === 1.0) return null;

    return (
      <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 border border-yellow-500 text-yellow-500 flex items-center gap-1">
        <AlertTriangle size={10} />
        Quality: {(numScore * 100).toFixed(0)}%
      </div>
    );
  };

  const getTimeSince = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d21] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00ffff]" size={40} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[#0d0d21] flex items-center justify-center text-red-500">
        Client not found.
      </div>
    );
  }

  const criteria = client.client_search_criteria?.[0];
  const newMatches = matches.filter(m => m.status === 'new');
  const shortlistedMatches = matches.filter(m => m.status === 'shortlisted');
  const rejectedMatches = matches.filter(m => m.status === 'rejected');
  const displayedMatches =
    activeTab === 'shortlist' ? shortlistedMatches : newMatches;

  const hasLocation = !!(
    criteria?.locations ||
    criteria?.selected_places ||
    criteria?.radius_searches
  );
  const hasBudget = !!(criteria?.min_budget || criteria?.max_budget);
  const matchingDisabled = !hasLocation && !hasBudget;

  return (
    <div className="min-h-screen bg-[#0d0d21] text-[#00ffff] font-[Orbitron]">
      <MainHeader />
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-[#00ffff]/30 pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 border border-[#00ffff] rounded hover:bg-[#00ffff]/10 text-[#00ffff]"
            >
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
                  <Mail size={12} /> {client.email || 'No Email'}
                </span>
                <span className="flex items-center gap-1 hover:text-white cursor-pointer">
                  <Phone size={12} /> {client.mobile || 'No Mobile'}
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

        {/* WARNING BANNER */}
        {matchingDisabled && (
          <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500 rounded-lg flex items-start gap-3">
            <AlertTriangle
              size={24}
              className="text-red-500 flex-shrink-0 mt-0.5"
            />
            <div>
              <div className="text-red-500 font-bold text-sm uppercase mb-1">
                ⚠️ Matching Disabled
              </div>
              <div className="text-white text-sm">
                This client has{' '}
                <span className="font-bold">
                  no location criteria AND no budget criteria
                </span>{' '}
                set. The matching system requires at least one of these to find
                relevant properties.
              </div>
              <button className="mt-3 px-4 py-2 bg-red-500 text-white rounded text-xs font-bold uppercase hover:bg-red-600">
                Configure Search Criteria
              </button>
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-6 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-2 px-2 text-sm font-bold uppercase transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'text-[#00ffff] border-b-2 border-[#00ffff]'
                : 'text-gray-500 hover:text-[#00ffff]'
            }`}
          >
            Criteria & Configuration
          </button>
          <button
            onClick={() => setActiveTab('market_scan')}
            className={`pb-2 px-2 text-sm font-bold uppercase transition-all whitespace-nowrap ${
              activeTab === 'market_scan'
                ? 'text-[#ff00ff] border-b-2 border-[#ff00ff]'
                : 'text-gray-500 hover:text-[#ff00ff]'
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
              activeTab === 'shortlist'
                ? 'text-[#00ff00] border-b-2 border-[#00ff00]'
                : 'text-gray-500 hover:text-[#00ff00]'
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

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: CRITERIA */}
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-[#00ffff]/5 border border-[#00ffff] rounded-lg p-6 relative">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg text-white font-bold uppercase flex items-center gap-2">
                    <Radar className="text-[#00ffff]" /> Search Configuration
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
                        {hasBudget ? (
                          `€${criteria.min_budget?.toLocaleString() || '0'} - €${
                            criteria.max_budget?.toLocaleString() || '∞'
                          }`
                        ) : (
                          <span className="text-red-500 text-sm">Not Set</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">
                        Target Sector
                      </label>
                      <div className="text-lg text-white">
                        {hasLocation ? (
                          criteria.locations || 'Custom area'
                        ) : (
                          <span className="text-red-500 text-sm">Not Set</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">
                        Min Surface
                      </label>
                      <div className="text-lg text-white">
                        {criteria.min_surface
                          ? `${criteria.min_surface} m²`
                          : 'Any'}
                      </div>
                    </div>
                    <div>
                      <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">
                        Min Rooms/Bedrooms
                      </label>
                      <div className="text-lg text-white">
                        {criteria.min_rooms || 'Any'} /{' '}
                        {criteria.min_bedrooms || 'Any'}
                      </div>
                    </div>
                    {criteria.property_types &&
                      criteria.property_types.length > 0 && (
                        <div className="col-span-2">
                          <label className="text-[0.65rem] text-[#00ffff] uppercase block mb-1">
                            Property Types
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {criteria.property_types.map(t => (
                              <span
                                key={t}
                                className="text-xs border border-[#00ffff]/30 px-2 py-1 rounded bg-[#00ffff]/10"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </section>

              <section className="bg-[#020222] border border-[#333] rounded-lg p-6">
                <h3 className="text-sm text-[#a0a0ff] font-bold uppercase mb-4 flex items-center gap-2">
                  <Globe size={16} /> Active Data Sources
                </h3>
                <div className="flex flex-wrap gap-3">
                  {[
                    'CAD-IMMO',
                    'SeLoger (Soon)',
                    'Leboncoin (Soon)',
                    'Local Agencies (Coming)',
                  ].map((source, idx) => (
                    <div
                      key={source}
                      className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded border border-white/10 text-xs text-white"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          idx === 0
                            ? 'bg-[#00ff00] shadow-[0_0_5px_#00ff00]'
                            : 'bg-gray-500'
                        }`}
                      ></div>
                      {source}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-[0.7rem] text-gray-500">
                  * System is currently monitoring active sources for new
                  listings matching criteria.
                </div>
              </section>
            </div>

            {/* RIGHT: STATUS */}
            <div className="space-y-6">
              <div className="bg-[#ff00ff]/10 border border-[#ff00ff] rounded-lg p-6 text-center">
                <h3 className="text-[#ff00ff] font-bold uppercase text-sm mb-4">
                  Market Scanner Status
                </h3>

                {isScanning ? (
                  <div className="flex flex-col items-center py-4">
                    <Loader2
                      size={40}
                      className="animate-spin text-[#ff00ff] mb-2"
                    />
                    <span className="text-white text-sm animate-pulse">
                      Refreshing matches...
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
                      disabled={matchingDisabled}
                      className="w-full py-3 bg-[#ff00ff] text-white font-bold uppercase text-sm rounded shadow-[0_0_15px_#ff00ff] hover:bg-[#ff00ff]/80 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Radar size={16} />
                      Refresh Matches
                    </button>
                  </div>
                )}

                {lastUpdated && (
                  <div className="mt-3 text-[0.65rem] text-[#a0a0ff] flex items-center justify-center gap-1">
                    <Calendar size={10} />
                    Last updated: {getTimeSince(lastUpdated)}
                  </div>
                )}
              </div>

              <div className="bg-[#020222] border border-[#333] rounded-lg p-4">
                <h4 className="text-xs text-gray-400 uppercase mb-3">
                  Quick Stats
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">New Matches:</span>
                    <span className="text-[#ff00ff] font-bold">
                      {newMatches.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Shortlisted:</span>
                    <span className="text-[#00ff00] font-bold">
                      {shortlistedMatches.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Discarded:</span>
                    <span className="text-red-500 font-bold">
                      {rejectedMatches.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Matches:</span>
                    <span className="text-white font-bold">
                      {matches.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MARKET & SHORTLIST TABS */}
        {(activeTab === 'market_scan' || activeTab === 'shortlist') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400 uppercase">
                {activeTab === 'market_scan'
                  ? `Showing ${displayedMatches.length} new matches`
                  : `${displayedMatches.length} shortlisted properties`}
                {lastUpdated && (
                  <span className="ml-3 text-[#a0a0ff]">
                    • Last updated: {getTimeSince(lastUpdated)}
                  </span>
                )}
              </div>
            </div>

            {displayedMatches.length === 0 ? (
              <div className="bg-[#020222] border border-[#333] rounded-lg p-12 text-center">
                <p className="text-gray-500 text-lg mb-4">
                  {activeTab === 'market_scan'
                    ? 'No new matches found yet.'
                    : 'No properties shortlisted yet.'}
                </p>
                {activeTab === 'market_scan' && !matchingDisabled && (
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
                {displayedMatches.map(match => {
                  if (!match.properties) return null;

                  const prop = match.properties;
                  const firstImage = Array.isArray(prop.images) ? prop.images[0] : null;
                  const allImages = Array.isArray(prop.images) ? prop.images : [];
                  const qualityScore = prop.data_quality_score || '1.0';
                  const validationErrors = prop.validation_errors || [];
                  const isExpanded = expandedPropertyId === match.id;

                  // Price change indicator
                  const hasPriceChange = prop.previous_price && prop.price_changed_at;
                  const priceDrop = prop.price_drop_amount || 0;

                  return (
                    <div
                      key={match.id}
                      className="bg-[#020222] border border-[#333] hover:border-[#ff00ff] transition-colors rounded-lg overflow-hidden"
                    >
                      {/* COLLAPSED VIEW */}
                      <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                        {/* Image */}
                        <div
                          className="w-full md:w-48 h-32 bg-white/5 rounded overflow-hidden flex items-center justify-center text-gray-600 relative flex-shrink-0 cursor-pointer"
                          onClick={() =>
                            setExpandedPropertyId(isExpanded ? null : match.id)
                          }
                        >
                          {firstImage ? (
                            <img
                              src={firstImage}
                              alt={prop.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Home size={40} className="text-gray-600" />
                          )}

                          {/* Match Score Badge */}
                          <div
                            className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold border ${getMatchScoreColor(
                              match.match_score
                            )}`}
                          >
                            <TrendingUp size={10} className="inline mr-1" />
                            {match.match_score}%
                          </div>

                          {/* Quality Badge */}
                          {getQualityBadge(qualityScore, validationErrors)}

                          {/* Expand indicator */}
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                            {isExpanded
                              ? '▲ Less'
                              : `▼ More (${allImages.length} photos)`}
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex gap-2 mb-2 flex-wrap">
                            <span className="bg-[#ff00ff] text-white text-[0.6rem] font-bold px-2 py-0.5 rounded uppercase">
                              {prop.source}
                            </span>
                            <span className="bg-white/10 text-gray-300 text-[0.6rem] font-bold px-2 py-0.5 rounded uppercase">
                              {prop.property_type || 'Property'}
                            </span>
                            {prop.pool && (
                              <span className="bg-blue-500/20 text-blue-400 text-[0.6rem] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                <Droplets size={10} /> Pool
                              </span>
                            )}
                            {hasPriceChange && priceDrop > 0 && (
                              <span className="bg-green-500/20 text-green-400 text-[0.6rem] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                💰 €{priceDrop.toLocaleString()} drop
                              </span>
                            )}
                          </div>

                          <h4
                            className="text-lg font-bold text-white mb-1 cursor-pointer hover:text-[#00ffff]"
                            onClick={() =>
                              setExpandedPropertyId(isExpanded ? null : match.id)
                            }
                          >
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
                            {prop.land_surface && (
                              <span className="flex items-center gap-1">
                                <Home size={12} /> {prop.land_surface} m² land
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
                            {prop.bathrooms && (
                              <span className="flex items-center gap-1">
                                <Bath size={12} /> {prop.bathrooms} bath
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-gray-400 mb-2">
                            {prop.heating_system && (
                              <span className="flex items-center gap-1">
                                <Flame size={10} /> {prop.heating_system}
                              </span>
                            )}
                            {prop.drainage_system && (
                              <span className="flex items-center gap-1">
                                <Wrench size={10} /> {prop.drainage_system}
                              </span>
                            )}
                            {prop.year_built && (
                              <span className="flex items-center gap-1">
                                <Calendar size={10} /> Built {prop.year_built}
                              </span>
                            )}
                          </div>

                          {validationErrors.length > 0 && (
                            <div className="text-xs text-yellow-500 mb-2 flex items-center gap-1">
                              <AlertTriangle size={12} />
                              {Array.isArray(validationErrors)
                                ? validationErrors.join(', ')
                                : 'Data quality issues'}
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <div className="text-xl font-bold text-[#00ffff]">
                              €{parseInt(prop.price || '0', 10).toLocaleString()}
                            </div>
                            {hasPriceChange && (
                              <div className="text-xs text-gray-500 line-through">
                                €
                                {parseInt(
                                  String(prop.previous_price),
                                  10
                                ).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex md:flex-col gap-2 w-full md:w-auto">
                          {match.status !== 'shortlisted' && (
                            <button
                              onClick={() =>
                                updateMatchStatus(match.id, 'shortlisted')
                              }
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
                              onClick={() =>
                                updateMatchStatus(match.id, 'rejected')
                              }
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

                      {/* EXPANDED VIEW - Keep your existing expanded view code here */}
                      {/* I'm truncating this for brevity, but keep all your existing accordion content */}
                    </div>
                  );
                })}
              </div>
            )}

            {/* DISCARDED PROPERTIES SECTION */}
            {activeTab === 'shortlist' && rejectedMatches.length > 0 && (
              <details className="bg-[#020222] border border-red-500/30 rounded-lg p-4">
                <summary className="cursor-pointer text-red-500 font-bold uppercase text-sm flex items-center gap-2">
                  <XCircle size={16} />
                  ▼ Discarded Properties ({rejectedMatches.length})
                </summary>
                <div className="mt-4 space-y-3">
                  {rejectedMatches.map(match => {
                    if (!match.properties) return null;
                    const prop = match.properties;

                    return (
                      <div
                        key={match.id}
                        className="flex justify-between items-center p-3 bg-red-500/5 border border-red-500/20 rounded"
                      >
                        <div>
                          <div className="text-white font-bold text-sm">
                            {prop.title}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {prop.location_city} • €
                            {parseInt(prop.price || '0', 10).toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={() => updateMatchStatus(match.id, 'new')}
                          className="px-3 py-1 border border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff]/10 rounded uppercase text-xs font-bold"
                        >
                          Restore
                        </button>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
