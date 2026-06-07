'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  FileText,
  Sparkles,
  Building2,
} from 'lucide-react'
import MainHeader from '../../../../components/MainHeader'
import EditClientPopup from '../../../../components/popups/EditClientPopup'
import { pdf } from '@react-pdf/renderer'
import { PropertyBrochurePDF } from '../../../../components/PDFgen/PropertyBrochurePDF'
import { createClient } from '@/lib/supabase-client'

const supabase = createClient()

interface ClientDetails {
  id: string
  first_name: string
  last_name: string
  email: string
  mobile: string
  created_at: string
  last_matched_at?: string
  client_search_criteria: {
    min_budget: number | null
    max_budget: number | null
    locations: string | null
    selected_places: Array<{ name: string; lat: number; lng: number }> | null
    radius_searches:
      | Array<{ center: { lat: number; lng: number }; radius: number; name?: string }>
      | null
    custom_sectors: {
      type: string
      features: Array<{
        type: string
        geometry: { type: string; coordinates: number[][][] }
        properties?: Record<string, unknown>
      }>
    } | null
    min_surface: number | null
    max_surface: number | null
    min_bedrooms: number | null
    max_bedrooms: number | null
    property_types: string[] | null
    notes: string | null
    min_rooms: number | null
    max_rooms: number | null
    min_land_surface: number | null
    max_land_surface: number | null
    pool_preference: string | null
    heating_system: string | null
    drainage_system: string | null
    property_condition: string | null
    min_year_built: number | null
    max_year_built: number | null
    min_bathrooms: number | null
    desired_dpe: string | null
    features: string[]
  }[]
}

interface PropertyMatch {
  id: string
  match_score: number
  status: string
  matched_at: string
  updated_at: string
  property_id: string
  properties: {
    id: string
    title: string
    price: string
    location_city: string
    location_department: string
    location_postal_code: string
    location_lat: number | null
    location_lng: number | null
    surface: string
    rooms: number
    bedrooms: number
    property_type: string
    url: string
    source: string
    reference: string
    images: string[]
    description: string | null
    data_quality_score: string
    validation_errors: string[]
    land_surface: number | null
    building_surface: number | null
    floors: number | null
    pool: boolean | null
    heating_system: string | null
    drainage_system: string | null
    property_condition: string | null
    year_built: number | null
    bathrooms: number | null
    wc_count: number | null
    energy_consumption: number | null
    co2_emissions: number | null
    previous_price: number | null
    price_changed_at: string | null
    price_drop_amount: number | null
    scraped_at: string
    last_seen_at: string
  } | null
}

interface MatchAnalysis {
  matches: Record<string, boolean>
  uncertainties: {
    field: string
    reason: string
  }[]
}

interface CriteriaField {
  name: string
  filled: boolean
  priority: 'critical' | 'high' | 'medium' | 'nice-to-have'
  description: string
  value?: string
}

interface UserBranding {
  company_name: string | null
  contact_phone: string | null
  contact_email: string | null
  brand_color: string | null
  logo_url: string | null
}

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string
  icon: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-300">
            {icon}
          </div>
          <h3 className="text-base font-semibold tracking-tight text-stone-100">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function StatCard({
  label,
  value,
  tone = 'default',
  helper,
}: {
  label: string
  value: React.ReactNode
  tone?: 'default' | 'accent' | 'success'
  helper?: string
}) {
  const toneClasses =
    tone === 'accent'
      ? 'text-amber-300'
      : tone === 'success'
        ? 'text-emerald-300'
        : 'text-stone-100'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
      <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${toneClasses}`}>{value}</div>
      {helper && <p className="mt-2 text-sm text-stone-400">{helper}</p>}
    </div>
  )
}

function formatCurrencyRange(min?: number | null, max?: number | null) {
  if (!min && !max) return 'Not set'
  return `€${min?.toLocaleString() || '0'} - €${max?.toLocaleString() || 'Open'}`
}

function formatRange(min?: number | null, max?: number | null, suffix = '') {
  if (!min && !max) return 'Any'
  return `${min || 'Any'} - ${max || 'Any'}${suffix}`
}

function getPriorityTone(priority: string) {
  switch (priority) {
    case 'critical':
      return {
        badge: 'border-red-400/20 bg-red-400/10 text-red-300',
        card: 'border-red-400/15 bg-red-400/[0.05]',
        label: 'Critical',
      }
    case 'high':
      return {
        badge: 'border-orange-400/20 bg-orange-400/10 text-orange-300',
        card: 'border-orange-400/15 bg-orange-400/[0.05]',
        label: 'High',
      }
    case 'medium':
      return {
        badge: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
        card: 'border-amber-400/15 bg-amber-400/[0.05]',
        label: 'Medium',
      }
    default:
      return {
        badge: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
        card: 'border-sky-400/15 bg-sky-400/[0.05]',
        label: 'Optional',
      }
  }
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<ClientDetails | null>(null)
  const [matches, setMatches] = useState<PropertyMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'market_scan' | 'shortlist'>('dashboard')
  const [isScanning, setIsScanning] = useState(false)
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [hasAutoMatched, setHasAutoMatched] = useState(false)
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null)
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false)
  const [isCompletenessExpanded, setIsCompletenessExpanded] = useState(false)
  const [userBranding, setUserBranding] = useState<UserBranding | null>(null)
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null)

  useEffect(() => {
    const fetchBranding = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from('user_profiles')
        .select('company_name, contact_phone, contact_email, brand_color, logo_url')
        .eq('id', user.id)
        .single()

      if (data) setUserBranding(data)
    }

    fetchBranding()
  }, [])

  useEffect(() => {
    fetchClientData()
  }, [clientId])

  const fetchClientData = async () => {
    setLoading(true)

    const { data, error: clientError } = await supabase
      .from('clients')
      .select('*, client_search_criteria (*)')
      .eq('id', clientId)
      .single()

    if (!clientError && data) {
      setClient(data as unknown as ClientDetails)

      if (data.last_matched_at) {
        setLastUpdated(new Date(data.last_matched_at))
      }
    } else {
      setClient(null)
    }

    const matchesResponse = await supabase
      .from('property_matches')
      .select('*')
      .eq('client_id', clientId)
      .order('match_score', { ascending: false })

    if (!matchesResponse.error && matchesResponse.data && matchesResponse.data.length > 0) {
      const propertyIds = matchesResponse.data.map((m: { property_id: string }) => m.property_id)

      const propertiesResponse = await supabase.from('properties').select('*').in('id', propertyIds)

      let parsedProperties: Array<PropertyMatch['properties']> | undefined =
        propertiesResponse.data ?? undefined

      if (!propertiesResponse.error && propertiesResponse.data) {
        parsedProperties = propertiesResponse.data.map((p: Record<string, unknown>) => {
          let images: string[] = []
          let validation_errors: string[] = []

          try {
            if (p.images) {
              if (typeof p.images === 'string') {
                images = JSON.parse(p.images)
              } else if (Array.isArray(p.images)) {
                images = p.images as string[]
              }
            }
          } catch {}

          try {
            if (p.validation_errors) {
              if (typeof p.validation_errors === 'string') {
                const parsed = JSON.parse(p.validation_errors)
                validation_errors = Array.isArray(parsed) ? parsed : []
              } else if (Array.isArray(p.validation_errors)) {
                validation_errors = p.validation_errors as string[]
              }
            }
          } catch {}

          return {
            ...p,
            images,
            validation_errors,
            data_quality_score: p.data_quality_score || '1.0',
          }
        }) as Array<PropertyMatch['properties']>
      }

      const mergedMatches = matchesResponse.data
        .map((match: { property_id: string; [key: string]: unknown }) => {
          const matchedProperty = parsedProperties?.find(
            (p) => (p as { id: string })?.id === match.property_id,
          )
          return {
            ...match,
            properties: matchedProperty || null,
          }
        })
        .filter((m: { properties: unknown }) => m.properties !== null)

      setMatches(mergedMatches as PropertyMatch[])
    } else {
      setMatches([])
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!loading && !hasAutoMatched && client && matches.length === 0) {
      const criteria = client.client_search_criteria?.[0]

      const hasLocation = !!(
        criteria?.locations ||
        criteria?.selected_places ||
        criteria?.radius_searches ||
        (criteria?.custom_sectors &&
          criteria.custom_sectors.features &&
          criteria.custom_sectors.features.length > 0)
      )
      const hasBudget = !!(criteria?.min_budget || criteria?.max_budget)

      if (hasLocation || hasBudget) {
        setHasAutoMatched(true)
        handleRunScan()
      }
    }
  }, [loading, hasAutoMatched, client, matches.length])

  const handleRunScan = async () => {
    setIsScanning(true)

    await fetch('/api/match-properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })

    await fetchClientData()
    setIsScanning(false)
  }

  const updateMatchStatus = async (
    matchId: string,
    newStatus: 'shortlisted' | 'rejected' | 'new',
  ) => {
    setUpdatingMatchId(matchId)

    const { error } = await supabase
      .from('property_matches')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    if (!error) {
      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, status: newStatus } : m)))
    }

    setUpdatingMatchId(null)
  }

  const handleCreateBrochure = async (property: PropertyMatch['properties']) => {
    if (!property) {
      alert('⚠️ Property data is not available.')
      return
    }

    if (!userBranding || !userBranding.company_name) {
      alert(
        '⚠️ Please set up your branding in Account Settings first!\n\nGo to Account → PDF Branding Settings to configure your company details.',
      )
      return
    }

    setGeneratingPdfId(property.id)

    try {
      const doc = <PropertyBrochurePDF property={property as never} branding={userBranding as never} />
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)

      const newWindow = window.open(url, '_blank')
      if (newWindow) {
        newWindow.focus()
      } else {
        const link = document.createElement('a')
        link.href = url
        link.download = `${property.title.replace(/\s+/g, '-')}-brochure.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (error) {
      console.error('❌ Error generating PDF:', error)
      alert('Failed to generate brochure. Please try again.')
    } finally {
      setGeneratingPdfId(null)
    }
  }

  const calculateMatchAnalysis = (
    property: PropertyMatch['properties'],
    criteria: ClientDetails['client_search_criteria'][0],
  ): MatchAnalysis => {
    if (!property || !criteria) return { matches: {}, uncertainties: [] }

    const price = parseInt(property.price || '0', 10)
    const matches: Record<string, boolean> = {}

    if (criteria.min_budget || criteria.max_budget) {
      matches.budget = !!(
        (!criteria.min_budget || price >= criteria.min_budget) &&
        (!criteria.max_budget || price <= criteria.max_budget)
      )
    }

    matches.location = true

    if (criteria.property_types && criteria.property_types.length > 0) {
      matches.propertyType = criteria.property_types.includes(property.property_type)
    }

    if (criteria.min_surface || criteria.max_surface) {
      matches.surface = !!(
        (!criteria.min_surface || parseFloat(property.surface || '0') >= criteria.min_surface) &&
        (!criteria.max_surface || parseFloat(property.surface || '0') <= criteria.max_surface)
      )
    }

    if (criteria.min_rooms || criteria.max_rooms) {
      matches.rooms = !!(
        (!criteria.min_rooms || property.rooms >= criteria.min_rooms) &&
        (!criteria.max_rooms || property.rooms <= criteria.max_rooms)
      )
    }

    if (criteria.min_bedrooms || criteria.max_bedrooms) {
      matches.bedrooms = !!(
        (!criteria.min_bedrooms || property.bedrooms >= criteria.min_bedrooms) &&
        (!criteria.max_bedrooms || property.bedrooms <= criteria.max_bedrooms)
      )
    }

    if (criteria.min_land_surface || criteria.max_land_surface) {
      matches.landSurface = !!(
        (!criteria.min_land_surface ||
          (property.land_surface && property.land_surface >= criteria.min_land_surface)) &&
        (!criteria.max_land_surface ||
          (property.land_surface && property.land_surface <= criteria.max_land_surface))
      )
    }

    if (criteria.pool_preference && criteria.pool_preference !== '') {
      matches.pool = !!(
        (criteria.pool_preference === 'required' && property.pool === true) ||
        (criteria.pool_preference === 'preferred' && property.pool === true) ||
        (criteria.pool_preference === 'no' && property.pool === false) ||
        (criteria.pool_preference === 'preferred' && property.pool === null)
      )
    }

    if (criteria.heating_system && criteria.heating_system !== '') {
      matches.heating = property.heating_system === criteria.heating_system
    }

    if (criteria.drainage_system && criteria.drainage_system !== '') {
      matches.drainage = property.drainage_system === criteria.drainage_system
    }

    if (criteria.property_condition && criteria.property_condition !== '') {
      matches.condition = property.property_condition === criteria.property_condition
    }

    if (criteria.min_year_built || criteria.max_year_built) {
      matches.yearBuilt = !!(
        (!criteria.min_year_built ||
          (property.year_built && property.year_built >= criteria.min_year_built)) &&
        (!criteria.max_year_built ||
          (property.year_built && property.year_built <= criteria.max_year_built))
      )
    }

    if (criteria.min_bathrooms) {
      matches.bathrooms = !!(property.bathrooms && property.bathrooms >= criteria.min_bathrooms)
    }

    const uncertainties = []

    if (criteria.pool_preference && criteria.pool_preference !== '' && property.pool === null) {
      uncertainties.push({
        field: 'Pool',
        reason: 'Property listing does not specify pool availability',
      })
    }
    if (criteria.heating_system && criteria.heating_system !== '' && !property.heating_system) {
      uncertainties.push({
        field: 'Heating System',
        reason: 'Heating system not specified in listing',
      })
    }
    if (criteria.drainage_system && criteria.drainage_system !== '' && !property.drainage_system) {
      uncertainties.push({
        field: 'Drainage',
        reason: 'Drainage system not specified',
      })
    }
    if (criteria.min_bathrooms && !property.bathrooms) {
      uncertainties.push({
        field: 'Bathrooms',
        reason: 'Number of bathrooms not provided',
      })
    }
    if ((criteria.min_land_surface || criteria.max_land_surface) && !property.land_surface) {
      uncertainties.push({
        field: 'Land Surface',
        reason: 'Land surface area not specified',
      })
    }
    if (criteria.property_condition && criteria.property_condition !== '' && !property.property_condition) {
      uncertainties.push({
        field: 'Property Condition',
        reason: 'Condition not specified in listing',
      })
    }
    if ((criteria.min_year_built || criteria.max_year_built) && !property.year_built) {
      uncertainties.push({
        field: 'Year Built',
        reason: 'Construction year not provided',
      })
    }

    return { matches, uncertainties }
  }

  const analyzeCriteriaCompleteness = (
    criteria: ClientDetails['client_search_criteria'][0] | undefined,
  ): CriteriaField[] => {
    if (!criteria) return []

    const hasLocationSet = !!(
      criteria.locations ||
      (criteria.selected_places && criteria.selected_places.length > 0) ||
      (criteria.radius_searches && criteria.radius_searches.length > 0) ||
      (criteria.custom_sectors &&
        criteria.custom_sectors.features &&
        criteria.custom_sectors.features.length > 0)
    )

    const getLocationValue = () => {
      if (criteria.locations) return criteria.locations
      if (criteria.selected_places && criteria.selected_places.length > 0) return 'Selected places'
      if (criteria.radius_searches && criteria.radius_searches.length > 0) return 'Radius search areas'
      if (
        criteria.custom_sectors &&
        criteria.custom_sectors.features &&
        criteria.custom_sectors.features.length > 0
      ) {
        return 'Custom sectors'
      }
      return undefined
    }

    return [
      {
        name: 'Location',
        filled: hasLocationSet,
        priority: 'critical',
        description: 'Essential for finding properties in your desired area',
        value: getLocationValue(),
      },
      {
        name: 'Budget Range',
        filled: !!(criteria.min_budget || criteria.max_budget),
        priority: 'critical',
        description: 'Required to filter properties within your price range',
        value:
          criteria.min_budget || criteria.max_budget
            ? `€${criteria.min_budget?.toLocaleString() || '0'} - €${criteria.max_budget?.toLocaleString() || '∞'}`
            : undefined,
      },
      {
        name: 'Property Types',
        filled: !!(criteria.property_types && criteria.property_types.length > 0),
        priority: 'high',
        description: 'Helps narrow down to houses, apartments, or specific property types',
        value: criteria.property_types?.join(', '),
      },
      {
        name: 'Surface Area',
        filled: !!(criteria.min_surface || criteria.max_surface),
        priority: 'high',
        description: 'Important for finding properties with the right living space',
        value:
          criteria.min_surface || criteria.max_surface
            ? `${criteria.min_surface || 'Any'} - ${criteria.max_surface || 'Any'} m²`
            : undefined,
      },
      {
        name: 'Bedrooms',
        filled: !!(criteria.min_bedrooms || criteria.max_bedrooms),
        priority: 'high',
        description: 'Key criteria for family size and space requirements',
        value:
          criteria.min_bedrooms || criteria.max_bedrooms
            ? `${criteria.min_bedrooms || 'Any'} - ${criteria.max_bedrooms || 'Any'}`
            : undefined,
      },
      {
        name: 'Total Rooms',
        filled: !!(criteria.min_rooms || criteria.max_rooms),
        priority: 'high',
        description: 'Helps match overall property layout to your needs',
        value:
          criteria.min_rooms || criteria.max_rooms
            ? `${criteria.min_rooms || 'Any'} - ${criteria.max_rooms || 'Any'}`
            : undefined,
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
        value:
          criteria.min_land_surface || criteria.max_land_surface
            ? `${criteria.min_land_surface || 'Any'} - ${criteria.max_land_surface || 'Any'} m²`
            : undefined,
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
        value:
          criteria.min_year_built || criteria.max_year_built
            ? `${criteria.min_year_built || 'Any'} - ${criteria.max_year_built || 'Any'}`
            : undefined,
      },
      {
        name: 'Bathrooms',
        filled: !!criteria.min_bathrooms,
        priority: 'nice-to-have',
        description: 'Additional comfort requirement',
        value: criteria.min_bathrooms ? `${criteria.min_bathrooms}+` : undefined,
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
      },
    ]
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) {
      return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
    }
    if (score >= 60) {
      return 'border-amber-400/20 bg-amber-400/10 text-amber-300'
    }
    if (score >= 50) {
      return 'border-stone-300/15 bg-white/[0.04] text-stone-300'
    }
    return 'border-white/10 bg-white/[0.04] text-stone-400'
  }

  const getQualityBadge = (score: string) => {
    const numScore = parseFloat(score)
    if (numScore === 1.0) return null

    return (
      <div className="absolute left-3 top-3 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
        Quality {(numScore * 100).toFixed(0)}%
      </div>
    )
  }

  const getTimeSince = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141310] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-300" size={40} />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[#141310] flex items-center justify-center text-red-300">
        Client not found.
      </div>
    )
  }

  const criteria = client.client_search_criteria?.[0]
  const newMatches = matches.filter((m) => m.status === 'new')
  const shortlistedMatches = matches.filter((m) => m.status === 'shortlisted')
  const rejectedMatches = matches.filter((m) => m.status === 'rejected')
  const displayedMatches = activeTab === 'shortlist' ? shortlistedMatches : newMatches

  const hasLocation = !!(
    criteria?.locations ||
    criteria?.selected_places ||
    criteria?.radius_searches ||
    (criteria?.custom_sectors &&
      criteria.custom_sectors.features &&
      criteria.custom_sectors.features.length > 0)
  )
  const hasBudget = !!(criteria?.min_budget || criteria?.max_budget)
  const matchingDisabled = !hasLocation && !hasBudget

  const criteriaAnalysis = analyzeCriteriaCompleteness(criteria)
  const filledFields = criteriaAnalysis.filter((f) => f.filled)
  const missingFields = criteriaAnalysis.filter((f) => !f.filled)
  const completionPercentage = criteriaAnalysis.length
    ? Math.round((filledFields.length / criteriaAnalysis.length) * 100)
    : 0

  const priorityOrder = { critical: 1, high: 2, medium: 3, 'nice-to-have': 4 }
  const sortedMissingFields = [...missingFields].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  )

  const buyerName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed client'
  const isOverlayOpen = isEditPopupOpen

  return (
    <div className="min-h-screen bg-[#141310] text-stone-100">
      <div
        className="min-h-screen"
        style={{
          backgroundImage:
            'radial-gradient(circle at top left, rgba(245,158,11,0.10), transparent 24%), radial-gradient(circle at bottom right, rgba(251,191,36,0.06), transparent 24%)',
        }}
      >
        <MainHeader />

        <main
          className={`mx-auto w-full max-w-[1600px] px-5 py-8 transition-all duration-300 sm:px-8 ${
            isOverlayOpen ? 'blur-[4px]' : ''
          }`}
        >
          <section className="mb-8 flex flex-col gap-6 border-b border-white/10 pb-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 max-w-4xl">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-stone-200 transition-colors duration-200 hover:bg-white/[0.08]"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-amber-200">
                  <Sparkles size={14} />
                  Client intelligence
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                  <CheckCircle2 size={13} />
                  Active buyer
                </div>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">
                {buyerName}
              </h1>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-400">
                <span className="inline-flex items-center gap-2">
                  <Mail size={14} className="text-stone-500" />
                  {client.email || 'No email'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Phone size={14} className="text-stone-500" />
                  {client.mobile || 'No mobile'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Calendar size={14} className="text-stone-500" />
                  Added {new Date(client.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-stone-200 transition-colors duration-200 hover:bg-white/[0.08]">
                <BellRing size={15} />
                Alerts on
              </button>

              <button
                onClick={() => setIsEditPopupOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition-colors duration-200 hover:bg-amber-400/15"
              >
                <User size={15} />
                Edit client file
              </button>
            </div>
          </section>

          {matchingDisabled && (
            <section className="mb-8 rounded-[28px] border border-red-400/20 bg-red-400/[0.06] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 text-red-300" size={22} />
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-red-300">
                      Matching disabled
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-300">
                      This client has no usable location criteria and no budget criteria. The
                      scanner needs at least one of those to return relevant properties.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditPopupOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors duration-200 hover:bg-red-400/15"
                >
                  Configure criteria
                </button>
              </div>
            </section>
          )}

          <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="New matches"
              value={newMatches.length}
              tone="accent"
              helper="Fresh opportunities awaiting review."
            />
            <StatCard
              label="Shortlisted"
              value={shortlistedMatches.length}
              tone="success"
              helper="Properties saved for active discussion."
            />
            <StatCard
              label="Profile strength"
              value={`${completionPercentage}%`}
              helper={`${filledFields.length} of ${criteriaAnalysis.length} criteria configured.`}
            />
            <StatCard
              label="Last scan"
              value={lastUpdated ? getTimeSince(lastUpdated) : 'Not yet run'}
              helper="Most recent scanner refresh timestamp."
            />
          </section>

          <section className="mb-8 flex flex-wrap gap-3 border-b border-white/10 pb-4">
            {[
              { key: 'dashboard', label: 'Criteria & configuration', count: null },
              { key: 'market_scan', label: 'External market feed', count: newMatches.length },
              { key: 'shortlist', label: 'Selection / shortlist', count: shortlistedMatches.length },
            ].map((tab) => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                    active
                      ? 'border border-amber-300/20 bg-amber-400/10 text-amber-200'
                      : 'border border-white/10 bg-white/[0.03] text-stone-400 hover:bg-white/[0.06] hover:text-stone-200'
                  }`}
                >
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span
                      className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] ${
                        active ? 'bg-amber-300 text-[#171512]' : 'bg-white/10 text-stone-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </section>

          {activeTab === 'dashboard' && (
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.8fr_1fr]">
              <div className="flex flex-col gap-5">
                <Panel
                  title="Search configuration"
                  icon={<Radar size={18} />}
                  action={
                    <button
                      onClick={() => setIsEditPopupOpen(true)}
                      className="text-sm font-medium text-amber-300 transition-colors duration-200 hover:text-amber-200"
                    >
                      Edit criteria
                    </button>
                  }
                >
                  {!criteria ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-stone-500">
                      No search criteria set. Configure the client profile to begin scanning.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                          Budget range
                        </div>
                        <div className="mt-2 text-lg font-semibold text-stone-100">
                          {formatCurrencyRange(criteria.min_budget, criteria.max_budget)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                          Target sector
                        </div>
                        <div className="mt-2 text-lg font-semibold text-stone-100">
                          {hasLocation
                            ? criteria.locations ||
                              (criteria.radius_searches && criteria.radius_searches.length > 0
                                ? 'Radius search areas'
                                : null) ||
                              (criteria.custom_sectors &&
                              criteria.custom_sectors.features &&
                              criteria.custom_sectors.features.length > 0
                                ? 'Custom sectors'
                                : null) ||
                              'Custom area'
                            : 'Not set'}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                          Surface target
                        </div>
                        <div className="mt-2 text-lg font-semibold text-stone-100">
                          {formatRange(criteria.min_surface, criteria.max_surface, ' m²')}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                          Rooms / bedrooms
                        </div>
                        <div className="mt-2 text-lg font-semibold text-stone-100">
                          {formatRange(criteria.min_rooms, criteria.max_rooms)} /{' '}
                          {formatRange(criteria.min_bedrooms, criteria.max_bedrooms)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                          Land surface
                        </div>
                        <div className="mt-2 text-lg font-semibold text-stone-100">
                          {formatRange(criteria.min_land_surface, criteria.max_land_surface, ' m²')}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                          Bathrooms
                        </div>
                        <div className="mt-2 text-lg font-semibold text-stone-100">
                          {criteria.min_bathrooms ? `${criteria.min_bathrooms}+` : 'Any'}
                        </div>
                      </div>

                      {criteria.property_types && criteria.property_types.length > 0 && (
                        <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                            Property types
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {criteria.property_types.map((type) => (
                              <span
                                key={type}
                                className="rounded-full border border-amber-300/15 bg-amber-400/8 px-3 py-1 text-xs text-amber-200"
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {criteria.notes && (
                        <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                            Notes
                          </div>
                          <p className="mt-3 text-sm leading-7 text-stone-300">{criteria.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </Panel>

                <Panel
                  title="Search profile completeness"
                  icon={<Info size={18} />}
                  action={
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditPopupOpen(true)}
                        className="text-sm font-medium text-amber-300 transition-colors duration-200 hover:text-amber-200"
                      >
                        Add data
                      </button>
                      <button
                        onClick={() => setIsCompletenessExpanded(!isCompletenessExpanded)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-stone-300 transition-colors duration-200 hover:bg-white/[0.08]"
                      >
                        {isCompletenessExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  }
                >
                  <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-3xl font-semibold text-stone-100">{completionPercentage}%</div>
                        <p className="mt-1 text-sm text-stone-400">
                          {filledFields.length} of {criteriaAnalysis.length} criteria configured.
                        </p>
                      </div>
                      <div className="w-full max-w-md">
                        <div className="h-2 overflow-hidden rounded-full bg-black/20">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
                            style={{ width: `${completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {isCompletenessExpanded && (
                    <div className="mt-5 space-y-5">
                      <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                        <h4 className="text-sm font-semibold text-stone-100">How matching works</h4>
                        <p className="mt-2 text-sm leading-7 text-stone-400">
                          The scanner ranks opportunities by how well each listing fits this
                          client’s requirements. The more complete and specific the profile, the
                          more useful the resulting shortlist becomes.
                        </p>
                      </div>

                      {filledFields.length > 0 && (
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-emerald-300">
                            Configured criteria
                          </h4>
                          <div className="grid grid-cols-1 gap-3">
                            {filledFields.map((field, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <Check className="mt-0.5 text-emerald-300" size={16} />
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-semibold text-stone-100">
                                        {field.name}
                                      </span>
                                      {field.value && (
                                        <span className="text-xs text-emerald-300">{field.value}</span>
                                      )}
                                    </div>
                                    <p className="mt-1 text-sm text-stone-400">{field.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {sortedMissingFields.length > 0 ? (
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-amber-300">
                            Recommended additions
                          </h4>
                          <div className="grid grid-cols-1 gap-3">
                            {sortedMissingFields.map((field, idx) => {
                              const tone = getPriorityTone(field.priority)
                              return (
                                <div
                                  key={idx}
                                  className={`rounded-2xl border p-4 ${tone.card}`}
                                >
                                  <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 text-stone-300" size={16} />
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold text-stone-100">
                                          {field.name}
                                        </span>
                                        <span
                                          className={`rounded-full border px-2.5 py-1 text-[11px] ${tone.badge}`}
                                        >
                                          {tone.label}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-sm text-stone-400">{field.description}</p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <button
                            onClick={() => setIsEditPopupOpen(true)}
                            className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition-colors duration-200 hover:bg-amber-400/15"
                          >
                            <User size={15} />
                            Add missing criteria
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-6 text-center">
                          <CheckCircle2 size={34} className="mx-auto text-emerald-300" />
                          <p className="mt-3 text-lg font-semibold text-emerald-300">
                            Profile complete
                          </p>
                          <p className="mt-2 text-sm text-stone-400">
                            All priority criteria are configured and the search profile is ready for
                            high-quality matching.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Panel>

                <Panel title="Active data sources" icon={<Globe size={18} />}>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: 'CAD-IMMO', active: true },
                      { label: 'SeLoger', active: false },
                      { label: 'Leboncoin', active: false },
                      { label: 'Local agencies', active: false },
                    ].map((source) => (
                      <div
                        key={source.label}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#1b1916] px-3 py-2 text-xs text-stone-200"
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            source.active ? 'bg-emerald-300' : 'bg-stone-600'
                          }`}
                        />
                        {source.label}
                        {!source.active && <span className="text-stone-500">(soon)</span>}
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 text-sm leading-7 text-stone-400">
                    The scanner currently monitors enabled sources and checks them against the active
                    client profile when you run a refresh.
                  </p>
                </Panel>
              </div>

              <div className="flex flex-col gap-5">
                <Panel title="Scanner status" icon={<Radar size={18} />}>
                  {isScanning ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Loader2 size={34} className="animate-spin text-amber-300" />
                      <p className="mt-3 text-sm font-medium text-stone-200">Refreshing matches…</p>
                      <p className="mt-1 text-sm text-stone-500">
                        Reviewing current opportunities against this profile.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl font-semibold text-amber-300">{newMatches.length}</div>
                      <p className="mt-2 text-sm text-stone-400">New matches currently available.</p>

                      <button
                        onClick={handleRunScan}
                        disabled={matchingDisabled}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-200 transition-colors duration-200 hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Radar size={16} />
                        Refresh matches
                      </button>

                      {lastUpdated && (
                        <p className="mt-4 text-xs text-stone-500">
                          Last updated {getTimeSince(lastUpdated)}
                        </p>
                      )}
                    </div>
                  )}
                </Panel>

                <Panel title="Quick stats" icon={<TrendingUp size={18} />}>
                  <div className="space-y-3 text-sm">
                    {[
                      { label: 'New matches', value: newMatches.length, tone: 'text-amber-300' },
                      { label: 'Shortlisted', value: shortlistedMatches.length, tone: 'text-emerald-300' },
                      { label: 'Discarded', value: rejectedMatches.length, tone: 'text-red-300' },
                      { label: 'Total matches', value: matches.length, tone: 'text-stone-100' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-stone-400">{row.label}</span>
                        <span className={`font-semibold ${row.tone}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Profile strength" icon={<Sparkles size={18} />}>
                  <div className="text-center">
                    <div className="text-4xl font-semibold text-stone-100">{completionPercentage}%</div>
                    <p className="mt-2 text-sm text-stone-400">
                      {filledFields.length} of {criteriaAnalysis.length} criteria set.
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/20">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>

                    {sortedMissingFields.length > 0 && (
                      <p className="mt-4 text-xs text-amber-300">
                        Add{' '}
                        {
                          sortedMissingFields.filter(
                            (f) => f.priority === 'critical' || f.priority === 'high',
                          ).length
                        }{' '}
                        key criteria to improve scan quality.
                      </p>
                    )}
                  </div>
                </Panel>
              </div>
            </section>
          )}

          {(activeTab === 'market_scan' || activeTab === 'shortlist') && (
            <section className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-stone-400">
                  {activeTab === 'market_scan'
                    ? `Showing ${displayedMatches.length} new matches`
                    : `${displayedMatches.length} shortlisted properties`}
                </div>

                {lastUpdated && (
                  <div className="text-sm text-stone-500">Last updated {getTimeSince(lastUpdated)}</div>
                )}
              </div>

              {displayedMatches.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/10 px-6 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-300">
                    <Building2 size={24} />
                  </div>
                  <h2 className="text-lg font-semibold text-stone-100">
                    {activeTab === 'market_scan'
                      ? 'No new matches yet'
                      : 'No shortlisted properties yet'}
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-stone-400">
                    {activeTab === 'market_scan'
                      ? 'Run the scanner to refresh the external feed and compare current listings against this client profile.'
                      : 'Shortlisted properties will appear here once you begin selecting strong matches.'}
                  </p>

                  {activeTab === 'market_scan' && !matchingDisabled && (
                    <button
                      onClick={handleRunScan}
                      className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition-colors duration-200 hover:bg-amber-400/15"
                    >
                      <Radar size={16} />
                      Run scan
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5">
                  {displayedMatches.map((match) => {
                    if (!match.properties) return null

                    const prop = match.properties
                    const firstImage = Array.isArray(prop.images) ? prop.images[0] : null
                    const allImages = Array.isArray(prop.images) ? prop.images : []
                    const qualityScore = prop.data_quality_score || '1.0'
                    const validationErrors = prop.validation_errors || []
                    const isExpanded = expandedPropertyId === match.id
                    const hasPriceChange = prop.previous_price && prop.price_changed_at
                    const priceDrop = (prop.price_drop_amount || 0) > 0

                    return (
                      <article
                        key={match.id}
                        className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
                      >
                        <div className="p-5 sm:p-6">
                          <div className="flex flex-col gap-5 xl:flex-row">
                            <div
                              className="relative h-56 w-full cursor-pointer overflow-hidden rounded-[24px] border border-white/10 bg-[#1b1916] xl:w-[300px] xl:flex-shrink-0"
                              onClick={() => setExpandedPropertyId(isExpanded ? null : match.id)}
                            >
                              {firstImage ? (
                                <img
                                  src={firstImage}
                                  alt={prop.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-stone-600">
                                  <Home size={42} />
                                </div>
                              )}

                              {getQualityBadge(qualityScore)}

                              <div
                                className={`absolute right-3 top-3 rounded-full border px-2.5 py-1 text-[11px] font-medium ${getMatchScoreColor(
                                  match.match_score,
                                )}`}
                              >
                                <TrendingUp size={11} className="mr-1 inline" />
                                {match.match_score}%
                              </div>

                              <div className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] text-stone-200 backdrop-blur-sm">
                                {isExpanded ? 'Less' : 'More'} · {allImages.length} photos
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-amber-200">
                                  {prop.source}
                                </span>

                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-stone-300">
                                  {prop.property_type || 'Property'}
                                </span>

                                {prop.pool && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-sky-300">
                                    <Droplets size={11} />
                                    Pool
                                  </span>
                                )}

                                {hasPriceChange && priceDrop && (
                                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-emerald-300">
                                    €{(prop.price_drop_amount || 0).toLocaleString()} drop
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => setExpandedPropertyId(isExpanded ? null : match.id)}
                                className="mt-3 text-left text-xl font-semibold tracking-tight text-stone-100 transition-colors duration-200 hover:text-amber-200"
                              >
                                {prop.title}
                              </button>

                              <div className="mt-3 flex flex-wrap gap-3 text-sm text-stone-400">
                                <span className="inline-flex items-center gap-2">
                                  <MapPin size={14} className="text-stone-500" />
                                  {prop.location_city}
                                </span>
                                {prop.surface && (
                                  <span className="inline-flex items-center gap-2">
                                    <Maximize2 size={14} className="text-stone-500" />
                                    {prop.surface} m²
                                  </span>
                                )}
                                {prop.land_surface && (
                                  <span className="inline-flex items-center gap-2">
                                    <Home size={14} className="text-stone-500" />
                                    {prop.land_surface} m² land
                                  </span>
                                )}
                                {prop.rooms && (
                                  <span className="inline-flex items-center gap-2">
                                    <Home size={14} className="text-stone-500" />
                                    {prop.rooms} rooms
                                  </span>
                                )}
                                {prop.bedrooms && (
                                  <span className="inline-flex items-center gap-2">
                                    <Bed size={14} className="text-stone-500" />
                                    {prop.bedrooms} bed
                                  </span>
                                )}
                                {prop.bathrooms && (
                                  <span className="inline-flex items-center gap-2">
                                    <Bath size={14} className="text-stone-500" />
                                    {prop.bathrooms} bath
                                  </span>
                                )}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
                                {prop.heating_system && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Flame size={12} />
                                    {prop.heating_system}
                                  </span>
                                )}
                                {prop.drainage_system && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Wrench size={12} />
                                    {prop.drainage_system}
                                  </span>
                                )}
                                {prop.year_built && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Calendar size={12} />
                                    Built {prop.year_built}
                                  </span>
                                )}
                              </div>

                              {validationErrors.length > 0 && (
                                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
                                  <AlertTriangle size={12} />
                                  {Array.isArray(validationErrors)
                                    ? validationErrors.join(', ')
                                    : 'Data quality issues'}
                                </div>
                              )}

                              <div className="mt-4 flex flex-wrap items-center gap-3">
                                <div className="text-2xl font-semibold text-stone-100">
                                  €{parseInt(prop.price || '0', 10).toLocaleString()}
                                </div>

                                {hasPriceChange && (
                                  <div className="text-sm text-stone-500 line-through">
                                    €{parseInt(String(prop.previous_price), 10).toLocaleString()}
                                  </div>
                                )}

                                {criteria &&
                                  (() => {
                                    const analysis = calculateMatchAnalysis(prop, criteria)
                                    const matchCount = Object.values(analysis.matches).filter(
                                      (v) => v === true,
                                    ).length
                                    const mismatchCount = Object.values(analysis.matches).filter(
                                      (v) => v === false,
                                    ).length
                                    const uncertainCount = analysis.uncertainties.length

                                    return (
                                      <div className="flex flex-wrap gap-2">
                                        {matchCount > 0 && (
                                          <div className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                                            <CheckCircle2 size={12} />
                                            {matchCount} matches
                                          </div>
                                        )}
                                        {(mismatchCount > 0 || uncertainCount > 0) && (
                                          <div className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
                                            <AlertTriangle size={12} />
                                            {mismatchCount + uncertainCount} questions
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                              </div>
                            </div>

                            <div className="flex w-full flex-col gap-2 xl:w-[180px] xl:flex-shrink-0">
                              <button
                                onClick={() => handleCreateBrochure(prop)}
                                disabled={generatingPdfId === prop.id}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition-colors duration-200 hover:bg-amber-400/15 disabled:opacity-50"
                              >
                                {generatingPdfId === prop.id ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Generating…
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
                                  className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition-colors duration-200 hover:bg-emerald-400/15 disabled:opacity-50"
                                >
                                  {updatingMatchId === match.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 size={14} />
                                      Select
                                    </>
                                  )}
                                </button>
                              )}

                              {match.status !== 'rejected' && (
                                <button
                                  onClick={() => updateMatchStatus(match.id, 'rejected')}
                                  disabled={updatingMatchId === match.id}
                                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors duration-200 hover:bg-red-400/15 disabled:opacity-50"
                                >
                                  {updatingMatchId === match.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <>
                                      <XCircle size={14} />
                                      Discard
                                    </>
                                  )}
                                </button>
                              )}

                              <a
                                href={prop.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-stone-200 transition-colors duration-200 hover:bg-white/[0.08]"
                              >
                                <ExternalLink size={14} />
                                Source
                              </a>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-white/10 bg-[#181613] px-5 py-6 sm:px-6">
                            <div className="space-y-6">
                              {criteria &&
                                (() => {
                                  const analysis = calculateMatchAnalysis(prop, criteria)
                                  const matchedCriteria = Object.entries(analysis.matches).filter(
                                    ([, isMatch]) => isMatch,
                                  )
                                  const unmatchedCriteria = Object.entries(analysis.matches).filter(
                                    ([, isMatch]) => !isMatch,
                                  )

                                  return (
                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                      {matchedCriteria.length > 0 && (
                                        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
                                          <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                                            <CheckCircle2 size={14} />
                                            Criteria met ({matchedCriteria.length})
                                          </h5>
                                          <ul className="space-y-2 text-sm text-stone-300">
                                            {matchedCriteria.map(([key]) => (
                                              <li key={key} className="flex items-center gap-2">
                                                <Check size={13} className="text-emerald-300" />
                                                <span className="capitalize">
                                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {(unmatchedCriteria.length > 0 ||
                                        analysis.uncertainties.length > 0) && (
                                        <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-4">
                                          <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-300">
                                            <AlertTriangle size={14} />
                                            Questions ({unmatchedCriteria.length + analysis.uncertainties.length})
                                          </h5>
                                          <ul className="space-y-2 text-sm text-stone-300">
                                            {unmatchedCriteria.map(([key]) => (
                                              <li key={key} className="flex items-center gap-2">
                                                <XCircle size={13} className="text-red-300" />
                                                <span className="capitalize">
                                                  {key.replace(/([A-Z])/g, ' $1').trim()} doesn’t match
                                                </span>
                                              </li>
                                            ))}
                                            {analysis.uncertainties.map((unc, idx) => (
                                              <li key={idx} className="flex items-start gap-2">
                                                <AlertCircle size={13} className="mt-0.5 text-amber-300" />
                                                <div>
                                                  <span className="font-medium text-stone-100">
                                                    {unc.field}:
                                                  </span>{' '}
                                                  {unc.reason}
                                                </div>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}

                              {allImages.length > 1 && (
                                <div>
                                  <h5 className="mb-3 text-sm font-semibold text-stone-100">
                                    Photo gallery ({allImages.length})
                                  </h5>
                                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                    {allImages.map((img, idx) => (
                                      <div
                                        key={idx}
                                        className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#1b1916]"
                                      >
                                        <img
                                          src={img}
                                          alt={`${prop.title} - ${idx + 1}`}
                                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {prop.description && (
                                <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                                  <h5 className="text-sm font-semibold text-stone-100">Description</h5>
                                  <p className="mt-3 text-sm leading-7 text-stone-400">
                                    {prop.description}
                                  </p>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                {prop.energy_consumption && (
                                  <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                                      Energy
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-stone-100">
                                      {prop.energy_consumption} kWh/m²
                                    </div>
                                  </div>
                                )}

                                {prop.co2_emissions && (
                                  <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                                      CO2
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-stone-100">
                                      {prop.co2_emissions} kg/m²
                                    </div>
                                  </div>
                                )}

                                {prop.floors && (
                                  <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                                      Floors
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-stone-100">
                                      {prop.floors}
                                    </div>
                                  </div>
                                )}

                                <div className="rounded-2xl border border-white/10 bg-[#1b1916] p-4">
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                                    Reference
                                  </div>
                                  <div className="mt-2 text-sm font-semibold text-stone-100">
                                    {prop.reference}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </main>

        {isEditPopupOpen && (
          <EditClientPopup
            isOpen={isEditPopupOpen}
            clientId={clientId}
            onClose={() => {
              setIsEditPopupOpen(false)
              fetchClientData()
            }}
          />
        )}
      </div>
    </div>
  )
}