import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface SearchCriteria {
  client_id: string;
  min_budget?: number;
  max_budget?: number;
  min_surface?: number;
  max_surface?: number;
  min_rooms?: number;
  max_rooms?: number;
  min_bedrooms?: number;
  max_bedrooms?: number;
  property_types?: string[];
  locations?: string;
  selected_insee_codes?: string[];
  features?: string[];
  desired_dpe?: string;
  location_mode?: string;
  selected_places?: any;
  radius_searches?: any;
  custom_sectors?: any;
  min_land_surface?: number;
  max_land_surface?: number;
  pool_preference?: string;
  heating_system?: string;
  drainage_system?: string;
  property_condition?: string;
  min_year_built?: number;
  max_year_built?: number;
  min_bathrooms?: number;
}

interface Property {
  id: string;
  title: string;
  price: number;
  surface: number;
  rooms: number;
  bedrooms: number;
  property_type: string;
  location_city: string;
  location_department: string;
  location_postal_code: string;
  location_lat: number | null;
  location_lng: number | null;
  url: string;
  source: string;
  land_surface?: number;
  pool?: boolean;
  heating_system?: string;
  drainage_system?: string;
  property_condition?: string;
  year_built?: number;
  bathrooms?: number;
  energy_consumption?: number;
}

// Helper: Remove accents for location matching
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Helper: Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Check if property is in location criteria
function matchesLocation(property: Property, criteria: SearchCriteria): boolean {
  // If no location criteria set, match all
  if (!criteria.locations && !criteria.selected_places && !criteria.radius_searches && !criteria.custom_sectors) {
    return true;
  }

  // Text-based location matching
  if (criteria.locations) {
    const locationsList = criteria.locations.split(',').map(l => removeAccents(l.trim().toLowerCase()));
    const propertyCity = removeAccents(property.location_city?.toLowerCase() || '');
    const propertyDept = removeAccents(property.location_department?.toLowerCase() || '');
    const propertyPostal = removeAccents(property.location_postal_code?.toLowerCase() || '');
    
    const textMatch = locationsList.some(loc => 
      propertyCity.includes(loc) ||
      propertyDept.includes(loc) ||
      propertyPostal.includes(loc)
    );
    
    if (textMatch) return true;
  }

  // Radius search matching
  if (criteria.radius_searches && property.location_lat && property.location_lng) {
    try {
      const radiusSearches = typeof criteria.radius_searches === 'string' 
        ? JSON.parse(criteria.radius_searches) 
        : criteria.radius_searches;

      if (Array.isArray(radiusSearches)) {
        for (const search of radiusSearches) {
          if (search.center && search.radius) {
            const distance = calculateDistance(
              property.location_lat,
              property.location_lng,
              search.center[1],
              search.center[0]
            );
            if (distance <= search.radius) return true;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing radius_searches:', e);
    }
  }

  // Places matching
  if (criteria.selected_places && property.location_lat && property.location_lng) {
    try {
      const places = typeof criteria.selected_places === 'string'
        ? JSON.parse(criteria.selected_places)
        : criteria.selected_places;

      if (Array.isArray(places)) {
        for (const place of places) {
          if (place.coordinates) {
            const distance = calculateDistance(
              property.location_lat,
              property.location_lng,
              place.coordinates[1],
              place.coordinates[0]
            );
            // Default 5km radius for places
            if (distance <= 5) return true;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing selected_places:', e);
    }
  }

  return false;
}

// Calculate match score with new weights
function calculateMatchScore(property: Property, criteria: SearchCriteria): number {
  let score = 0;
  const weights = {
    bedrooms: 20,
    surface: 20,
    land_surface: 15,
    rooms: 15,
    pool: 15,
    features: 10,
    property_type: 3,
    dpe: 2,
  };

  // Bedrooms (20 points)
  if (criteria.min_bedrooms || criteria.max_bedrooms) {
    if (property.bedrooms) {
      const min = criteria.min_bedrooms || 0;
      const max = criteria.max_bedrooms || 999;
      if (property.bedrooms >= min && property.bedrooms <= max) {
        score += weights.bedrooms;
      }
    }
  }

  // Surface (20 points)
  if (criteria.min_surface || criteria.max_surface) {
    if (property.surface) {
      const min = criteria.min_surface || 0;
      const max = criteria.max_surface || 99999;
      if (property.surface >= min && property.surface <= max) {
        score += weights.surface;
      }
    }
  }

  // Land surface (15 points)
  if (criteria.min_land_surface || criteria.max_land_surface) {
    if (property.land_surface) {
      const min = criteria.min_land_surface || 0;
      const max = criteria.max_land_surface || 999999;
      if (property.land_surface >= min && property.land_surface <= max) {
        score += weights.land_surface;
      }
    }
  }

  // Rooms (15 points)
  if (criteria.min_rooms || criteria.max_rooms) {
    if (property.rooms) {
      const min = criteria.min_rooms || 0;
      const max = criteria.max_rooms || 999;
      if (property.rooms >= min && property.rooms <= max) {
        score += weights.rooms;
      }
    }
  }

  // Pool (15 points)
  if (criteria.pool_preference) {
    if (criteria.pool_preference === 'required' && property.pool === true) {
      score += weights.pool;
    } else if (criteria.pool_preference === 'preferred' && property.pool === true) {
      score += weights.pool;
    } else if (criteria.pool_preference === 'no_preference') {
      score += weights.pool / 2; // Give some points for being flexible
    }
  }

  // Features (10 points max, 2 points per matching feature)
  if (criteria.features && criteria.features.length > 0) {
    let matchingFeatures = 0;
    
    // Check heating system
    if (criteria.heating_system && property.heating_system) {
      if (property.heating_system.toLowerCase().includes(criteria.heating_system.toLowerCase())) {
        matchingFeatures++;
      }
    }

    // Check drainage system
    if (criteria.drainage_system && property.drainage_system) {
      if (property.drainage_system.toLowerCase().includes(criteria.drainage_system.toLowerCase())) {
        matchingFeatures++;
      }
    }

    // Check property condition
    if (criteria.property_condition && property.property_condition) {
      if (property.property_condition.toLowerCase().includes(criteria.property_condition.toLowerCase())) {
        matchingFeatures++;
      }
    }

    // Check year built
    if (criteria.min_year_built && property.year_built) {
      if (property.year_built >= criteria.min_year_built) {
        matchingFeatures++;
      }
    }

    // Check bathrooms
    if (criteria.min_bathrooms && property.bathrooms) {
      if (property.bathrooms >= criteria.min_bathrooms) {
        matchingFeatures++;
      }
    }

    const featureScore = Math.min(matchingFeatures * 2, weights.features);
    score += featureScore;
  }

  // Property type (3 points)
  if (criteria.property_types && criteria.property_types.length > 0) {
    if (property.property_type && criteria.property_types.includes(property.property_type)) {
      score += weights.property_type;
    }
  }

  // DPE/Energy (2 points)
  if (criteria.desired_dpe && property.energy_consumption) {
    // Simple DPE matching - you can expand this
    score += weights.dpe;
  }

  return score;
}

export async function POST(request: NextRequest) {
  try {
    // Allow cron jobs to call this
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret && cronSecret === process.env.CRON_SECRET) {
      console.log('✅ Authenticated cron request');
    }

    let body: { clientId?: string } = {};

    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      console.log('No body provided, will match all clients');
    }

    const { clientId } = body;

    // Fetch clients
    let clientsQuery = supabase.from('clients').select('id, first_name, last_name');
    
    if (clientId) {
      clientsQuery = clientsQuery.eq('id', clientId);
    }

    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError || !clients) {
      return NextResponse.json({ error: 'Failed to fetch clients', details: clientsError }, { status: 500 });
    }

    let totalMatches = 0;
    let newMatches = 0;
    let updatedMatches = 0;
    const results: Array<{ clientName: string; matchesFound: number }> = [];

    for (const client of clients) {
      // Get client search criteria
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('client_search_criteria')
        .select('*')
        .eq('client_id', client.id)
        .single();

      if (criteriaError || !criteriaData) {
        console.log(`No criteria found for client ${client.first_name} ${client.last_name}`);
        continue;
      }

      const criteria: SearchCriteria = criteriaData;

      // Check if BOTH location AND price are missing - skip if true
      const hasLocation = !!(criteria.locations || criteria.selected_places || criteria.radius_searches || criteria.custom_sectors);
      const hasPrice = !!(criteria.min_budget || criteria.max_budget);

      if (!hasLocation && !hasPrice) {
        console.log(`⚠️ Skipping client ${client.first_name} ${client.last_name} - no location AND no price criteria`);
        continue;
      }

      // Build property query
      let propertiesQuery = supabase
        .from('properties')
        .select('*')
        .eq('is_active', true);

      // Apply price filter if set
      if (criteria.min_budget) {
        propertiesQuery = propertiesQuery.gte('price', criteria.min_budget);
      }
      if (criteria.max_budget) {
        propertiesQuery = propertiesQuery.lte('price', criteria.max_budget);
      }

      const { data: properties, error: propertiesError } = await propertiesQuery;

      if (propertiesError || !properties) {
        console.log(`No properties found for client ${client.first_name} ${client.last_name}`);
        continue;
      }

      let clientMatches = 0;

      for (const property of properties) {
        // Check primary criteria: location
        if (hasLocation && !matchesLocation(property as Property, criteria)) {
          continue; // Skip if doesn't match location
        }

        // Calculate secondary match score
        const matchScore = calculateMatchScore(property as Property, criteria);

        // Apply minimum score filter when only ONE primary criteria is set
        const minimumScore = (hasLocation && !hasPrice) || (!hasLocation && hasPrice) ? 30 : 0;

        if (matchScore < minimumScore) {
          continue;
        }

        // Upsert match (insert or update)
        const { data: existingMatch } = await supabase
          .from('property_matches')
          .select('id, status')
          .eq('client_id', client.id)
          .eq('property_id', property.id)
          .single();

        if (existingMatch) {
          // Update existing match, preserve user status
          const { error: updateError } = await supabase
            .from('property_matches')
            .update({
              match_score: matchScore,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMatch.id);

          if (!updateError) {
            updatedMatches++;
            clientMatches++;
          }
        } else {
          // Insert new match
          const { error: insertError } = await supabase
            .from('property_matches')
            .insert({
              client_id: client.id,
              property_id: property.id,
              match_score: matchScore,
              status: 'new',
              matched_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (!insertError) {
            totalMatches++;
            newMatches++;
            clientMatches++;
          }
        }
      }

      // ✅ ONLY NEW ADDITION: Update last_matched_at for this client
      await supabase
        .from('clients')
        .update({ last_matched_at: new Date().toISOString() })
        .eq('id', client.id);

      results.push({
        clientName: `${client.first_name} ${client.last_name}`,
        matchesFound: clientMatches,
      });
    }

    return NextResponse.json({
      success: true,
      clientsProcessed: clients.length,
      totalMatches,
      newMatches,
      updatedMatches,
      results,
      message: `Matched ${newMatches} new properties, updated ${updatedMatches} existing matches across ${clients.length} client(s)`,
    });
  } catch (error) {
    console.error('Matching error:', error);
    return NextResponse.json(
      { error: 'Matching failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Property Matching API',
    usage: 'POST with optional { "clientId": "uuid" } to match properties for specific client or all clients',
    scoringWeights: {
      bedrooms: 20,
      surface: 20,
      land_surface: 15,
      rooms: 15,
      pool: 15,
      features: 10,
      property_type: 3,
      dpe: 2,
    },
  });
}
