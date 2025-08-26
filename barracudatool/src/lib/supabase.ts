import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (based on your schema)
export interface CadastralParcel {
  id: string
  cadastral_id: string
  commune_code: string
  section: string
  parcel_number: string
  surface_area: number
  zone_type?: string
  geometry: any // PostGIS geometry
  created_at: string
  updated_at: string
}

export interface PropertyTransaction {
  id: string
  cadastral_id: string
  sale_date: string
  sale_price: number
  surface_area?: number
  property_type?: string
  municipality: string
  created_at: string
}

export interface EnergyRating {
  id: string
  cadastral_id: string
  energy_class: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  ghg_class: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  energy_consumption?: number
  ghg_emission?: number
  rating_date: string
  valid_until?: string
  created_at: string
}
