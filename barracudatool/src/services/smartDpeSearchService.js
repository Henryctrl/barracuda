const BASE_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines';

export class SmartDPESearchService {
  /**
   * Smart search that prioritizes exact matches and searches deeper
   * @param {string} address - Full address to search
   * @param {number} maxResults - Maximum results to fetch and filter (default 100)
   * @returns {Promise<Object>} Smart filtered results
   */
  static async smartAddressSearch(address, maxResults = 100) {
    try {
      // First, get a larger set of results to filter through
      const params = new URLSearchParams({
        q: address,
        size: Math.min(maxResults, 100), // API limit is usually 100
        select: '*'
      });

      const response = await fetch(`${BASE_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const allResults = data.results || [];
      
      // Parse the search address for smart matching
      const searchComponents = this.parseAddress(address);
      
      // Score and rank results by exactness
      const scoredResults = allResults.map(result => {
        const resultComponents = this.parseAddress(
          result['Adresse_(BAN)'] || result['Adresse_brute'] || ''
        );
        
        const exactnessScore = this.calculateExactnessScore(searchComponents, resultComponents, result);
        
        return {
          ...result,
          _exactness_score: exactnessScore.total,
          _exactness_details: exactnessScore.details,
          _original_api_score: result._score
        };
      });
      
      // Sort by exactness score (highest first), then by API score
      scoredResults.sort((a, b) => {
        if (a._exactness_score !== b._exactness_score) {
          return b._exactness_score - a._exactness_score;
        }
        return (b._original_api_score || 0) - (a._original_api_score || 0);
      });
      
      // Group results by exactness level
      const exactMatches = scoredResults.filter(r => r._exactness_score >= 90);
      const closeMatches = scoredResults.filter(r => r._exactness_score >= 70 && r._exactness_score < 90);
      const partialMatches = scoredResults.filter(r => r._exactness_score >= 40 && r._exactness_score < 70);
      const distantMatches = scoredResults.filter(r => r._exactness_score < 40);
      
      return {
        success: true,
        searched_address: address,
        total_api_results: allResults.length,
        total_available: data.total || 0,
        results: {
          exact_matches: exactMatches.slice(0, 10),
          close_matches: closeMatches.slice(0, 10),
          partial_matches: partialMatches.slice(0, 10),
          distant_matches: distantMatches.slice(0, 5)
        },
        search_components: searchComponents,
        message: exactMatches.length > 0 ? 
          `Found ${exactMatches.length} exact matches!` :
          `No exact matches found. Found ${closeMatches.length} close matches and ${partialMatches.length} partial matches.`
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        searched_address: address,
        results: {}
      };
    }
  }

  /**
   * Parse address into components for smart matching
   */
  static parseAddress(address) {
    if (!address) return {};
    
    const normalized = address.toLowerCase().trim();
    
    // Extract components using regex patterns
    const houseNumberMatch = normalized.match(/^(\d+[a-z]*)/);
    const postalCodeMatch = normalized.match(/(\d{5})/);
    const streetMatch = normalized.match(/\d+[a-z]*\s+(.+?)(?=,|\s+\d{5})/);
    const cityMatch = normalized.match(/\d{5}\s+(.+)$/);
    
    return {
      original: address,
      normalized: normalized,
      houseNumber: houseNumberMatch ? houseNumberMatch[1] : null,
      street: streetMatch ? streetMatch[1].trim() : null,
      postalCode: postalCodeMatch ? postalCodeMatch[1] : null,
      city: cityMatch ? cityMatch[1].trim() : null
    };
  }

  /**
   * Calculate how exactly an address matches the search
   */
  static calculateExactnessScore(searchComponents, resultComponents, result) {
    let score = 0;
    const details = {};
    
    // House number match (30 points)
    if (searchComponents.houseNumber && resultComponents.houseNumber) {
      if (searchComponents.houseNumber === resultComponents.houseNumber) {
        score += 30;
        details.houseNumber = 'exact';
      } else {
        details.houseNumber = 'different';
      }
    } else if (searchComponents.houseNumber && result['N°_voie_(BAN)']) {
      if (searchComponents.houseNumber === result['N°_voie_(BAN)'].toString()) {
        score += 30;
        details.houseNumber = 'exact_ban';
      }
    }
    
    // Street name match (40 points)
    if (searchComponents.street && resultComponents.street) {
      const searchStreet = this.normalizeStreetName(searchComponents.street);
      const resultStreet = this.normalizeStreetName(resultComponents.street);
      
      if (searchStreet === resultStreet) {
        score += 40;
        details.street = 'exact';
      } else if (this.similarStreetNames(searchStreet, resultStreet)) {
        score += 25;
        details.street = 'similar';
      } else {
        details.street = 'different';
      }
    }
    
    // Postal code match (20 points)
    if (searchComponents.postalCode && resultComponents.postalCode) {
      if (searchComponents.postalCode === resultComponents.postalCode) {
        score += 20;
        details.postalCode = 'exact';
      }
    } else if (searchComponents.postalCode && result['Code_postal_(BAN)']) {
      if (searchComponents.postalCode === result['Code_postal_(BAN)']) {
        score += 20;
        details.postalCode = 'exact_ban';
      }
    }
    
    // City match (10 points)
    if (searchComponents.city && resultComponents.city) {
      if (searchComponents.city === resultComponents.city) {
        score += 10;
        details.city = 'exact';
      }
    } else if (searchComponents.city && result['Nom__commune_(BAN)']) {
      if (searchComponents.city.toLowerCase() === result['Nom__commune_(BAN)'].toLowerCase()) {
        score += 10;
        details.city = 'exact_ban';
      }
    }
    
    return { total: score, details };
  }

  /**
   * Normalize street names for better matching
   */
  static normalizeStreetName(street) {
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
   * Check if two street names are similar
   */
  static similarStreetNames(street1, street2) {
    // Check if one contains the other
    return street1.includes(street2) || street2.includes(street1);
  }

  /**
   * Deep search - if no exact matches, search with broader terms
   */
  static async deepSearch(address, maxPages = 5) {
    const allResults = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore && page < maxPages) {
      try {
        const params = new URLSearchParams({
          q: address,
          size: 100,
          select: '*',
          from: page * 100
        });

        const response = await fetch(`${BASE_URL}?${params}`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          allResults.push(...data.results);
          hasMore = data.results.length === 100;
          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Deep search page ${page} failed:`, error);
        hasMore = false;
      }
    }
    
    return {
      success: true,
      total_searched: allResults.length,
      results: allResults,
      pages_searched: page
    };
  }
}
