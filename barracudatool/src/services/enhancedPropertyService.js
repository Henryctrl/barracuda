const CADASTRAL_API = 'https://apicarto.ign.fr/api/cadastre';
// Corrected: Removed unused GEOPORTAIL_API constant

export class EnhancedPropertyService {
  
  static async getPropertyIntelligence(address) {
    console.log('🏠 Starting property intelligence search for:', address);
    
    try {
      const coordinates = await this.geocodeAddress(address);
      console.log('📍 Coordinates found:', coordinates);
      
      const parcelData = await this.getParcelAtCoordinates(coordinates.lat, coordinates.lon);
      console.log('🗺️ Parcel data:', parcelData);
      
      if (!parcelData.parcelId) {
        throw new Error('No cadastral parcel found at this location');
      }
      
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
  
  static async geocodeAddress(address) {
    try {
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
        parcelId: parcel.id,
        section: parcel.section,
        numero: parcel.numero,
        commune: parcel.commune,
        departement: parcel.departement,
        contenance: parcel.contenance,
        geometry: data.features[0].geometry
      };
      
    } catch (error) {
      throw new Error(`Parcel lookup failed: ${error.message}`);
    }
  }
  
  static async getDPEByParcel(parcelId, coordinates) {
    try {
      const { StructuredDPESearchService } = await import('./structuredDpeSearchService');
      
      const dpeResult = await StructuredDPESearchService.searchByCoordinates(
        coordinates.lat,
        coordinates.lon,
        100
      );
      
      if (!dpeResult.success) {
        return [];
      }
      
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
  
  static isDPELive(expirationDate) {
    if (!expirationDate) return false;
    
    const expiry = new Date(expirationDate);
    const now = new Date();
    
    return expiry > now;
  }
  
  static async getBuildingInfo(parcelData) {
    try {
      const params = new URLSearchParams({
        code_insee: parcelData.commune,
        section: parcelData.section,
        numero: parcelData.numero
      });
      
      const response = await fetch(`${CADASTRAL_API}/batiment?${params}`);
      
      if (!response.ok) {
        return [];
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
  
  // Corrected: Removed unused 'lat' and 'lon' parameters
  static async getPlanningInfo() {
    try {
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
  
  static calculatePolygonArea(geometry) {
    if (geometry.type !== 'Polygon') return null;
    
    const coords = geometry.coordinates[0];
    let area = 0;
    
    for (let i = 0; i < coords.length - 1; i++) {
      area += coords[i][0] * coords[i + 1][1];
      area -= coords[i + 1][0] * coords[i][1];
    }
    
    return Math.abs(area) / 2;
  }
}
