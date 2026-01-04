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
  Bath,
  Check,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import MainHeader from '../../../../components/MainHeader';
import EditClientPopup from '../../../../components/popups/EditClientPopup';
import { pdf } from '@react-pdf/renderer';
import { PropertyBrochurePDF } from '../../../../components/PropertyBrochurePDF';

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
  last_matched_at?: string;
  client_search_criteria: {
    min_budget: number | null;
    max_budget: number | null;
    locations: string | null;
    selected_places: any;
    radius_searches: any;
    custom_sectors: any;
    min_surface: number | null;
    max_surface: number | null;
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
    desired_dpe: string | null;
    features: string[];
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

interface MatchAnalysis {
  matches: Record<string, boolean>;
  uncertainties: {
    field: string;
    reason: string;
  }[];
}

interface CriteriaField {
  name: string;
  filled: boolean;
  priority: 'critical' | 'high' | 'medium' | 'nice-to-have';
  description: string;
  value?: string;
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
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const [isCompletenessExpanded, setIsCompletenessExpanded] = useState(false);
  const [userBranding, setUserBranding] = useState<any>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranding = async () => {
      console.log('🔍 Starting to fetch branding...');
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user);
      
      if (!user) {
        console.log('❌ No user found');
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('company_name, contact_phone, contact_email, brand_color, logo_url')
        .eq('id', user.id)
        .single();

      console.log('📊 Branding query result:', { data, error });

      if (data) {
        console.log('✅ Branding data set:', data);
        setUserBranding(data);
      } else {
        console.log('❌ No branding data found');
      }
    };
    
    fetchBranding();
  }, []);

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    setLoading(true);
  
    const { data, error: clientError } = await supabase
      .from('clients')
      .select('*, client_search_criteria (*)')
      .eq('id', clientId)
      .single();
  
    if (!clientError && data) {
      setClient(data as unknown as ClientDetails);
      
      if (data.last_matched_at) {
        setLastUpdated(new Date(data.last_matched_at));
      }
    } else {
      setClient(null);
    }
  
    const matchesResponse = await supabase
      .from('property_matches')
      .select('*')
      .eq('client_id', clientId)
      .order('match_score', { ascending: false });
  
    if (!matchesResponse.error && matchesResponse.data && matchesResponse.data.length > 0) {
      const propertyIds = matchesResponse.data.map((m: any) => m.property_id);
  
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

  useEffect(() => {
    if (!loading && !hasAutoMatched && client && matches.length === 0) {
      const criteria = client.client_search_criteria?.[0];

      const hasLocation = !!(
        criteria?.locations ||
        criteria?.selected_places ||
        criteria?.radius_searches ||
        (criteria?.custom_sectors && criteria.custom_sectors.features && criteria.custom_sectors.features.length > 0)
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

  const handleCreateBrochure = async (property: any) => {
    console.log('🎨 handleCreateBrochure called');
    console.log('📦 userBranding state:', userBranding);
    console.log('🏢 Company name:', userBranding?.company_name);
    console.log('🎯 Property:', property);
    
    if (!userBranding) {
      console.log('❌ No branding data at all');
      alert('⚠️ Please set up your branding in Account Settings first!\n\nGo to Account → PDF Branding Settings to configure your company details.');
      return;
    }
    
    if (!userBranding.company_name) {
      console.log('❌ Company name is empty:', userBranding.company_name);
      alert('⚠️ Please set up your branding in Account Settings first!\n\nGo to Account → PDF Branding Settings to configure your company details.');
      return;
    }
  
    console.log('✅ All checks passed, generating PDF...');
    setGeneratingPdfId(property.id);
  
    try {
      const blob = await pdf(
        <PropertyBrochurePDF property={property} branding={userBranding} />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      console.log('✅ PDF generated successfully');
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      alert('Failed to generate brochure. Please try again.');
    } finally {
      setGeneratingPdfId(null);
    }
  };
  

  const calculateMatchAnalysis = (
    property: PropertyMatch['properties'],
    criteria: ClientDetails['client_search_criteria'][0]
  ): MatchAnalysis => {
    if (!property || !criteria) return { matches: {}, uncertainties: [] };

    const price = parseInt(property.price || '0', 10);
    
    const matches: Record<string, boolean> = {};
    
    if (criteria.min_budget || criteria.max_budget) {
      matches.budget = !!(
        (!criteria.min_budget || price >= criteria.min_budget) &&
        (!criteria.max_budget || price <= criteria.max_budget)
      );
    }
    
    matches.location = true;
    
    if (criteria.property_types && criteria.property_types.length > 0) {
      matches.propertyType = criteria.property_types.includes(property.property_type);
    }
    
    if (criteria.min_surface || criteria.max_surface) {
      matches.surface = !!(
        (!criteria.min_surface || parseFloat(property.surface || '0') >= criteria.min_surface) &&
        (!criteria.max_surface || parseFloat(property.surface || '0') <= criteria.max_surface)
      );
    }
    
    if (criteria.min_rooms || criteria.max_rooms) {
      matches.rooms = !!(
        (!criteria.min_rooms || property.rooms >= criteria.min_rooms) &&
        (!criteria.max_rooms || property.rooms <= criteria.max_rooms)
      );
    }
    
    if (criteria.min_bedrooms || criteria.max_bedrooms) {
      matches.bedrooms = !!(
        (!criteria.min_bedrooms || property.bedrooms >= criteria.min_bedrooms) &&
        (!criteria.max_bedrooms || property.bedrooms <= criteria.max_bedrooms)
      );
    }
    
    if (criteria.min_land_surface || criteria.max_land_surface) {
      matches.landSurface = !!(
        (!criteria.min_land_surface || (property.land_surface && property.land_surface >= criteria.min_land_surface)) &&
        (!criteria.max_land_surface || (property.land_surface && property.land_surface <= criteria.max_land_surface))
      );
    }
    
    if (criteria.pool_preference && criteria.pool_preference !== '') {
      matches.pool = !!(
        (criteria.pool_preference === 'required' && property.pool === true) ||
        (criteria.pool_preference === 'preferred' && property.pool === true) ||
        (criteria.pool_preference === 'no' && property.pool === false) ||
        (criteria.pool_preference === 'preferred' && property.pool === null)
      );
    }
    
    if (criteria.heating_system && criteria.heating_system !== '') {
      matches.heating = property.heating_system === criteria.heating_system;
    }
    
    if (criteria.drainage_system && criteria.drainage_system !== '') {
      matches.drainage = property.drainage_system === criteria.drainage_system;
    }
    
    if (criteria.property_condition && criteria.property_condition !== '') {
      matches.condition = property.property_condition === criteria.property_condition;
    }
    
    if (criteria.min_year_built || criteria.max_year_built) {
      matches.yearBuilt = !!(
        (!criteria.min_year_built || (property.year_built && property.year_built >= criteria.min_year_built)) &&
        (!criteria.max_year_built || (property.year_built && property.year_built <= criteria.max_year_built))
      );
    }
    
    if (criteria.min_bathrooms) {
      matches.bathrooms = !!(property.bathrooms && property.bathrooms >= criteria.min_bathrooms);
    }

    const uncertainties = [];

    if (criteria.pool_preference && criteria.pool_preference !== '' && property.pool === null) {
      uncertainties.push({ field: 'Pool', reason: 'Property listing does not specify pool availability' });
    }
    if (criteria.heating_system && criteria.heating_system !== '' && !property.heating_system) {
      uncertainties.push({ field: 'Heating System', reason: 'Heating system not specified in listing' });
    }
    if (criteria.drainage_system && criteria.drainage_system !== '' && !property.drainage_system) {
      uncertainties.push({ field: 'Drainage', reason: 'Drainage system not specified' });
    }
    if (criteria.min_bathrooms && !property.bathrooms) {
      uncertainties.push({ field: 'Bathrooms', reason: 'Number of bathrooms not provided' });
    }
    if ((criteria.min_land_surface || criteria.max_land_surface) && !property.land_surface) {
      uncertainties.push({ field: 'Land Surface', reason: 'Land surface area not specified' });
    }
    if (criteria.property_condition && criteria.property_condition !== '' && !property.property_condition) {
      uncertainties.push({ field: 'Property Condition', reason: 'Condition not specified in listing' });
    }
    if ((criteria.min_year_built || criteria.max_year_built) && !property.year_built) {
      uncertainties.push({ field: 'Year Built', reason: 'Construction year not provided' });
    }

    return { matches, uncertainties };
  };

  const analyzeCriteriaCompleteness = (criteria: ClientDetails['client_search_criteria'][0] | undefined): CriteriaField[] => {
    if (!criteria) return [];

    const hasLocationSet = !!(
      criteria.locations ||
      (criteria.selected_places && criteria.selected_places.length > 0) ||
      (criteria.radius_searches && criteria.radius_searches.length > 0) ||
      (criteria.custom_sectors && criteria.custom_sectors.features && criteria.custom_sectors.features.length > 0)
    );

    const getLocationValue = () => {
      if (criteria.locations) return criteria.locations;
      if (criteria.selected_places && criteria.selected_places.length > 0) return 'Selected places';
      if (criteria.radius_searches && criteria.radius_searches.length > 0) return 'Radius search areas';
      if (criteria.custom_sectors && criteria.custom_sectors.features && criteria.custom_sectors.features.length > 0) return 'Custom sectors';
      return undefined;
    };

    const fields: CriteriaField[] = [
      {
        name: 'Location',
        filled: hasLocationSet,
        priority: 'critical',
        description: 'Essential for finding properties in your desired area',
        value: getLocationValue()
      },
      {
        name: 'Budget Range',
        filled: !!(criteria.min_budget || criteria.max_budget),
        priority: 'critical',
        description: 'Required to filter properties within your price range',
        value: criteria.min_budget || criteria.max_budget 
          ? `€${criteria.min_budget?.toLocaleString() || '0'} - €${criteria.max_budget?.toLocaleString() || '∞'}` 
          : undefined
      },
      {
        name: 'Property Types',
        filled: !!(criteria.property_types && criteria.property_types.length > 0),
        priority: 'high',
        description: 'Helps narrow down to houses, apartments, or specific property types',
        value: criteria.property_types?.join(', ')
      },
      {
        name: 'Surface Area',
        filled: !!(criteria.min_surface || criteria.max_surface),
        priority: 'high',
        description: 'Important for finding properties with the right living space',
        value: criteria.min_surface || criteria.max_surface 
          ? `${criteria.min_surface || 'Any'} - ${criteria.max_surface || 'Any'} m²` 
          : undefined
      },
      {
        name: 'Bedrooms',
        filled: !!(criteria.min_bedrooms || criteria.max_bedrooms),
        priority: 'high',
        description: 'Key criteria for family size and space requirements',
        value: criteria.min_bedrooms || criteria.max_bedrooms 
          ? `${criteria.min_bedrooms || 'Any'} - ${criteria.max_bedrooms || 'Any'}` 
          : undefined
      },
      {
        name: 'Total Rooms',
        filled: !!(criteria.min_rooms || criteria.max_rooms),
        priority: 'high',
        description: 'Helps match overall property layout to your needs',
        value: criteria.min_rooms || criteria.max_rooms 
          ? `${criteria.min_rooms || 'Any'} - ${criteria.max_rooms || 'Any'}` 
          : undefined
      },
      {
        name: 'Pool Preference',
        filled: !!(criteria.pool_preference && criteria.pool_preference !== ''),
        priority: 'medium',
        description: 'Filters properties based on pool availability',
        value: criteria.pool_preference ?? undefined,
      },
      {
        name: 'Land Surface',
        filled: !!(criteria.min_land_surface || criteria.max_land_surface),
        priority: 'medium',
        description: 'Important if you need outdoor space or land',
        value: criteria.min_land_surface || criteria.max_land_surface 
          ? `${criteria.min_land_surface || 'Any'} - ${criteria.max_land_surface || 'Any'} m²` 
          : undefined
      },
      {
        name: 'Property Condition',
        filled: !!(criteria.property_condition && criteria.property_condition !== ''),
        priority: 'medium',
        description: 'Matches properties based on renovation state',
        value: criteria.property_condition ?? undefined,
      },
      {
        name: 'Heating System',
        filled: !!(criteria.heating_system && criteria.heating_system !== ''),
        priority: 'medium',
        description: 'Ensures comfort and running costs match your preferences',
        value: criteria.heating_system ?? undefined,
      },
      {
        name: 'Year Built',
        filled: !!(criteria.min_year_built || criteria.max_year_built),
        priority: 'medium',
        description: 'Helps find modern or character properties',
        value: criteria.min_year_built || criteria.max_year_built 
          ? `${criteria.min_year_built || 'Any'} - ${criteria.max_year_built || 'Any'}` 
          : undefined
      },
      {
        name: 'Bathrooms',
        filled: !!(criteria.min_bathrooms),
        priority: 'nice-to-have',
        description: 'Additional comfort requirement',
        value: criteria.min_bathrooms ? `${criteria.min_bathrooms}+` : undefined
      },
      {
        name: 'Drainage System',
        filled: !!(criteria.drainage_system && criteria.drainage_system !== ''),
        priority: 'nice-to-have',
        description: 'Technical specification for rural properties',
        value: criteria.drainage_system ?? undefined,
      },
      {
        name: 'Energy Rating (DPE)',
        filled: !!(criteria.desired_dpe && criteria.desired_dpe !== ''),
        priority: 'nice-to-have',
        description: 'Environmental impact and running costs',
        value: criteria.desired_dpe ?? undefined,
      }
    ];

    return fields;
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
    criteria?.radius_searches ||
    (criteria?.custom_sectors && criteria.custom_sectors.features && criteria.custom_sectors.features.length > 0)
  );
  const hasBudget = !!(criteria?.min_budget || criteria?.max_budget);
  const matchingDisabled = !hasLocation && !hasBudget;

  const criteriaAnalysis = analyzeCriteriaCompleteness(criteria);
  const filledFields = criteriaAnalysis.filter(f => f.filled);
  const missingFields = criteriaAnalysis.filter(f => !f.filled);
  const completionPercentage = Math.round((filledFields.length / criteriaAnalysis.length) * 100);

  const priorityOrder = { 'critical': 1, 'high': 2, 'medium': 3, 'nice-to-have': 4 };
  const sortedMissingFields = missingFields.sort((a, b) => 
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'critical': return 'text-red-500 border-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 border-orange-500 bg-orange-500/10';
      case 'medium': return 'text-yellow-500 border-yellow-500 bg-yellow-500/10';
      case 'nice-to-have': return 'text-blue-500 border-blue-500 bg-blue-500/10';
      default: return 'text-gray-500 border-gray-500 bg-gray-500/10';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch(priority) {
      case 'critical': return 'CRITICAL';
      case 'high': return 'HIGH PRIORITY';
      case 'medium': return 'MEDIUM';
      case 'nice-to-have': return 'OPTIONAL';
      default: return priority.toUpperCase();
    }
  };

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
            <button 
              onClick={() => setIsEditPopupOpen(true)}
              className="px-4 py-2 bg-[#00ffff] text-black hover:bg-[#00ffff]/80 rounded uppercase text-xs font-bold flex items-center gap-2"
            >
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
              <button 
                onClick={() => setIsEditPopupOpen(true)}
                className="mt-3 px-4 py-2 bg-red-500 text-white rounded text-xs font-bold uppercase hover:bg-red-600"
              >
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
                          criteria.locations || 
                          (criteria.radius_searches && criteria.radius_searches.length > 0 ? 'Radius search areas' : null) ||
                          (criteria.custom_sectors && criteria.custom_sectors.features && criteria.custom_sectors.features.length > 0 ? 'Custom sectors' : null) ||
                          'Custom area'
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

              {/* COLLAPSIBLE CRITERIA COMPLETENESS */}
              <section className="bg-gradient-to-br from-[#00ffff]/5 to-[#ff00ff]/5 border border-[#00ffff]/50 rounded-lg overflow-hidden">
                <div 
                  className="p-4 cursor-pointer hover:bg-[#00ffff]/5 transition-colors flex items-center justify-between"
                  onClick={() => setIsCompletenessExpanded(!isCompletenessExpanded)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Info className="text-[#00ffff]" size={20} />
                    <div className="flex-1">
                      <h3 className="text-sm text-white font-bold uppercase">
                        Search Profile Completeness
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="text-2xl font-bold text-[#00ffff]">
                          {completionPercentage}%
                        </div>
                        <div className="flex-1 h-2 bg-[#020222] rounded-full overflow-hidden border border-[#00ffff]/30">
                          <div 
                            className="h-full bg-gradient-to-r from-[#00ffff] to-[#00ff00] transition-all duration-500"
                            style={{ width: `${completionPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditPopupOpen(true);
                      }}
                      className="px-4 py-2 bg-[#00ffff] text-black hover:bg-[#00ffff]/80 rounded uppercase text-xs font-bold flex items-center gap-2"
                    >
                      <User size={14} /> Add Missing Data
                    </button>
                    {isCompletenessExpanded ? (
                      <ChevronUp className="text-[#00ffff]" size={20} />
                    ) : (
                      <ChevronDown className="text-[#00ffff]" size={20} />
                    )}
                  </div>
                </div>

                {isCompletenessExpanded && (
                  <div className="p-6 pt-0 animate-in fade-in duration-300">
                    <div className="bg-[#020222] border border-[#00ffff]/30 rounded-lg p-4 mb-6">
                      <h4 className="text-xs text-[#00ffff] uppercase font-bold mb-2 flex items-center gap-2">
                        <Radar size={14} /> How Our Matching Algorithm Works
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed mb-3">
                        Our system scans thousands of properties and ranks them based on how well they match your criteria. 
                        The more details you provide, the more accurate the matches become.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-gray-400"><span className="text-red-500 font-bold">Critical:</span> Required for matching</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-gray-400"><span className="text-orange-500 font-bold">High:</span> Major impact on results</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-gray-400"><span className="text-yellow-500 font-bold">Medium:</span> Refines matches</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-400"><span className="text-blue-500 font-bold">Optional:</span> Nice to have</span>
                        </div>
                      </div>
                    </div>

                    {filledFields.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm text-[#00ff00] uppercase font-bold mb-3 flex items-center gap-2">
                          <Check size={16} /> Configured Criteria ({filledFields.length})
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {filledFields.map((field, idx) => (
                            <div 
                              key={idx}
                              className="bg-[#00ff00]/10 border border-[#00ff00]/30 rounded p-3 flex items-start gap-3"
                            >
                              <Check size={16} className="text-[#00ff00] flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-white font-bold text-sm">{field.name}</span>
                                  {field.value && (
                                    <span className="text-[#00ff00] text-xs">→ {field.value}</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400">{field.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sortedMissingFields.length > 0 && (
                      <div>
                        <h4 className="text-sm text-[#ff00ff] uppercase font-bold mb-3 flex items-center gap-2">
                          <AlertCircle size={16} /> Improve Your Matches ({sortedMissingFields.length} fields to add)
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {sortedMissingFields.map((field, idx) => (
                            <div 
                              key={idx}
                              className={`border rounded p-3 flex items-start gap-3 ${getPriorityColor(field.priority)}`}
                            >
                              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-white font-bold text-sm">{field.name}</span>
                                  <span className={`text-[0.6rem] px-2 py-0.5 rounded border font-bold ${getPriorityColor(field.priority)}`}>
                                    {getPriorityLabel(field.priority)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300">{field.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={() => setIsEditPopupOpen(true)}
                          className="mt-4 w-full py-3 bg-[#00ffff] text-black font-bold uppercase text-sm rounded hover:bg-[#00ffff]/80 transition-all flex items-center justify-center gap-2"
                        >
                          <User size={14} /> Add Missing Criteria
                        </button>
                      </div>
                    )}

                    {sortedMissingFields.length === 0 && (
                      <div className="bg-[#00ff00]/10 border border-[#00ff00] rounded-lg p-6 text-center">
                        <CheckCircle2 size={40} className="text-[#00ff00] mx-auto mb-3" />
                        <p className="text-[#00ff00] font-bold text-lg mb-2">Profile 100% Complete!</p>
                        <p className="text-sm text-gray-300">
                          All criteria have been configured. Your search is fully optimized for the best matches.
                        </p>
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
                  {['CAD-IMMO', 'SeLoger (Soon)', 'Leboncoin (Soon)', 'Local Agencies (Coming)'].map((source, idx) => (
                    <div key={source} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded border border-white/10 text-xs text-white">
                      <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-[#00ff00] shadow-[0_0_5px_#00ff00]' : 'bg-gray-500'}`}></div>
                      {source}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-[0.7rem] text-gray-500">
                  System is currently monitoring active sources for new listings matching criteria.
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
                    <Loader2 size={40} className="animate-spin text-[#ff00ff] mb-2" />
                    <span className="text-white text-sm animate-pulse">Refreshing matches...</span>
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
                      <Radar size={16} /> Refresh Matches
                    </button>
                  </div>
                )}
                {lastUpdated && (
                  <div className="mt-3 text-[0.65rem] text-[#a0a0ff] flex items-center justify-center gap-1">
                    <Calendar size={10} /> Last updated {getTimeSince(lastUpdated)}
                  </div>
                )}
              </div>

              <div className="bg-[#020222] border border-[#333] rounded-lg p-4">
                <h4 className="text-xs text-gray-400 uppercase mb-3">Quick Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">New Matches</span>
                    <span className="text-[#ff00ff] font-bold">{newMatches.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Shortlisted</span>
                    <span className="text-[#00ff00] font-bold">{shortlistedMatches.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Discarded</span>
                    <span className="text-red-500 font-bold">{rejectedMatches.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Matches</span>
                    <span className="text-white font-bold">{matches.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#00ffff]/10 to-[#ff00ff]/10 border border-[#00ffff] rounded-lg p-4">
                <h4 className="text-xs text-[#00ffff] uppercase mb-3 font-bold">Profile Strength</h4>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {completionPercentage}%
                  </div>
                  <div className="text-xs text-gray-400 mb-3">
                    {filledFields.length} of {criteriaAnalysis.length} criteria set
                  </div>
                  <div className="w-full h-2 bg-[#020222] rounded-full overflow-hidden border border-[#00ffff]/30">
                    <div 
                      className="h-full bg-gradient-to-r from-[#00ffff] to-[#00ff00] transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                  {sortedMissingFields.length > 0 && (
                    <div className="mt-3 text-[0.65rem] text-orange-400">
                      Add {sortedMissingFields.filter(f => f.priority === 'critical' || f.priority === 'high').length} key criteria to improve matches
                    </div>
                  )}
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
                    Last updated {getTimeSince(lastUpdated)}
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
                  const hasPriceChange = prop.previous_price && prop.price_changed_at;
                  const priceDrop = (prop.price_drop_amount || 0) > 0;

                  return (
                    <div
                      key={match.id}
                      className="bg-[#020222] border border-[#333] hover:border-[#ff00ff] transition-colors rounded-lg overflow-hidden"
                    >
                      {/* COLLAPSED VIEW */}
                      <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                        {/* Image */}
                        <div className="w-full md:w-48 h-32 bg-white/5 rounded overflow-hidden flex items-center justify-center text-gray-600 relative flex-shrink-0 cursor-pointer"
                          onClick={() => setExpandedPropertyId(isExpanded ? null : match.id)}
                        >
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

                          {/* Quality Badge */}
                          {getQualityBadge(qualityScore, validationErrors)}

                          {/* Expand indicator */}
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                            {isExpanded ? 'Less' : 'More'} ({allImages.length} photos)
                          </div>
                        </div>

                        {/* Details */}
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
                            {hasPriceChange && priceDrop && (
                              <span className="bg-green-500/20 text-green-400 text-[0.6rem] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                €{(prop.price_drop_amount || 0).toLocaleString()} drop
                              </span>
                            )}
                          </div>

                          <h4 className="text-lg font-bold text-white mb-1 cursor-pointer hover:text-[#00ffff]"
                            onClick={() => setExpandedPropertyId(isExpanded ? null : match.id)}
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
                              {Array.isArray(validationErrors) ? validationErrors.join(', ') : 'Data quality issues'}
                            </div>
                          )}

                          {/* Price and Match Analysis Badges */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="text-xl font-bold text-[#00ffff]">
                              €{parseInt(prop.price || '0', 10).toLocaleString()}
                            </div>
                            {hasPriceChange && (
                              <div className="text-xs text-gray-500 line-through">
                                €{parseInt(String(prop.previous_price), 10).toLocaleString()}
                              </div>
                            )}

                            {/* Match Analysis Badges */}
                            {criteria && (() => {
                              const analysis = calculateMatchAnalysis(prop, criteria);
                              const matchCount = Object.values(analysis.matches).filter(v => v === true).length;
                              const mismatchCount = Object.values(analysis.matches).filter(v => v === false).length;
                              const uncertainCount = analysis.uncertainties.length;

                              return (
                                <div className="flex gap-2">
                                  {matchCount > 0 && (
                                    <div className="bg-green-500/20 border border-green-500 text-green-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                      <CheckCircle2 size={12} /> {matchCount} matches
                                    </div>
                                  )}
                                  {(mismatchCount > 0 || uncertainCount > 0) && (
                                    <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                      <AlertTriangle size={12} /> {mismatchCount + uncertainCount} queries
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex md:flex-col gap-2 w-full md:w-auto">
                          <button
                            onClick={() => handleCreateBrochure(prop)}
                            disabled={generatingPdfId === prop.id}
                            className="flex-1 md:w-40 py-2 bg-[#ff00ff] text-white hover:bg-[#ff00ff]/80 rounded uppercase text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {generatingPdfId === prop.id ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <FileText size={14} />
                                Brochure
                              </>
                            )}
                          </button>

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

                      {/* EXPANDED VIEW */}
                      {isExpanded && (
                        <div className="border-t border-[#333] p-6 bg-[#0d0d21] space-y-6 animate-in fade-in duration-300">
                          {/* Match Analysis - Pros/Cons */}
                          {criteria && (() => {
                            const analysis = calculateMatchAnalysis(prop, criteria);
                            const matchedCriteria = Object.entries(analysis.matches).filter(([, isMatch]) => isMatch);
                            const unmatchedCriteria = Object.entries(analysis.matches).filter(([, isMatch]) => !isMatch);

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Matches */}
                                {matchedCriteria.length > 0 && (
                                  <div className="bg-green-500/5 border border-green-500/30 rounded-lg p-4">
                                    <h5 className="text-sm font-bold text-green-400 uppercase mb-3 flex items-center gap-2">
                                      <CheckCircle2 size={14} /> Criteria Met ({matchedCriteria.length})
                                    </h5>
                                    <ul className="space-y-2 text-xs text-gray-300">
                                      {matchedCriteria.map(([key]) => (
                                        <li key={key} className="flex items-center gap-2">
                                          <Check size={12} className="text-green-500 flex-shrink-0" />
                                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Mismatches and Uncertainties */}
                                {(unmatchedCriteria.length > 0 || analysis.uncertainties.length > 0) && (
                                  <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-lg p-4">
                                    <h5 className="text-sm font-bold text-yellow-400 uppercase mb-3 flex items-center gap-2">
                                      <AlertTriangle size={14} /> Questions ({unmatchedCriteria.length + analysis.uncertainties.length})
                                    </h5>
                                    <ul className="space-y-2 text-xs text-gray-300">
                                      {unmatchedCriteria.map(([key]) => (
                                        <li key={key} className="flex items-center gap-2">
                                          <XCircle size={12} className="text-red-500 flex-shrink-0" />
                                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()} doesn't match</span>
                                        </li>
                                      ))}
                                      {analysis.uncertainties.map((unc, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          <AlertCircle size={12} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                                          <div>
                                            <span className="font-bold">{unc.field}:</span> {unc.reason}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Image Gallery */}
                          {allImages.length > 1 && (
                            <div>
                              <h5 className="text-sm font-bold text-white uppercase mb-3">
                                Photo Gallery ({allImages.length})
                              </h5>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {allImages.map((img, idx) => (
                                  <div key={idx} className="aspect-video bg-white/5 rounded overflow-hidden">
                                    <img 
                                      src={img} 
                                      alt={`${prop.title} - ${idx + 1}`} 
                                      className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Description */}
                          {prop.description && (
                            <div>
                              <h5 className="text-sm font-bold text-white uppercase mb-2">Description</h5>
                              <p className="text-sm text-gray-300 leading-relaxed">{prop.description}</p>
                            </div>
                          )}

                          {/* Additional Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            {prop.energy_consumption && (
                              <div>
                                <span className="text-gray-500 uppercase block mb-1">Energy</span>
                                <span className="text-white font-bold">{prop.energy_consumption} kWh/m²</span>
                              </div>
                            )}
                            {prop.co2_emissions && (
                              <div>
                                <span className="text-gray-500 uppercase block mb-1">CO2</span>
                                <span className="text-white font-bold">{prop.co2_emissions} kg/m²</span>
                              </div>
                            )}
                            {prop.floors && (
                              <div>
                                <span className="text-gray-500 uppercase block mb-1">Floors</span>
                                <span className="text-white font-bold">{prop.floors}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500 uppercase block mb-1">Reference</span>
                              <span className="text-white font-bold">{prop.reference}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Client Popup */}
      {isEditPopupOpen && (
        <EditClientPopup
          isOpen={isEditPopupOpen}
          clientId={clientId}
          onClose={() => {
            setIsEditPopupOpen(false);
            fetchClientData();
          }}
        />
      )}
    </div>
  );
}
