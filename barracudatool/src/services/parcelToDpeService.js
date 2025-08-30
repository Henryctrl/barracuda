const CADASTRAL_API = 'https://apicarto.ign.fr/api/cadastre';
const DPE_API = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines';

export class ParcelToDPEService {
  
  /**
   * Get DPE data for a cadastral parcel ID
   * @param {string} parcelId - e.g., "24037000DM0316"
   */
  static async getDPEForParcel(parcelId) {
    console.log('🆔 Getting DPE data for parcel:', parcelId);
    
    try {
      // Step 1: Get parcel info and address
      const parcelInfo = await this.getParcelInfo(parcelId);
      console.log('📍 Parcel info:', parcelInfo);
      
      // Step 2: Search DPE records by the parcel's location
      const dpeRecords = await this.searchDPEByLocation(parcelInfo);
      console.log('⚡ Found DPE records:', dpeRecords.length);
      
      return {
        success: true,
        parcel_id: parcelId,
        parcel_info: parcelInfo,
        dpe_records: dpeRecords,
        message: `Found ${dpeRecords.length} DPE record(s) for parcel ${parcelId}`
      };
      
    } catch (error) {
      console.error('❌ Error:', error);
      return {
        success: false,
        parcel_id: parcelId,
        error: error.message
      };
    }
  }
  
  /**
   * Get parcel information from cadastral API
   */
  static async getParcelInfo(parcelId) {
    try {
      const response = await fetch(`${CADASTRAL_API}/parcelle?parcelle=${parcelId}`);
      
      if (!response.ok) {
        throw new Error(`Parcel not found: ${parcelId} (Status: ${response.status})`);
      }
      
      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error(`No parcel found with ID: ${parcelId}`);
      }
      
      const parcel = data.features[0];
      const props = parcel.properties;
      
      console.log('🔍 Raw parcel properties:', props);
      
      // Extract info from parcel ID if API doesn't provide it
      const departement = parcelId.substring(0, 2);
      const communeFromId = parcelId.substring(0, 5);
      
      // Use API data if available, otherwise extract from parcel ID
      const commune = props.commune || communeFromId;
      const section = props.section || parcelId.substring(5, 8);
      const numero = props.numero || parcelId.substring(8);
      
      // Try to get commune name
      let communeName = 'Unknown';
      try {
        if (commune && commune !== 'undefined') {
          const communeInfo = await this.getCommuneName(commune);
          communeName = communeInfo;
        }
      } catch (e) {
        console.warn('Could not get commune name:', e.message);
        // Try to get commune name from department + commune code
        try {
          const altCommuneInfo = await this.getCommuneNameByDeptAndCode(departement, communeFromId);
          communeName = altCommuneInfo;
        } catch (e2) {
          console.warn('Alternative commune lookup also failed:', e2.message);
        }
      }
      
      return {
        id: parcelId,
        commune: commune,
        commune_name: communeName,
        section: section,
        numero: numero,
        departement: departement,
        contenance: props.contenance, // Area in m²
        geometry: parcel.geometry
      };
      
    } catch (error) {
      throw new Error(`Failed to get parcel info: ${error.message}`);
    }
  }
  
  /**
   * Get commune name from INSEE code
   */
  static async getCommuneName(inseeCode) {
    try {
      if (!inseeCode || inseeCode === 'undefined') {
        throw new Error('Invalid INSEE code');
      }
      
      // Use French geographical API to get commune name
      const response = await fetch(`https://geo.api.gouv.fr/communes/${inseeCode}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.nom;
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Commune lookup failed: ${error.message}`);
    }
  }
  
  /**
   * Alternative commune name lookup using department and code
   */
  static async getCommuneNameByDeptAndCode(departement, communeCode) {
    try {
      // Search for communes in the department
      const response = await fetch(`https://geo.api.gouv.fr/departements/${departement}/communes`);
      
      if (response.ok) {
        const communes = await response.json();
        const matchingCommune = communes.find(c => c.code === communeCode);
        if (matchingCommune) {
          return matchingCommune.nom;
        }
      }
      
      throw new Error('Commune not found in department list');
    } catch (error) {
      throw new Error(`Department commune lookup failed: ${error.message}`);
    }
  }
  
  /**
   * Search DPE records by location info
   */
  static async searchDPEByLocation(parcelInfo) {
    try {
      // Build search terms - try multiple approaches
      const searchApproaches = [];
      
      // Approach 1: Use commune name if available
      if (parcelInfo.commune_name && parcelInfo.commune_name !== 'Unknown') {
        searchApproaches.push({
          terms: `${parcelInfo.commune_name} ${parcelInfo.departement}`,
          description: 'commune name + department'
        });
      }
      
      // Approach 2: Use department only
      searchApproaches.push({
        terms: parcelInfo.departement,
        description: 'department only'
      });
      
      // Approach 3: Use postal code pattern (department + 3 digits)
      searchApproaches.push({
        terms: `${parcelInfo.departement}*`,
        description: 'postal code pattern'
      });
      
      console.log('🔍 Will try these search approaches:', searchApproaches);
      
      let allResults = [];
      
      for (const approach of searchApproaches) {
        console.log(`🔍 Trying search: ${approach.description} - "${approach.terms}"`);
        
        const params = new URLSearchParams({
          q: approach.terms,
          size: 100, // Increased to get more results
          select: '*'
        });
        
        const response = await fetch(`${DPE_API}?${params}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`📊 ${approach.description} returned:`, data.total, 'total records,', data.results?.length, 'returned');
          
          if (data.results && data.results.length > 0) {
            allResults = allResults.concat(data.results);
          }
        } else {
          console.warn(`❌ ${approach.description} failed:`, response.status);
        }
      }
      
      // Remove duplicates by DPE ID
      const uniqueResults = allResults.filter((dpe, index, self) => 
        index === self.findIndex(d => d['N°DPE'] === dpe['N°DPE'])
      );
      
      console.log('📊 Total unique DPE records found:', uniqueResults.length);
      
      // Filter by department if we found results
      let filteredResults = uniqueResults;
      
      if (parcelInfo.departement && filteredResults.length > 0) {
        filteredResults = filteredResults.filter(dpe => 
          dpe['N°_département_(BAN)'] === parcelInfo.departement ||
          dpe['Code_postal_(BAN)']?.startsWith(parcelInfo.departement)
        );
        console.log('📊 After department filter:', filteredResults.length);
      }
      
      // If we have a commune name, try to filter by it
      if (parcelInfo.commune_name && parcelInfo.commune_name !== 'Unknown' && filteredResults.length > 0) {
        const communeFiltered = filteredResults.filter(dpe => 
          dpe['Nom__commune_(BAN)']?.toLowerCase().includes(parcelInfo.commune_name.toLowerCase()) ||
          dpe['Adresse_brute']?.toLowerCase().includes(parcelInfo.commune_name.toLowerCase()) ||
          dpe['Adresse_(BAN)']?.toLowerCase().includes(parcelInfo.commune_name.toLowerCase())
        );
        
        // Only use commune filtering if it doesn't eliminate all results
        if (communeFiltered.length > 0) {
          filteredResults = communeFiltered;
          console.log('📊 After commune filter:', filteredResults.length);
        } else {
          console.log('📊 Commune filter would eliminate all results, keeping department filter only');
        }
      }
      
      // Format DPE records
      return filteredResults.map(dpe => ({
        id: dpe['N°DPE'],
        address: dpe['Adresse_brute'] || dpe['Adresse_(BAN)'] || 'Address not available',
        energy_class: dpe['Etiquette_DPE'],
        ghg_class: dpe['Etiquette_GES'],
        surface: dpe['Surface_habitable_logement'],
        construction_year: dpe['Année_construction'],
        establishment_date: dpe['Date_établissement_DPE'],
        expiry_date: dpe['Date_fin_validité_DPE'],
        annual_cost: dpe['Coût_total_5_usages'],
        building_type: dpe['Type_bâtiment'],
        postal_code: dpe['Code_postal_(BAN)'],
        commune: dpe['Nom__commune_(BAN)'],
        is_live: this.isDPELive(dpe['Date_fin_validité_DPE'])
      })).slice(0, 20); // Limit to 20 results for display
      
    } catch (error) {
      console.error('DPE search error:', error);
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
}
