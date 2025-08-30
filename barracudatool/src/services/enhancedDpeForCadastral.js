const DPE_API = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines';

export class EnhancedDPEForCadastral {
  
  /**
   * Get exact DPE match for cadastral property info
   * @param {Object} propertyInfo - Your existing property data structure
   */
  static async getExactDPEForProperty(propertyInfo) {
    console.log('🎯 Getting EXACT DPE for property:', propertyInfo.cadastralId);
    
    try {
      // Build multiple search strategies for exactness
      const searchStrategies = [];
      
      // Strategy 1: Use exact commune + department
      if (propertyInfo.commune && propertyInfo.department) {
        searchStrategies.push({
          terms: `${propertyInfo.commune} ${propertyInfo.department}`,
          type: 'commune_dept',
          priority: 1
        });
      }
      
      // Strategy 2: Use postal code pattern (dept + commune)
      if (propertyInfo.department) {
        const postalPattern = `${propertyInfo.department}*`;
        searchStrategies.push({
          terms: postalPattern,
          type: 'postal_pattern', 
          priority: 2
        });
      }
      
      console.log(`🔍 Will try ${searchStrategies.length} search strategies`);
      
      let allCandidates = [];
      
      // Execute search strategies
      for (const strategy of searchStrategies) {
        const candidates = await this.searchDPEByStrategy(strategy);
        allCandidates = allCandidates.concat(candidates);
        console.log(`📊 Strategy "${strategy.type}" returned ${candidates.length} candidates`);
      }
      
      // Remove duplicates by DPE ID
      const uniqueCandidates = this.removeDuplicates(allCandidates);
      console.log(`📊 Total unique candidates: ${uniqueCandidates.length}`);
      
      // Apply strict filtering for exact match
      const exactMatch = this.findExactMatch(uniqueCandidates, propertyInfo);
      
      if (exactMatch) {
        console.log(`✅ EXACT MATCH FOUND: ${exactMatch.id}`);
        return {
          success: true,
          hasExactMatch: true,
          dpeRating: this.formatDPEForYourSystem(exactMatch),
          nearbyDpeCount: uniqueCandidates.length - 1,
          searchedWith: propertyInfo.cadastralId
        };
      } else {
        console.log(`❌ No exact match found. ${uniqueCandidates.length} nearby candidates`);
        return {
          success: true,
          hasExactMatch: false,
          dpeRating: null,
          nearbyDpeCount: uniqueCandidates.length,
          searchedWith: propertyInfo.cadastralId
        };
      }
      
    } catch (error) {
      console.error('❌ DPE search failed:', error);
      return {
        success: false,
        hasExactMatch: false,
        dpeRating: null,
        error: error.message
      };
    }
  }
  
  /**
   * Search DPE by specific strategy
   */
  static async searchDPEByStrategy(strategy) {
    const params = new URLSearchParams({
      q: strategy.terms,
      size: 50,
      select: '*'
    });
    
    const response = await fetch(`${DPE_API}?${params}`);
    
    if (!response.ok) {
      throw new Error(`DPE API error for ${strategy.type}: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
  }
  
  /**
   * Remove duplicate DPE records by ID
   */
  static removeDuplicates(dpeRecords) {
    const seen = new Set();
    return dpeRecords.filter(dpe => {
      const id = dpe['N°DPE'];
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  
  /**
   * Find exact match using multiple criteria
   */
  static findExactMatch(candidates, propertyInfo) {
    console.log(`🎯 Looking for exact match among ${candidates.length} candidates`);
    
    // Score each candidate for exactness
    const scoredCandidates = candidates.map(dpe => {
      let score = 0;
      const details = {};
      
      // Department match (essential - 40 points)
      if (propertyInfo.department && dpe['N°_département_(BAN)'] === propertyInfo.department) {
        score += 40;
        details.department = 'exact';
      }
      
      // Commune match (high priority - 30 points)
      if (propertyInfo.commune && dpe['Nom__commune_(BAN)']) {
        const dpeCommune = dpe['Nom__commune_(BAN)'].toLowerCase();
        const searchCommune = propertyInfo.commune.toLowerCase();
        
        if (dpeCommune === searchCommune) {
          score += 30;
          details.commune = 'exact';
        } else if (dpeCommune.includes(searchCommune) || searchCommune.includes(dpeCommune)) {
          score += 15;
          details.commune = 'partial';
        }
      }
      
      // Address proximity (20 points) - check if addresses mention similar locations
      if (propertyInfo.section || propertyInfo.numero) {
        const dpeAddress = (dpe['Adresse_brute'] || dpe['Adresse_(BAN)'] || '').toLowerCase();
        
        // Look for section/numero patterns in address
        if (propertyInfo.section && dpeAddress.includes(propertyInfo.section.toLowerCase())) {
          score += 10;
          details.address = 'section_match';
        }
        if (propertyInfo.numero && dpeAddress.includes(propertyInfo.numero)) {
          score += 10;
          details.address = 'numero_match';
        }
      }
      
      // Recent DPE (10 points for newer certificates)
      if (dpe['Date_établissement_DPE']) {
        const dpeDate = new Date(dpe['Date_établissement_DPE']);
        const now = new Date();
        const ageInYears = (now - dpeDate) / (1000 * 60 * 60 * 24 * 365);
        
        if (ageInYears < 2) score += 10;
        else if (ageInYears < 5) score += 5;
        
        details.age = `${ageInYears.toFixed(1)} years`;
      }
      
      return {
        ...dpe,
        _exactness_score: score,
        _exactness_details: details
      };
    });
    
    // Sort by score
    scoredCandidates.sort((a, b) => b._exactness_score - a._exactness_score);
    
    // Log top candidates
    console.log('🏆 Top 3 candidates:');
    scoredCandidates.slice(0, 3).forEach((candidate, i) => {
      console.log(`  ${i+1}. Score: ${candidate._exactness_score}/100 - ${candidate['Adresse_brute']} (${candidate['N°DPE']})`);
    });
    
    // Return exact match only if score is high enough
    const topCandidate = scoredCandidates[0];
    if (topCandidate && topCandidate._exactness_score >= 70) {
      return topCandidate;
    }
    
    return null;
  }
  
  /**
   * Format DPE data for your existing system structure
   */
  static formatDPEForYourSystem(dpe) {
    return {
      energy: dpe['Etiquette_DPE'] || 'N/A',
      ghg: dpe['Etiquette_GES'] || 'N/A', 
      date: dpe['Date_établissement_DPE'] ? new Date(dpe['Date_établissement_DPE']).toLocaleDateString() : 'Unknown',
      consumption: dpe['Conso_5_usages_par_m²_é_finale'] || null,
      yearBuilt: dpe['Année_construction'] || null,
      surfaceArea: dpe['Surface_habitable_logement'] || null,
      annualCost: dpe['Coût_total_5_usages'] || null,
      establishmentDate: dpe['Date_établissement_DPE'],
      expiryDate: dpe['Date_fin_validité_DPE'],
      isActive: this.isDPEActive(dpe['Date_fin_validité_DPE']),
      dpeId: dpe['N°DPE'],
      address: dpe['Adresse_brute'] || dpe['Adresse_(BAN)'] || 'Unknown',
      buildingType: dpe['Type_bâtiment'] || null
    };
  }
  
  /**
   * Check if DPE is still active
   */
  static isDPEActive(expiryDate) {
    if (!expiryDate) return false;
    return new Date(expiryDate) > new Date();
  }
}
