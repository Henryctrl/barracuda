export class OfficialFrenchAPIs {
  
    // Updated IGN endpoints based on current documentation
    static IGN_CADASTRE_API = 'https://apicarto.ign.fr/api/cadastre'
    static IGN_WMTS_BASE = 'https://data.geopf.fr/wmts'
    static BAN_API = 'https://api-adresse.data.gouv.fr'
    static ADEME_DPE_API = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines'
    
    /**
     * Get cadastral parcel information from coordinates (FIXED)
     */
    static async getCadastralParcel(longitude, latitude) {
      console.log(`📋 Getting cadastral data for ${longitude}, ${latitude}`)
      
      try {
        // Create proper GeoJSON Point geometry
        const pointGeometry = {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
        
        // Properly encode the geometry parameter
        const geomParam = encodeURIComponent(JSON.stringify(pointGeometry))
        
        const response = await fetch(
          `${this.IGN_CADASTRE_API}/parcelle?geom=${geomParam}`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        )
        
        console.log(`📋 IGN API Response Status: ${response.status}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('📋 IGN API Error Response:', errorText)
          throw new Error(`IGN API error: ${response.status} - ${errorText}`)
        }
        
        const data = await response.json()
        console.log('📋 IGN response:', data)
        
        if (!data.features || data.features.length === 0) {
          console.log('📋 No parcels found at this location')
          return null
        }
        
        const parcel = data.features[0]
        const props = parcel.properties
        
        // Extract parcel information with better data handling
        const parcelData = {
          parcelId: props.id || props.numero || props.idu || 'UNKNOWN',
          lat: latitude,
          lon: longitude,
          area: props.contenance || props.superficie || 0,
          commune: props.commune || props.nom_com || 'Unknown',
          department: props.code_dep || props.departement || this.extractDepartmentFromId(props.id) || 'Unknown',
          section: props.section || 'Unknown',
          numero: props.numero || 'Unknown',
          geometry: parcel.geometry
        }
        
        console.log('📋 Parsed parcel data:', parcelData)
        return parcelData
        
      } catch (error) {
        console.error('❌ Failed to get cadastral data:', error)
        throw new Error(`Cadastral lookup failed: ${error.message}`)
      }
    }
    
    /**
     * Extract department code from parcel ID
     */
    static extractDepartmentFromId(parcelId) {
      if (!parcelId || parcelId.length < 2) return null
      return parcelId.substring(0, 2)
    }
    
    /**
     * Get building information for a parcel (with fallbacks)
     */
    static async getBuildingInformation(parcelId) {
      console.log(`🏠 Getting building info for ${parcelId}`)
      
      try {
        // Try multiple approaches to get building data
        const approaches = [
          () => this.getBuildingFromCadastre(parcelId),
          () => this.getBuildingFromCommune(parcelId),
          () => this.getBuildingEstimate(parcelId)
        ]
        
        for (const approach of approaches) {
          try {
            const result = await approach()
            if (result) {
              console.log('🏠 Building info found:', result)
              return result
            }
          } catch (error) {
            console.warn('🏠 Building lookup approach failed:', error.message)
          }
        }
        
        console.log('🏠 No building information available')
        return null
        
      } catch (error) {
        console.warn('🏠 Building info lookup failed:', error)
        return null
      }
    }
    
    /**
     * Try to get building data from cadastre API
     */
    static async getBuildingFromCadastre(parcelId) {
      const response = await fetch(
        `${this.IGN_CADASTRE_API}/batiment?parcelle=${parcelId}`,
        { headers: { 'Accept': 'application/json' } }
      )
      
      if (!response.ok) return null
      
      const data = await response.json()
      if (!data.features || data.features.length === 0) return null
      
      const building = data.features[0]
      const props = building.properties
      
      return {
        constructionYear: props.construction_year || props.annee_construction || null,
        buildingType: props.usage || props.type_local || 'Unknown',
        floors: props.nb_niveaux || props.floor_count || null
      }
    }
    
    /**
     * Try to get building data from commune info
     */
    static async getBuildingFromCommune(parcelId) {
      // Extract commune code from parcel ID (first 5 digits)
      if (!parcelId || parcelId.length < 5) return null
      
      const communeCode = parcelId.substring(0, 5)
      
      try {
        const response = await fetch(
          `${this.IGN_CADASTRE_API}/commune?code_insee=${communeCode}`,
          { headers: { 'Accept': 'application/json' } }
        )
        
        if (!response.ok) return null
        
        // This would return commune info, not specific building info
        // But could provide context for estimates
        return null
        
      } catch (error) {
        return null
      }
    }
    
    /**
     * Provide building estimates based on parcel characteristics
     */
    static async getBuildingEstimate(parcelId) {
      // Simple heuristic-based estimates
      // This is a fallback when no real data is available
      const currentYear = new Date().getFullYear()
      
      return {
        constructionYear: null, // Can't estimate without data
        buildingType: 'Unknown',
        floors: null
      }
    }
    
    /**
     * Get DPE records using multiple search strategies (IMPROVED)
     */
    static async getDPERecords(searchParams) {
      console.log('⚡ Searching ADEME DPE database with params:', searchParams)
      
      const searchStrategies = []
      
      // Strategy 1: Exact commune + department
      if (searchParams.commune && searchParams.department) {
        searchStrategies.push(`${searchParams.commune} ${searchParams.department}`)
      }
      
      // Strategy 2: Department only
      if (searchParams.department) {
        searchStrategies.push(searchParams.department)
      }
      
      // Strategy 3: Postal code area
      if (searchParams.postalCode) {
        searchStrategies.push(searchParams.postalCode)
      }
      
      // Strategy 4: Address search
      if (searchParams.address) {
        searchStrategies.push(searchParams.address)
      }
      
      let allResults = []
      
      for (const query of searchStrategies) {
        try {
          console.log(`⚡ Trying DPE search: "${query}"`)
          
          const params = new URLSearchParams({
            q: query,
            size: 50,
            select: '*'
          })
          
          const response = await fetch(`${this.ADEME_DPE_API}?${params}`)
          
          if (response.ok) {
            const data = await response.json()
            if (data.results) {
              allResults = allResults.concat(data.results)
              console.log(`⚡ Found ${data.results.length} DPE records for "${query}"`)
            }
          } else {
            console.warn(`⚡ DPE search failed for "${query}": ${response.status}`)
          }
        } catch (error) {
          console.warn(`DPE search failed for query "${query}":`, error)
        }
      }
      
      // Remove duplicates by DPE ID
      const uniqueResults = this.removeDuplicateDPE(allResults)
      console.log(`⚡ Found ${uniqueResults.length} unique DPE records`)
      
      return uniqueResults
    }
    
    /**
     * Remove duplicate DPE records
     */
    static removeDuplicateDPE(dpeRecords) {
      const seen = new Set()
      return dpeRecords.filter(dpe => {
        const id = dpe['N°DPE']
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
    }
    
    /**
     * Get sales history for a parcel (PLACEHOLDER - needs implementation)
     */
    static async getSalesHistory(parcelId) {
      console.log(`💰 Getting sales history for parcel ${parcelId}`)
      
      try {
        // TODO: Implement actual DVF API integration
        // For now, return empty array as the DVF API structure varies by region
        // and often requires specific authentication or regional endpoints
        
        console.log('💰 DVF integration not yet implemented - returning empty sales history')
        return []
        
      } catch (error) {
        console.error('❌ Failed to get sales history:', error)
        return []
      }
    }
    
    /**
     * Validate coordinates are within France
     */
    static validateFrenchCoordinates(lat, lon) {
      const latitude = parseFloat(lat)
      const longitude = parseFloat(lon)
      
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates: not numbers')
      }
      
      // France mainland bounds (approximate)
      if (latitude < 41 || latitude > 52 || longitude < -5 || longitude > 10) {
        throw new Error('Coordinates outside France bounds')
      }
      
      return { latitude, longitude }
    }
  }
  