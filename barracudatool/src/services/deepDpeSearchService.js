const BASE_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines';

export class DeepDPESearchService {
  /**
   * Deep search with pagination - fetches up to 500+ records
   * @param {string} address - Address to search
   * @param {number} maxResults - Maximum results to fetch (default 500)
   * @returns {Promise<Object>} Deep search results with smart ranking
   */
  static async deepSearch(address, maxResults = 500) {
    const pageSize = 100; // API max per request
    const maxPages = Math.ceil(maxResults / pageSize);
    let allResults = [];
    let totalAvailable = 0;

    try {
      for (let page = 0; page < maxPages; page++) {
        console.log(`Fetching page ${page + 1}/${maxPages}...`);
        
        const params = new URLSearchParams({
          q: address,
          size: pageSize,
          from: page * pageSize,
          select: '*'
        });

        const response = await fetch(`${BASE_URL}?${params}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (page === 0) {
          totalAvailable = data.total || 0;
        }
        
        if (!data.results || data.results.length === 0) {
          break;
        }

        allResults.push(...data.results);

        // Break if we got fewer results than requested (last page)
        if (data.results.length < pageSize) {
          break;
        }
      }

      // Smart sort: exact matches first, then by relevance
      const scoredResults = this.scoreAndSortResults(address, allResults);
      
      return {
        success: true,
        searched_address: address,
        total_fetched: allResults.length,
        total_available: totalAvailable,
        pages_searched: Math.min(maxPages, Math.ceil(allResults.length / pageSize)),
        results: scoredResults,
        message: `Fetched ${allResults.length} records from ${totalAvailable.toLocaleString()} total available`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        searched_address: address,
        total_fetched: 0,
        results: []
      };
    }
  }

  /**
   * Score and sort results by address exactness
   */
  static scoreAndSortResults(searchAddress, results) {
    const searchComponents = this.parseAddress(searchAddress);
    
    return results.map(result => {
      const score = this.calculateMatchScore(searchComponents, result);
      return {
        ...result,
        _match_score: score.total,
        _match_details: score.details,
        _original_api_score: result._score
      };
    }).sort((a, b) => {
      // Sort by match score first (highest first), then API score
      if (a._match_score !== b._match_score) {
        return b._match_score - a._match_score;
      }
      return (b._original_api_score || 0) - (a._original_api_score || 0);
    });
  }

  /**
   * Parse address into searchable components
   */
  static parseAddress(address) {
    const normalized = address.toLowerCase().trim();
    
    return {
      original: address,
      normalized: normalized,
      houseNumber: normalized.match(/^\d+[a-z]*/)?.[0],
      streetName: normalized.match(/^\d+[a-z]*\s+(.+?)(?=,|\s+\d{5})/)?.[1]?.trim(),
      postalCode: normalized.match(/\b\d{5}\b/)?.[0],
      city: normalized.match(/\d{5}\s+(.+)$/)?.[1]?.trim()
    };
  }

  /**
   * Calculate how well a DPE result matches the search
   */
  static calculateMatchScore(searchComponents, result) {
    let score = 0;
    const details = {};
    
    // Get address fields from result
    const resultAddress = result['Adresse_(BAN)'] || result['Adresse_brute'] || '';
    const resultComponents = this.parseAddress(resultAddress);
    
    // House number match (30 points)
    if (searchComponents.houseNumber && resultComponents.houseNumber) {
      if (searchComponents.houseNumber === resultComponents.houseNumber) {
        score += 30;
        details.houseNumber = 'exact';
      }
    } else if (searchComponents.houseNumber && result['N°_voie_(BAN)']) {
      if (searchComponents.houseNumber === result['N°_voie_(BAN)'].toString()) {
        score += 30;
        details.houseNumber = 'exact_ban';
      }
    }
    
    // Street name match (40 points)
    if (searchComponents.streetName && resultComponents.streetName) {
      const searchStreet = this.normalizeStreet(searchComponents.streetName);
      const resultStreet = this.normalizeStreet(resultComponents.streetName);
      
      if (searchStreet === resultStreet) {
        score += 40;
        details.street = 'exact';
      } else if (resultStreet.includes(searchStreet) || searchStreet.includes(resultStreet)) {
        score += 25;
        details.street = 'partial';
      }
    }
    
    // Postal code match (20 points)
    if (searchComponents.postalCode) {
      const resultPostal = result['Code_postal_(BAN)'] || resultComponents.postalCode;
      if (searchComponents.postalCode === resultPostal) {
        score += 20;
        details.postalCode = 'exact';
      }
    }
    
    // City match (10 points)
    if (searchComponents.city) {
      const resultCity = result['Nom__commune_(BAN)'] || resultComponents.city;
      if (resultCity && searchComponents.city.toLowerCase() === resultCity.toLowerCase()) {
        score += 10;
        details.city = 'exact';
      }
    }
    
    return { total: score, details };
  }

  /**
   * Normalize street names for better matching
   */
  static normalizeStreet(street) {
    return street
      .toLowerCase()
      .replace(/^(rue|avenue|av|boulevard|bd|route|chemin|impasse|place|pl)\s+/g, '')
      .replace(/\s+de\s+/g, ' ')
      .replace(/\s+des\s+/g, ' ')
      .replace(/\s+du\s+/g, ' ')
      .replace(/é/g, 'e')
      .replace(/è/g, 'e')
      .replace(/à/g, 'a')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Group results by match quality
   */
  static groupResultsByQuality(results) {
    return {
      exact_matches: results.filter(r => r._match_score >= 90),
      close_matches: results.filter(r => r._match_score >= 70 && r._match_score < 90),
      partial_matches: results.filter(r => r._match_score >= 40 && r._match_score < 70),
      distant_matches: results.filter(r => r._match_score < 40)
    };
  }
}
