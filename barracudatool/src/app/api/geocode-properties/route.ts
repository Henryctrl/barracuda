import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Property {
  id: string;
  location_city: string | null;
  location_postal_code: string | null;
  location_department: string | null;
  location_lat: number | null;
  location_lng: number | null;
}

interface BanFeature {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    label: string;
    score: number;
  };
}

interface GeocodingError {
  propertyId: string;
  location: string;
  reason: string;
  details?: string;
}

async function geocodeAddress(city: string | null, postalCode: string | null): Promise<[number, number] | null> {
  if (!city && !postalCode) return null;

  const query = [city, postalCode].filter(Boolean).join(' ');
  
  try {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0] as BanFeature;
      const [lon, lat] = feature.geometry.coordinates;
      
      if (feature.properties.score > 0.4) {
        return [lat, lon];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('x-cron-secret');
    const isAuthorized = cronSecret === process.env.CRON_SECRET;
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { limit = 100, force = false } = body;

    let query = supabase
      .from('properties')
      .select('id, location_city, location_postal_code, location_department, location_lat, location_lng, title, reference')
      .eq('is_active', true);

    if (!force) {
      query = query.or('location_lat.is.null,location_lng.is.null');
    }

    const { data: properties, error: fetchError } = await query.limit(limit);

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch properties', details: fetchError }, { status: 500 });
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No properties need geocoding',
        processed: 0,
        geocoded: 0,
        failed: 0,
        errors: [],
      });
    }

    let geocoded = 0;
    let failed = 0;
    const results = [];
    const errors: GeocodingError[] = [];

    for (const property of properties as Property[]) {
      if (!force && property.location_lat && property.location_lng) {
        continue;
      }

      const locationString = `${property.location_city || ''} ${property.location_postal_code || ''}`.trim();

      if (!property.location_city && !property.location_postal_code) {
        failed++;
        errors.push({
          propertyId: property.id,
          location: 'No location data',
          reason: 'Missing both city and postal code',
          details: `Property has no location data to geocode`,
        });
        continue;
      }

      const coords = await geocodeAddress(
        property.location_city,
        property.location_postal_code
      );

      if (coords) {
        const [lat, lng] = coords;
        
        const { error: updateError } = await supabase
          .from('properties')
          .update({
            location_lat: lat,
            location_lng: lng,
          })
          .eq('id', property.id);

        if (!updateError) {
          geocoded++;
          results.push({
            id: property.id,
            location: locationString,
            coordinates: { lat, lng },
          });
        } else {
          failed++;
          errors.push({
            propertyId: property.id,
            location: locationString,
            reason: 'Database update failed',
            details: updateError.message,
          });
        }
      } else {
        failed++;
        errors.push({
          propertyId: property.id,
          location: locationString,
          reason: 'Address not found or low confidence score',
          details: 'BAN API returned no results or confidence score < 0.4',
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: true,
      message: `Geocoded ${geocoded} properties`,
      processed: properties.length,
      geocoded,
      failed,
      results: results.slice(0, 10),
      errors: errors, // Return ALL errors
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Geocoding failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Geocoding API',
    usage: 'POST with optional { "limit": 100, "force": false }',
    description: 'Geocodes properties using BAN (Base Adresse Nationale) API',
  });
}
