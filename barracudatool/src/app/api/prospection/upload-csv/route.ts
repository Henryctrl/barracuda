// src/app/api/prospection/upload-csv/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to validate and parse dates
function parseDate(dateString: string | null | undefined): string | null {
  if (!dateString || dateString.trim() === '') {
    return null;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().split('T')[0];
}

// Geocode function with retry logic
async function geocodeAddress(address: string, town?: string, postcode?: string): Promise<{lat: number, lon: number} | null> {
  const searchQuery = [address, postcode, town].filter(Boolean).join(' ').trim();
  
  if (!searchQuery) return null;

  try {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=1`,
      { 
        headers: { 'User-Agent': 'BarracudaTool/1.0' },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      return { lat, lon };
    }
  } catch (error) {
    console.warn('Geocoding failed for:', searchQuery);
  }
  
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { prospects } = body;

  if (!Array.isArray(prospects)) {
    return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
  }

  const validProspects: any[] = [];
  const failedProspects: any[] = [];

  // Process sequentially to avoid rate limiting
  for (let i = 0; i < prospects.length; i++) {
    const p = prospects[i];
    const errors: string[] = [];

    // Validate required fields
    if (!p.address && !p.link) {
      errors.push('Missing both address and link');
    }

    if (p.price && (isNaN(p.price) || p.price < 0)) {
      errors.push('Invalid price');
    }

    if (p.owner_email && !p.owner_email.includes('@')) {
      errors.push('Invalid email format');
    }

    if (errors.length > 0) {
      failedProspects.push({
        row_number: i + 2,
        data: p,
        errors: errors,
        failed_at: new Date().toISOString()
      });
      continue;
    }

    // Geocode if needed (server-side)
    let latitude = p.latitude;
    let longitude = p.longitude;

    if (p.address && !latitude && !longitude) {
      console.log(`Geocoding ${i + 1}/${prospects.length}: ${p.address}`);
      const coords = await geocodeAddress(p.address, p.town, p.postcode);
      
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lon;
      }

      // Add delay to avoid rate limiting (300ms between requests)
      await delay(300);
    }

    // Prepare valid prospect
    validProspects.push({
      ...p,
      user_id: user.id,
      latitude,
      longitude,
      last_contact_date: parseDate(p.last_contact_date),
      owner_email: p.owner_email && p.owner_email.trim() !== '' ? p.owner_email : null,
      owner_phone: p.owner_phone && p.owner_phone.trim() !== '' ? p.owner_phone : null,
      owner_address: p.owner_address && p.owner_address.trim() !== '' ? p.owner_address : null,
      owner_name: p.owner_name && p.owner_name.trim() !== '' ? p.owner_name : null,
      notes: p.notes && p.notes.trim() !== '' ? p.notes : null,
    });
  }

  let insertedData = [];
  let insertError = null;

  // Insert valid prospects
  if (validProspects.length > 0) {
    const { data, error } = await supabase
      .from('property_prospects')
      .insert(validProspects)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      insertError = error;
    } else {
      insertedData = data || [];
    }
  }

  return NextResponse.json({ 
    success: insertedData.length,
    failed: failedProspects.length,
    inserted: insertedData,
    failures: failedProspects,
    error: insertError ? insertError.message : null
  });
}
