// src/types/index.ts

export interface PropertyInfo {
    cadastralId: string | null;
    size: number | null;
    zone: string | null;
    commune?: string;
    department?: string;
    postalCode?: string;
    coordinates?: { lat: number; lon: number };
    population?: number;
    lastSaleDate?: string;
    lastSalePrice?: number;
    pricePerSqm?: number;
    section?: string;
    numero?: string;
    dataSource: 'real_cadastral' | 'no_data';
    dpeRating?: {
      energy: string;
      ghg: string;
      date: string;
      consumption?: number;
      yearBuilt?: string;
      surfaceArea?: number;
      annualCost?: number;
      dpeId?: string;
      address?: string;
      isActive?: boolean;
    };
    nearbyDpeCount?: number;
    allDpeCandidates?: DpeCandidate[];
    transactions?: Transaction[];
    hasSales?: boolean;
    salesCount?: number;
  }
  
  export interface DpeCandidate {
    id: string;
    address: string;
    energy_class: string;
    ghg_class: string;
    surface?: number;
    annual_cost?: number;
    establishment_date?: string;
    score: number;
    reason?: string;
    distance: number; // This is the crucial field
  }
  
  export interface Transaction {
    sale_date: string;
    sale_price: number;
    property_type: string;
    surface_area: number;
    municipality: string;
    postal_code: string;
  }
  