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
     * WORKING: Search by address - this is what working apps use
     */
    static async getDpeNearCoordinates(lng: number, lat: number, radiusKm: number = 2.0): Promise<DpeData[]> {
      console.log(`🎯 ADDRESS-BASED DPE Search: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      
      try {
        // Step 1: Get exact address from coordinates
        const addressResponse = await fetch(
          `https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}&limit=1`
        );
        
        if (!addressResponse.ok) {
          throw new Error('Failed to get address from coordinates');
        }
        
        const addressData = await addressResponse.json();
        const feature = addressData.features?.[0];
        if (!feature) {
          console.warn('❌ Could not determine address for coordinates');
          return [];
        }
        
        const address = feature.properties;
        const fullAddress = `${address.housenumber || ''} ${address.street || ''} ${address.name || ''}`.trim();
        const postalCode = address.postcode;
        const commune = address.city;
        
        console.log(`📍 Found address: "${fullAddress}", ${commune} (${postalCode})`);
        
        // Step 2: Try multiple search approaches
        const searchStrategies = [
          // Exact address match
          {
            name: 'Exact Address',
            query: `"${fullAddress}" AND Code_postal_(BAN):${postalCode}`
          },
          // Street name + postal code
          {
            name: 'Street + Postal',
            query: `${address.street || address.name} AND Code_postal_(BAN):${postalCode}`
          },
          // Just postal code with commune
          {
            name: 'Postal Code Area',
            query: `Code_postal_(BAN):${postalCode} AND Nom__commune_(BAN):${commune}`
          },
          // Broader postal code search
          {
            name: 'Postal Code Only',
            query: `Code_postal_(BAN):${postalCode}`
          }
        ];
  
        for (const strategy of searchStrategies) {
          console.log(`🔍 Trying ${strategy.name}: ${strategy.query}`);
          
          const searchParams = new URLSearchParams({
            size: '50',
            from: '0',
            q: strategy.query
          });
  
          const response = await fetch(`${this.BASE_URL}/lines?${searchParams.toString()}`);
          
          if (!response.ok) {
            console.warn(`⚠️ ${strategy.name} search failed: ${response.status}`);
            continue;
          }
  
          const data = await response.json();
          console.log(`📊 ${strategy.name} returned ${data.total} total records`);
          
          if (data.results && data.results.length > 0) {
            const validRecords = this.filterValidDPE(data.results, lng, lat, radiusKm, commune, postalCode);
            
            if (validRecords.length > 0) {
              console.log(`✅ SUCCESS with ${strategy.name}: Found ${validRecords.length} DPE certificates`);
              return validRecords;
            }
          }
        }
  
        console.log(`❌ No DPE certificates found with any search strategy`);
        return [];
        
      } catch (error) {
        console.error('❌ Failed to fetch DPE data:', error);
        return [];
      }
    }
  
    /**
     * Filter and validate DPE records
     */
    private static filterValidDPE(results: any[], lng: number, lat: number, radiusKm: number, commune: string, postalCode: string): DpeData[] {
      const validRecords = results.filter((dpe: any) => {
        // Must have energy class - try multiple field names
        const energyClass = dpe.Etiquette_DPE || dpe['Etiquette DPE'] || dpe.etiquette_dpe;
        if (!energyClass || energyClass === 'N.C.') {
          return false;
        }
  
        // Must have consumption data
        const consumption = dpe['Conso_5_usages_par_m²_é_finale'] || dpe.consommation_energie;
        if (!consumption || consumption <= 0) {
          return false;
        }
  
        return true;
      });
  
      console.log(`✅ Filtered to ${validRecords.length} valid DPE records with energy class`);
  
      // Calculate distances if coordinates exist
      const withDistances = validRecords.map((dpe: any) => {
        const coordX = dpe['Coordonnée_cartographique_X_(BAN)'];
        const coordY = dpe['Coordonnée_cartographique_Y_(BAN)'];
        
        if (coordX && coordY) {
          const distance = this.calculateSimpleDistance(lat, lng, coordY, coordX);
          dpe.distance = distance;
        } else {
          dpe.distance = 0; // Same postal code/commune = closest
        }
  
        return dpe;
      });
  
      // Sort by distance
      withDistances.sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
  
      // Map to interface
      return withDistances.map((dpe: any) => {
        const coordX = dpe['Coordonnée_cartographique_X_(BAN)'];
        const coordY = dpe['Coordonnée_cartographique_Y_(BAN)'];
        
        const result: DpeData = {
          numero_dpe: dpe['N°DPE'] || dpe.numero_dpe || '',
          date_reception_dpe: dpe['Date_réception_DPE'] || dpe.date_reception_dpe || '',
          adresse_bien: dpe['Adresse_(BAN)'] || dpe.adresse_bien || '',
          commune_bien: dpe['Nom__commune_(BAN)'] || dpe.commune_bien || commune,
          code_postal_bien: dpe['Code_postal_(BAN)'] || dpe.code_postal_bien || postalCode,
          etiquette_dpe: dpe['Etiquette_DPE'] || dpe.etiquette_dpe || '',
          consommation_energie: dpe['Conso_5_usages_par_m²_é_finale'] || dpe.consommation_energie || 0,
          estimation_ges: dpe['Emission_GES_5_usages_par_m²'] || dpe.estimation_ges || 0,
          surface_habitable: dpe['Surface_habitable_logement'] || dpe.surface_habitable || 0,
          coordonnee_x: coordX,
          coordonnee_y: coordY,
          distance: dpe.distance
        };
  
        console.log(`📋 Mapped DPE: ${result.adresse_bien} - Energy: ${result.etiquette_dpe} - Distance: ${result.distance?.toFixed(2)}km`);
        return result;
      });
    }
  
    /**
     * Search by specific certificate number (for known certificates)
     */
    static async getDpeByCertificateNumber(certificateNumber: string): Promise<DpeData | null> {
      console.log(`🎯 Certificate Search: ${certificateNumber}`);
      
      try {
        const searchParams = new URLSearchParams({
          size: '10',
          q: `N°DPE:"${certificateNumber}"`
        });
  
        const response = await fetch(`${this.BASE_URL}/lines?${searchParams.toString()}`);
        
        if (!response.ok) {
          console.warn(`⚠️ Certificate search failed: ${response.status}`);
          return null;
        }
  
        const data = await response.json();
        console.log(`📊 Certificate search returned ${data.total} records`);
        
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
     * Simple distance calculation
     */
    private static calculateSimpleDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }
  
    // Keep existing debug methods unchanged...
    static async testCoordinateFields(): Promise<any> {
      try {
        const searchParams = new URLSearchParams({ size: '10' });
        const response = await fetch(`${this.BASE_URL}/lines?${searchParams.toString()}`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const fields = Object.keys(data.results[0]);
          return {
            totalFields: fields.length,
            allFields: fields,
            sampleRecord: data.results[0]
          };
        }
        return { error: 'No results returned' };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  
    static async debugDpeSearch(lng: number, lat: number): Promise<any> {
      const coordinateTest = await this.testCoordinateFields();
      return { 
        coordinateTest,
        message: 'Debug completed - check console for detailed logs'
      };
    }
  }
  