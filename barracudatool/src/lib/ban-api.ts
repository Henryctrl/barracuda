// barracudatool/src/lib/ban-api.ts

export interface BanAddress {
    label: string;
    score: number;
    housenumber?: string;
    name: string;
    postcode: string;
    citycode: string;
    city: string;
    context: string;
    type: 'housenumber' | 'street' | 'locality' | 'municipality';
    coordinates: [number, number]; // [lng, lat]
    properties: {
      id?: string;
      name?: string;
      postcode?: string;
      citycode?: string;
      context?: string;
      type?: string;
      importance?: number;
    };
  }
  
  export interface BanSearchResult {
    type: 'FeatureCollection';
    version: string;
    features: Array<{
      type: 'Feature';
      properties: BanAddress['properties'] & {
        label: string;
        score: number;
        housenumber?: string;
        name: string;
        postcode: string;
        citycode: string;
        city: string;
        context: string;
        type: string;
        importance?: number;
      };
      geometry: {
        type: 'Point';
        coordinates: [number, number];
      };
    }>;
    attribution: string;
    licence: string;
    query: string;
    limit: number;
  }
  
  export class BanAPI {
    private static readonly BASE_URL = 'https://api-adresse.data.gouv.fr';
    private static cache = new Map<string, BanSearchResult>();
  
    /**
     * Search for addresses using text query
     */
    static async searchAddresses(
      query: string, 
      options: {
        limit?: number;
        autocomplete?: boolean;
        type?: 'housenumber' | 'street' | 'locality' | 'municipality';
        postcode?: string;
        citycode?: string;
        lat?: number;
        lon?: number;
      } = {}
    ): Promise<BanSearchResult> {
      const cacheKey = `search_${query}_${JSON.stringify(options)}`;
      
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }
  
      try {
        const params = new URLSearchParams({
          q: query,
          limit: (options.limit || 15).toString(),
          ...(options.autocomplete && { autocomplete: '1' }),
          ...(options.type && { type: options.type }),
          ...(options.postcode && { postcode: options.postcode }),
          ...(options.citycode && { citycode: options.citycode }),
          ...(options.lat && options.lon && { 
            lat: options.lat.toString(), 
            lon: options.lon.toString() 
          })
        });
  
        const response = await fetch(`${this.BASE_URL}/search/?${params}`);
        
        if (!response.ok) {
          throw new Error(`BAN API error: ${response.status}`);
        }
  
        const data: BanSearchResult = await response.json();
        
        console.log(`🏠 BAN API: Found ${data.features.length} addresses for "${query}"`);
        
        this.cache.set(cacheKey, data);
        return data;
      } catch (error) {
        console.error('❌ BAN API search failed:', error);
        throw error;
      }
    }
  
    /**
     * Reverse geocoding - get address from coordinates
     */
    static async reverseGeocode(lng: number, lat: number): Promise<BanSearchResult> {
      const cacheKey = `reverse_${lng.toFixed(6)}_${lat.toFixed(6)}`;
      
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }
  
      try {
        const response = await fetch(
          `${this.BASE_URL}/reverse/?lon=${lng}&lat=${lat}`
        );
        
        if (!response.ok) {
          throw new Error(`BAN reverse API error: ${response.status}`);
        }
  
        const data: BanSearchResult = await response.json();
        
        console.log(`📍 BAN reverse: Found address at ${lat}, ${lng}`);
        
        this.cache.set(cacheKey, data);
        return data;
      } catch (error) {
        console.error('❌ BAN reverse geocoding failed:', error);
        throw error;
      }
    }
  
    /**
     * Get the best address match from coordinates
     */
    static async getAddressFromCoordinates(lng: number, lat: number): Promise<BanAddress | null> {
      try {
        const result = await this.reverseGeocode(lng, lat);
        
        if (result.features.length === 0) {
          return null;
        }
  
        const feature = result.features[0];
        return {
          label: feature.properties.label,
          score: feature.properties.score,
          housenumber: feature.properties.housenumber,
          name: feature.properties.name,
          postcode: feature.properties.postcode,
          citycode: feature.properties.citycode,
          city: feature.properties.city,
          context: feature.properties.context,
          type: feature.properties.type as any,
          coordinates: feature.geometry.coordinates,
          properties: feature.properties
        };
      } catch (error) {
        console.error('❌ Failed to get address from coordinates:', error);
        return null;
      }
    }
  }
  