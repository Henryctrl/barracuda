// src/app/api/scrape/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

async function scrapeCadImmo(searchUrl: string): Promise<ScrapedProperty[]> {
  let browser;
  
  try {
    const puppeteer = await initPuppeteer();
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: 'cadimmo_screenshot.png', fullPage: true });

    await page.waitForSelector('a[href*="/propriete/"]', { timeout: 10000 });

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

      const propertyLinks = document.querySelectorAll('a[href*="/propriete/"]');

      propertyLinks.forEach((link) => {
        try {
          const url = (link as HTMLAnchorElement).href;
          
          // Find the CLOSEST parent container
          let card: HTMLElement | null = (link as HTMLElement).parentElement;
          
          // Try to find a more specific card container
          while (card && !card.classList.contains('property') && !card.classList.contains('card') && card.tagName !== 'ARTICLE') {
            card = card.parentElement;
            // Stop if we've gone too far up
            if (card && (card.tagName === 'BODY' || card.tagName === 'MAIN' || card.id === 'root')) {
              card = (link as HTMLElement).parentElement;
              break;
            }
          }

          if (!card) card = link as HTMLElement;

          // Get text ONLY from this specific card
          const cardText = card.textContent || '';

          // Extract price
          const priceMatch = cardText.match(/(\d[\d\s]+)\s*€/);
          const price = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, '')) : null;

          if (!price) return; // Skip if no price

          // Extract image from THIS card's image
          const imgEl = link.querySelector('img.propertiesPicture') || 
                       link.querySelector('img') ||
                       (card ? card.querySelector('img.propertiesPicture') : null) ||
                       (card ? card.querySelector('img') : null);
          
          let image = '';
          if (imgEl) {
            image = (imgEl as HTMLImageElement).src;
          }

          // Get title from image alt or from heading
          let title = '';
          if (imgEl && (imgEl as HTMLImageElement).alt) {
            title = (imgEl as HTMLImageElement).alt;
          } else {
            const titleEl = card ? card.querySelector('h2, h3, h4, .title') : null;
            title = titleEl ? titleEl.textContent?.trim() || '' : '';
          }
          
          // Clean title
          title = title.replace(/[\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
          
          // If title is still empty, try to parse from URL
          if (!title) {
            const urlParts = url.split('+');
            if (urlParts.length > 1) {
              const type = urlParts[0].split('/').pop();
              const propertyType = urlParts[1];
              const city = urlParts[2];
              title = `${propertyType}, ${city}`;
            }
          }

          // Extract location from title
          const locationMatch = title.match(/,\s*([A-Za-zÀ-ÿ\s-]+)$/);
          const location = locationMatch ? locationMatch[1].trim() : 'Unknown';

          // Extract details from card text
          const surfaceMatch = cardText.match(/(\d+)\s*m²/);
          const surface = surfaceMatch ? parseInt(surfaceMatch[1]) : null;

          const roomsMatch = cardText.match(/(\d+)\s*pièces?/);
          const rooms = roomsMatch ? parseInt(roomsMatch[1]) : null;

          const bedroomsMatch = cardText.match(/(\d+)\s*chambres?/);
          const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1]) : null;

          const bathroomsMatch = cardText.match(/(\d+)\s*salles?\s+de\s+bains?/);
          const bathrooms = bathroomsMatch ? parseInt(bathroomsMatch[1]) : null;

          listings.push({
            url,
            title,
            price,
            location,
            surface,
            rooms,
            bedrooms,
            bathrooms,
            image,
            description: '',
          });
        } catch (err) {
          console.error('Error parsing property:', err);
        }
      });

      return listings;
    });

    const formattedProperties: ScrapedProperty[] = properties.map((p) => {
      const urlParts = p.url.split('+');
      const lastPart = urlParts[urlParts.length - 1];
      const uniqueId = lastPart || `cadimmo-${Date.now()}-${Math.random()}`;

      const postalCode = extractPostalCode(p.location) || '24100';
      const department = postalCode.substring(0, 2);

      return {
        source: 'cadimmo',
        source_id: uniqueId,
        url: p.url,
        title: p.title,
        description: p.description || undefined,
        price: p.price,
        location_city: p.location,
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
    if (browser) await browser.close();
    throw error;
  }
}

async function scrapeLeboncoinPuppeteer(searchUrl: string): Promise<ScrapedProperty[]> {
  let browser;
  
  try {
    const puppeteer = await initPuppeteer();
    browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: 'leboncoin_screenshot.png', fullPage: true });
    await page.waitForSelector('a[href*="/ventes_immobilieres/"]', { timeout: 15000 });

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

          listings.push({ sourceId, url, title, price, location, surface, rooms, image, attributesText });
        } catch (err) {
          // Skip
        }
      });

      return listings;
    });

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
        raw_data: { attributesText: p.attributesText, scrapedAt: new Date().toISOString() },
      };
    });

    await browser.disconnect();
    return formattedProperties;
  } catch (error) {
    if (browser) await browser.disconnect();
    throw error;
  }
}

async function saveProperties(properties: ScrapedProperty[]) {
  const results = { inserted: 0, updated: 0, errors: 0 };

  for (const prop of properties) {
    try {
      const { error } = await supabase.from('properties').upsert({
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
      }, { onConflict: 'source,source_id' });

      if (error) {
        results.errors++;
      } else {
        results.inserted++;
      }
    } catch (err) {
      results.errors++;
    }
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchUrl, source = 'cadimmo' } = body;

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
