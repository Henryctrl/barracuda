const BASE_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines';

export class StructuredDPESearchService {
  /**
   * Hierarchical search with detailed logging
   */
  static async hierarchicalSearch(address) {
    console.log('🔍 Starting hierarchical search for:', address);
    
    const { houseNumber, street, postalCode, city, department } = this.parseAddress(address);
    
    console.log('📋 Parsed components:', {
      houseNumber,
      street, 
      postalCode,
      city,
      department
    });
    
    try {
      // Build filters step by step
      const filters = {};
      
      if (department) {
        filters['N°_département_(BAN)'] = department;
        console.log('✅ Added department filter:', department);
      }
      
      if (postalCode) {
        filters['Code_postal_(BAN)'] = postalCode;
        console.log('✅ Added postal code filter:', postalCode);
      }
      
      if (city) {
        filters['Nom__commune_(BAN)'] = city;
        console.log('✅ Added city filter:', city);
      }
      
      if (houseNumber) {
        filters['N°_voie_(BAN)'] = houseNumber;
        console.log('✅ Added house number filter:', houseNumber);
      }
      
      console.log('🎯 Final filters to apply:', filters);
      
      // Step 1: Apply location filters
      let results = await this.fetchWithFilters(filters);
      console.log(`📊 Step 1 - Location filters: ${results.length} records found`);
      
      if (results.length === 0) {
        console.log('❌ No results with strict filters. Trying relaxed filters...');
        
        // Try without house number
        const relaxedFilters = { ...filters };
        delete relaxedFilters['N°_voie_(BAN)'];
        console.log('🔄 Trying without house number:', relaxedFilters);
        
        results = await this.fetchWithFilters(relaxedFilters);
        console.log(`📊 Step 1b - Relaxed filters: ${results.length} records found`);
        
        if (results.length === 0 && city) {
          // Try without city (case sensitivity issue)
          const superRelaxedFilters = { ...relaxedFilters };
          delete superRelaxedFilters['Nom__commune_(BAN)'];
          console.log('🔄 Trying without city:', superRelaxedFilters);
          
          results = await this.fetchWithFilters(superRelaxedFilters);
          console.log(`📊 Step 1c - Super relaxed filters: ${results.length} records found`);
        }
      }
      
    //   // Step 2: Filter by street name
    //   if (street && results.length > 0) {
    //     const beforeStreet = results.length;
    //     results = this.filterByStreetName(results, street);
    //     console.log(`📊 Step 2 - Street filter "${street}": ${beforeStreet} → ${results.length} records`);
        
    //     // Log some street names for debugging
    //     if (results.length > 0) {
    //       console.log('🏠 Sample street names found:', 
    //         results.slice(0, 3).map(r => r['Nom__rue_(BAN)'] || r['Adresse_brute'])
    //       );
    //     }
    //   }
      
      // Step 3: Remove duplicates
      const beforeDedup = results.length;
      results = this.removeDuplicates(results);
      console.log(`📊 Step 3 - Deduplication: ${beforeDedup} → ${results.length} unique records`);
      
      if (beforeDedup > results.length) {
        console.log(`🗑️ Removed ${beforeDedup - results.length} duplicate DPE IDs`);
      }
      
      // Step 4: Rank by exactness
      results = this.rankByExactness(results, address);
      console.log('📊 Step 4 - Ranked by exactness');
      
      // Log top matches
      if (results.length > 0) {
        console.log('🏆 Top 3 matches by exactness:');
        results.slice(0, 3).forEach((r, i) => {
          console.log(`  ${i+1}. ${r._exactness_score}/100 - ${r['Adresse_brute']} (${r['N°DPE']})`);
        });
      }
      
      return {
        success: true,
        searched_address: address,
        filters_applied: filters,
        total_found: results.length,
        results: results,
        message: results.length > 0 ? 
          `Found ${results.length} unique DPE record(s) using structured search` :
          'No DPE records found with structured filtering'
      };
      
    } catch (error) {
      console.error('❌ Hierarchical search error:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Fetch with detailed logging
   */
  static async fetchWithFilters(filters, maxResults = 200) {
    const params = new URLSearchParams({
      size: maxResults,
      select: '*'
    });
    
    // Add filters to URL
    Object.entries(filters).forEach(([field, value]) => {
      params.append(field, value);
    });
    
    const url = `${BASE_URL}?${params}`;
    console.log('🌐 API Request URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('❌ API Response Error:', response.status, response.statusText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📨 API Response:', {
      total: data.total,
      returned: data.results?.length || 0
    });
    
    return data.results || [];
  }

  /**
   * Enhanced fallback with logging
   */
  static async fallbackSearch(address) {
    console.log('🔄 Starting fallback search for:', address);
    
    try {
      const params = new URLSearchParams({
        q: address,
        size: 50,
        select: '*'
      });

      const url = `${BASE_URL}?${params}`;
      console.log('🌐 Fallback API URL:', url);

      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📨 Fallback API Response:', {
        total: data.total,
        returned: data.results?.length || 0
      });
      
      const deduped = this.removeDuplicates(data.results || []);
      const ranked = this.rankByExactness(deduped, address);
      
      console.log('🏆 Fallback top matches:');
      ranked.slice(0, 3).forEach((r, i) => {
        console.log(`  ${i+1}. ${r._exactness_score}/100 - ${r['Adresse_brute']} (${r['N°DPE']})`);
      });
      
      return {
        success: true,
        results: ranked,
        total_found: ranked.length,
        message: `Fallback search found ${ranked.length} unique records`
      };
      
    } catch (error) {
      console.error('❌ Fallback search error:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  // Keep all other methods the same (parseAddress, filterByStreetName, etc.)
  static parseAddress(address) {
    const normalized = address.toLowerCase().trim();
    
    const postalMatch = normalized.match(/(\d{5})/);
    const postalCode = postalMatch ? postalMatch[1] : null;
    const department = postalCode ? postalCode.substring(0, 2) : null;
    
    const houseNumberMatch = normalized.match(/^(\d+[a-z]*)/);
    const cityMatch = normalized.match(/\d{5}\s+(.+)$/);
    
    let street = null;
    if (houseNumberMatch && postalCode) {
      const streetMatch = normalized.match(/^\d+[a-z]*\s+(.+?)(?=,|\s+\d{5})/);
      street = streetMatch ? streetMatch[1].trim() : null;
    }
    
    return {
      original: address,
      houseNumber: houseNumberMatch ? houseNumberMatch[1] : null,
      street: street,
      postalCode: postalCode,
      city: cityMatch ? cityMatch[1].trim() : null,
      department: department
    };
  }

  static filterByStreetName(results, searchStreet) {
    const normalizedSearch = this.normalizeStreetName(searchStreet);
    console.log('🔍 Filtering by normalized street name:', normalizedSearch);
    
    return results.filter(result => {
      const addresses = [
        result['Adresse_brute'],
        result['Adresse_(BAN)'],
        result['Nom__rue_(BAN)']
      ].filter(Boolean);
      
      const matches = addresses.some(addr => {
        const normalizedAddr = this.normalizeStreetName(addr);
        return normalizedAddr.includes(normalizedSearch) || 
               normalizedSearch.includes(normalizedAddr);
      });
      
      if (matches) {
        console.log(`✅ Street match: "${searchStreet}" found in "${addresses[0]}"`);
      }
      
      return matches;
    });
  }

  static removeDuplicates(results) {
    const seen = new Set();
    const duplicates = [];
    
    const unique = results.filter(result => {
      const key = result['N°DPE'];
      if (seen.has(key)) {
        duplicates.push(key);
        return false;
      }
      seen.add(key);
      return true;
    });
    
    if (duplicates.length > 0) {
      console.log('🗑️ Removed duplicate DPE IDs:', [...new Set(duplicates)]);
    }
    
    return unique;
  }

  static normalizeStreetName(street) {
    if (!street) return '';
    
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
      .replace(/ê/g, 'e')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static rankByExactness(results, searchAddress) {
    const searchComponents = this.parseAddress(searchAddress);
    
    return results.map(result => {
      let exactnessScore = 0;
      const details = {};
      
      // House number match (40 points)
      if (searchComponents.houseNumber && result['N°_voie_(BAN)']) {
        if (searchComponents.houseNumber === result['N°_voie_(BAN)'].toString()) {
          exactnessScore += 40;
          details.houseNumber = 'exact';
        }
      }
      
      // Street name match (30 points) 
      if (searchComponents.street) {
        const searchStreet = this.normalizeStreetName(searchComponents.street);
        const resultStreets = [
          result['Adresse_brute'],
          result['Adresse_(BAN)'],
          result['Nom__rue_(BAN)']
        ].map(s => this.normalizeStreetName(s)).filter(Boolean);
        
        const hasExactMatch = resultStreets.some(s => s === searchStreet);
        const hasPartialMatch = resultStreets.some(s => s.includes(searchStreet) || searchStreet.includes(s));
        
        if (hasExactMatch) {
          exactnessScore += 30;
          details.street = 'exact';
        } else if (hasPartialMatch) {
          exactnessScore += 15;
          details.street = 'partial';
        }
      }
      
      // Postal code match (20 points)
      if (searchComponents.postalCode === result['Code_postal_(BAN)']) {
        exactnessScore += 20;
        details.postalCode = 'exact';
      }
      
      // City match (10 points)
      if (searchComponents.city && result['Nom__commune_(BAN)']) {
        if (searchComponents.city.toLowerCase() === result['Nom__commune_(BAN)'].toLowerCase()) {
          exactnessScore += 10;
          details.city = 'exact';
        }
      }
      
      return {
        ...result,
        _exactness_score: exactnessScore,
        _exactness_details: details
      };
    }).sort((a, b) => b._exactness_score - a._exactness_score);
  }
}
