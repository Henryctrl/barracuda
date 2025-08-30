export interface DpeData {
    numero_dpe: string;
    date_reception_dpe: string;
    adresse_bien: string;
    commune_bien: string;
    code_postal_bien: string;
    etiquette_dpe: string;
    consommation_energie: number;
    estimation_ges: number;
    surface_habitable: number;
    coordonnee_x?: number;
    coordonnee_y?: number;
    distance?: number;
  }
  
  export class DpeAPI {
    private static readonly BASE_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants';
    private static cache = new Map<string, any>();
  
    /**
     * WORKING: Search by address with correct query syntax
     */
    static async getDpeNearCoordinates(lng: number, lat: number, radiusKm: number = 2.0): Promise<DpeData[]> {
      console.log(`🎯 WORKING DPE Search: ${lat.toFixed(6)}, ${lng.toFixed(6)} within ${radiusKm * 1000}m`);
      
      try {
        // Step 1: Get exact address
        const addressResponse = await fetch(
          `https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}&limit=1`
        );
        
        if (!addressResponse.ok) {
          throw new Error('Failed to get address');
        }
        
        const addressData = await addressResponse.json();
        const feature = addressData.features?.[0];
        if (!feature) return [];
        
        const address = feature.properties;
        const fullAddress = `${address.housenumber || ''} ${address.street || ''}`.trim();
        const postalCode = address.postcode;
        const commune = address.city;
        
        console.log(`📍 Found address: "${fullAddress}", ${commune} (${postalCode})`);
        
        // Step 2: Search with correct exact match syntax
        const searchParams = new URLSearchParams({
          size: '50',
          from: '0',
          q: `Adresse_(BAN):"${fullAddress}" AND Code_postal_(BAN):"${postalCode}" AND Nom__commune_(BAN):"${commune}"`
        });
  
        console.log(`📡 Query: ${searchParams.get('q')}`);
        const response = await fetch(`${this.BASE_URL}/lines?${searchParams.toString()}`);
        
        if (!response.ok) return [];
        
        const data = await response.json();
        console.log(`📊 Found ${data.total} matching DPE records`);
        
        const results = data.results || [];
        
        // FIXED: Add explicit type to parameter
        const mappedRecords: DpeData[] = results.map((dpe: any) => ({
          numero_dpe: dpe['N°DPE'] || '',
          date_reception_dpe: dpe['Date_réception_DPE'] || '',
          adresse_bien: dpe['Adresse_(BAN)'] || '',
          commune_bien: dpe['Nom__commune_(BAN)'] || commune,
          code_postal_bien: dpe['Code_postal_(BAN)'] || postalCode,
          etiquette_dpe: dpe['Etiquette_DPE'] || '',
          consommation_energie: dpe['Conso_5_usages_par_m²_é_finale'] || 0,
          estimation_ges: dpe['Emission_GES_5_usages_par_m²'] || 0,
          surface_habitable: dpe['Surface_habitable_logement'] || 0,
          coordonnee_x: dpe['Coordonnée_cartographique_X_(BAN)'],
          coordonnee_y: dpe['Coordonnée_cartographique_Y_(BAN)'],
          distance: 0 // Exact match
        // FIXED: Add explicit type to parameter
        })).filter((dpe: any) => dpe.etiquette_dpe && dpe.etiquette_dpe !== 'N.C.' && dpe.consommation_energie > 0);
  
        console.log(`🎯 SUCCESS: Found ${mappedRecords.length} valid DPE certificates!`);
        return mappedRecords;
        
      } catch (error) {
        console.error('❌ Failed:', error);
        return [];
      }
    }
  
    /**
     * WORKING: Search by certificate number with correct syntax
     */
    static async getDpeByCertificateNumber(certificateNumber: string): Promise<DpeData | null> {
      console.log(`🎯 Certificate Search: ${certificateNumber}`);
      
      try {
        const searchParams = new URLSearchParams({
          size: '10',
          from: '0',
          q: `N°DPE:"${certificateNumber}"`
        });
  
        console.log(`📡 Query: ${searchParams.get('q')}`);
        const response = await fetch(`${this.BASE_URL}/lines?${searchParams.toString()}`);
        
        if (!response.ok) return null;
        
        const data = await response.json();
        console.log(`📊 Found ${data.total} matching certificates`);
        
        if (data.results && data.results.length > 0) {
          const dpe = data.results[0];
          console.log(`✅ Found certificate: ${dpe['Adresse_(BAN)']} - Energy: ${dpe['Etiquette_DPE']}`);
          
          return {
            numero_dpe: dpe['N°DPE'] || '',
            date_reception_dpe: dpe['Date_réception_DPE'] || '',
            adresse_bien: dpe['Adresse_(BAN)'] || '',
            commune_bien: dpe['Nom__commune_(BAN)'] || '',
            code_postal_bien: dpe['Code_postal_(BAN)'] || '',
            etiquette_dpe: dpe['Etiquette_DPE'] || '',
            consommation_energie: dpe['Conso_5_usages_par_m²_é_finale'] || 0,
            estimation_ges: dpe['Emission_GES_5_usages_par_m²'] || 0,
            surface_habitable: dpe['Surface_habitable_logement'] || 0,
            coordonnee_x: dpe['Coordonnée_cartographique_X_(BAN)'],
            coordonnee_y: dpe['Coordonnée_cartographique_Y_(BAN)']
          };
        }
  
        return null;
        
      } catch (error) {
        console.error('❌ Certificate search failed:', error);
        return null;
      }
    }
  
    /**
     * Test coordinate fields - FIXED
     */
    static async testCoordinateFields(): Promise<any> {
      try {
        console.log(`🧪 Testing coordinate fields with simplified approach...`);
        
        const searchParams = new URLSearchParams({
          size: '10'
        });
  
        const response = await fetch(`${this.BASE_URL}/lines?${searchParams.toString()}`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const fields = Object.keys(data.results[0]);
          const coordFields = fields.filter(f => 
            f.toLowerCase().includes('coord') || 
            f.toLowerCase().includes('longitude') || 
            f.toLowerCase().includes('latitude')
          );
          
          console.log(`📋 All available fields (${fields.length}):`, fields);
          console.log(`📍 Coordinate-related fields:`, coordFields);
          console.log(`📄 Sample record:`, data.results[0]);
          
          return {
            totalFields: fields.length,
            allFields: fields,
            coordinateFields: coordFields,
            sampleRecord: data.results[0]
          };
        }
        
        return { error: 'No results returned' };
      } catch (error) {
        console.error('❌ Coordinate field test failed:', error);
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  
    /**
     * Debug search - FIXED
     */
    static async debugDpeSearch(lng: number, lat: number): Promise<any> {
      try {
        console.log(`🔬 SIMPLIFIED DEBUG: Testing DPE API for ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        
        const coordinateTest = await this.testCoordinateFields();
        
        return { 
          coordinateTest,
          message: 'Simplified debug completed - check console for field names and sample data'
        };
      } catch (error) {
        console.error('❌ Debug test failed:', error);
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  }
  