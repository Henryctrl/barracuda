// src/app/gatherer/prospection/types.ts

export type ProspectionStatus = 
  | 'not_contacted'
  | 'contacted'
  | 'follow_up_needed'
  | 'callback_scheduled'
  | 'positive_response'
  | 'not_interested';

export interface PropertyProspect {
  id: string;
  created_at: string;
  updated_at: string;
  link?: string;
  photo_url?: string;
  address: string;
  town?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  property_type?: string;
  current_agent?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  owner_address?: string;
  status: ProspectionStatus;
  last_contact_date?: string;
  return_date?: string;
  notes?: string;
  user_id: string;
  reference?: string;
  added_by?: string;
}

export interface ProspectionFilters {
  minPrice?: number;
  maxPrice?: number;
  status?: ProspectionStatus[];
  town?: string;
  sortBy?: 'price' | 'town' | 'last_contact_date' | 'distance';
  sortOrder?: 'asc' | 'desc';
  searchCenter?: [number, number];
  maxDistance?: number; // in km
}

export const STATUS_CONFIG: Record<
  ProspectionStatus,
  { label: string; color: string; dotColor: string }
> = {
  not_contacted: {
    label: 'Not Contacted',
    color: '#8D857D',
    dotColor: '#8D857D',
  },
  contacted: {
    label: 'Contacted',
    color: '#3BA7FF',
    dotColor: '#3BA7FF',
  },
  follow_up_needed: {
    label: 'Follow-up Needed',
    color: '#F2C94C',
    dotColor: '#F2C94C',
  },
  callback_scheduled: {
    label: 'Callback Scheduled',
    color: '#FF8A3D',
    dotColor: '#FF8A3D',
  },
  positive_response: {
    label: 'Positive Response',
    color: '#57C084',
    dotColor: '#57C084',
  },
  not_interested: {
    label: 'Not Interested',
    color: '#E06A6A',
    dotColor: '#E06A6A',
  },
};
