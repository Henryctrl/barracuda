import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as turf from '@turf/turf'; // ✅ ADD THIS IMPORT

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

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function calculateDistance(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function matchesLocation(property: Property, criteria: SearchCriteria): boolean {
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
          if (search.center && Array.isArray(search.center) && search.radius_km) {
            const [searchLng, searchLat] = search.center;
            
            const distance = calculateDistance(
              searchLng,
              searchLat,
              property.location_lng,
              property.location_lat
            );
            
            console.log(`📍 Distance from ${property.location_city} to ${search.place_name}: ${distance.toFixed(2)} km (radius: ${search.radius_km} km)`);
            
            if (distance <= search.radius_km) {
              return true;
            }
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
          if (place.center && Array.isArray(place.center)) {
            const [placeLng, placeLat] = place.center;
            
            const distance = calculateDistance(
              placeLng,
              placeLat,
              property.location_lng,
              property.location_lat
            );
            
            if (distance <= 10) {
              return true;
            }
          }
        }
      }
    } catch (e) {
      console.error('Error parsing selected_places:', e);
    }
  }

  // ✅ NEW: Custom sectors matching (point-in-polygon)
  if (criteria.custom_sectors && property.location_lat && property.location_lng) {
    try {
      const sectors = typeof criteria.custom_sectors === 'string'
        ? JSON.parse(criteria.custom_sectors)
        : criteria.custom_sectors;

      if (sectors && sectors.type === 'FeatureCollection' && Array.isArray(sectors.features)) {
        const propertyPoint = turf.point([property.location_lng, property.location_lat]);
        
        for (const feature of sectors.features) {
          if (feature.geometry && feature.geometry.type === 'Polygon') {
            const polygon = turf.polygon(feature.geometry.coordinates);
            
            if (turf.booleanPointInPolygon(propertyPoint, polygon)) {
              console.log(`✅ ${property.location_city} is INSIDE custom sector polygon`);
              return true;
            }
          }
        }
        
        console.log(`❌ ${property.location_city} [${property.location_lng}, ${property.location_lat}] is OUTSIDE all custom sectors`);
      }
    } catch (e) {
      console.error('Error parsing custom_sectors:', e);
    }
  }

  return false;
}

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

  if (criteria.min_bedrooms || criteria.max_bedrooms) {
    if (property.bedrooms) {
      const min = criteria.min_bedrooms || 0;
      const max = criteria.max_bedrooms || 999;
      if (property.bedrooms >= min && property.bedrooms <= max) {
        score += weights.bedrooms;
      }
    }
  }

  if (criteria.min_surface || criteria.max_surface) {
    if (property.surface) {
      const min = criteria.min_surface || 0;
      const max = criteria.max_surface || 99999;
      if (property.surface >= min && property.surface <= max) {
        score += weights.surface;
      }
    }
  }

  if (criteria.min_land_surface || criteria.max_land_surface) {
    if (property.land_surface) {
      const min = criteria.min_land_surface || 0;
      const max = criteria.max_land_surface || 999999;
      if (property.land_surface >= min && property.land_surface <= max) {
        score += weights.land_surface;
      }
    }
  }

  if (criteria.min_rooms || criteria.max_rooms) {
    if (property.rooms) {
      const min = criteria.min_rooms || 0;
      const max = criteria.max_rooms || 999;
      if (property.rooms >= min && property.rooms <= max) {
        score += weights.rooms;
      }
    }
  }

  if (criteria.pool_preference) {
    if (criteria.pool_preference === 'required' && property.pool === true) {
      score += weights.pool;
    } else if (criteria.pool_preference === 'preferred' && property.pool === true) {
      score += weights.pool;
    } else if (criteria.pool_preference === 'no_preference') {
      score += weights.pool / 2;
    }
  }

  if (criteria.features && criteria.features.length > 0) {
    let matchingFeatures = 0;
    
    if (criteria.heating_system && property.heating_system) {
      if (property.heating_system.toLowerCase().includes(criteria.heating_system.toLowerCase())) {
        matchingFeatures++;
      }
    }

    if (criteria.drainage_system && property.drainage_system) {
      if (property.drainage_system.toLowerCase().includes(criteria.drainage_system.toLowerCase())) {
        matchingFeatures++;
      }
    }

    if (criteria.property_condition && property.property_condition) {
      if (property.property_condition.toLowerCase().includes(criteria.property_condition.toLowerCase())) {
        matchingFeatures++;
      }
    }

    if (criteria.min_year_built && property.year_built) {
      if (property.year_built >= criteria.min_year_built) {
        matchingFeatures++;
      }
    }

    if (criteria.min_bathrooms && property.bathrooms) {
      if (property.bathrooms >= criteria.min_bathrooms) {
        matchingFeatures++;
      }
    }

    const featureScore = Math.min(matchingFeatures * 2, weights.features);
    score += featureScore;
  }

  if (criteria.property_types && criteria.property_types.length > 0) {
    if (property.property_type && criteria.property_types.includes(property.property_type)) {
      score += weights.property_type;
    }
  }

  if (criteria.desired_dpe && property.energy_consumption) {
    score += weights.dpe;
  }

  return score;
}

export async function POST(request: NextRequest) {
  try {
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
      console.log(`\n🔍 Processing client: ${client.first_name} ${client.last_name}`);
      
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('client_search_criteria')
        .select('*')
        .eq('client_id', client.id)
        .single();

      if (criteriaError || !criteriaData) {
        console.log(`❌ No criteria found for client ${client.first_name} ${client.last_name}`);
        continue;
      }

      const criteria: SearchCriteria = criteriaData;
      
      console.log('📋 Criteria:', JSON.stringify({
        min_budget: criteria.min_budget,
        max_budget: criteria.max_budget,
        min_land_surface: criteria.min_land_surface,
        location_mode: criteria.location_mode,
        has_radius: !!criteria.radius_searches,
        has_sectors: !!criteria.custom_sectors,
        has_places: !!criteria.selected_places,
      }, null, 2));

      const hasLocation = !!(criteria.locations || criteria.selected_places || criteria.radius_searches || criteria.custom_sectors);
      const hasPrice = !!(criteria.min_budget || criteria.max_budget);

      console.log(`   Has location: ${hasLocation}, Has price: ${hasPrice}`);

      if (!hasLocation && !hasPrice) {
        console.log(`⚠️ Skipping - no location AND no price criteria`);
        continue;
      }

      let propertiesQuery = supabase
        .from('properties')
        .select('*')
        .eq('is_active', true);

      if (criteria.min_budget) {
        console.log(`   Adding filter: price >= ${criteria.min_budget}`);
        propertiesQuery = propertiesQuery.gte('price', criteria.min_budget);
      }
      if (criteria.max_budget) {
        console.log(`   Adding filter: price <= ${criteria.max_budget}`);
        propertiesQuery = propertiesQuery.lte('price', criteria.max_budget);
      }

      const { data: properties, error: propertiesError } = await propertiesQuery;

      console.log(`\n📦 Properties fetched from DB: ${properties?.length || 0}`);
      
      if (propertiesError) {
        console.log(`❌ Error fetching properties:`, propertiesError);
        continue;
      }

      if (!properties || properties.length === 0) {
        console.log(`⚠️ No properties match price filter!`);
        continue;
      }

      console.log(`\n🏠 Sample properties (first 5):`);
      properties.slice(0, 5).forEach((p: any, idx: number) => {
        console.log(`   ${idx + 1}. ${p.location_city} - €${p.price} - Land: ${p.land_surface}m² - Coords: [lng: ${p.location_lng}, lat: ${p.location_lat}]`);
      });

      let clientMatches = 0;
      let locationFiltered = 0;
      let scoreFiltered = 0;

      for (const property of properties) {
        if (hasLocation && !matchesLocation(property as Property, criteria)) {
          locationFiltered++;
          continue;
        }

        const matchScore = calculateMatchScore(property as Property, criteria);
        const minimumScore = (hasLocation && !hasPrice) || (!hasLocation && hasPrice) ? 30 : 0;

        if (matchScore < minimumScore) {
          scoreFiltered++;
          continue;
        }

        console.log(`\n✅ MATCH FOUND: ${(property as any).location_city} - Score: ${matchScore}`);

        const { data: existingMatch } = await supabase
          .from('property_matches')
          .select('id, status')
          .eq('client_id', client.id)
          .eq('property_id', property.id)
          .single();

        if (existingMatch) {
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

      console.log(`\n📊 Filtering Stats for ${client.first_name}:`);
      console.log(`   Total properties from DB: ${properties.length}`);
      console.log(`   Filtered by location: ${locationFiltered}`);
      console.log(`   Filtered by score: ${scoreFiltered}`);
      console.log(`   Final matches: ${clientMatches}`);

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
