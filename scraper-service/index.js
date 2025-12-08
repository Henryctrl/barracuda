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

  // Validate price
  if (!data.price || data.price < 1000 || data.price > 10000000) {
    errors.push('Invalid price range');
    qualityScore -= 0.2;
  }

  // Validate surface (should be reasonable for a property)
  if (data.surface && (data.surface < 10 || data.surface > 2000)) {
    errors.push('Surface out of reasonable range');
    qualityScore -= 0.2;
  }

  // Validate rooms (should be 1-20 for most properties)
  if (data.rooms && (data.rooms < 1 || data.rooms > 20)) {
    errors.push('Rooms count suspicious');
    qualityScore -= 0.2;
  }

  // Validate bedrooms (should be less than rooms)
  if (data.bedrooms && data.rooms && data.bedrooms > data.rooms) {
    errors.push('Bedrooms exceeds total rooms');
    qualityScore -= 0.2;
  }

  // Check for number concatenation in rooms (like 62337 instead of 7)
  if (data.rooms && data.rooms > 50) {
    errors.push('Rooms value appears to be concatenated with other data');
    qualityScore -= 0.3;
  }

  // Check for huge land surface (might be concatenated)
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
// EXTRACTION FUNCTIONS
// ========================================

async function extractPropertyData(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 1500));

    const propertyData = await page.evaluate(() => {
      const data = {};

      // Helper function to get text safely
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : '';
      };

      // Helper to get text from list item
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

      // ===== TITLE =====
      data.title = getText('h1') || getText('.property-title-4') || getText('.title');

      // ===== PRICE =====
      const priceText = getText('.price') || getText('[class*="price"]') || getText('[class*="Price"]');
      const priceMatch = priceText.match(/(\d[\d\s]+)\s*€/);
      data.price = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, '')) : null;

      // ===== REFERENCE =====
      const refText = getListItemValue('Référence');
      const refMatch = refText.match(/Référence\s+(\d+)/i);
      data.reference = refMatch ? refMatch[1] : null;

      // ===== ROOMS (PIÈCES) =====
      const roomsText = getListItemValue('Pièces');
      const roomsMatch = roomsText.match(/(\d+)\s*pièces?/i);
      data.rooms = roomsMatch ? parseInt(roomsMatch[1]) : null;

      // ===== BEDROOMS (CHAMBRES) =====
      const bedroomsText = getListItemValue('chambres');
      const bedroomsMatch = bedroomsText.match(/(\d+)\s*chambres?/i);
      data.bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1]) : null;

      // ===== SURFACE (BUILDING) =====
      const surfaceText = getListItemValue('Surface');
      const surfaceMatch = surfaceText.match(/(\d+)\s*m/i);
      data.building_surface = surfaceMatch ? parseInt(surfaceMatch[1]) : null;

      // ===== LAND SURFACE (TERRAIN) =====
      const landText = getListItemValue('Terrain');
      if (landText) {
        const landMatch = landText.match(/(\d+)\s*m/i);
        data.land_surface = landMatch ? parseInt(landMatch[1]) : null;
      }

      // ===== FLOORS =====
      const floorText = getListItemValue('Étage');
      if (floorText.includes('Plain-pied')) {
        data.floors = 1;
      } else {
        const floorMatch = floorText.match(/(\d+)\s*étages?/i);
        data.floors = floorMatch ? parseInt(floorMatch[1]) : null;
      }

      // ===== PROPERTY TYPE =====
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

// ===== IMAGES (UPDATED - PRIORITIZE HERO IMAGE) =====
const images = [];
const LOGO_HASH = '52600504a0dbbe5c433dd0e783a78880'; // The logo image to exclude

// Strategy 1: PRIORITY - Get the main/hero image first
const heroSelectors = [
  '.main-image img',
  '.hero-image img',
  '.property-main-image img',
  '.slider-images img:first-child',
  '.property-gallery img:first-child',
  '.carousel-item:first-child img',
  '[class*="main"] img:first-child',
  'picture:first-of-type img',
  '.pictures img:first-child'
];

let heroImage = null;
for (const selector of heroSelectors) {
  const img = document.querySelector(selector);
  if (img) {
    const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy');
    if (src && 
        src.includes('cloudfront') && 
        !src.includes(LOGO_HASH) &&
        !src.includes('logo')) {
      heroImage = src;
      images.push(src);
      break; // Found hero image, stop looking
    }
  }
}

// Strategy 2: Get additional gallery images (excluding hero)
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
      src !== heroImage && // Don't duplicate hero image
      img.naturalWidth > 200) {
    images.push(src);
  }
});

// Strategy 3: If still no images, get all large images
if (images.length === 0) {
  const allImages = document.querySelectorAll('img[src*="cloudfront"]');
  allImages.forEach(img => {
    const src = img.src;
    if (src && 
        !src.includes(LOGO_HASH) &&
        !src.includes('logo') &&
        !src.includes('icon') &&
        img.naturalWidth > 200 &&
        img.naturalHeight > 150) {
      images.push(src);
    }
  });
}

// Strategy 4: Check for data attributes and lazy loading
if (images.length === 0) {
  const lazyImages = document.querySelectorAll('img[data-src], img[data-lazy], img[data-original]');
  lazyImages.forEach(img => {
    const src = img.getAttribute('data-src') || 
                img.getAttribute('data-lazy') || 
                img.getAttribute('data-original');
    if (src && 
        src.includes('cloudfront') && 
        !src.includes(LOGO_HASH)) {
      images.push(src);
    }
  });
}

// Remove duplicates and limit to 10 images (hero is already first)
data.images = [...new Set(images)].slice(0, 10);


      // ===== DESCRIPTION =====
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
// MAIN SCRAPE ENDPOINT
// ========================================

app.get('/', (req, res) => {
  res.json({ 
    status: 'Barracuda Scraper Service v2.0',
    features: ['Data validation', 'Quality scoring', 'Separate fields', 'Multiple image extraction']
  });
});

app.post('/scrape', async (req, res) => {
  try {
    const { searchUrl, maxPages = 3 } = req.body;

    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    console.log('🎯 Starting scrape:', searchUrl);

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

    // Get property URLs from listing pages
    let currentPage = 1;
    const propertyUrls = new Set();

    while (currentPage <= maxPages) {
      console.log(`📄 Scraping listing page ${currentPage}...`);

      const pageUrl = currentPage === 1 
        ? searchUrl 
        : `${searchUrl}?page=${currentPage}`;

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const urls = await page.evaluate(() => {
          const links = document.querySelectorAll('a[href*="/fr/propriete/"]');
          return Array.from(links)
            .map(link => link.href)
            .filter(href => href && href.includes('cad-immo.com'));
        });

        urls.forEach(url => propertyUrls.add(url));
        console.log(`   Found ${urls.length} properties on page ${currentPage}`);

        currentPage++;
      } catch (pageError) {
        console.error(`Error on listing page ${currentPage}:`, pageError.message);
        break;
      }
    }

    console.log(`\n✅ Found ${propertyUrls.size} unique properties to scrape\n`);

    // Scrape each property page
    let scrapedCount = 0;
    for (const propUrl of Array.from(propertyUrls).slice(0, 36)) {
      const propertyData = await extractPropertyData(page, propUrl);

      if (!propertyData || !propertyData.price) {
        console.log(`⚠️  Skipping ${propUrl} - no valid data`);
        continue;
      }

      // Validate the data
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
        console.log(`⚠️  Quality issues in ${propUrl}:`, validation.errors);
      }

      allProperties.push({
        url: propUrl,
        ...propertyData,
        data_quality_score: validation.qualityScore,
        validation_errors: validation.errors
      });

      scrapedCount++;

      // Log progress and image count
      if (scrapedCount % 5 === 0) {
        console.log(`   Scraped ${scrapedCount}/${propertyUrls.size} properties...`);
      }

      // Log image extraction success
      if (propertyData.images && propertyData.images.length > 0) {
        console.log(`   ✓ Found ${propertyData.images.length} images for ${propertyData.title}`);
      } else {
        console.log(`   ⚠️  No images found for ${propertyData.title}`);
      }
    }

    await browser.close();

    console.log(`\n✅ Scraping complete: ${allProperties.length} properties`);
    console.log(`   Valid: ${validationStats.valid}, Invalid: ${validationStats.invalid}\n`);

    // ========================================
    // SAVE TO SUPABASE
    // ========================================

    let inserted = 0;
    let updated = 0;

    for (const prop of allProperties) {
      try {
        // Extract source_id from URL
        const urlParts = prop.url.split('+');
        const sourceId = urlParts[urlParts.length - 1] || `cadimmo-${Date.now()}`;

        // Determine city from URL
        let city = 'Bergerac';
        if (urlParts.length >= 3) {
          city = urlParts[2]
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('-');
        }

        // Prepare data for Supabase
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
          images: prop.images || [], // Use the array of images
          data_quality_score: prop.data_quality_score,
          validation_errors: prop.validation_errors,
          last_seen_at: new Date().toISOString(),
          raw_data: { 
            scrapedAt: new Date().toISOString(),
            scraper_version: '2.1',
            imageCount: prop.images?.length || 0
          }
        };

        const { data, error } = await supabase
          .from('properties')
          .upsert(dbData, { 
            onConflict: 'source,source_id',
            returning: 'minimal'
          });

        if (error) {
          console.error(`Save error for ${sourceId}:`, error.message);
        } else {
          inserted++;
        }

      } catch (err) {
        console.error('Save error:', err.message);
      }
    }

    res.json({
      success: true,
      totalScraped: allProperties.length,
      inserted,
      updated,
      validation: validationStats,
      imageStats: {
        withImages: allProperties.filter(p => p.images && p.images.length > 0).length,
        withoutImages: allProperties.filter(p => !p.images || p.images.length === 0).length
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
    console.error('❌ Scraping failed:', error);
    res.status(500).json({
      error: 'Scraping failed',
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Scraper service v2.1 running on port ${PORT}`);
});
