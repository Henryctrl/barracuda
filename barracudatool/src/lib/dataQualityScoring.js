export class DataQualityScoring {
  
    /**
     * Calculate overall data quality for a property
     */
    static calculateOverallQuality(cadastralData, dpeResults, salesHistory) {
      console.log('📊 Calculating data quality scores')
      
      const scores = {
        cadastralConfidence: this.scoreCadastralQuality(cadastralData),
        addressConfidence: this.scoreAddressQuality(cadastralData),
        dpeConfidence: this.scoreDPEQuality(dpeResults),
        salesConfidence: this.scoreSalesQuality(salesHistory)
      }
      
      // Calculate weighted overall score
      const overall = this.calculateWeightedAverage(scores)
      
      console.log('📊 Quality scores:', { ...scores, overall })
      
      return {
        ...scores,
        overall: Math.round(overall)
      }
    }
    
    /**
     * Score cadastral data quality
     */
    static scoreCadastralQuality(cadastralData) {
      let score = 0
      
      // Essential fields (60 points)
      if (cadastralData.parcelId && cadastralData.parcelId !== 'UNKNOWN') score += 20
      if (cadastralData.area && cadastralData.area > 0) score += 20
      if (cadastralData.commune && cadastralData.commune !== 'Unknown') score += 20
      
      // Important fields (30 points)
      if (cadastralData.department && cadastralData.department !== 'Unknown') score += 10
      if (cadastralData.section && cadastralData.section !== 'Unknown') score += 10
      if (cadastralData.numero && cadastralData.numero !== 'Unknown') score += 10
      
      // Bonus fields (10 points)
      if (cadastralData.constructionYear) score += 5
      if (cadastralData.buildingType) score += 5
      
      return Math.min(score, 100)
    }
    
    /**
     * Score address standardization quality
     */
    static scoreAddressQuality(cadastralData) {
      let score = 0
      
      // Check if we have standardized address
      if (cadastralData.standardizedAddress) {
        score += 50
        
        // Bonus for postal code
        if (cadastralData.postalCode) score += 25
        
        // Bonus for coordinate accuracy
        if (cadastralData.coordinates && cadastralData.coordinates.lat && cadastralData.coordinates.lon) {
          score += 25
        }
      } else {
        // Partial score for basic location data
        if (cadastralData.commune) score += 30
        if (cadastralData.department) score += 20
      }
      
      return Math.min(score, 100)
    }
    
    /**
     * Score DPE data quality
     */
    static scoreDPEQuality(dpeResults) {
      if (!dpeResults || !dpeResults.matches) {
        return 0
      }
      
      // If we have an exact match, score is based on its confidence
      if (dpeResults.exactMatch) {
        return Math.min(dpeResults.exactMatch.confidenceScore, 100)
      }
      
      // If we have matches but no exact match, score based on best candidate
      if (dpeResults.matches.length > 0) {
        const bestScore = Math.max(...dpeResults.matches.map(m => m.confidenceScore))
        return Math.min(bestScore * 0.8, 80) // Cap at 80% since it's not exact
      }
      
      return 0
    }
    
    /**
     * Score sales data quality
     */
    static scoreSalesQuality(salesHistory) {
      if (!salesHistory || salesHistory.length === 0) {
        return 0
      }
      
      let score = 0
      
      // Base score for having sales data
      score += 60
      
      // Bonus for recent sales
      const recentSales = salesHistory.filter(sale => {
        const saleDate = new Date(sale.date)
        const fiveYearsAgo = new Date()
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
        return saleDate >= fiveYearsAgo
      })
      
      if (recentSales.length > 0) score += 20
      
      // Bonus for multiple transactions
      if (salesHistory.length > 1) score += 10
      
      // Bonus for complete data
      const completeTransactions = salesHistory.filter(sale => 
        sale.price && sale.surface && sale.date && sale.type
      )
      
      if (completeTransactions.length === salesHistory.length) score += 10
      
      return Math.min(score, 100)
    }
    
    /**
     * Calculate weighted average of quality scores
     */
    static calculateWeightedAverage(scores) {
      // Weights based on importance for property intelligence
      const weights = {
        cadastralConfidence: 0.4,   // Most important - foundation data
        addressConfidence: 0.2,     // Important for matching
        dpeConfidence: 0.3,         // Key for energy intelligence
        salesConfidence: 0.1        // Nice to have but not essential
      }
      
      let weightedSum = 0
      let totalWeight = 0
      
      for (const [key, score] of Object.entries(scores)) {
        if (weights[key] !== undefined) {
          weightedSum += score * weights[key]
          totalWeight += weights[key]
        }
      }
      
      return totalWeight > 0 ? weightedSum / totalWeight : 0
    }
    
    /**
     * Get quality level description
     */
    static getQualityLevel(score) {
      if (score >= 90) return { level: 'EXCELLENT', color: 'green', description: 'High-confidence exact data' }
      if (score >= 70) return { level: 'GOOD', color: 'yellow', description: 'Reliable data with minor gaps' }
      if (score >= 50) return { level: 'FAIR', color: 'orange', description: 'Partial data available' }
      return { level: 'POOR', color: 'red', description: 'Limited or uncertain data' }
    }
    
    /**
     * Get recommendations for improving data quality
     */
    static getQualityRecommendations(scores) {
      const recommendations = []
      
      if (scores.cadastralConfidence < 80) {
        recommendations.push('Verify cadastral parcel information')
      }
      
      if (scores.addressConfidence < 80) {
        recommendations.push('Improve address standardization')
      }
      
      if (scores.dpeConfidence < 70) {
        recommendations.push('Search for additional DPE certificates or commission new assessment')
      }
      
      if (scores.salesConfidence < 50) {
        recommendations.push('Look for additional transaction history or market comparables')
      }
      
      return recommendations
    }
  }
  