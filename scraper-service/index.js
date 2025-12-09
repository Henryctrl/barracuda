const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chromium = require('@sparticuz/chromium');
const { createClient } = require('@supabase/supabase-js');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

puppeteer.use(StealthPlugin());

const app = express();
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


// INSERT EXTRA AGENCIES HERE ----------------------------------------------------------------


// ========================================
// AGENCE ELEONOR EXTRACTION
// ========================================

async function extractEleonorPropertyData(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 1500));

    const propertyData = await page.evaluate(() => {
      const data = {};

      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : '';
      };

      const getMetaValue = (label) => {
        const items = document.querySelectorAll('.features-list li, .caracteristiques li, .property-features li');
        for (const item of items) {
          const text = item.textContent.toLowerCase();
          if (text.includes(label)) {
            const match = text.match(/\d+/);
            return match ? parseInt(match[0]) : null;
          }
        }
        return null;
      };

      data.title = getText('h1') || getText('.property-title') || getText('[class*="title"]');

      const priceText = getText('.price') || getText('[class*="price"]') || getText('[class*="Price"]');
      const priceMatch = priceText.match(/(\d[\d\s]+)\s*€/);
      data.price = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, '')) : null;

      const refText = getText('.reference') || getText('[class*="ref"]');
      const refMatch = refText.match(/VM\d+|REF[\s:]?\d+/i);
      data.reference = refMatch ? refMatch[0] : null;

      const titleLower = data.title.toLowerCase();
      if (titleLower.includes('maison') || titleLower.includes('villa')) {
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

      const piecesMatch = data.title.match(/(\d+)\s*pièces?/i);
      data.rooms = piecesMatch ? parseInt(piecesMatch[1]) : getMetaValue('pièce');

      const chambresMatch = data.title.match(/(\d+)\s*chambres?/i);
      data.bedrooms = chambresMatch ? parseInt(chambresMatch[1]) : getMetaValue('chambre');

      const surfaceText = getText('[class*="surface"]') || getText('.area');
      const surfaceMatch = surfaceText.match(/(\d+)\s*m/i) || data.title.match(/(\d+)\s*m²/);
      data.building_surface = surfaceMatch ? parseInt(surfaceMatch[1]) : getMetaValue('surface');

      data.land_surface = getMetaValue('terrain');

      const urlParts = window.location.pathname.split('-');
      if (urlParts.length >= 2) {
        const lastPart = urlParts[urlParts.length - 2];
        data.city = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
      }

      const postalMatch = window.location.pathname.match(/(\d{5})/);
      data.postal_code = postalMatch ? postalMatch[1] : null;

      const images = [];
      const galleryImages = document.querySelectorAll(
        '.gallery img, ' +
        '.slider img, ' +
        '[class*="gallery"] img, ' +
        '[class*="slider"] img, ' +
        '.property-images img, ' +
        'img[src*="images"]'
      );

      galleryImages.forEach(img => {
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy');
        if (src && 
            !src.includes('logo') &&
            !src.includes('icon') &&
            img.naturalWidth > 200) {
          images.push(src);
        }
      });

      data.additionalImages = [...new Set(images)];

      const descEl = document.querySelector('.description') || 
                     document.querySelector('[class*="description"]') ||
                     document.querySelector('.comment');
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
// HOME ROUTE
// ========================================

app.get('/', (req, res) => {
  res.json({ 
    status: 'Barracuda Scraper Service v2.3',
    features: ['CAD-IMMO scraper', 'Agence Eleonor scraper'],
    endpoints: ['/scrape', '/scrape-eleonor']
  });
});

// ========================================
// CAD-IMMO SCRAPER ENDPOINT
// ========================================

app.post('/scrape', async (req, res) => {
  try {
    const { searchUrl, maxPages = 3 } = req.body; // CHANGED FROM 3 TO 999

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
            scraper_version: '2.3',
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


//INSERT NEW AGENCY SCRAPE ENDPOINT HERE -----------------------------------------------


// ========================================
// AGENCE ELEONOR SCRAPER ENDPOINT (👈 NEW!)
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

    let currentPage = 1;
    const propertyUrls = new Map();

    while (currentPage <= maxPages) {
      console.log(`📄 Scraping Eleonor listing page ${currentPage}...`);

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
          const results = [];

          const cards = document.querySelectorAll(
            '.property-card, .property-item, .listing-card, article, [class*="property"], [class*="listing"]'
          );

          cards.forEach(card => {
            const link = card.querySelector('a[href*="/fr/vente/"]');
            if (!link) return;

            const url = link.href;
            if (!url || !url.includes('agence-eleonor.fr')) return;

            let heroImage = null;

            const images = card.querySelectorAll('img');
            for (const img of images) {
              if (img.complete && img.naturalWidth > 0) {
                const src = img.currentSrc || img.src;
                if (src && 
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
                const src = img.getAttribute('data-src') || img.getAttribute('data-lazy');
                if (src && !src.includes('logo')) {
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
          console.log(`   ✅ Reached end of Eleonor listings at page ${currentPage - 1}`);
          break;
        }

        listings.forEach(listing => {
          if (listing.url && !propertyUrls.has(listing.url)) {
            propertyUrls.set(listing.url, listing.heroImage);
          }
        });

        console.log(`   Found ${listings.length} Eleonor properties on page ${currentPage}`);
        console.log(`   With hero images: ${listings.filter(l => l.heroImage).length}`);

        currentPage++;
      } catch (pageError) {
        console.error(`Error on listing page ${currentPage}:`, pageError.message);
        break;
      }
    }

    console.log(`\n✅ Found ${propertyUrls.size} unique Eleonor properties\n`);

    let scrapedCount = 0;
    for (const [propUrl, heroImage] of propertyUrls.entries()) {
      const propertyData = await extractEleonorPropertyData(page, propUrl);

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
        console.log(`   Scraped ${scrapedCount}/${propertyUrls.size} Eleonor properties...`);
      }

      const imageCount = propertyData.images.length;
      console.log(`   ✓ ${imageCount} images for ${propertyData.title} (hero: ${heroImage ? '✓' : '✗'})`);
    }

    await browser.close();

    console.log(`\n✅ Eleonor scraping complete: ${allProperties.length} properties\n`);

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
          location_department: '24',
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
            scraper_version: '2.3',
            source: 'eleonor'
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
        imageCount: p.images?.length || 0
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
// SERVER START (MUST BE AT BOTTOM!)
// ========================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Scraper service v2.3 running on port ${PORT}`);
});
