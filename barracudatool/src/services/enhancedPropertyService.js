const CADASTRAL_API = 'https://apicarto.ign.fr/api/cadastre';
const GEOPORTAIL_API = 'https://wxs.ign.fr/choisirgeoportail/geoportail/ols/apis/completion';

export class EnhancedPropertyService {
  
  /**
   * MAIN FUNCTION: Address → Complete Property Intelligence
   */
  static async getPropertyIntelligence(address) {
    console.log('🏠 Starting property intelligence search for:', address);
    
    try {
      // Step 1: Address → Coordinates
      const coordinates = await this.geocodeAddress(address);
      console.log('📍 Coordinates found:', coordinates);
      
      // Step 2: Coordinates → Cadastral Parcel ID
      const parcelData = await this.getParcelAtCoordinates(coordinates.lat, coordinates.lon);
      console.log('🗺️ Parcel data:', parcelData);
      
      if (!parcelData.parcelId) {
        throw new Error('No cadastral parcel found at this location');
      }
      
      // Step 3: Get complete property data
      const [dpeRecords, buildingInfo, planningZone] = await Promise.all([
        this.getDPEByParcel(parcelData.parcelId, coordinates),
        this.getBuildingInfo(parcelData),
        this.getPlanningInfo(coordinates.lat, coordinates.lon)
      ]);
      
      return {
        success: true,
        searched_address: address,
        parcel_id: parcelData.parcelId,
        coordinates: coordinates,
        properties: {
          id: parcelData.parcelId,
          center: {
            type: "Point",
            coordinates: [coordinates.lon, coordinates.lat]
          },
          fieldArea: parcelData.contenance || null,
          section: parcelData.section,
          numero: parcelData.numero,
          commune: parcelData.commune,
          departement: parcelData.departement
        },
        dpe_list: dpeRecords,
        buildings: buildingInfo,
        plu: planningZone,
        message: `Found complete property intelligence for parcel ${parcelData.parcelId}`
      };
      
    } catch (error) {
      console.error('❌ Property intelligence error:', error);
      
      return {
        success: false,
        error: error.message,
        searched_address: address
      };
    }
  }
  
  /**
   * Convert address to coordinates using French geocoding
   */
  static async geocodeAddress(address) {
    try {
      // Use French national address API (BAN)
      const params = new URLSearchParams({
        q: address,
        type: 'housenumber',
        autocomplete: 0,
        limit: 1
      });
      
      const response = await fetch(`https://api-adresse.data.gouv.fr/search/?${params}`);
      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error('Address not found in French address database');
      }
      
      const feature = data.features[0];
      const [lon, lat] = feature.geometry.coordinates;
      
      return {
        lat: lat,
        lon: lon,
        score: feature.properties.score,
        label: feature.properties.label,
        postcode: feature.properties.postcode,
        city: feature.properties.city
      };
      
    } catch (error) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }
  
  /**
   * Get cadastral parcel at specific coordinates
   */
  static async getParcelAtCoordinates(lat, lon) {
    try {
      const params = new URLSearchParams({
        geom: `{"type":"Point","coordinates":[${lon},${lat}]}`,
        _limit: 1
      });
      
      const response = await fetch(`${CADASTRAL_API}/parcelle?${params}`);
      
      if (!response.ok) {
        throw new Error(`Cadastral API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error('No cadastral parcel found at these coordinates');
      }
      
      const parcel = data.features[0].properties;
      
      return {
        parcelId: parcel.id,  // e.g., "24037000DM0316"
        section: parcel.section,
        numero: parcel.numero,
        commune: parcel.commune,
        departement: parcel.departement,
        contenance: parcel.contenance, // Area in m²
        geometry: data.features[0].geometry
      };
      
    } catch (error) {
      throw new Error(`Parcel lookup failed: ${error.message}`);
    }
  }
  
  /**
   * Get DPE records linked to cadastral parcel
   */
  static async getDPEByParcel(parcelId, coordinates) {
    try {
      // Import your existing DPE service
      const { StructuredDPESearchService } = await import('./structuredDpeSearchService');
      
      // Search DPE records near the parcel coordinates
      const dpeResult = await StructuredDPESearchService.searchByCoordinates(
        coordinates.lat,
        coordinates.lon,
        100 // 100m radius to catch nearby properties
      );
      
      if (!dpeResult.success) {
        return [];
      }
      
      // Enhance DPE records with parcel information
      return dpeResult.results.map(dpe => ({
        id: dpe['N°DPE'],
        is_live: this.isDPELive(dpe['Date_fin_validité_DPE']),
        parcelleId: parcelId,
        latitude: coordinates.lat,
        longitude: coordinates.lon,
        energy_class: dpe['Etiquette_DPE'],
        ghg_class: dpe['Etiquette_GES'],
        address: dpe['Adresse_brute'] || dpe['Adresse_(BAN)'],
        surface: dpe['Surface_habitable_logement'],
        construction_year: dpe['Année_construction'],
        establishment_date: dpe['Date_établissement_DPE'],
        annual_cost: dpe['Coût_total_5_usages']
      }));
      
    } catch (error) {
      console.error('DPE lookup error:', error);
      return [];
    }
  }
  
  /**
   * Check if DPE certificate is still valid
   */
  static isDPELive(expirationDate) {
    if (!expirationDate) return false;
    
    const expiry = new Date(expirationDate);
    const now = new Date();
    
    return expiry > now;
  }
  
  /**
   * Get building information from cadastral data
   */
  static async getBuildingInfo(parcelData) {
    try {
      // Get building footprints from cadastral API
      const params = new URLSearchParams({
        code_insee: parcelData.commune,
        section: parcelData.section,
        numero: parcelData.numero
      });
      
      const response = await fetch(`${CADASTRAL_API}/batiment?${params}`);
      
      if (!response.ok) {
        return []; // No building data available
      }
      
      const data = await response.json();
      
      return data.features?.map(building => ({
        geometry: building.geometry,
        properties: building.properties,
        area: this.calculatePolygonArea(building.geometry)
      })) || [];
      
    } catch (error) {
      console.error('Building info error:', error);
      return [];
    }
  }
  
  /**
   * Get urban planning zone (PLU) information
   */
  static async getPlanningInfo(lat, lon) {
    try {
      // Note: This would need a PLU/POS API - placeholder for now
      return {
        name: "Zone information not available",
        description: "Urban planning data requires additional API access",
        file: null
      };
      
    } catch (error) {
      console.error('Planning info error:', error);
      return null;
    }
  }
  
  /**
   * Helper: Calculate polygon area (rough estimate)
   */
  static calculatePolygonArea(geometry) {
    if (geometry.type !== 'Polygon') return null;
    
    // Simplified area calculation - for demo purposes
    const coords = geometry.coordinates[0];
    let area = 0;
    
    for (let i = 0; i < coords.length - 1; i++) {
      area += coords[i][0] * coords[i + 1][1];
      area -= coords[i + 1][0] * coords[i][1];
    }
    
    return Math.abs(area) / 2;
  }
}
