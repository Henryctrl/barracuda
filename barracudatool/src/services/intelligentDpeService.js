import { OfficialFrenchAPIs } from './officialFrenchApis'

export class IntelligentDPEService {
  
  /**
   * Find intelligent DPE matches using multiple strategies
   */
  static async findIntelligentMatches(cadastralData, searchMode = 'precision') {
    console.log(`🧠 Starting intelligent DPE matching for ${cadastralData.parcelId}`)
    
    try {
      // Get raw DPE data from ADEME
      const rawDPEData = await OfficialFrenchAPIs.getDPERecords({
        commune: cadastralData.commune,
        department: cadastralData.department,
        postalCode: cadastralData.postalCode,
        address: cadastralData.address
      })
      
      if (!rawDPEData || rawDPEData.length === 0) {
        console.log('❌ No DPE records found in area')
        return {
          matches: [],
          exactMatch: null,
          confidence: 0
        }
      }
      
      console.log(`📊 Found ${rawDPEData.length} DPE records to analyze`)
      
      // Apply intelligent matching strategies
      const scoredMatches = this.scoreAllMatches(rawDPEData, cadastralData)
      
      // Sort by confidence score
      scoredMatches.sort((a, b) => b.confidenceScore - a.confidenceScore)
      
      // Determine exact match based on search mode
      const confidenceThreshold = searchMode === 'precision' ? 90 : 70
      const exactMatch = scoredMatches.length > 0 && scoredMatches[0].confidenceScore >= confidenceThreshold 
        ? scoredMatches[0] 
        : null
      
      // Filter matches based on mode
      const filteredMatches = searchMode === 'precision' 
        ? scoredMatches.filter(m => m.confidenceScore >= 70) // Show potential matches even in precision mode
        : scoredMatches.filter(m => m.confidenceScore >= 50) // More lenient in comprehensive mode
      
      console.log(`✅ Analysis complete: ${exactMatch ? 'EXACT MATCH' : 'NO EXACT MATCH'} found`)
      console.log(`📊 Returning ${filteredMatches.length} candidate matches`)
      
      return {
        matches: filteredMatches.slice(0, 20), // Limit to 20 for performance
        exactMatch: exactMatch,
        confidence: exactMatch ? exactMatch.confidenceScore : 0
      }
      
    } catch (error) {
      console.error('❌ Intelligent DPE matching failed:', error)
      return {
        matches: [],
        exactMatch: null,
        confidence: 0,
        error: error.message
      }
    }
  }
  
  /**
   * Score all DPE matches using multiple criteria
   */
  static scoreAllMatches(dpeRecords, cadastralData) {
    return dpeRecords.map(dpe => {
      let score = 0
      let reasons = []
      
      // Strategy 1: Department match (Essential - 40 points)
      if (this.matchesDepartment(dpe, cadastralData)) {
        score += 40
        reasons.push('Department match')
      } else {
        reasons.push('Wrong department')
        return this.createScoredMatch(dpe, 0, reasons.join(', '))
      }
      
      // Strategy 2: Commune match (High priority - 30 points)
      const communeScore = this.scoreCommune(dpe, cadastralData)
      score += communeScore
      if (communeScore === 30) {
        reasons.push('Exact commune')
      } else if (communeScore > 0) {
        reasons.push('Partial commune match')
      }
      
      // Strategy 3: Address similarity (20 points)
      const addressScore = this.scoreAddress(dpe, cadastralData)
      score += addressScore
      if (addressScore > 0) {
        reasons.push(`Address similarity: ${addressScore}/20`)
      }
      
      // Strategy 4: Coordinate proximity (15 points)
      const proximityScore = this.scoreProximity(dpe, cadastralData)
      score += proximityScore
      if (proximityScore > 0) {
        reasons.push(`Geographic proximity: ${proximityScore}/15`)
      }
      
      // Strategy 5: Surface area similarity (10 points)
      const surfaceScore = this.scoreSurface(dpe, cadastralData)
      score += surfaceScore
      if (surfaceScore > 0) {
        reasons.push(`Surface similarity: ${surfaceScore}/10`)
      }
      
      // Strategy 6: Recent DPE bonus (5 points)
      const recencyScore = this.scoreRecency(dpe)
      score += recencyScore
      if (recencyScore > 0) {
        reasons.push('Recent certificate')
      }
      
      return this.createScoredMatch(dpe, Math.min(score, 100), reasons.join(', '))
    })
  }
  
  /**
   * Check if DPE matches the department
   */
  static matchesDepartment(dpe, cadastralData) {
    const dpeDept = dpe['N°_département_(BAN)'] || dpe['Code_postal_(BAN)']?.substring(0, 2)
    const cadastralDept = cadastralData.department?.toString()
    
    return dpeDept === cadastralDept
  }
  
  /**
   * Score commune matching
   */
  static scoreCommune(dpe, cadastralData) {
    const dpeCommune = (dpe['Nom__commune_(BAN)'] || '').toLowerCase().trim()
    const cadastralCommune = (cadastralData.commune || '').toLowerCase().trim()
    
    if (!dpeCommune || !cadastralCommune) return 0
    
    if (dpeCommune === cadastralCommune) {
      return 30 // Exact match
    }
    
    if (dpeCommune.includes(cadastralCommune) || cadastralCommune.includes(dpeCommune)) {
      return 15 // Partial match
    }
    
    return 0
  }
  
  /**
   * Score address similarity
   */
  static scoreAddress(dpe, cadastralData) {
    const dpeAddress = ((dpe['Adresse_brute'] || dpe['Adresse_(BAN)']) || '').toLowerCase()
    
    let score = 0
    
    // Check for section matching
    if (cadastralData.section && dpeAddress.includes(cadastralData.section.toLowerCase())) {
      score += 10
    }
    
    // Check for numero matching
    if (cadastralData.numero && dpeAddress.includes(cadastralData.numero)) {
      score += 10
    }
    
    // Check for street patterns
    const streetPatterns = ['rue', 'avenue', 'boulevard', 'place', 'chemin', 'route']
    const matchedPatterns = streetPatterns.filter(pattern => dpeAddress.includes(pattern))
    if (matchedPatterns.length > 0) {
      score += 5
    }
    
    return Math.min(score, 20)
  }
  
  /**
   * Score coordinate proximity
   */
  static scoreProximity(dpe, cadastralData) {
    // This would require coordinates in DPE data
    // For now, return 0 as coordinates aren't always available
    // In a real implementation, you'd calculate distance between points
    return 0
  }
  
  /**
   * Score surface area similarity
   */
  static scoreSurface(dpe, cadastralData) {
    const dpeSurface = dpe['Surface_habitable_logement']
    const cadastralArea = cadastralData.area
    
    if (!dpeSurface || !cadastralArea) return 0
    
    // Calculate similarity percentage
    const diff = Math.abs(dpeSurface - cadastralArea)
    const avg = (dpeSurface + cadastralArea) / 2
    const similarity = Math.max(0, 100 - (diff / avg * 100))
    
    // Convert to 0-10 scale
    return Math.round(similarity / 10)
  }
  
  /**
   * Score DPE recency
   */
  static scoreRecency(dpe) {
    const establishmentDate = dpe['Date_établissement_DPE']
    if (!establishmentDate) return 0
    
    const dpeDate = new Date(establishmentDate)
    const now = new Date()
    const ageInYears = (now - dpeDate) / (1000 * 60 * 60 * 24 * 365)
    
    if (ageInYears < 2) return 5
    if (ageInYears < 5) return 3
    return 0
  }
  
  /**
   * Create a standardized scored match object
   */
  static createScoredMatch(dpe, score, reason) {
    return {
      id: dpe['N°DPE'],
      address: dpe['Adresse_brute'] || dpe['Adresse_(BAN)'] || 'Unknown',
      energyClass: dpe['Etiquette_DPE'] || 'N/A',
      ghgClass: dpe['Etiquette_GES'] || 'N/A',
      consumption: dpe['Conso_5_usages_par_m²_é_finale'] || 0,
      surface: dpe['Surface_habitable_logement'] || 0,
      establishmentDate: dpe['Date_établissement_DPE'] || '',
      expiryDate: dpe['Date_fin_validité_DPE'] || '',
      isActive: this.isDPEActive(dpe['Date_fin_validité_DPE']),
      annualCost: dpe['Coût_total_5_usages'] || null,
      confidenceScore: score,
      matchReason: reason
    }
  }
  
  /**
   * Check if DPE certificate is still active
   */
  static isDPEActive(expiryDate) {
    if (!expiryDate) return false
    return new Date(expiryDate) > new Date()
  }
}
