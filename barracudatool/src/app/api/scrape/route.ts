import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Dynamic puppeteer setup
async function initPuppeteer() {
  const puppeteerExtra = (await import('puppeteer-extra')).default;
  const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
  puppeteerExtra.use(StealthPlugin());
  return puppeteerExtra;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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

function extractPostalCode(location: string): string | null {
  const match = location.match(/\b\d{5}\b/);
  return match ? match[0] : null;
}

function guessPropertyType(title: string): string | null {
  const lower = title.toLowerCase();
  if (lower.includes('appartement') || lower.includes('appart')) return 'Apartment';
  if (lower.includes('maison') || lower.includes('villa')) return 'House/Villa';
  if (lower.includes('studio')) return 'Studio';
  if (lower.includes('loft')) return 'Loft/Atelier';
  if (lower.includes('terrain')) return 'Land (Terrain)';
  return null;
}

async function scrapeLeboncoinPuppeteer(searchUrl: string): Promise<ScrapedProperty[]> {
  let browser;
  
  try {
    console.log('🚀 Launching browser...');
    const puppeteer = await initPuppeteer();
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('🔍 Navigating to:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.screenshot({ path: 'leboncoin_screenshot.png', fullPage: true });
    console.log('Screenshot taken at leboncoin_screenshot.png');

    console.log('⏳ Waiting for listings to load...');
    
    await page.waitForSelector('a[href*="/ventes_immobilieres/"]', { timeout: 15000 });

    console.log('📄 Extracting data from page...');

    const properties = await page.evaluate(() => {
      const listings: any[] = [];
      const cards = document.querySelectorAll('a[href*="/ventes_immobilieres/"]');

      cards.forEach((card) => {
        try {
          const url = (card as HTMLAnchorElement).href;
          const idMatch = url.match(/\/(\d+)\.htm/);
          const sourceId = idMatch ? idMatch[1] : url;

          const titleEl = card.querySelector('[data-qa-id="aditem_title"]');
          const title = titleEl ? titleEl.textContent?.trim() || '' : '';

          const priceEl = card.querySelector('[data-qa-id="aditem_price"]');
          const priceText = priceEl ? priceEl.textContent?.trim() || '' : '';
          const priceMatch = priceText.match(/(\d[\d\s]*)/);
          const price = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, '')) : null;

          const locationEl = card.querySelector('[data-qa-id="aditem_location"]');
          const location = locationEl ? locationEl.textContent?.trim() || '' : '';

          const attributesEl = card.querySelector('[data-qa-id="aditem_attributes"]');
          const attributesText = attributesEl ? attributesEl.textContent?.trim() || '' : '';
          
          const surfaceMatch = attributesText.match(/(\d+)\s*m²/);
          const surface = surfaceMatch ? parseInt(surfaceMatch[1]) : null;
          
          const roomsMatch = attributesText.match(/(\d+)\s*pièces?/);
          const rooms = roomsMatch ? parseInt(roomsMatch[1]) : null;

          const imgEl = card.querySelector('img[src*="leboncoin"]');
          const image = imgEl ? (imgEl as HTMLImageElement).src : '';

          listings.push({
            sourceId,
            url,
            title,
            price,
            location,
            surface,
            rooms,
            image,
            attributesText,
          });
        } catch (err) {
          console.error('Error parsing listing:', err);
        }
      });

      return listings;
    });

    console.log(`✅ Found ${properties.length} listings`);

    const formattedProperties: ScrapedProperty[] = properties.map((p) => {
      const postalCode = extractPostalCode(p.location);
      const department = postalCode ? postalCode.substring(0, 2) : null;

      return {
        source: 'leboncoin',
        source_id: p.sourceId,
        url: p.url,
        title: p.title,
        price: p.price,
        location_city: p.location,
        location_department: department,
        location_postal_code: postalCode,
        property_type: guessPropertyType(p.title),
        surface: p.surface,
        rooms: p.rooms,
        images: p.image ? [p.image] : [],
        raw_data: {
          attributesText: p.attributesText,
          scrapedAt: new Date().toISOString(),
        },
      };
    });

    await browser.close();
    return formattedProperties;
  } catch (error) {
    console.error('❌ Puppeteer scrape error:', error);
    if (browser) await browser.close();
    return [];
  }
}

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchUrl, source = 'leboncoin' } = body;

    console.log('🚀 Scrape request:', { searchUrl, source });

    if (!searchUrl) {
      return NextResponse.json({ error: 'searchUrl required' }, { status: 400 });
    }

    let properties: ScrapedProperty[] = [];

    if (source === 'leboncoin') {
      properties = await scrapeLeboncoinPuppeteer(searchUrl);
    } else {
      return NextResponse.json({ error: 'Unsupported source' }, { status: 400 });
    }

    const results = await saveProperties(properties);

    return NextResponse.json({
      success: true,
      scraped: properties.length,
      ...results,
      properties: properties.slice(0, 5),
    });
  } catch (error) {
    console.error('❌ Scrape API error:', error);
    return NextResponse.json(
      { error: 'Scraping failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Scraper API ready (Puppeteer Stealth mode)',
    usage: 'POST with { "searchUrl": "leboncoin_search_url", "source": "leboncoin" }',
  });
}
