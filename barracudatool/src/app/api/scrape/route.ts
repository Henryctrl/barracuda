// src/app/api/scrape/route.ts

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
  description?: string;
  price: number | null;
  location_city: string | null;
  location_department: string | null;
  location_postal_code: string | null;
  property_type: string | null;
  surface: number | null;
  rooms: number | null;
  bedrooms: number | null;
  images: string[];
  raw_data: Record<string, unknown>;
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

// ===== NEW: CAD-IMMO SCRAPER =====
async function scrapeCadImmo(searchUrl: string): Promise<ScrapedProperty[]> {
  let browser;
  
  try {
    console.log('🚀 Launching browser for CAD-IMMO...');
    const puppeteer = await initPuppeteer();
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    console.log('🔍 Navigating to:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.screenshot({ path: 'cadimmo_screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved');

    console.log('⏳ Waiting for listings...');
    
    // Wait for property cards - try multiple possible selectors
    await Promise.race([
      page.waitForSelector('article', { timeout: 10000 }),
      page.waitForSelector('.property-card', { timeout: 10000 }),
      page.waitForSelector('[class*="property"]', { timeout: 10000 }),
      page.waitForSelector('a[href*="/property/"]', { timeout: 10000 }),
    ]).catch(() => console.log('⚠️ No standard selectors found, will try generic extraction'));

    console.log('📄 Extracting data from CAD-IMMO...');

    const properties = await page.evaluate(() => {
      const listings: Array<{
        url: string;
        title: string;
        price: number | null;
        location: string;
        surface: number | null;
        rooms: number | null;
        bedrooms: number | null;
        bathrooms: number | null;
        image: string;
        description: string;
      }> = [];

      // Try to find property cards with various selectors
      const possibleSelectors = [
        'article',
        '.property-card',
        '[class*="property"]',
        'a[href*="/property/"]',
        '[class*="bien"]',
        '[class*="annonce"]'
      ];

      let cards: NodeListOf<Element> | null = null;
      
      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          cards = elements;
          console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
          break;
        }
      }

      if (!cards || cards.length === 0) {
        console.log('❌ No property cards found');
        return [];
      }

      cards.forEach((card) => {
        try {
          // Extract URL - look for links containing /property/, /bien/, /vente/, etc.
          let url = '';
          const linkEl = card.querySelector('a[href*="/property/"], a[href*="/bien/"], a[href*="/vente/"]') || 
                        (card.tagName === 'A' ? card : null);
          if (linkEl) {
            url = (linkEl as HTMLAnchorElement).href;
          }

          // Extract unique ID from URL
          const idMatch = url.match(/\/(\d+)/) || url.match(/[a-z]+-([a-f0-9]+)/);
          const sourceId = idMatch ? idMatch[1] : url || `cadimmo-${Date.now()}-${Math.random()}`;

          // Extract title - multiple possible locations
          const titleEl = card.querySelector('h2, h3, h4, .title, [class*="title"]');
          const title = titleEl ? titleEl.textContent?.trim() || 'Property' : 'Property';

          // Extract price - look for € symbol
          const priceText = card.textContent || '';
          const priceMatch = priceText.match(/(\d[\d\s]*)\s*€/) || priceText.match(/€\s*(\d[\d\s]*)/);
          const price = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, '')) : null;

          // Extract location
          const locationEl = card.querySelector('[class*="location"], [class*="ville"], [class*="city"]');
          const location = locationEl ? locationEl.textContent?.trim() || 'Bergerac' : 'Bergerac';

          // Extract details from text content
          const text = card.textContent || '';
          
          // Surface (m²)
          const surfaceMatch = text.match(/(\d+)\s*m²/);
          const surface = surfaceMatch ? parseInt(surfaceMatch[1]) : null;
          
          // Rooms (pièces)
          const roomsMatch = text.match(/(\d+)\s*pièces?/);
          const rooms = roomsMatch ? parseInt(roomsMatch[1]) : null;
          
          // Bedrooms (chambres)
          const bedroomsMatch = text.match(/(\d+)\s*chambres?/);
          const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1]) : null;

          // Bathrooms (salles de bains)
          const bathroomsMatch = text.match(/(\d+)\s*salles?\s+de\s+bains?/);
          const bathrooms = bathroomsMatch ? parseInt(bathroomsMatch[1]) : null;

          // Extract image
          const imgEl = card.querySelector('img');
          const image = imgEl ? (imgEl as HTMLImageElement).src : '';

          // Extract description
          const descEl = card.querySelector('p, .description, [class*="desc"]');
          const description = descEl ? descEl.textContent?.trim() || '' : '';

          if (price) { // Only add if we found a price
            listings.push({
              url: url || window.location.href,
              title,
              price,
              location,
              surface,
              rooms,
              bedrooms,
              bathrooms,
              image,
              description,
            });
          }
        } catch (err) {
          console.error('Error parsing listing:', err);
        }
      });

      return listings;
    });

    console.log(`✅ Found ${properties.length} CAD-IMMO listings`);

    const formattedProperties: ScrapedProperty[] = properties.map((p, index) => {
      const postalCode = extractPostalCode(p.location) || '24100'; // Default to Bergerac
      const department = postalCode ? postalCode.substring(0, 2) : '24';

      return {
        source: 'cadimmo',
        source_id: p.url ? p.url.split('/').pop() || `cadimmo-${index}` : `cadimmo-${index}`,
        url: p.url,
        title: p.title,
        description: p.description || undefined,
        price: p.price,
        location_city: p.location || 'Bergerac',
        location_department: department,
        location_postal_code: postalCode,
        property_type: guessPropertyType(p.title),
        surface: p.surface,
        rooms: p.rooms,
        bedrooms: p.bedrooms,
        images: p.image ? [p.image] : [],
        raw_data: {
          bathrooms: p.bathrooms,
          scrapedAt: new Date().toISOString(),
        },
      };
    });

    await browser.close();
    return formattedProperties;
  } catch (error) {
    console.error('❌ CAD-IMMO scrape error:', error);
    if (browser) await browser.close();
    return [];
  }
}

// ===== EXISTING LEBONCOIN SCRAPER (keep this for future use) =====
async function scrapeLeboncoinPuppeteer(searchUrl: string): Promise<ScrapedProperty[]> {
  let browser;
  
  try {
    console.log('🔌 Connecting to existing Chrome instance...');
    const puppeteer = await initPuppeteer();
    
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    
    console.log('🔍 Navigating to:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.screenshot({ path: 'leboncoin_screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved');

    console.log('⏳ Waiting for listings...');
    await page.waitForSelector('a[href*="/ventes_immobilieres/"]', { timeout: 15000 });

    console.log('📄 Extracting data...');

    const properties = await page.evaluate(() => {
      const listings: Array<{
        sourceId: string;
        url: string;
        title: string;
        price: number | null;
        location: string;
        surface: number | null;
        rooms: number | null;
        image: string;
        attributesText: string;
      }> = [];

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
        bedrooms: null,
        images: p.image ? [p.image] : [],
        raw_data: {
          attributesText: p.attributesText,
          scrapedAt: new Date().toISOString(),
        },
      };
    });

    await browser.disconnect();
    return formattedProperties;
  } catch (error) {
    console.error('❌ Puppeteer scrape error:', error);
    if (browser) await browser.disconnect();
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
          description: prop.description || null,
          price: prop.price,
          location_city: prop.location_city,
          location_department: prop.location_department,
          location_postal_code: prop.location_postal_code,
          property_type: prop.property_type,
          surface: prop.surface,
          rooms: prop.rooms,
          bedrooms: prop.bedrooms,
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
    const { searchUrl, source = 'cadimmo' } = body;

    console.log('🚀 Scrape request:', { searchUrl, source });

    if (!searchUrl) {
      return NextResponse.json({ error: 'searchUrl required' }, { status: 400 });
    }

    let properties: ScrapedProperty[] = [];

    if (source === 'cadimmo') {
      properties = await scrapeCadImmo(searchUrl);
    } else if (source === 'leboncoin') {
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
    message: 'Scraper API ready (Supports: cadimmo, leboncoin)',
    usage: 'POST with { "searchUrl": "url", "source": "cadimmo" }',
  });
}
