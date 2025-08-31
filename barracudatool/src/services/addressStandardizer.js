export class AddressStandardizer {
  
    // BAN API endpoint (now managed by IGN)
    static BAN_API = 'https://api-adresse.data.gouv.fr'
    
    /**
     * Standardize address for a cadastral parcel
     */
    static async standardizeParcelAddress(cadastralData) {
      console.log(`📍 Standardizing address for parcel ${cadastralData.parcelId}`)
      
      try {
        // Try multiple address search strategies
        const searchQueries = this.buildAddressQueries(cadastralData)
        
        for (const query of searchQueries) {
          console.log(`🔍 Trying address search: "${query}"`)
          
          const result = await this.searchBAN(query, cadastralData)
          if (result && result.confidence >= 0.7) {
            console.log(`✅ Found standardized address: ${result.address}`)
            return result
          }
        }
        
        console.log('❌ Could not standardize address')
        return null
        
      } catch (error) {
        console.error('❌ Address standardization failed:', error)
        return null
      }
    }
    
    /**
     * Build various address search queries
     */
    static buildAddressQueries(cadastralData) {
      const queries = []
      
      // Query 1: Section + numero + commune
      if (cadastralData.section && cadastralData.numero && cadastralData.commune) {
        queries.push(`${cadastralData.section} ${cadastralData.numero} ${cadastralData.commune}`)
      }
      
      // Query 2: Just commune
      if (cadastralData.commune) {
        queries.push(cadastralData.commune)
      }
      
      // Query 3: Commune + department
      if (cadastralData.commune && cadastralData.department) {
        queries.push(`${cadastralData.commune} ${cadastralData.department}`)
      }
      
      return queries
    }
    
    /**
     * Search the BAN (Base Adresse Nationale) API
     */
    static async searchBAN(query, cadastralData) {
      try {
        const params = new URLSearchParams({
          q: query,
          limit: 5,
          type: 'housenumber'
        })
        
        // Add geographic filter if we have coordinates
        if (cadastralData.lat && cadastralData.lon) {
          params.append('lat', cadastralData.lat.toString())
          params.append('lon', cadastralData.lon.toString())
        }
        
        const response = await fetch(`${this.BAN_API}/search/?${params}`)
        
        if (!response.ok) {
          throw new Error(`BAN API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!data.features || data.features.length === 0) {
          return null
        }
        
        // Get the best match
        const bestMatch = data.features[0]
        const props = bestMatch.properties
        
        // Calculate confidence based on score and geographic proximity
        let confidence = props.score || 0
        
        // Boost confidence if commune matches
        if (props.city && cadastralData.commune) {
          const cityMatch = props.city.toLowerCase() === cadastralData.commune.toLowerCase()
          if (cityMatch) confidence += 0.2
        }
        
        // Boost confidence if department matches
        if (props.context && cadastralData.department) {
          const deptMatch = props.context.includes(cadastralData.department)
          if (deptMatch) confidence += 0.1
        }
        
        return {
          address: props.label || props.name,
          postalCode: props.postcode,
          city: props.city,
          department: this.extractDepartment(props.context),
          coordinates: {
            lat: bestMatch.geometry.coordinates[1],
            lon: bestMatch.geometry.coordinates[0]
          },
          confidence: Math.min(confidence, 1.0),
          source: 'BAN'
        }
        
      } catch (error) {
        console.error('BAN search failed:', error)
        return null
      }
    }
    
    /**
     * Extract department from BAN context
     */
    static extractDepartment(context) {
      if (!context) return null
      
      // Context format is usually "departement, region"
      const parts = context.split(',')
      return parts[0]?.trim() || null
    }
    
    /**
     * Reverse geocode coordinates to get address
     */
    static async reverseGeocode(latitude, longitude) {
      console.log(`🔄 Reverse geocoding ${latitude}, ${longitude}`)
      
      try {
        const response = await fetch(
          `${this.BAN_API}/reverse/?lon=${longitude}&lat=${latitude}`
        )
        
        if (!response.ok) {
          throw new Error(`Reverse geocoding failed: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!data.features || data.features.length === 0) {
          return null
        }
        
        const result = data.features[0]
        const props = result.properties
        
        return {
          address: props.label,
          postalCode: props.postcode,
          city: props.city,
          department: this.extractDepartment(props.context),
          confidence: props.score || 0.8,
          source: 'BAN_REVERSE'
        }
        
      } catch (error) {
        console.error('Reverse geocoding failed:', error)
        return null
      }
    }
    
    /**
     * Normalize address string for better matching
     */
    static normalizeAddress(address) {
      if (!address) return ''
      
      return address
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim()
    }
    
    /**
     * Calculate similarity between two addresses
     */
    static calculateAddressSimilarity(address1, address2) {
      if (!address1 || !address2) return 0
      
      const norm1 = this.normalizeAddress(address1)
      const norm2 = this.normalizeAddress(address2)
      
      if (norm1 === norm2) return 1.0
      
      // Simple word-based similarity
      const words1 = norm1.split(' ')
      const words2 = norm2.split(' ')
      
      const commonWords = words1.filter(word => words2.includes(word))
      const totalWords = Math.max(words1.length, words2.length)
      
      return totalWords > 0 ? commonWords.length / totalWords : 0
    }
  }
  