const { savePropertiesToDB } = require('../utils/database');

// ========================================
// CHARBIT IMMOBILIER SCRAPER
// ========================================

async function scrapeCharbit(req, res, { puppeteer, chromium, supabase }) {
  const { 
    searchUrl = 'https://charbit-immo.fr/fr/ventes', 
    maxPages = 3, 
    maxProperties = null 
  } = req.body;

  console.log('🎯 Starting Charbit Immobilier scrape:', searchUrl);

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // ===== PART 1: Collect all property URLs from listing pages =====
    const propertyUrls = new Set();
    let currentPageNum = 1;

    while (currentPageNum <= maxPages) {
      const pageUrl = currentPageNum === 1 
        ? searchUrl 
        : `${searchUrl}?page=${currentPageNum}`;
      
      console.log(`📄 Scraping Charbit listing page ${currentPageNum}: ${pageUrl}`);

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Scroll to trigger lazy loading
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Extract property links
        const links = await page.evaluate(() => {
          const results = [];
          
          // Method 1: Find links with /propriete/ in href
          const propertyLinks = document.querySelectorAll('a[href*="/propriete/vente"]');
          
          propertyLinks.forEach(link => {
            const href = link.href;
            // Only include detail pages
            if (href && href.includes('/propriete/vente+')) {
              results.push(href);
            }
          });
          
          return [...new Set(results)]; // Remove duplicates
        });

        console.log(`   Found ${links.length} property links on page ${currentPageNum}`);
        
        if (links.length === 0) {
          console.log(`   ✅ No more properties found. Stopping at page ${currentPageNum}`);
          break;
        }

        links.forEach(url => propertyUrls.add(url));
        currentPageNum++;

      } catch (pageError) {
        console.error(`❌ Error scraping listing page ${currentPageNum}:`, pageError.message);
        break;
      }
    }

    console.log(`\n✅ Found ${propertyUrls.size} total property URLs\n`);

    // ===== PART 2: Scrape detailed data from each property page =====
    const properties = [];
    const propertyArray = Array.from(propertyUrls);
    const limit = maxProperties || propertyArray.length;
    
    console.log(`🔍 Scraping details for ${Math.min(limit, propertyArray.length)} properties...\n`);

    for (let i = 0; i < Math.min(limit, propertyArray.length); i++) {
      const url = propertyArray[i];
      console.log(`[${i + 1}/${Math.min(limit, propertyArray.length)}] Scraping: ${url}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const property = await page.evaluate((url) => {
          const prop = { url };
          const clean = (txt) => txt ? txt.replace(/\s+/g, ' ').trim() : '';

          // Title
          const titleEl = document.querySelector('h1');
          if (titleEl) {
            const titleText = clean(titleEl.textContent);
            // Remove city from title (it's in a span)
            const citySpan = titleEl.querySelector('span');
            if (citySpan) {
              prop.title = titleText.replace(clean(citySpan.textContent), '').trim();
              prop.city = clean(citySpan.textContent);
            } else {
              prop.title = titleText;
            }
          }

          // Price
          const priceEl = document.querySelector('.price, p.price');
          if (priceEl) {
            const priceText = priceEl.textContent.replace(/[^0-9]/g, '');
            prop.price = priceText ? parseInt(priceText) : null;
          }

          // Reference - from details summary
          const detailsItems = document.querySelectorAll('.summary.details li');
          detailsItems.forEach(item => {
            const text = clean(item.textContent);
            const textLower = text.toLowerCase();
            
            if (textLower.includes('référence') || textLower.includes('reference')) {
              const span = item.querySelector('span');
              if (span) prop.reference = clean(span.textContent);
            }
            
            if (textLower.includes('pièces') && textLower.includes('pièce')) {
              const match = text.match(/(\d+)\s*pièce/i);
              if (match) prop.rooms = parseInt(match[1]);
            }
            
            if (textLower.includes('surface') && !textLower.includes('totale')) {
              const match = text.match(/(\d+)\s*m/i);
              if (match) prop.building_surface = parseInt(match[1]);
            }
            
            if (textLower.includes('surface totale')) {
              const match = text.match(/(\d+(?:\.\d+)?)\s*m/i);
              if (match) prop.total_surface = parseFloat(match[1]);
            }
            
            if (textLower.includes('type de chauffage')) {
              const span = item.querySelector('span');
              if (span) prop.heating_system = clean(span.textContent);
            }
            
            if (textLower.includes('eaux usées') || textLower.includes('eaux uses')) {
              const span = item.querySelector('span');
              if (span) prop.drainage_system = clean(span.textContent);
            }
            
            if (textLower.includes('état')) {
              const span = item.querySelector('span');
              if (span) prop.property_condition = clean(span.textContent);
            }
          });

          // Description
          const descEl = document.querySelector('#description, .comment');
          if (descEl) prop.description = clean(descEl.textContent).substring(0, 1500);

          // Property type from URL or title
          const urlLower = url.toLowerCase();
          if (urlLower.includes('+maison+') || prop.title?.toLowerCase().includes('maison')) {
            prop.property_type = 'Maison';
          } else if (urlLower.includes('+villa+') || prop.title?.toLowerCase().includes('villa')) {
            prop.property_type = 'Villa';
          } else if (urlLower.includes('+appartement+') || prop.title?.toLowerCase().includes('appartement')) {
            prop.property_type = 'Appartement';
          } else if (urlLower.includes('+terrain+')) {
            prop.property_type = 'Terrain';
          } else if (urlLower.includes('+immeuble+')) {
            prop.property_type = 'Immeuble';
          }

          // Extract city from URL if not found
          if (!prop.city) {
            const cityMatch = url.match(/vente\+[^+]+\+([^+]+)\+/);
            if (cityMatch) {
              prop.city = cityMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
          }

          // Prestations (Features) - includes pool detection
          prop.pool = false;
          const prestationsEl = document.querySelector('.module-property-info-template-6');
          if (prestationsEl) {
            const prestationsList = prestationsEl.querySelectorAll('li');
            const prestations = [];
            prestationsList.forEach(li => {
              const text = clean(li.textContent);
              prestations.push(text);
              if (text.toLowerCase().includes('piscine')) {
                prop.pool = true;
              }
            });
            prop.features = prestations;
          }

          // Also check title and description for pool
          if (!prop.pool) {
            const titleLower = (prop.title || '').toLowerCase();
            const descLower = (prop.description || '').toLowerCase();
            if (titleLower.includes('piscine') || descLower.includes('piscine')) {
              prop.pool = true;
            }
          }

          // Detailed surfaces (rooms)
          const surfacesEl = document.querySelector('.module-property-info-template-5');
          if (surfacesEl) {
            const surfaceItems = surfacesEl.querySelectorAll('li');
            let bedroomCount = 0;
            let bathroomCount = 0;
            
            surfaceItems.forEach(li => {
              const text = clean(li.textContent).toLowerCase();
              if (text.includes('chambre')) bedroomCount++;
              if (text.includes('salle de bains') || text.includes('salle d\'eau')) bathroomCount++;
            });
            
            if (bedroomCount > 0) prop.bedrooms = bedroomCount;
            if (bathroomCount > 0) prop.bathrooms = bathroomCount;
          }

          // Images
          prop.images = [];
          
          // Method 1: Main slider images
          const sliderImages = document.querySelectorAll('.module_Slider_Content img, .slider img');
          sliderImages.forEach(img => {
            let imgUrl = img.getAttribute('src') || img.getAttribute('data-src');
            if (imgUrl && imgUrl.includes('d36vnx92dgl2c5.cloudfront.net')) {
              if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
              // Get high-res version
              if (imgUrl.includes('staticlbi.com') || imgUrl.includes('cloudfront.net')) {
                imgUrl = imgUrl.replace(/\/\d+x\d+\//, '/original/');
              }
              if (!prop.images.includes(imgUrl)) {
                prop.images.push(imgUrl);
              }
            }
          });

          // Method 2: Gallery/thumbnail images
          const thumbnailImages = document.querySelectorAll('.thumbnail img, .picture img');
          thumbnailImages.forEach(img => {
            let imgUrl = img.getAttribute('src') || img.getAttribute('data-src');
            if (imgUrl && imgUrl.includes('d36vnx92dgl2c5.cloudfront.net') && !imgUrl.includes('data-low-src')) {
              if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
              imgUrl = imgUrl.replace(/\/\d+x\d+\//, '/original/');
              if (!prop.images.includes(imgUrl)) {
                prop.images.push(imgUrl);
              }
            }
          });

          // Remove duplicates and limit
          prop.images = [...new Set(prop.images)].slice(0, 15);

          return prop;
        }, url);

        // Validation
        if (property.price && (property.reference || property.title)) {
          properties.push(property);
          console.log(`   ✅ ${property.reference || 'N/A'}: ${property.title?.substring(0, 50)}... [Pool: ${property.pool}]`);
        } else {
          console.log(`   ⚠️  Skipped: Missing reference or price`);
        }

      } catch (propError) {
        console.error(`   ❌ Error scraping property: ${propError.message}`);
      }

      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`\n📊 Scraped ${properties.length} properties\n`);

    // ===== PART 3: Save to database =====
    let inserted = 0;
    if (properties.length > 0) {
      const propertiesForDB = properties.map(p => ({
        source: 'charbit',
        url: p.url,
        reference: p.reference,
        title: p.title,
        description: p.description || '',
        price: p.price,
        property_type: p.property_type,
        rooms: p.rooms,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        building_surface: p.building_surface,
        city: p.city,
        heating_system: p.heating_system,
        drainage_system: p.drainage_system,
        pool: p.pool,
        property_condition: p.property_condition,
        images: p.images,
        raw_data: JSON.stringify({
          source: 'charbit',
          scrapedAt: new Date().toISOString(),
          imageCount: p.images.length,
          features: p.features || [],
          scraper_version: '1.0'
        }),
        scraped_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      }));

      inserted = await savePropertiesToDB(propertiesForDB, 'charbit', supabase);
    }

    console.log(`\n🎉 Scraping complete!`);
    console.log(`   Total: ${properties.length}`);
    console.log(`   Inserted/Updated: ${inserted}`);
    console.log(`   With Pool: ${properties.filter(p => p.pool).length}`);

    await browser.close();

    // Send response
    res.json({
      success: true,
      source: 'charbit-immobilier',
      totalScraped: properties.length,
      inserted,
      poolCount: properties.filter(p => p.pool).length,
      imageStats: {
        withImages: properties.filter(p => p.images && p.images.length > 0).length,
        avgImagesPerProperty: properties.length > 0 
          ? (properties.reduce((sum, p) => sum + (p.images?.length || 0), 0) / properties.length).toFixed(1)
          : 0
      }
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await browser.close();
    res.status(500).json({ error: error.message });
  }
}

module.exports = { scrapeCharbit };
