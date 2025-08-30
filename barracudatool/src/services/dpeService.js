const BASE_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines';

export class DPEService {
  /**
   * Fetch DPE data with optional filters
   * @param {Object} filters - Filter parameters
   * @param {string} filters.address - Address to search
   * @param {string} filters.energyClass - Energy class (A to G)
   * @param {string} filters.ghgClass - GHG class (A to G)
   * @param {number} filters.size - Number of results (default 20)
   * @returns {Promise<Object>} API response
   */
  static async fetchDPEData(filters = {}) {
    try {
      const params = new URLSearchParams({
        size: filters.size || 20,
        ...(filters.address && { q: filters.address }),
        ...(filters.energyClass && { 'Classe_energetique': filters.energyClass }),
        ...(filters.ghgClass && { 'Classe_GES': filters.ghgClass })
      });

      const response = await fetch(`${BASE_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        data: data.results || [],
        total: data.total || 0,
        error: null
      };
    } catch (error) {
      console.error('DPE API Error:', error);
      return {
        success: false,
        data: [],
        total: 0,
        error: error.message
      };
    }
  }

  /**
   * Search DPE data by address
   * @param {string} address - Address to search
   * @returns {Promise<Object>} API response
   */
  static async searchByAddress(address) {
    return this.fetchDPEData({ address, size: 10 });
  }

  /** 
   * Get DPE statistics by energy class
   * @param {string} energyClass - Energy class (A to G)
   * @returns {Promise<Object>} API response
   */
  static async getByEnergyClass(energyClass) {
    return this.fetchDPEData({ energyClass, size: 50 });
  }
}
