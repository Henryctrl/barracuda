const DPE_API = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines';

export class EnhancedDPEForCadastral {
  
  static async getExactDPEForProperty(propertyInfo) {
    console.log('🎯 Getting EXACT DPE for property:', propertyInfo.cadastralId);
    
    try {
      const searchStrategies = [];
      
      if (propertyInfo.commune && propertyInfo.department) {
        searchStrategies.push({
          terms: `${propertyInfo.commune} ${propertyInfo.department}`,
          type: 'commune_dept',
          priority: 1
        });
      }
      
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
      
      for (const strategy of searchStrategies) {
        const candidates = await this.searchDPEByStrategy(strategy);
        allCandidates = allCandidates.concat(candidates);
        console.log(`📊 Strategy "${strategy.type}" returned ${candidates.length} candidates`);
      }
      
      const uniqueCandidates = this.removeDuplicates(allCandidates);
      console.log(`📊 Total unique candidates: ${uniqueCandidates.length}`);
      
      const exactMatch = this.findExactMatch(uniqueCandidates, propertyInfo);
      
      const formattedCandidates = uniqueCandidates.map(dpe => ({
        id: dpe['N°DPE'],
        address: dpe['Adresse_brute'] || dpe['Adresse_(BAN)'] || 'Unknown',
        energy_class: dpe['Etiquette_DPE'],
        ghg_class: dpe['Etiquette_GES'],
        surface: dpe['Surface_habitable_logement'],
        annual_cost: dpe['Coût_total_5_usages'],
        establishment_date: dpe['Date_établissement_DPE'],
        score: dpe._exactness_score || 0,
        reason: dpe._exactness_score < 90 ? 
          `Score: ${dpe._exactness_score}/100 - Not exact enough` : 
          'Qualified candidate'
      })).sort((a, b) => b.score - a.score);
      
      if (exactMatch) {
        console.log(`✅ EXACT MATCH FOUND: ${exactMatch.id}`);
        return {
          success: true,
          hasExactMatch: true,
          dpeRating: this.formatDPEForYourSystem(exactMatch),
          nearbyDpeCount: uniqueCandidates.length - 1,
          allDpeCandidates: formattedCandidates,
          searchedWith: propertyInfo.cadastralId
        };
      } else {
        console.log(`❌ No exact match found. ${uniqueCandidates.length} candidates available`);
        return {
          success: true,
          hasExactMatch: false,
          dpeRating: null,
          nearbyDpeCount: uniqueCandidates.length,
          allDpeCandidates: formattedCandidates,
          searchedWith: propertyInfo.cadastralId
        };
      }
      
    } catch (error) {
      console.error('❌ DPE search failed:', error);
      return {
        success: false,
        hasExactMatch: false,
        dpeRating: null,
        allDpeCandidates: [],
        error: error.message
      };
    }
  }
  
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
  
  static removeDuplicates(dpeRecords) {
    const seen = new Set();
    return dpeRecords.filter(dpe => {
      const id = dpe['N°DPE'];
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  
  static findExactMatch(candidates, propertyInfo) {
    console.log(`🎯 Looking for TRULY EXACT match among ${candidates.length} candidates`);
    
    const scoredCandidates = candidates.map(dpe => {
      let score = 0;
      const details = {};
      
      if (propertyInfo.department && dpe['N°_département_(BAN)'] === propertyInfo.department) {
        score += 40;
        details.department = 'exact';
      } else {
        return { ...dpe, _exactness_score: 0, _exactness_details: { disqualified: 'wrong_department' } };
      }
      
      if (propertyInfo.commune && dpe['Nom__commune_(BAN)']) {
        const dpeCommune = dpe['Nom__commune_(BAN)'].toLowerCase().trim();
        const searchCommune = propertyInfo.commune.toLowerCase().trim();
        
        if (dpeCommune === searchCommune) {
          score += 40;
          details.commune = 'exact';
        } else {
          return { ...dpe, _exactness_score: 0, _exactness_details: { disqualified: 'wrong_commune' } };
        }
      } else {
        return { ...dpe, _exactness_score: 0, _exactness_details: { disqualified: 'no_commune_data' } };
      }
      
      // Corrected: Removed 'addressMatch' as it was unused
      if (dpe['Adresse_brute'] || dpe['Adresse_(BAN)']) {
        const dpeAddress = (dpe['Adresse_brute'] || dpe['Adresse_(BAN)'] || '').toLowerCase();
        
        if (propertyInfo.section && dpeAddress.includes(propertyInfo.section.toLowerCase())) {
          score += 10;
          details.address = 'section_match';
        }
        if (propertyInfo.numero && dpeAddress.includes(propertyInfo.numero)) {
          score += 10;
          details.address = details.address ? 'section_and_numero' : 'numero_match';
        }
        
        const streetNumberPattern = /\b\d+\s/;
        if (streetNumberPattern.test(dpeAddress)) {
          score += 5;
          details.hasStreetNumber = true;
        }
      }
      
      if (dpe['Date_établissement_DPE']) {
        const dpeDate = new Date(dpe['Date_établissement_DPE']);
        const now = new Date();
        const ageInYears = (now.getTime() - dpeDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        if (ageInYears < 3) score += 5;
        details.age = `${ageInYears.toFixed(1)} years`;
      }
      
      return {
        ...dpe,
        _exactness_score: score,
        _exactness_details: details
      };
    });
    
    const qualifiedCandidates = scoredCandidates.filter(c => c._exactness_score > 0);
    
    console.log(`📊 Qualified candidates: ${qualifiedCandidates.length}/${candidates.length}`);
    
    if (qualifiedCandidates.length === 0) {
      console.log('❌ No candidates passed basic qualification (department + commune match)');
      return null;
    }
    
    qualifiedCandidates.sort((a, b) => b._exactness_score - a._exactness_score);
    
    console.log('🏆 Top qualified candidates:');
    qualifiedCandidates.slice(0, 3).forEach((candidate, i) => {
      console.log(`  ${i+1}. Score: ${candidate._exactness_score}/100 - ${candidate['Adresse_brute']} (${candidate['N°DPE']})`);
      console.log(`     Details:`, candidate._exactness_details);
    });
    
    const topCandidate = qualifiedCandidates[0];
    
    if (topCandidate && topCandidate._exactness_score >= 90) {
      console.log(`✅ EXACT MATCH FOUND with ${topCandidate._exactness_score}/100 points`);
      return topCandidate;
    } else if (topCandidate) {
      console.log(`❌ Best candidate only scored ${topCandidate._exactness_score}/100 - not exact enough`);
      return null;
    }
    
    console.log('❌ No truly exact match found');
    return null;
  }
  
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
  
  static isDPEActive(expiryDate) {
    if (!expiryDate) return false;
    return new Date(expiryDate) > new Date();
  }
}
