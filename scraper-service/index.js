const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chromium = require('@sparticuz/chromium');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('✅ Supabase client created successfully');

// ========================================
// VALIDATION UTILITIES
// ========================================

function validatePropertyData(data) {
  const errors = [];
  let qualityScore = 1.0;

  if (!data.price || data.price < 1000 || data.price > 10000000) {
    errors.push('Invalid price range');
    qualityScore -= 0.2;
  }

  if (data.surface && (data.surface < 10 || data.surface > 2000)) {
    errors.push('Surface out of reasonable range');
    qualityScore -= 0.2;
  }

  if (data.rooms && (data.rooms < 1 || data.rooms > 20)) {
    errors.push('Rooms count suspicious');
    qualityScore -= 0.2;
  }

  if (data.bedrooms && data.rooms && data.bedrooms > data.rooms) {
    errors.push('Bedrooms exceeds total rooms');
    qualityScore -= 0.2;
  }

  if (data.rooms && data.rooms > 50) {
    errors.push('Rooms value appears to be concatenated with other data');
    qualityScore -= 0.3;
  }

  if (data.land_surface && data.land_surface > 1000000) {
    errors.push('Land surface suspiciously large');
    qualityScore -= 0.2;
  }

  return {
    isValid: errors.length === 0,
    errors,
    qualityScore: Math.max(0, qualityScore)
  };
}

function cleanText(text) {
  return text ? text.replace(/\s+/g, ' ').trim() : '';
}

// ========================================
// CAD-IMMO EXTRACTION
// ========================================

async function extractPropertyData(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 1500));

    const propertyData = await page.evaluate(() => {
      const data = {};

      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : '';
      };

      const getListItemValue = (keyword) => {
        const items = document.querySelectorAll('.summary li, ul li');
        for (const item of items) {
          const text = item.textContent;
          if (text.includes(keyword)) {
            return text;
          }
        }
        return '';
      };

      data.title = getText('h1') || getText('.property-title-4') || getText('.title');

      const priceText = getText('.price') || getText('[class*="price"]') || getText('[class*="Price"]');
      const priceMatch = priceText.match(/(\d[\d\s]+)\s*€/);
      data.price = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, '')) : null;

      const refText = getListItemValue('Référence');
      const refMatch = refText.match(/Référence\s+(\d+)/i);
      data.reference = refMatch ? refMatch[1] : null;

      const roomsText = getListItemValue('Pièces');
      const roomsMatch = roomsText.match(/(\d+)\s*pièces?/i);
      data.rooms = roomsMatch ? parseInt(roomsMatch[1]) : null;

      const bedroomsText = getListItemValue('chambres');
      const bedroomsMatch = bedroomsText.match(/(\d+)\s*chambres?/i);
      data.bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1]) : null;

      const surfaceText = getListItemValue('Surface');
      const surfaceMatch = surfaceText.match(/(\d+)\s*m/i);
      data.building_surface = surfaceMatch ? parseInt(surfaceMatch[1]) : null;

      const landText = getListItemValue('Terrain');
      if (landText) {
        const landMatch = landText.match(/(\d+)\s*m/i);
        data.land_surface = landMatch ? parseInt(landMatch[1]) : null;
      }

      const floorText = getListItemValue('Étage');
      if (floorText.includes('Plain-pied')) {
        data.floors = 1;
      } else {
        const floorMatch = floorText.match(/(\d+)\s*étages?/i);
        data.floors = floorMatch ? parseInt(floorMatch[1]) : null;
      }

      const titleLower = data.title.toLowerCase();
      if (titleLower.includes('maison')) {
        data.property_type = 'House/Villa';
      } else if (titleLower.includes('appartement')) {
        data.property_type = 'Apartment';
      } else if (titleLower.includes('terrain')) {
        data.property_type = 'Land (Terrain)';
      } else if (titleLower.includes('immeuble')) {
        data.property_type = 'Building';
      } else {
        data.property_type = null;
      }

      const LOGO_HASH = '52600504a0dbbe5c433dd0e783a78880';
      const images = [];
      
      const galleryImages = document.querySelectorAll(
        '.slider-images img, ' +
        '.property-gallery img, ' +
        '.carousel img, ' +
        '[class*="gallery"] img, ' +
        '[class*="slider"] img, ' +
        '[class*="photos"] img, ' +
        '.pictures img'
      );

      galleryImages.forEach(img => {
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy');
        if (src && 
            src.includes('cloudfront') && 
            !src.includes(LOGO_HASH) &&
            !src.includes('logo') &&
            img.naturalWidth > 200) {
          images.push(src);
        }
      });

      data.additionalImages = [...new Set(images)];

      const descEl = document.querySelector('#description') || 
                     document.querySelector('.comment') ||
                     document.querySelector('[class*="description"]');
      data.description = descEl ? descEl.textContent.trim().substring(0, 500) : '';

      return data;
    });

    return propertyData;

  } catch (error) {
    console.error(`❌ Error extracting ${url}:`, error.message);
    return null;
  }
}

// ========================================
// AGENCE ELEONOR LISTING EXTRACTION
// ========================================

async function extractEleonorListingCards(page) {
  return await page.evaluate(() => {
    const cards = [];
    const clean = s => s ? s.replace(/\s+/g, ' ').trim() : '';

    // Find all cards using the iconText div as anchor
    const iconTextDivs = Array.from(document.querySelectorAll('div._eic3rb.iconText'));

    iconTextDivs.forEach(iconDiv => {
      try {
        // Walk up to find the card container
        let card = iconDiv.closest('article') || 
                   iconDiv.closest('a[href*="/fr/vente/"]') || 
                   iconDiv.closest('div[class*="_nhv2ha"]')?.parentElement;

        if (!card) {
          // Try alternate strategy: find parent that contains both link and price
          let current = iconDiv.parentElement;
          for (let i = 0; i < 5 && current; i++) {
            if (current.querySelector('a[href*="/fr/vente/"]') && 
                current.querySelector('[class*="_1s1nzvi"], [class*="_11w5q3n"]')) {
              card = current;
              break;
            }
            current = current.parentElement;
          }
        }

        if (!card) return;

        // Extract link
        const linkEl = card.querySelector('a[href*="/fr/vente/"][href*=",VM"]');
        if (!linkEl) return;
        
        const url = linkEl.href;

        // Extract price
        const priceEl = card.querySelector('span._1s1nzvi, div._11w5q3n');
        let price = null;
        if (priceEl) {
          const priceText = clean(priceEl.textContent);
          const match = priceText.match(/(\d[\d\s ]*)\s*€/);
          if (match) {
            price = parseInt(match[1].replace(/[^\d]/g, ''), 10);
          }
        }

        // Extract title
        const titleEl = card.querySelector('h2._i5yy8z, h2[class*="_prm2ej"]');
        const title = titleEl ? clean(titleEl.textContent) : null;

        // Extract summary info from iconText
        const summary = clean(iconDiv.textContent);
        
        // Parse rooms
        const roomsMatch = summary.match(/(\d+)\s*pièces?/i);
        const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : null;

        // Parse surface
        const surfaceMatch = summary.match(/(\d+)\s*m[²2]/i);
        const building_surface = surfaceMatch ? parseInt(surfaceMatch[1], 10) : null;

        // Parse location (city + postal code)
        const locationMatch = summary.match(/([A-Za-zÀ-ÿ'\- ]+)\s+(\d{5})$/);
        const city = locationMatch ? locationMatch[1].trim() : null;
        const postal_code = locationMatch ? locationMatch[2] : null;

        // Extract hero image
        let heroImage = null;
        const imgEl = card.querySelector('img[src*="netty."], img[srcset*="netty."]');
        if (imgEl) {
          const src = imgEl.currentSrc || 
                      imgEl.src || 
                      imgEl.getAttribute('data-src') || 
                      (imgEl.getAttribute('srcset') || '').split(' ')[0];
          
          if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('placeholder')) {
            heroImage = src;
          }
        }

        cards.push({
          url,
          price,
          title,
          rooms,
          building_surface,
          city,
          postal_code,
          heroImage,
          summary
        });

      } catch (err) {
        console.error('Card extraction error:', err);
      }
    });

    // Remove duplicates by URL
    const unique = new Map();
    cards.forEach(card => {
      if (card.url && !unique.has(card.url)) {
        unique.set(card.url, card);
      }
    });

    return Array.from(unique.values());
  });
}

// ========================================
// AGENCE ELEONOR DETAIL EXTRACTION
// ========================================

async function extractEleonorPropertyData(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const propertyData = await page.evaluate(() => {
      const data = {};
      const clean = (txt) => txt ? txt.replace(/\s+/g, ' ').trim() : '';

      // ===== TITLE =====
      const h1 = document.querySelector('h1');
      data.title = clean(h1 ? h1.textContent : '');

      if (data.title.includes('À vendre -')) {
        data.title = data.title.replace('À vendre - ', '').split('|')[0].trim();
      }

      // ===== REFERENCE (from URL) =====
      const urlParts = window.location.pathname.split(',');
      data.reference = urlParts[urlParts.length - 1] || null;

      // ===== PROPERTY TYPE FROM TITLE =====
      const tl = data.title.toLowerCase();
      if (tl.includes('maison') || tl.includes('villa') || tl.includes('manoir')) {
        data.property_type = 'House/Villa';
      } else if (tl.includes('appartement')) {
        data.property_type = 'Apartment';
      } else if (tl.includes('terrain')) {
        data.property_type = 'Land (Terrain)';
      } else if (tl.includes('immeuble')) {
        data.property_type = 'Building';
      } else {
        data.property_type = null;
      }

      // ===== PRICE =====
      let priceText = '';
      const priceP = document.querySelector('p._1hxffol');

      if (priceP) {
        priceText = clean(priceP.textContent);
      } else {
        const maybe = Array.from(document.querySelectorAll('p, div, span')).find(el => {
          const t = el.textContent;
          return t && t.includes('€') && /\d/.test(t) && t.length < 40;
        });
        priceText = maybe ? clean(maybe.textContent) : '';
      }

      const priceMatch = priceText.match(/(\d[\d\s ]*)\s*€/);
      data.price = priceMatch ? parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10) : null;

      // ===== FEATURES =====
      data.rooms = null;
      data.bedrooms = null;
      data.building_surface = null;
      data.land_surface = null;

      const featureItems = Array.from(document.querySelectorAll('ul li'))
        .map(li => clean(li.textContent))
        .filter(t => t.length > 0 && t.length < 120);

      featureItems.forEach(text => {
        const lower = text.toLowerCase();

        if (!data.rooms && lower.includes('pièce')) {
          const m = text.match(/(\d+)\s*pièces?/i);
          if (m) data.rooms = parseInt(m[1], 10);
        }

        if (!data.bedrooms && lower.includes('chambre')) {
          const m = text.match(/(\d+)\s*chambres?/i);
          if (m) data.bedrooms = parseInt(m[1], 10);
        }

        if (
          !data.building_surface &&
          lower.includes('surface') &&
          !lower.includes('terrain') &&
          lower.includes('m')
        ) {
          const m = text.match(/(\d[\d\s ]*)\s*m[²2]/i);
          if (m) {
            const val = parseInt(m[1].replace(/[^\d]/g, ''), 10);
            if (val >= 10 && val <= 2000) data.building_surface = val;
          }
        }

        if ((lower.includes('terrain') || lower.includes('parcelle') || lower.includes('land')) && lower.includes('m')) {
          const m = text.match(/(\d[\d\s ]*)\s*m[²2]/i);
          if (m) {
            const val = parseInt(m[1].replace(/[^\d]/g, ''), 10);
            if (!data.land_surface || val > data.land_surface) data.land_surface = val;
          }
        }

        if (!data.city || !data.postal_code) {
          const loc = text.match(/([A-Za-zÀ-ÿ'\- ]+)\s+(\d{5})/);
          if (loc) {
            data.city = loc[1].trim();
            data.postal_code = loc[2];
          }
        }
      });

      // ===== LOCATION FALLBACK =====
      if (!data.city || !data.postal_code) {
        const docTitle = document.querySelector('title');
        if (docTitle) {
          const t = clean(docTitle.textContent);
          const loc = t.match(/situé à\s+([A-Za-zÀ-ÿ'\- ]+)\s*\((\d{5})\)/i);
          if (loc) {
            if (!data.city) data.city = loc[1].trim();
            if (!data.postal_code) data.postal_code = loc[2];
          }
        }
      }

      // ===== IMAGES =====
      const LOGO_PATTERNS = ['logo', 'icon', 'placeholder'];
      const images = [];
      document.querySelectorAll('img').forEach(img => {
        const src =
          img.currentSrc ||
          img.src ||
          img.getAttribute('data-src') ||
          (img.getAttribute('srcset') || '').split(' ')[0];
        if (
          src &&
          src.includes('netty.') &&
          !LOGO_PATTERNS.some(p => src.toLowerCase().includes(p)) &&
          img.naturalWidth > 100
        ) {
          images.push(src);
        }
      });
      data.additionalImages = Array.from(new Set(images));

      // ===== DESCRIPTION =====
      const descEl =
        document.querySelector('[class*="description"]') ||
        document.querySelector('.comment') ||
        document.querySelector('section [class*="text"], article [class*="text"]');

      data.description = descEl ? clean(descEl.textContent).substring(0, 500) : '';

      return data;
    });

    console.log(`✅ ${propertyData.reference}: ${propertyData.title.substring(0, 60)}`);
    console.log(
      `   💰 €${propertyData.price || 'N/A'} | 🛏️ ${propertyData.rooms || 'N/A'} pcs | 🚪 ${
        propertyData.bedrooms || 'N/A'
      } ch | 📐 ${propertyData.building_surface || 'N/A'}m²`
    );
    console.log(`   📍 ${propertyData.city || 'N/A'} ${propertyData.postal_code || ''}`);

    return propertyData;
  } catch (error) {
    console.error(`❌ Error extracting ${url}:`, error.message);
    return null;
  }
}

// ========================================
// HOME ROUTE
// ========================================

app.get('/', (req, res) => {
  res.json({ 
    status: 'Barracuda Scraper Service v2.4',
    features: ['CAD-IMMO scraper', 'Agence Eleonor scraper with listing extraction'],
    endpoints: ['/scrape', '/scrape-eleonor', '/debug-eleonor-property']
  });
});

// ========================================
// CAD-IMMO SCRAPER ENDPOINT
// ========================================

app.post('/scrape', async (req, res) => {
  try {
    const { searchUrl, maxPages = 3 } = req.body;

    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    console.log('🎯 Starting CAD-IMMO scrape:', searchUrl);

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || chromium.executablePath,
      headless: true,
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const allProperties = [];
    const validationStats = { valid: 0, invalid: 0, total: 0 };

    let currentPage = 1;
    const propertyUrls = new Map();

    while (currentPage <= maxPages) {
      console.log(`📄 Scraping CAD-IMMO listing page ${currentPage}...`);

      const pageUrl = currentPage === 1 
        ? searchUrl 
        : `${searchUrl}?page=${currentPage}`;

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(resolve => setTimeout(resolve, 1000));

        const listings = await page.evaluate(() => {
          const LOGO_HASH = '52600504a0dbbe5c433dd0e783a78880';
          const results = [];

          const cards = document.querySelectorAll(
            'article, .property, .item, .listing-card, [class*="property-card"], [class*="listing"]'
          );

          cards.forEach(card => {
            const link = card.querySelector('a[href*="/fr/propriete/"]');
            if (!link) return;

            const url = link.href;
            if (!url || !url.includes('cad-immo.com')) return;

            let heroImage = null;
            const images = card.querySelectorAll('img');
            
            for (const img of images) {
              if (img.complete && img.naturalWidth > 0) {
                const src = img.currentSrc || img.src;
                
                if (src && 
                    src.includes('cloudfront') && 
                    !src.includes(LOGO_HASH) &&
                    !src.includes('logo') &&
                    !src.includes('icon') &&
                    !src.includes('placeholder')) {
                  heroImage = src;
                  break;
                }
              }
            }

            if (!heroImage) {
              for (const img of images) {
                const src = img.getAttribute('data-src') || 
                            img.getAttribute('data-lazy') ||
                            img.getAttribute('data-original') ||
                            (img.dataset ? img.dataset.src : null);
                            
                if (src && 
                    src.includes('cloudfront') && 
                    !src.includes(LOGO_HASH) &&
                    !src.includes('logo') &&
                    !src.includes('icon') &&
                    !src.includes('placeholder')) {
                  heroImage = src;
                  break;
                }
              }
            }

            results.push({ url, heroImage });
          });

          return results;
        });

        if (listings.length === 0) {
          console.log(`   ✅ Reached end of CAD-IMMO listings at page ${currentPage - 1}`);
          break;
        }

        listings.forEach(listing => {
          if (listing.url && !propertyUrls.has(listing.url)) {
            propertyUrls.set(listing.url, listing.heroImage);
          }
        });

        console.log(`   Found ${listings.length} properties on page ${currentPage}`);
        console.log(`   With hero images: ${listings.filter(l => l.heroImage).length}`);

        currentPage++;
      } catch (pageError) {
        console.error(`Error on listing page ${currentPage}:`, pageError.message);
        break;
      }
    }

    console.log(`\n✅ Found ${propertyUrls.size} unique CAD-IMMO properties\n`);

    let scrapedCount = 0;
    for (const [propUrl, heroImage] of propertyUrls.entries()) {
      const propertyData = await extractPropertyData(page, propUrl);

      if (!propertyData || !propertyData.price) {
        console.log(`⚠️  Skipping ${propUrl} - no valid data`);
        continue;
      }

      const finalImages = [];
      if (heroImage) finalImages.push(heroImage);
      
      if (propertyData.additionalImages && propertyData.additionalImages.length > 0) {
        propertyData.additionalImages.forEach(img => {
          if (img !== heroImage) finalImages.push(img);
        });
      }

      propertyData.images = finalImages.slice(0, 10);

      const validation = validatePropertyData({
        price: propertyData.price,
        surface: propertyData.building_surface,
        rooms: propertyData.rooms,
        bedrooms: propertyData.bedrooms,
        land_surface: propertyData.land_surface
      });

      validationStats.total++;
      if (validation.isValid) {
        validationStats.valid++;
      } else {
        validationStats.invalid++;
      }

      allProperties.push({
        url: propUrl,
        ...propertyData,
        data_quality_score: validation.qualityScore,
        validation_errors: validation.errors
      });

      scrapedCount++;

      if (scrapedCount % 5 === 0) {
        console.log(`   Scraped ${scrapedCount}/${propertyUrls.size} properties...`);
      }

      const imageCount = propertyData.images.length;
      console.log(`   ✓ ${imageCount} images for ${propertyData.title} (hero: ${heroImage ? '✓' : '✗'})`);
    }

    await browser.close();

    console.log(`\n✅ CAD-IMMO scraping complete: ${allProperties.length} properties\n`);

    let inserted = 0;

    for (const prop of allProperties) {
      try {
        const urlParts = prop.url.split('+');
        const sourceId = urlParts[urlParts.length - 1] || `cadimmo-${Date.now()}`;

        let city = 'Bergerac';
        if (urlParts.length >= 3) {
          city = urlParts[2]
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('-');
        }

        const dbData = {
          source: 'cadimmo',
          source_id: sourceId,
          reference: prop.reference,
          url: prop.url,
          title: prop.title,
          description: prop.description,
          price: prop.price,
          location_city: city,
          location_department: '24',
          location_postal_code: '24100',
          property_type: prop.property_type,
          surface: prop.building_surface,
          building_surface: prop.building_surface,
          land_surface: prop.land_surface,
          rooms: prop.rooms,
          bedrooms: prop.bedrooms,
          floors: prop.floors,
          images: prop.images || [],
          data_quality_score: prop.data_quality_score,
          validation_errors: prop.validation_errors,
          last_seen_at: new Date().toISOString(),
          raw_data: { 
            scrapedAt: new Date().toISOString(),
            scraper_version: '2.4',
            imageCount: prop.images?.length || 0,
            hasHeroImage: prop.images && prop.images.length > 0
          }
        };

        const { error } = await supabase
          .from('properties')
          .upsert(dbData, { 
            onConflict: 'source,source_id',
            returning: 'minimal'
          });

        if (error) {
          console.error(`Save error:`, error.message);
        } else {
          inserted++;
        }

      } catch (err) {
        console.error('Save error:', err.message);
      }
    }

    res.json({
      success: true,
      source: 'cadimmo',
      totalScraped: allProperties.length,
      inserted,
      validation: validationStats,
      imageStats: {
        withImages: allProperties.filter(p => p.images && p.images.length > 0).length,
        avgImagesPerProperty: allProperties.length > 0 
          ? (allProperties.reduce((sum, p) => sum + (p.images?.length || 0), 0) / allProperties.length).toFixed(1)
          : 0
      },
      properties: allProperties.slice(0, 5).map(p => ({
        url: p.url,
        title: p.title,
        price: p.price,
        rooms: p.rooms,
        surface: p.building_surface,
        imageCount: p.images?.length || 0,
        quality: p.data_quality_score,
        errors: p.validation_errors
      }))
    });

  } catch (error) {
    console.error('❌ CAD-IMMO scraping failed:', error);
    res.status(500).json({
      error: 'Scraping failed',
      details: error.message,
    });
  }
});

// ========================================
// AGENCE ELEONOR SCRAPER ENDPOINT (NEW)
// ========================================

app.post('/scrape-eleonor', async (req, res) => {
  try {
    const { searchUrl, maxPages = 3 } = req.body;

    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    console.log('🎯 Starting Agence Eleonor scrape:', searchUrl);

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || chromium.executablePath,
      headless: true,
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const allProperties = [];
    const validationStats = { valid: 0, invalid: 0, total: 0 };

    let currentPageNum = 1;
    const propertyMap = new Map();

    // STEP 1: Extract all cards from listing pages
    while (currentPageNum <= maxPages) {
      console.log(`📄 Scraping Eleonor listing page ${currentPageNum}...`);

      const pageUrl = currentPageNum === 1 
        ? searchUrl 
        : `${searchUrl}${searchUrl.includes('?') ? '&' : '?'}page=${currentPageNum}`;

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(resolve => setTimeout(resolve, 1000));

        const cards = await extractEleonorListingCards(page);

        if (cards.length === 0) {
          console.log(`   ✅ Reached end of Eleonor listings at page ${currentPageNum - 1}`);
          break;
        }

        cards.forEach(card => {
          if (card.url && !propertyMap.has(card.url)) {
            propertyMap.set(card.url, card);
          }
        });

        console.log(`   Found ${cards.length} Eleonor properties on page ${currentPageNum}`);
        console.log(`   With prices: ${cards.filter(c => c.price).length}`);
        console.log(`   With hero images: ${cards.filter(c => c.heroImage).length}`);

        currentPageNum++;
      } catch (pageError) {
        console.error(`Error on listing page ${currentPageNum}:`, pageError.message);
        break;
      }
    }

    console.log(`\n✅ Found ${propertyMap.size} unique Eleonor properties from listing pages\n`);

    // STEP 2: Enrich each property with detail page data
    let scrapedCount = 0;
    for (const [propUrl, listingData] of propertyMap.entries()) {
      const detailData = await extractEleonorPropertyData(page, propUrl);

      if (!detailData) {
        console.log(`⚠️  Skipping ${propUrl} - detail page failed`);
        continue;
      }

      // Merge listing data with detail data (detail takes priority)
      const propertyData = {
        ...listingData,
        ...detailData,
        // Use listing price if detail doesn't have one
        price: detailData.price || listingData.price,
        rooms: detailData.rooms || listingData.rooms,
        building_surface: detailData.building_surface || listingData.building_surface,
        city: detailData.city || listingData.city,
        postal_code: detailData.postal_code || listingData.postal_code
      };

      if (!propertyData.price) {
        console.log(`⚠️  Skipping ${propUrl} - no valid price`);
        continue;
      }

      // Combine images: hero first, then additional
      const finalImages = [];
      if (listingData.heroImage) finalImages.push(listingData.heroImage);
      
      if (propertyData.additionalImages && propertyData.additionalImages.length > 0) {
        propertyData.additionalImages.forEach(img => {
          if (img !== listingData.heroImage) finalImages.push(img);
        });
      }

      propertyData.images = finalImages.slice(0, 10);

      const validation = validatePropertyData({
        price: propertyData.price,
        surface: propertyData.building_surface,
        rooms: propertyData.rooms,
        bedrooms: propertyData.bedrooms,
        land_surface: propertyData.land_surface
      });

      validationStats.total++;
      if (validation.isValid) {
        validationStats.valid++;
      } else {
        validationStats.invalid++;
      }

      allProperties.push({
        url: propUrl,
        ...propertyData,
        data_quality_score: validation.qualityScore,
        validation_errors: validation.errors
      });

      scrapedCount++;

      if (scrapedCount % 5 === 0) {
        console.log(`   Scraped ${scrapedCount}/${propertyMap.size} Eleonor properties...`);
      }

      const imageCount = propertyData.images.length;
      console.log(`   ✓ ${imageCount} images for ${propertyData.title.substring(0, 50)} (hero: ${listingData.heroImage ? '✓' : '✗'})`);
    }

    await browser.close();

    console.log(`\n✅ Eleonor scraping complete: ${allProperties.length} properties\n`);

    // STEP 3: Save to database
    let inserted = 0;

    for (const prop of allProperties) {
      try {
        const refMatch = prop.url.match(/VM\d+/);
        const sourceId = refMatch ? refMatch[0] : `eleonor-${Date.now()}`;

        const dbData = {
          source: 'eleonor',
          source_id: sourceId,
          reference: prop.reference,
          url: prop.url,
          title: prop.title,
          description: prop.description,
          price: prop.price,
          location_city: prop.city || 'Unknown',
          location_postal_code: prop.postal_code || '24000',
          location_department: prop.postal_code?.substring(0, 2) || '24',
          property_type: prop.property_type,
          surface: prop.building_surface,
          building_surface: prop.building_surface,
          land_surface: prop.land_surface,
          rooms: prop.rooms,
          bedrooms: prop.bedrooms,
          images: prop.images || [],
          data_quality_score: prop.data_quality_score,
          validation_errors: prop.validation_errors,
          last_seen_at: new Date().toISOString(),
          raw_data: { 
            scrapedAt: new Date().toISOString(),
            scraper_version: '2.4',
            source: 'eleonor',
            imageCount: prop.images?.length || 0
          }
        };

        const { error } = await supabase
          .from('properties')
          .upsert(dbData, { 
            onConflict: 'source,source_id',
            returning: 'minimal'
          });

        if (error) {
          console.error(`Save error:`, error.message);
        } else {
          inserted++;
        }

      } catch (err) {
        console.error('Save error:', err.message);
      }
    }

    res.json({
      success: true,
      source: 'eleonor',
      totalScraped: allProperties.length,
      inserted,
      validation: validationStats,
      imageStats: {
        withImages: allProperties.filter(p => p.images && p.images.length > 0).length,
        avgImagesPerProperty: allProperties.length > 0 
          ? (allProperties.reduce((sum, p) => sum + (p.images?.length || 0), 0) / allProperties.length).toFixed(1)
          : 0
      },
      properties: allProperties.slice(0, 5).map(p => ({
        url: p.url,
        title: p.title,
        price: p.price,
        city: p.city,
        rooms: p.rooms,
        surface: p.building_surface,
        imageCount: p.images?.length || 0,
        quality: p.data_quality_score
      }))
    });

  } catch (error) {
    console.error('❌ Eleonor scraping failed:', error);
    res.status(500).json({
      error: 'Scraping failed',
      details: error.message,
    });
  }
});

// ========================================
// DEBUG ENDPOINT
// ========================================

app.post('/debug-eleonor-property', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'url parameter required' });
    }

    console.log('🔍 Debugging Eleonor property:', url);

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || chromium.executablePath,
      headless: true,
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const debug = await page.evaluate(() => {
      const trySelectors = (selectors) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent.trim()) {
            return {
              selector: sel,
              text: el.textContent.trim(),
              html: el.innerHTML.substring(0, 200)
            };
          }
        }
        return null;
      };

      return {
        title: trySelectors(['h1', '[class*="title"]', '[class*="Title"]', '.property-title', 'h2']),
        price: trySelectors(['[class*="price"]', '[class*="Price"]', '.price', '[class*="montant"]', '[class*="amount"]']),
        reference: trySelectors(['[class*="ref"]', '[class*="Ref"]', '[class*="reference"]', '.reference']),
        features: trySelectors(['[class*="feature"]', '[class*="characteristic"]', '[class*="detail"]', 'ul li', '[class*="info"]']),
        classNames: Array.from(document.querySelectorAll('[class]'))
          .slice(0, 50)
          .map(el => el.className)
          .filter(c => c && typeof c === 'string'),
        numberedElements: Array.from(document.querySelectorAll('*'))
          .filter(el => {
            const text = el.textContent;
            return text && 
                   text.length < 100 && 
                   /\d+/.test(text) && 
                   (text.includes('€') || text.includes('m²') || text.includes('pièce') || text.includes('chambre'));
          })
          .slice(0, 20)
          .map(el => ({
            tag: el.tagName.toLowerCase(),
            class: el.className,
            text: el.textContent.trim()
          }))
      };
    });

    await browser.close();

    res.json({ url, debug });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// TEST ENDPOINT
// ========================================

app.get('/test-logs', (req, res) => {
  console.log('========================================');
  console.log('🧪 TEST ENDPOINT CALLED');
  console.log('Time:', new Date().toISOString());
  console.log('========================================');
  
  res.json({ 
    message: 'Check Railway logs now!',
    time: new Date().toISOString()
  });
});

// ========================================
// SERVER START
// ========================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Scraper service v2.4 running on port ${PORT}`);
});
