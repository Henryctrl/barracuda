// barracudatool/src/lib/french-apis.ts

export class FrenchCadastralAPI {
  private static cache = new Map<string, any>();

  private static getCacheKey(lng: number, lat: number): string {
    return `${Math.round(lng * 10000) / 10000},${Math.round(lat * 10000) / 10000}`;
  }

  // ✅ REAL French commune data only - no fallbacks
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
        cadastral_id: null, // Will be filled by real cadastral data only
        commune_name: commune.nom,
        commune_code: commune.code,
        department: commune.codeDepartement,
        region: commune.codeRegion,
        postal_code: commune.codesPostaux[0] || null,
        surface_area: null, // ✅ NO ESTIMATES - real data only
        zone_type: null, // ✅ NO ESTIMATES - real data only
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

  // ✅ EXTRACT REAL CADASTRAL DATA ONLY
  static extractCadastralDataFromFeature(feature: any) {
    if (!feature || !feature.properties) {
      console.log('❌ No cadastral feature found');
      return null;
    }

    const props = feature.properties;
    console.log('🔍 Extracting REAL cadastral data:', props);
    
    // ✅ Try multiple property names for surface area
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
      return null; // ✅ NO ESTIMATES - return null if no real data
    }
    
    return {
      real_cadastral_id: props.id || null,
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

  // ✅ UPDATED DVF API - Use alternative endpoint (DVF+ from Cerema)
  static async getDVFTransactions(lng: number, lat: number) {
    const cacheKey = `dvf_${this.getCacheKey(lng, lat)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`📡 Calling DVF+ API for coordinates: ${lat}, ${lng}`);
      
      // ✅ Use DVF+ from Cerema (more reliable as of 2025)
      const response = await fetch(`/api/dvf-plus?lat=${lat}&lng=${lng}&rayon=2000`);
      
      if (!response.ok) {
        console.warn(`⚠️ DVF+ API returned ${response.status}, no sales data available`);
        this.cache.set(cacheKey, []);
        return [];
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.warn(`⚠️ DVF+ API issue: ${data.error}, no sales data available`);
        this.cache.set(cacheKey, []);
        return [];
      }

      const transactions = data.resultats || [];
      
      if (transactions.length === 0) {
        console.log('ℹ️ No real transactions found for this location');
        this.cache.set(cacheKey, []);
        return [];
      }
      
      const processedTransactions = transactions.slice(0, 5).map((t: any) => ({
        sale_date: t.date_mutation,
        sale_price: t.valeur_fonciere,
        property_type: t.type_local,
        surface_area: t.surface_reelle_bati || t.surface_terrain,
        municipality: t.nom_commune,
        postal_code: t.code_postal,
        data_source: 'real_dvf'
      }));

      console.log(`✅ DVF+ API success: ${processedTransactions.length} REAL transactions found`);
      this.cache.set(cacheKey, processedTransactions);
      return processedTransactions;
    } catch (error) {
      console.warn('⚠️ DVF+ API call failed, no sales data available:', error);
      this.cache.set(cacheKey, []);
      return [];
    }
  }

  // ✅ REMOVED - NO DPE ESTIMATES ALLOWED
  // DPE data will only be shown if available from real government sources

  // ✅ REAL DATA ASSEMBLY - NO ESTIMATES
  static async getCompleteParcelData(lng: number, lat: number, cadastralFeature?: any) {
    try {
      console.log(`🔍 Fetching REAL parcel data for: ${lng}, ${lat}`);
      
      const [parcelResult, transactionsResult] = await Promise.allSettled([
        this.getParcelByCoordinates(lng, lat),
        this.getDVFTransactions(lng, lat)
      ]);

      if (parcelResult.status === 'rejected') {
        throw new Error(`Failed to get commune data: ${parcelResult.reason}`);
      }

      const safeTransactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value : [];
      const latestSale = Array.isArray(safeTransactions) && safeTransactions.length > 0 ? safeTransactions[0] : null;

      let parcelData = parcelResult.value;

      // ✅ MERGE REAL CADASTRAL DATA if available from map click
      if (cadastralFeature) {
        const realCadastralData = this.extractCadastralDataFromFeature(cadastralFeature);
        if (realCadastralData) {
          console.log('✅ REAL cadastral data extracted:', realCadastralData);
          
          parcelData = {
            ...parcelData,
            cadastral_id: realCadastralData.real_cadastral_id,
            surface_area: realCadastralData.surface_area, // ✅ REAL surface area only
            zone_type: realCadastralData.zone_type,
            section: realCadastralData.section,
            numero: realCadastralData.numero,
            prefixe: realCadastralData.prefixe,
            nature_culture: realCadastralData.nature_culture,
            data_source: 'real_cadastral'
          };
        } else {
          console.log('❌ No real cadastral data available for this parcel');
          // ✅ Don't return partial data - user must click on a real parcel
          return null;
        }
      } else {
        console.log('❌ No cadastral feature clicked - cannot provide parcel data');
        return null;
      }

      const result = {
        parcel: parcelData,
        transactions: safeTransactions,
        dpe: null, // ✅ NO DPE ESTIMATES
        latest_sale: latestSale
      };

      console.log('✅ REAL parcel data assembled successfully');
      return result;
    } catch (error) {
      console.error('❌ Failed to fetch real parcel data:', error);
      throw error;
    }
  }
}
