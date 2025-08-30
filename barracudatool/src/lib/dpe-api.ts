export interface DpeData {
    numero_dpe: string;
    date_reception_dpe: string;
    date_fin_validite_dpe: string;
    adresse_bien: string;
    code_postal_bien: string;
    commune_bien: string;
    
    // Energy performance - REAL VALUES ONLY
    etiquette_dpe: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
    classe_consommation_energie: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
    classe_estimation_ges: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
    
    // Consumption values - REAL MEASUREMENTS ONLY
    consommation_energie: number;
    estimation_ges: number;
    
    // Property details - VERIFIED DATA ONLY
    type_batiment: string;
    annee_construction: string;
    surface_habitable: number;
    surface_thermique: number;
    
    // Geographic coordinates - CORRECT FIELD NAMES
    'Coordonnée_cartographique_X_(BAN)'?: number;
    'Coordonnée_cartographique_Y_(BAN)'?: number;
    
    // Calculated distance (added during search)
    distance?: number;
  }
  
  export class DpeAPI {
    private static readonly BASE_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants';
    private static cache = new Map<string, any>();
  
    /**
     * CORRECTED: Get DPE data using proper field names and mapping
     */
    static async getDpeNearCoordinates(lng: number, lat: number, radiusKm: number = 1.0): Promise<DpeData[]> {
      console.log(`🏡 CORRECTED DPE Search: ${lat.toFixed(6)}, ${lng.toFixed(6)} within ${radiusKm * 1000}m`);
      
      const cacheKey = `dpe_corrected_${lng.toFixed(6)}_${lat.toFixed(6)}_${radiusKm}`;
      
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
  
      try {
        // Use the corrected field names from debug output
        console.log(`🔍 Using corrected field names: Coordonnée_cartographique_X_(BAN), Coordonnée_cartographique_Y_(BAN)`);
        
        const searchParams = new URLSearchParams({
          size: '500', // Get more records to filter through
          from: '0',
          select: 'N°DPE,Date_réception_DPE,Date_fin_validité_DPE,Adresse_(BAN),Code_postal_(BAN),Nom__commune_(BAN),Etiquette_DPE,Classe_consommation_énergie,Classe_estimation_GES,Conso_5_usages_par_m²_é_finale,Emission_GES_5_usages_par_m²,Type_bâtiment,Période_construction,Surface_habitable_logement,Coordonnée_cartographique_X_(BAN),Coordonnée_cartographique_Y_(BAN)'
        });
  
        console.log(`📡 Fetching DPE records with correct field selection...`);
        const response = await fetch(`${this.BASE_URL}/lines?${searchParams.toString()}`);
        
        if (!response.ok) {
          console.warn(`⚠️ DPE API returned ${response.status}`);
          this.cache.set(cacheKey, []);
          return [];
        }
  
        const data = await response.json();
        console.log(`📊 Retrieved ${data.total} total DPE records`);
        
        const results = data.results || [];
        console.log(`🔍 Processing ${results.length} records for coordinate filtering...`);
  
        // Filter records with coordinates and calculate distances
        const nearbyRecords = results.filter((dpe: any) => {
          // Check if record has the essential DPE data
          const hasValidDpe = dpe['Etiquette_DPE'] && 
                             dpe['Etiquette_DPE'] !== 'N.C.' && 
                             dpe['Conso_5_usages_par_m²_é_finale'] && 
                             dpe['Conso_5_usages_par_m²_é_finale'] > 0;
  
          if (!hasValidDpe) {
            return false;
          }
          
          // Check coordinates using correct field names
          const coordX = dpe['Coordonnée_cartographique_X_(BAN)'];
          const coordY = dpe['Coordonnée_cartographique_Y_(BAN)'];
          
          if (!coordX || !coordY) {
            return false;
          }
          
          // Calculate distance
          const distance = this.calculateDistance(lat, lng, coordY, coordX);
          
          // Add distance to record for sorting
          dpe.distance = distance;
          
          const isNearby = distance <= radiusKm;
          if (isNearby) {
            console.log(`✅ Found nearby DPE: ${dpe['Adresse_(BAN)']} in ${dpe['Nom__commune_(BAN)']} - ${distance.toFixed(2)}km away - Energy: ${dpe['Etiquette_DPE']}`);
          }
          
          return isNearby;
        });
  
        // Sort by distance (closest first)
        nearbyRecords.sort((a: any, b: any) => a.distance - b.distance);
  
        // Map to our interface format
        const mappedRecords: DpeData[] = nearbyRecords.map((dpe: any) => ({
          numero_dpe: dpe['N°DPE'] || '',
          date_reception_dpe: dpe['Date_réception_DPE'] || '',
          date_fin_validite_dpe: dpe['Date_fin_validité_DPE'] || '',
          adresse_bien: dpe['Adresse_(BAN)'] || dpe['Adresse_brute'] || '',
          code_postal_bien: dpe['Code_postal_(BAN)'] || '',
          commune_bien: dpe['Nom__commune_(BAN)'] || '',
          etiquette_dpe: dpe['Etiquette_DPE'] as any,
          classe_consommation_energie: dpe['Classe_consommation_énergie'] as any,
          classe_estimation_ges: dpe['Classe_estimation_GES'] as any,
          consommation_energie: dpe['Conso_5_usages_par_m²_é_finale'] || 0,
          estimation_ges: dpe['Emission_GES_5_usages_par_m²'] || 0,
          type_batiment: dpe['Type_bâtiment'] || '',
          annee_construction: dpe['Période_construction'] || '',
          surface_habitable: dpe['Surface_habitable_logement'] || 0,
          surface_thermique: dpe['Surface_habitable_logement'] || 0,
          'Coordonnée_cartographique_X_(BAN)': dpe['Coordonnée_cartographique_X_(BAN)'],
          'Coordonnée_cartographique_Y_(BAN)': dpe['Coordonnée_cartographique_Y_(BAN)'],
          distance: dpe.distance
        }));
  
        console.log(`🎯 FOUND ${mappedRecords.length} DPE certificates within ${radiusKm * 1000}m using CORRECTED field names`);
        
        this.cache.set(cacheKey, mappedRecords);
        return mappedRecords;
        
      } catch (error) {
        console.error('❌ Failed to fetch DPE data:', error);
        this.cache.set(cacheKey, []);
        return [];
      }
    }
  
    /**
     * Test which records actually have coordinates
     */
    static async testCoordinateFields(): Promise<any> {
      try {
        console.log(`🧪 Testing which records have coordinate data...`);
        
        const searchParams = new URLSearchParams({
          size: '100',
          select: 'Adresse_(BAN),Nom__commune_(BAN),Coordonnée_cartographique_X_(BAN),Coordonnée_cartographique_Y_(BAN),Etiquette_DPE'
        });
  
        const response = await fetch(`${this.BASE_URL}/lines?${searchParams.toString()}`);
        const data = await response.json();
        
        const recordsWithCoords = data.results?.filter((r: any) => 
          r['Coordonnée_cartographique_X_(BAN)'] && r['Coordonnée_cartographique_Y_(BAN)']
        ) || [];
        
        console.log(`📍 Found ${recordsWithCoords.length} out of ${data.results?.length} records with coordinates`);
        
        if (recordsWithCoords.length > 0) {
          console.log(`✅ Sample records with coordinates:`, recordsWithCoords.slice(0, 3));
        }
        
        return {
          totalTested: data.results?.length || 0,
          withCoordinates: recordsWithCoords.length,
          samples: recordsWithCoords.slice(0, 5)
        };
      } catch (error) {
        console.error('❌ Coordinate field test failed:', error);
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  
    /**
     * Calculate distance between two points in kilometers
     */
    private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }
  
    // Keep your existing debugDpeSearch method for additional testing
    static async debugDpeSearch(lng: number, lat: number): Promise<any> {
      // ... your existing debug method stays the same
      const coordinateTest = await this.testCoordinateFields();
      return { coordinateTest };
    }
  }
  