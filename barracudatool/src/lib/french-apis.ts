// barracudatool/src/lib/french-apis.ts

import { BanAPI, type BanAddress } from './ban-api';
import { DpeAPI, type DpeData } from './dpe-api';

export class FrenchCadastralAPI {
  private static cache = new Map<string, any>();

  private static getCacheKey(lng: number, lat: number): string {
    return `${Math.round(lng * 10000) / 10000},${Math.round(lat * 10000) / 10000}`;
  }

  // NEW: Get real parcel coordinates from cadastral geometry
  static async getParcelCentroid(cadastralId: string): Promise<{lat: number, lng: number} | null> {
    try {
      const commune = cadastralId.slice(0, 5);
      const section = cadastralId.slice(8, 10);
      const numero = cadastralId.slice(10);
      
      console.log(`🗺️ Fetching real coordinates for parcel ${cadastralId} (commune: ${commune}, section: ${section}, numero: ${numero})`);
      
      // Try multiple cadastral APIs
      const apis = [
        `https://apicarto.ign.fr/api/cadastre/parcelle?code_insee=${commune}&section=${section}&numero=${numero}`,
        `https://geo.api.gouv.fr/cadastre?code_insee=${commune}&section=${section}&numero=${numero}`
      ];
      
      for (const apiUrl of apis) {
        try {
          const response = await fetch(apiUrl);
          
          if (response.ok) {
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              const geometry = data.features[0].geometry;
              if (geometry && geometry.coordinates) {
                let centroidLng: number, centroidLat: number;
                
                if (geometry.type === 'Polygon') {
                  const coordinates = geometry.coordinates[0];
                  centroidLng = coordinates.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coordinates.length;
                  centroidLat = coordinates.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coordinates.length;
                } else if (geometry.type === 'Point') {
                  centroidLng = geometry.coordinates[0];
                  centroidLat = geometry.coordinates[1];
                } else {
                  continue;
                }
                
                console.log(`✅ Found REAL parcel centroid for ${cadastralId}: lat=${centroidLat}, lng=${centroidLng}`);
                return { lat: centroidLat, lng: centroidLng };
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ API ${apiUrl} failed:`, error);
        }
      }
      
      console.warn(`⚠️ Could not get centroid for parcel ${cadastralId} from any API`);
      return null;
    } catch (error) {
      console.error(`❌ Error getting parcel centroid:`, error);
      return null;
    }
  }

  // Extract proper cadastral ID from feature
  static extractCadastralId(feature: any): string | null {
    if (!feature || !feature.properties) {
      return null;
    }

    const props = feature.properties;
    
    if (props.id) {
      console.log('✅ Using feature ID as cadastral ID:', props.id);
      return props.id;
    }
    
    const commune = props.commune || '';
    const section = props.section || '';
    const numero = props.numero || '';
    const prefixe = props.prefixe || '000';
    
    if (commune && section && numero) {
      const cadastralId = `${commune}${prefixe}${section}${numero.padStart(4, '0')}`;
      console.log('✅ Built cadastral ID from components:', cadastralId);
      return cadastralId;
    }
    
    console.log('❌ Could not extract cadastral ID from feature:', Object.keys(props));
    return null;
  }

  static async getParcelByCoordinates(lng: number, lat: number) {
    const cacheKey = this.getCacheKey(lng, lat);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lng}&format=json&fields=nom,code,codeDepartement,codeRegion,codesPostaux,surface,population`
      );
      
      if (!response.ok) {
        throw new Error(`Commune API failed: ${response.status}`);
      }
      
      const communes = await response.json();
      if (communes.length === 0) {
        throw new Error('No commune found for these coordinates');
      }

      const commune = communes[0];
      
      const parcelData = {
        cadastral_id: null,
        commune_name: commune.nom,
        commune_code: commune.code,
        department: commune.codeDepartement,
        region: commune.codeRegion,
        postal_code: commune.codesPostaux[0] || null,
        surface_area: null,
        zone_type: null,
        coordinates: [lng, lat],
        population: commune.population,
        commune_surface: commune.surface,
        data_source: 'commune_api_only'
      };

      this.cache.set(cacheKey, parcelData);
      return parcelData;
    } catch (error) {
      console.error('❌ Failed to fetch commune data:', error);
      throw error;
    }
  }

  static extractCadastralDataFromFeature(feature: any) {
    if (!feature || !feature.properties) {
      console.log('❌ No cadastral feature found');
      return null;
    }

    const props = feature.properties;
    console.log('🔍 Extracting REAL cadastral data:', props);
    
    let surfaceArea = null;
    const possibleSurfaceKeys = ['contenance', 'surface', 'superficie', 'area', 'surface_area'];
    
    for (const key of possibleSurfaceKeys) {
      if (props[key] !== undefined && props[key] !== null && props[key] !== '') {
        const value = parseFloat(props[key]);
        if (!isNaN(value) && value > 0) {
          surfaceArea = value;
          console.log(`✅ Found REAL surface area in '${key}':`, surfaceArea, 'm²');
          break;
        }
      }
    }
    
    if (!surfaceArea) {
      console.log('❌ No real surface area found. Available properties:', Object.keys(props));
      return null;
    }
    
    return {
      real_cadastral_id: this.extractCadastralId(feature),
      commune_code: props.commune || null,
      section: props.section || null,
      numero: props.numero || null,
      prefixe: props.prefixe || null,
      surface_area: surfaceArea,
      zone_type: props.zonage || props.zone || null,
      nature_culture: props.nature || props.culture || null,
      data_source: 'real_cadastral'
    };
  }

  // FIXED: DVF API with REAL parcel coordinates
  // barracudatool/src/lib/french-apis.ts (updated getDVFTransactions method)

static async getDVFTransactions(userLng: number, userLat: number, exactCadastralId?: string | null) {
  const cacheKey = `dvf_etalab_${this.getCacheKey(userLng, userLat)}_${exactCadastralId || 'noId'}`;
  
  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey);
  }

  try {
    let searchLat = userLat;
    let searchLng = userLng;
    
    // Try to get real parcel coordinates (optional)
    if (exactCadastralId) {
      console.log(`🗺️ Getting REAL coordinates for parcel ${exactCadastralId}...`);
      const realCoords = await this.getParcelCentroid(exactCadastralId);
      
      if (realCoords) {
        searchLat = realCoords.lat;
        searchLng = realCoords.lng;
        console.log(`✅ Using REAL parcel coordinates: lat=${searchLat}, lng=${searchLng}`);
      } else {
        console.log(`⚠️ Using click coordinates as fallback: lat=${searchLat}, lng=${searchLng}`);
      }
    }
    
    const params = new URLSearchParams({
      lat: searchLat.toString(),
      lng: searchLng.toString(),
      rayon: '1000' // Start with 1km radius for Etalab
    });
    
    if (exactCadastralId) {
      params.append('cadastralId', exactCadastralId);
    }
    
    const response = await fetch(`/api/dvf-plus?${params}`);
    
    if (!response.ok) {
      console.warn(`⚠️ Etalab DVF API returned ${response.status}, no sales data available`);
      this.cache.set(cacheKey, []);
      return [];
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.warn(`⚠️ Etalab DVF API issue: ${data.error}, no sales data available`);
      this.cache.set(cacheKey, []);
      return [];
    }

    const transactions = data.resultats || [];
    
    if (transactions.length === 0) {
      console.log(`ℹ️ No Etalab sales found for exact plot ${exactCadastralId || 'at coordinates'}`);
      this.cache.set(cacheKey, []);
      return [];
    }
    
    // Process Etalab transactions
    const processedTransactions = transactions.map((t: any) => ({
      sale_date: t.date_mutation || 'Unknown',
      sale_price: t.valeur_fonciere || 0,
      property_type: t.type_local || 'Unknown',
      surface_area: t.surface_reelle_bati || t.surface_terrain || 0,
      municipality: t.nom_commune || 'Unknown',
      postal_code: t.code_postal || 'Unknown',
      parcel_id: t.code_parcelle || null,
      data_source: 'etalab_official'
    }));

    console.log(`✅ ETALAB SUCCESS: ${processedTransactions.length} transactions found for parcel ${exactCadastralId}`);
    
    this.cache.set(cacheKey, processedTransactions);
    return processedTransactions;
  } catch (error) {
    console.warn('⚠️ Etalab DVF API failed:', error);
    this.cache.set(cacheKey, []);
    return [];
  }
}

  static async getCompleteParcelData(userLng: number, userLat: number, cadastralFeature?: any) {
    try {
      console.log(`🔍 Fetching REAL parcel data for: lng=${userLng}, lat=${userLat}`);
      
      let exactCadastralId: string | null = null;
      if (cadastralFeature) {
        exactCadastralId = this.extractCadastralId(cadastralFeature);
        console.log(`🏠 Extracted exact cadastral ID: ${exactCadastralId}`);
      }
      
      const [parcelResult, transactionsResult] = await Promise.allSettled([
        this.getParcelByCoordinates(userLng, userLat),
        this.getDVFTransactions(userLng, userLat, exactCadastralId)
      ]);

      if (parcelResult.status === 'rejected') {
        throw new Error(`Failed to get commune data: ${parcelResult.reason}`);
      }

      const safeTransactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value : [];
      const latestSale = Array.isArray(safeTransactions) && safeTransactions.length > 0 ? safeTransactions[0] : null;

      let parcelData = parcelResult.value;

      if (cadastralFeature) {
        const realCadastralData = this.extractCadastralDataFromFeature(cadastralFeature);
        if (realCadastralData) {
          console.log('✅ REAL cadastral data extracted:', realCadastralData);
          
          parcelData = {
            ...parcelData,
            cadastral_id: realCadastralData.real_cadastral_id || exactCadastralId,
            surface_area: realCadastralData.surface_area,
            zone_type: realCadastralData.zone_type,
            section: realCadastralData.section,
            numero: realCadastralData.numero,
            prefixe: realCadastralData.prefixe,
            nature_culture: realCadastralData.nature_culture,
            data_source: 'real_cadastral'
          };
        } else {
          console.log('❌ No real cadastral data available for this parcel');
          return null;
        }
      } else {
        console.log('❌ No cadastral feature clicked - cannot provide parcel data');
        return null;
      }

      const result = {
        parcel: parcelData,
        transactions: safeTransactions,
        dpe: null,
        latest_sale: latestSale,
        has_sales: safeTransactions.length > 0,
        sales_count: safeTransactions.length,
        exact_cadastral_id: exactCadastralId
      };

      console.log(`✅ EXACT parcel analysis complete: ${safeTransactions.length > 0 ? `${safeTransactions.length} REAL SALES FOUND` : 'NO SALES FOR THIS EXACT PLOT'}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to fetch real parcel data:', error);
      throw error;
    }
  }
  // Add this method to your FrenchCadastralAPI class
// Add this corrected method to your FrenchCadastralAPI class
// Add these imports at the top of your french-apis.ts file
// import { DpeAPI, type DpeData } from './dpe-api';

// Add this method to your FrenchCadastralAPI class
// Add this to your FrenchCadastralAPI class
static async getEnhancedPropertyData(userLng: number, userLat: number, cadastralFeature?: any) {
  let baseData = null;
  
  try {
    console.log(`🔍 Fetching ENHANCED property data with COORDINATE CONVERSION for: ${userLat.toFixed(6)}, ${userLng.toFixed(6)}`);
    
    // Get your existing data FIRST
    baseData = await this.getCompleteParcelData(userLng, userLat, cadastralFeature);
    if (!baseData) {
      console.log('❌ No base parcel data found');
      return null;
    }

    // Get DPE data using coordinate conversion (wider search radius)
    const dpeData = await DpeAPI.getDpeNearCoordinates(userLng, userLat, 1.0); // 1km radius
    
    // Find the closest DPE match
    let closestDpe = null;
    if (dpeData.length > 0) {
      console.log(`🏡 Found ${dpeData.length} DPE certificates using coordinate conversion`);
      closestDpe = dpeData[0]; // Already sorted by distance
      
      console.log(`✅ Closest DPE: ${closestDpe.adresse_bien} - Energy: ${closestDpe.etiquette_dpe}, Distance: ${closestDpe.distance?.toFixed(2)}km`);
    } else {
      console.log('❌ No DPE certificates found even with coordinate conversion');
    }

    return {
      ...baseData,
      dpe: closestDpe,
      nearbyDpeCount: dpeData.length,
      dpeData: dpeData.slice(0, 3)
    };
  } catch (error) {
    console.error('❌ Failed to fetch enhanced property data:', error);
    return baseData ? {
      ...baseData,
      dpe: null,
      nearbyDpeCount: 0,
      dpeData: []
    } : null;
  }
}
}
