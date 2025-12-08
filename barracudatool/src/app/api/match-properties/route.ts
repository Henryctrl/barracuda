//src/app/api/match-properties/route.ts

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
  min_bedrooms?: number;
  max_bedrooms?: number;
  property_types?: string[];
  locations?: string; // TEXT field in your schema
  selected_insee_codes?: string[];
  features?: string[];
  desired_dpe?: string;
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
  url: string;
  source: string;
}

function calculateMatchScore(property: Property, criteria: SearchCriteria): number {
  let score = 0;
  let totalChecks = 0;

  // Budget match (30 points) - using min_budget/max_budget
  if (criteria.min_budget || criteria.max_budget) {
    totalChecks += 30;
    if (property.price) {
      if ((!criteria.min_budget || property.price >= criteria.min_budget) &&
          (!criteria.max_budget || property.price <= criteria.max_budget)) {
        score += 30;
      }
    }
  }

  // Surface match (20 points)
  if (criteria.min_surface || criteria.max_surface) {
    totalChecks += 20;
    if (property.surface) {
      if ((!criteria.min_surface || property.surface >= criteria.min_surface) &&
          (!criteria.max_surface || property.surface <= criteria.max_surface)) {
        score += 20;
      }
    }
  }

  // Rooms match (15 points)
  if (criteria.min_rooms) {
    totalChecks += 15;
    if (property.rooms && property.rooms >= criteria.min_rooms) {
      score += 15;
    }
  }

  // Bedrooms match (15 points)
  if (criteria.min_bedrooms || criteria.max_bedrooms) {
    totalChecks += 15;
    if (property.bedrooms) {
      if ((!criteria.min_bedrooms || property.bedrooms >= criteria.min_bedrooms) &&
          (!criteria.max_bedrooms || property.bedrooms <= criteria.max_bedrooms)) {
        score += 15;
      }
    }
  }

  // Property type match (10 points)
  if (criteria.property_types && criteria.property_types.length > 0) {
    totalChecks += 10;
    if (property.property_type && criteria.property_types.includes(property.property_type)) {
      score += 10;
    }
  }

  // Helper function to remove accents
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Location match (10 points) - locations is TEXT, can contain comma-separated values
if (criteria.locations) {
  totalChecks += 10;
  const locationsList = criteria.locations.split(',').map(l => removeAccents(l.trim().toLowerCase()));
  const propertyCity = removeAccents(property.location_city?.toLowerCase() || '');
  const propertyDept = removeAccents(property.location_department?.toLowerCase() || '');
  const propertyPostal = removeAccents(property.location_postal_code?.toLowerCase() || '');
  
  const locationMatch = locationsList.some(loc => 
    propertyCity.includes(loc) ||
    propertyDept.includes(loc) ||
    propertyPostal.includes(loc)
  );
  if (locationMatch) {
    score += 10;
  }
}


  // Normalize to 100 if criteria exist
  if (totalChecks > 0) {
    return Math.round((score / totalChecks) * 100);
  }

  return 0;
}

export async function POST(request: NextRequest) {
  try {
    // Allow cron jobs to call this
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret && cronSecret === process.env.CRON_SECRET) {
      console.log('✅ Authenticated cron request');
    }

    // Handle empty body gracefully
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

    // If clientId provided, match for that client only. Otherwise, match for all clients
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

      // Build property query based on criteria
      let propertiesQuery = supabase.from('properties').select('*').eq('is_active', true);

      // Apply filters
      if (criteria.min_budget) {
        propertiesQuery = propertiesQuery.gte('price', criteria.min_budget);
      }
      if (criteria.max_budget) {
        propertiesQuery = propertiesQuery.lte('price', criteria.max_budget);
      }
      if (criteria.min_surface) {
        propertiesQuery = propertiesQuery.gte('surface', criteria.min_surface);
      }
      if (criteria.max_surface) {
        propertiesQuery = propertiesQuery.lte('surface', criteria.max_surface);
      }
      if (criteria.min_rooms) {
        propertiesQuery = propertiesQuery.gte('rooms', criteria.min_rooms);
      }
      if (criteria.min_bedrooms) {
        propertiesQuery = propertiesQuery.gte('bedrooms', criteria.min_bedrooms);
      }

      const { data: properties, error: propertiesError } = await propertiesQuery;

      if (propertiesError || !properties) {
        console.log(`No properties found for client ${client.first_name} ${client.last_name}`);
        continue;
      }

      let clientMatches = 0;

      // Calculate match scores and insert matches
      for (const property of properties) {
        const matchScore = calculateMatchScore(property as Property, criteria);

        // Only create matches with score >= 50
        if (matchScore >= 50) {
          const { error: matchError } = await supabase
            .from('property_matches')
            .upsert({
              client_id: client.id,
              property_id: property.id,
              match_score: matchScore,
              status: 'new',
              matched_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'client_id,property_id',
              ignoreDuplicates: false,
            });

          if (!matchError) {
            totalMatches++;
            newMatches++;
            clientMatches++;
          } else {
            console.error('Match insert error:', matchError);
          }
        }
      }

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
      results,
      message: `Matched ${newMatches} new properties across ${clients.length} client(s)`,
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
  });
}
