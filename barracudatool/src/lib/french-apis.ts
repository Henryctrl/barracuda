import { DpeAPI } from './dpe-api';

// Define clear interfaces for your data structures
interface Transaction {
  sale_date: string;
  sale_price: number;
  property_type: string;
  surface_area: number;
  municipality: string;
  postal_code: string;
  parcel_id: string | null;
  data_source: string;
}

interface Parcel {
  cadastral_id: string | null;
  commune_name: string;
  commune_code: string;
  department: string;
  region: string;
  postal_code: string | null;
  surface_area: number | null;
  zone_type: string | null;
  coordinates: [number, number];
  population: number | null;
  commune_surface: number;
  data_source: string;
  section?: string | null;
  numero?: string | null;
  prefixe?: string | null;
  nature_culture?: string | null;
}

interface ApiTransaction {
  date_mutation: string;
  valeur_fonciere: number;
  type_local: string;
  surface_reelle_bati?: number;
  surface_terrain?: number;
  nom_commune: string;
  code_postal: string;
  code_parcelle: string | null;
}

export class FrenchCadastralAPI {
  private static cache = new Map<string, unknown>();
  
  private static getCacheKey(lng: number, lat: number): string {
    return `${Math.round(lng * 10000) / 10000},${Math.round(lat * 10000) / 10000}`;
  }

  static async getParcelCentroid(cadastralId: string): Promise<{lat: number, lng: number} | null> {
    // ... (rest of the function is correct)
    try {
      const commune = cadastralId.slice(0, 5);
      const section = cadastralId.slice(8, 10);
      const numero = cadastralId.slice(10);
      const apis = [
        `https://apicarto.ign.fr/api/cadastre/parcelle?code_insee=${commune}&section=${section}&numero=${numero}`,
        `https://geo.api.gouv.fr/cadastre?code_insee=${commune}&section=${section}&numero=${numero}`
      ];
      for (const apiUrl of apis) {
        try {
          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.features?.[0]?.geometry?.coordinates) {
              const geom = data.features[0].geometry;
              if (geom.type === 'Polygon') {
                const coords = geom.coordinates[0];
                const lng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
                const lat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
                return { lat, lng };
              } else if (geom.type === 'Point') {
                return { lng: geom.coordinates[0], lat: geom.coordinates[1] };
              }
            }
          }
        } catch {}
      }
      return null;
    } catch {
      return null;
    }
  }

  static extractCadastralId(feature: unknown): string | null {
    if (typeof feature !== 'object' || !feature || !('properties' in feature)) return null;
    const props = (feature as { properties: Record<string, unknown> }).properties;
    if (props.id && typeof props.id === 'string') return props.id;
    const { commune, section, numero, prefixe = '000' } = props;
    if (commune && section && numero) {
      return `${commune}${prefixe}${String(section)}${String(numero).padStart(4, '0')}`;
    }
    return null;
  }
  
  static async getParcelByCoordinates(lng: number, lat: number): Promise<Parcel | null> {
    const cacheKey = this.getCacheKey(lng, lat);
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as Parcel;
    try {
      const res = await fetch(`https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lng}&format=json&fields=nom,code,codeDepartement,codeRegion,codesPostaux,surface,population`);
      if (!res.ok) return null;
      const communes = await res.json();
      if (!communes.length) return null;
      const c = communes[0];
      const parcelData: Parcel = {
        cadastral_id: null,
        commune_name: c.nom,
        commune_code: c.code,
        department: c.codeDepartement,
        region: c.codeRegion,
        postal_code: c.codesPostaux[0] || null,
        surface_area: null,
        zone_type: null,
        coordinates: [lng, lat],
        population: c.population,
        commune_surface: c.surface,
        data_source: 'commune_api_only'
      };
      this.cache.set(cacheKey, parcelData);
      return parcelData;
    } catch {
      return null;
    }
  }

  static extractCadastralDataFromFeature(feature: unknown) {
    if (typeof feature !== 'object' || !feature || !('properties' in feature)) return null;
    const props = (feature as { properties: Record<string, unknown> }).properties;
    const surfaceKeys = ['contenance', 'surface', 'superficie', 'area', 'surface_area'];
    let surfaceArea = null;
    for (const key of surfaceKeys) {
      const val = parseFloat(String(props[key]));
      if (!isNaN(val) && val > 0) {
        surfaceArea = val;
        break;
      }
    }
    if (!surfaceArea) return null;
    return {
      real_cadastral_id: this.extractCadastralId(feature),
      commune_code: String(props.commune || ''),
      section: String(props.section || ''),
      numero: String(props.numero || ''),
      prefixe: String(props.prefixe || '000'),
      surface_area: surfaceArea,
      zone_type: String(props.zonage || props.zone || ''),
      nature_culture: String(props.nature || props.culture || ''),
      data_source: 'real_cadastral'
    };
  }

  static async getDVFTransactions(userLng: number, userLat: number, exactCadastralId?: string | null): Promise<Transaction[]> {
    const cacheKey = `dvf_${this.getCacheKey(userLng, userLat)}_${exactCadastralId || 'noId'}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as Transaction[];
    try {
      let searchLat = userLat, searchLng = userLng;
      if (exactCadastralId) {
        const realCoords = await this.getParcelCentroid(exactCadastralId);
        if (realCoords) {
          searchLat = realCoords.lat;
          searchLng = realCoords.lng;
        }
      }
      const params = new URLSearchParams({ lat: String(searchLat), lng: String(searchLng), rayon: '1000' });
      if (exactCadastralId) params.append('cadastralId', exactCadastralId);
      const res = await fetch(`/api/dvf-plus?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (data.error || !data.resultats) return [];
      const transactions: Transaction[] = data.resultats.map((t: ApiTransaction) => ({
        sale_date: t.date_mutation,
        sale_price: t.valeur_fonciere,
        property_type: t.type_local,
        surface_area: t.surface_reelle_bati || t.surface_terrain || 0,
        municipality: t.nom_commune,
        postal_code: t.code_postal,
        parcel_id: t.code_parcelle,
        data_source: 'etalab_official'
      }));
      this.cache.set(cacheKey, transactions);
      return transactions;
    } catch {
      return [];
    }
  }

  static async getCompleteParcelData(userLng: number, userLat: number, cadastralFeature?: unknown) {
    try {
      const exactCadastralId = cadastralFeature ? this.extractCadastralId(cadastralFeature) : null;
      const [parcelResult, transactionsResult] = await Promise.allSettled([
        this.getParcelByCoordinates(userLng, userLat),
        this.getDVFTransactions(userLng, userLat, exactCadastralId)
      ]);

      if (parcelResult.status === 'rejected' || !parcelResult.value) return null;
      
      let parcelData: Parcel = parcelResult.value;
      const safeTransactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value : [];
      const latestSale = safeTransactions[0] || null;

      if (cadastralFeature) {
        const realCadastralData = this.extractCadastralDataFromFeature(cadastralFeature);
        if (realCadastralData) {
          // Correctly spread the existing parcelData object
          parcelData = {
            ...parcelData,
            ...realCadastralData,
            cadastral_id: realCadastralData.real_cadastral_id,
          };
        } else {
            return null;
        }
      } else {
        return null;
      }
      return {
        parcel: parcelData,
        transactions: safeTransactions,
        dpe: null,
        latest_sale: latestSale,
        has_sales: !!safeTransactions.length,
        sales_count: safeTransactions.length,
        exact_cadastral_id: exactCadastralId
      };
    } catch {
      return null;
    }
  }
  
  static async getEnhancedPropertyData(userLng: number, userLat: number, cadastralFeature?: unknown) {
    try {
      const baseData = await this.getCompleteParcelData(userLng, userLat, cadastralFeature);
      if (!baseData) return null;
      
      const dpeData = await DpeAPI.getDpeNearCoordinates(userLng, userLat);
      const closestDpe = dpeData[0] || null;

      return {
        ...baseData,
        dpe: closestDpe,
        nearbyDpeCount: dpeData.length,
        dpeData: dpeData.slice(0, 3)
      };
    } catch {
      return null;
    }
  }
}
