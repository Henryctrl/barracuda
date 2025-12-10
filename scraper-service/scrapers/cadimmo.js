const { validatePropertyData } = require('../utils/validation');
const { savePropertiesToDB } = require('../utils/database');

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
        '.slider-images img, .property-gallery img, .carousel img, [class*="gallery"] img, [class*="slider"] img, [class*="photos"] img, .pictures img'
      );

      galleryImages.forEach(img => {
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy');
        if (src && src.includes('cloudfront') && !src.includes(LOGO_HASH) && !src.includes('logo') && img.naturalWidth > 200) {
          images.push(src);
        }
      });

      data.additionalImages = [...new Set(images)];

      const descEl = document.querySelector('#description') || document.querySelector('.comment') || document.querySelector('[class*="description"]');
      data.description = descEl ? descEl.textContent.trim().substring(0, 500) : '';

      return data;
    });

    return propertyData;

  } catch (error) {
    console.error(`❌ Error extracting ${url}:`, error.message);
    return null;
  }
}

async function scrapeCadImmo(req, res, { puppeteer, chromium, supabase }) {
  try {
    const { searchUrl, maxPages = 3 } = req.body;

    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    console.log('🎯 Starting CAD-IMMO scrape:', searchUrl);

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || chromium.executablePath,
      headless: true,
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const allProperties = [];
    const validationStats = { valid: 0, invalid: 0, total: 0 };

    let currentPage = 1;
    const propertyUrls = new Map();

    while (currentPage <= maxPages) {
      console.log(`📄 Scraping CAD-IMMO listing page ${currentPage}...`);

      const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}?page=${currentPage}`;

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

          const cards = document.querySelectorAll('article, .property, .item, .listing-card, [class*="property-card"], [class*="listing"]');

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
                if (src && src.includes('cloudfront') && !src.includes(LOGO_HASH) && !src.includes('logo') && !src.includes('icon') && !src.includes('placeholder')) {
                  heroImage = src;
                  break;
                }
              }
            }

            if (!heroImage) {
              for (const img of images) {
                const src = img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.getAttribute('data-original') || (img.dataset ? img.dataset.src : null);
                if (src && src.includes('cloudfront') && !src.includes(LOGO_HASH) && !src.includes('logo') && !src.includes('icon') && !src.includes('placeholder')) {
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

    const inserted = await savePropertiesToDB(allProperties, 'cadimmo', supabase);

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
    res.status(500).json({ error: 'Scraping failed', details: error.message });
  }
}

module.exports = { scrapeCadImmo };
