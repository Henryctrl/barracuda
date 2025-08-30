const BASE_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines';

export class DPESearchService {
  /**
   * Search DPE by exact address - most reliable method
   * @param {string} address - Full address (e.g., "45 Rue des Amandiers, 75020 Paris")
   * @param {number} limit - Maximum results (default 10)
   * @returns {Promise<Object>} Real DPE data or empty results
   */
  static async searchByExactAddress(address, limit = 100) {
    try {
      const params = new URLSearchParams({
        q: address,
        size: limit,
        select: '*' // Get all fields
      });

      const response = await fetch(`${BASE_URL}?${params}`);
      
      // Handle different scenarios
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limiting - too many requests. Please wait.');
        } else if (response.status === 500) {
          throw new Error('Server error - API temporarily unavailable.');
        } else if (response.status === 404) {
          throw new Error('No DPE data found for this address.');
        } else {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      return {
        success: true,
        results: data.results || [],
        total: data.total || 0,
        searched_address: address,
        message: data.results?.length > 0 ? 
          `Found ${data.results.length} DPE record(s) for this address` : 
          'No DPE records found for this exact address'
      };
      
    } catch (error) {
      return {
        success: false,
        results: [],
        total: 0,
        searched_address: address,
        error: error.message
      };
    }
  }

  /**
   * Search DPE by coordinates with radius - for precise plot location
   * @param {number} lat - Latitude (e.g., 48.86471)
   * @param {number} lon - Longitude (e.g., 2.38953)
   * @param {number} radius - Search radius in meters (default 50m)
   * @returns {Promise<Object>} Real DPE data within radius
   */
  static async searchByCoordinates(lat, lon, radius = 50) {
    try {
      // Use geo-distance filter for precise location search
      const params = new URLSearchParams({
        size: 20,
        select: '*',
        geo_distance: `${radius}m`,
        geo_point: `${lat},${lon}`
      });

      const response = await fetch(`${BASE_URL}?${params}`);
      
      // Handle different scenarios
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limiting - too many requests. Please wait.');
        } else if (response.status === 500) {
          throw new Error('Server error - API temporarily unavailable.');
        } else {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      return {
        success: true,
        results: data.results || [],
        total: data.total || 0,
        searched_coordinates: { lat, lon, radius },
        message: data.results?.length > 0 ? 
          `Found ${data.results.length} DPE record(s) within ${radius}m` : 
          'No DPE records found at these coordinates'
      };
      
    } catch (error) {
      return {
        success: false,
        results: [],
        total: 0,
        searched_coordinates: { lat, lon, radius },
        error: error.message
      };
    }
  }

  /**
   * Search DPE by cadastral reference (using BAN identifier if available)
   * @param {string} cadastralRef - Cadastral reference or BAN ID
   * @returns {Promise<Object>} Real DPE data for specific plot
   */
  static async searchByCadastralRef(cadastralRef) {
    try {
      const params = new URLSearchParams({
        size: 10,
        select: '*',
        'Identifiant__BAN': cadastralRef
      });

      const response = await fetch(`${BASE_URL}?${params}`);
      
      // Handle different scenarios
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limiting - too many requests. Please wait.');
        } else if (response.status === 500) {
          throw new Error('Server error - API temporarily unavailable.');
        } else {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      return {
        success: true,
        results: data.results || [],
        total: data.total || 0,
        searched_cadastral: cadastralRef,
        message: data.results?.length > 0 ? 
          `Found ${data.results.length} DPE record(s) for this cadastral reference` : 
          'No DPE records found for this cadastral reference'
      };
      
    } catch (error) {
      return {
        success: false,
        results: [],
        total: 0,
        searched_cadastral: cadastralRef,
        error: error.message
      };
    }
  }

  /**
   * Multi-method search for maximum accuracy
   * @param {Object} searchParams - Search parameters
   * @param {string} searchParams.address - Full address
   * @param {number} searchParams.lat - Latitude
   * @param {number} searchParams.lon - Longitude
   * @param {string} searchParams.postalCode - Postal code
   * @param {string} searchParams.houseNumber - House number
   * @param {string} searchParams.street - Street name
   * @returns {Promise<Object>} Most relevant DPE data
   */
  static async preciseSearch(searchParams) {
    const { address, lat, lon, postalCode, houseNumber, street } = searchParams;
    
    try {
      let searchQuery = '';
      let filters = {};
      
      // Build precise search query
      if (address) {
        searchQuery = address;
      } else if (houseNumber && street && postalCode) {
        searchQuery = `${houseNumber} ${street}, ${postalCode}`;
      } else if (street && postalCode) {
        searchQuery = `${street}, ${postalCode}`;
      }
      
      // Add postal code filter for precision
      if (postalCode) {
        filters['Code_postal_(BAN)'] = postalCode;
      }
      
      // Add house number filter if available
      if (houseNumber) {
        filters['N°_voie_(BAN)'] = houseNumber;
      }
      
      const params = new URLSearchParams({
        q: searchQuery,
        size: 10,
        select: '*',
        ...filters
      });

      const response = await fetch(`${BASE_URL}?${params}`);
      
      // Handle different scenarios
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limiting - too many requests. Please wait.');
        } else if (response.status === 500) {
          throw new Error('Server error - API temporarily unavailable.');
        } else {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      // If coordinates provided, also try coordinate search
      if (lat && lon && data.results?.length === 0) {
        return this.searchByCoordinates(lat, lon, 100);
      }
      
      return {
        success: true,
        results: data.results || [],
        total: data.total || 0,
        search_method: 'precise_address',
        searched_params: searchParams,
        message: data.results?.length > 0 ? 
          `Found ${data.results.length} DPE record(s) matching your search` : 
          'No DPE records found matching these criteria'
      };
      
    } catch (error) {
      return {
        success: false,
        results: [],
        total: 0,
        search_method: 'precise_address',
        searched_params: searchParams,
        error: error.message
      };
    }
  }
}
