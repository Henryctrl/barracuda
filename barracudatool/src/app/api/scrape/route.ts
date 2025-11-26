import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Add this to .env.local
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ScrapedProperty {
  source: string;
  source_id: string;
  url: string;
  title: string;
  price: number | null;
  location_city: string | null;
  location_department: string | null;
  location_postal_code: string | null;
  property_type: string | null;
  surface: number | null;
  rooms: number | null;
  images: string[];
  raw_data: any;
}

// Helper: Extract postal code from location string
function extractPostalCode(location: string): string | null {
  const match = location.match(/\b\d{5}\b/);
  return match ? match[0] : null;
}

// Helper: Determine property type from title
function guessPropertyType(title: string): string | null {
  const lower = title.toLowerCase();
  if (lower.includes('appartement') || lower.includes('appart')) return 'Apartment';
  if (lower.includes('maison') || lower.includes('villa')) return 'House/Villa';
  if (lower.includes('studio')) return 'Studio';
  if (lower.includes('loft')) return 'Loft/Atelier';
  if (lower.includes('terrain')) return 'Land (Terrain)';
  return null;
}

// LEBONCOIN RSS SCRAPER
async function scrapeLeboncoinRSS(searchUrl: string): Promise<ScrapedProperty[]> {
  try {
    // Leboncoin RSS URL format: https://www.leboncoin.fr/recherche?category=9&locations=Nice_06000&real_estate_type=1&rss=1
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const properties: ScrapedProperty[] = [];

    $('item').each((_, item) => {
      const $item = $(item);
      
      const title = $item.find('title').text().trim();
      const link = $item.find('link').text().trim();
      const description = $item.find('description').text().trim();
      const pubDate = $item.find('pubDate').text().trim();
      
      // Extract data from description (Leboncoin puts it in CDATA)
      const priceMatch = description.match(/(\d[\d\s]*)\s*€/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, '')) : null;
      
      const locationMatch = description.match(/Ville:\s*([^<]+)/);
      const location = locationMatch ? locationMatch[1].trim() : null;
      
      const surfaceMatch = description.match(/(\d+)\s*m²/);
      const surface = surfaceMatch ? parseInt(surfaceMatch[1]) : null;
      
      const roomsMatch = description.match(/(\d+)\s*pièces?/);
      const rooms = roomsMatch ? parseInt(roomsMatch[1]) : null;
      
      // Extract ID from URL
      const idMatch = link.match(/\/(\d+)\.htm/);
      const sourceId = idMatch ? idMatch[1] : link;
      
      const postalCode = location ? extractPostalCode(location) : null;
      const department = postalCode ? postalCode.substring(0, 2) : null;

      properties.push({
        source: 'leboncoin',
        source_id: sourceId,
        url: link,
        title,
        price,
        location_city: location,
        location_department: department,
        location_postal_code: postalCode,
        property_type: guessPropertyType(title),
        surface,
        rooms,
        images: [],
        raw_data: {
          description,
          pubDate,
          scrapedAt: new Date().toISOString(),
        },
      });
    });

    return properties;
  } catch (error) {
    console.error('Leboncoin RSS scrape error:', error);
    return [];
  }
}

// Save properties to database
async function saveProperties(properties: ScrapedProperty[]) {
  const results = {
    inserted: 0,
    updated: 0,
    errors: 0,
  };

  for (const prop of properties) {
    try {
      const { error } = await supabase
        .from('properties')
        .upsert({
          source: prop.source,
          source_id: prop.source_id,
          url: prop.url,
          title: prop.title,
          price: prop.price,
          location_city: prop.location_city,
          location_department: prop.location_department,
          location_postal_code: prop.location_postal_code,
          property_type: prop.property_type,
          surface: prop.surface,
          rooms: prop.rooms,
          images: prop.images,
          raw_data: prop.raw_data,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'source,source_id',
        });

      if (error) {
        console.error('Error saving property:', error);
        results.errors++;
      } else {
        results.inserted++;
      }
    } catch (err) {
      console.error('Exception saving property:', err);
      results.errors++;
    }
  }

  return results;
}

// API Handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchUrl, source = 'leboncoin' } = body;

    if (!searchUrl) {
      return NextResponse.json({ error: 'searchUrl required' }, { status: 400 });
    }

    let properties: ScrapedProperty[] = [];

    if (source === 'leboncoin') {
      properties = await scrapeLeboncoinRSS(searchUrl);
    } else {
      return NextResponse.json({ error: 'Unsupported source' }, { status: 400 });
    }

    const results = await saveProperties(properties);

    return NextResponse.json({
      success: true,
      scraped: properties.length,
      ...results,
      properties: properties.slice(0, 5), // Return first 5 as preview
    });
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json(
      { error: 'Scraping failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET handler for testing
export async function GET() {
  return NextResponse.json({
    message: 'Scraper API ready',
    usage: 'POST with { "searchUrl": "leboncoin_rss_url", "source": "leboncoin" }',
  });
}
