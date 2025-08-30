const CADASTRAL_API = 'https://apicarto.ign.fr/api/cadastre';

export class CadastralDirectService {
  
  /**
   * Get complete property data by cadastral ID
   * @param {string} cadastralId - e.g., "24037000DM0316"
   */
  static async getPropertyByID(cadastralId) {
    console.log('🆔 Looking up cadastral ID:', cadastralId);
    
    try {
      // Get parcel details
      const parcelData = await this.getParcelDetails(cadastralId);
      
      // Get DPE records for this parcel
      const dpeRecords = await this.getDPEForParcel(cadastralId, parcelData.coordinates);
      
      // Get building information
      const buildings = await this.getBuildingsForParcel(cadastralId);
      
      return {
        success: true,
        parcel_id: cadastralId,
        properties: {
          id: cadastralId,
          center: {
            type: "Point",
            coordinates: parcelData.coordinates
          },
          fieldArea: parcelData.contenance,
          commune: parcelData.commune,
          section: parcelData.section,
          numero: parcelData.numero,
          departement: parcelData.departement
        },
        dpe_list: dpeRecords,
        buildings: buildings,
        message: `Found property data for cadastral ID ${cadastralId}`
      };
      
    } catch (error) {
      console.error('❌ Cadastral lookup error:', error);
      return {
        success: false,
        error: error.message,
        parcel_id: cadastralId
      };
    }
  }
  
  /**
   * Get parcel details from cadastral ID
   */
  static async getParcelDetails(cadastralId) {
    try {
      const response = await fetch(`${CADASTRAL_API}/parcelle?parcelle=${cadastralId}`);
      
      if (!response.ok) {
        throw new Error(`Cadastral API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error(`No parcel found with ID ${cadastralId}`);
      }
      
      const parcel = data.features[0];
      const props = parcel.properties;
      
      // Extract center coordinates from geometry
      const geometry = parcel.geometry;
      let center = [0, 0];
      
      if (geometry.type === 'Polygon') {
        // Calculate centroid of polygon
        const coords = geometry.coordinates[0];
        let x = 0, y = 0;
        for (let i = 0; i < coords.length - 1; i++) {
          x += coords[i][0];
          y += coords[i][1];
        }
        center = [x / (coords.length - 1), y / (coords.length - 1)];
      }
      
      return {
        id: props.id,
        commune: props.commune,
        section: props.section,
        numero: props.numero,
        departement: props.departement,
        contenance: props.contenance,
        coordinates: center,
        geometry: geometry
      };
      
    } catch (error) {
      throw new Error(`Failed to get parcel details: ${error.message}`);
    }
  }
  
  /**
   * Get DPE records near the parcel
   */
  static async getDPEForParcel(cadastralId, coordinates) {
    try {
      // Import your existing DPE service
      const { StructuredDPESearchService } = await import('./structuredDpeSearchService');
      
      const [lon, lat] = coordinates;
      
      // Search DPE records near the parcel center
      const dpeResult = await StructuredDPESearchService.searchByCoordinates(lat, lon, 100);
      
      if (!dpeResult.success) {
        return [];
      }
      
      // Format DPE records to match cadastre.com structure
      return dpeResult.results.map(dpe => ({
        id: dpe['N°DPE'],
        is_live: this.isDPELive(dpe['Date_fin_validité_DPE']),
        parcelleId: cadastralId,
        latitude: lat,
        longitude: lon,
        energy_class: dpe['Etiquette_DPE'],
        ghg_class: dpe['Etiquette_GES'],
        address: dpe['Adresse_brute'] || dpe['Adresse_(BAN)'],
        surface: dpe['Surface_habitable_logement'],
        construction_year: dpe['Année_construction'],
        establishment_date: dpe['Date_établissement_DPE'],
        expiry_date: dpe['Date_fin_validité_DPE'],
        annual_cost: dpe['Coût_total_5_usages'],
        building_type: dpe['Type_bâtiment']
      }));
      
    } catch (error) {
      console.error('DPE lookup error:', error);
      return [];
    }
  }
  
  /**
   * Get building footprints for the parcel
   */
  static async getBuildingsForParcel(cadastralId) {
    try {
      // Extract components from cadastral ID for building lookup
      const response = await fetch(`${CADASTRAL_API}/batiment?parcelle=${cadastralId}`);
      
      if (!response.ok) {
        return []; // No building data available
      }
      
      const data = await response.json();
      
      return data.features?.map((building, index) => ({
        id: `building_${index}`,
        geometry: building.geometry,
        properties: building.properties,
        area: this.calculateBuildingArea(building.geometry)
      })) || [];
      
    } catch (error) {
      console.error('Building lookup error:', error);
      return [];
    }
  }
  
  /**
   * Check if DPE is still valid
   */
  static isDPELive(expirationDate) {
    if (!expirationDate) return false;
    const expiry = new Date(expirationDate);
    const now = new Date();
    return expiry > now;
  }
  
  /**
   * Calculate building area from geometry
   */
  static calculateBuildingArea(geometry) {
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
