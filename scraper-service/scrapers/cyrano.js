const { savePropertiesToDB } = require('../utils/database');

// ========================================
// CYRANO IMMOBILIER SCRAPER
// ========================================

async function scrapeCyrano(req, res, { puppeteer, chromium, supabase }) {
  const { searchUrl = 'https://www.cyranoimmobilier.com/vente/1', maxPages = 3, maxProperties = null } = req.body;

  console.log('🎯 Starting Cyrano Immobilier scrape:', searchUrl);

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
      const pageUrl = searchUrl.replace(/\/\d+$/, '') + `/${currentPageNum}`;
      console.log(`📄 Scraping Cyrano listing page ${currentPageNum}: ${pageUrl}`);

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract property links
        const links = await page.evaluate(() => {
          const results = [];
          // Find all property card links
          const propertyLinks = document.querySelectorAll('a[href*="/vente/"][href*="-maison"], a[href*="/vente/"][href*="-villa"], a[href*="/vente/"][href*="-appartement"]');
          
          propertyLinks.forEach(link => {
            const href = link.href;
            // Only include detail pages (not listing pages)
            if (href && href.includes('/vente/') && /\/\d+-(?:maison|villa|appartement)$/.test(href)) {
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
        await new Promise(resolve => setTimeout(resolve, 1500));

        const property = await page.evaluate((url) => {
          const prop = { url };

          // Reference
          const refEl = document.querySelector('.ref');
          if (refEl) {
            const refMatch = refEl.textContent.match(/Référence\s*:\s*(\S+)/);
            if (refMatch) prop.reference = refMatch[1].trim();
          }

          // Title
          const titleEl = document.querySelector('h1.titleBien');
          if (titleEl) prop.title = titleEl.textContent.trim();

          // Price
          const priceEl = document.querySelector('.typeSlider .price');
          if (priceEl) {
            const priceText = priceEl.textContent.replace(/[^0-9]/g, '');
            prop.price = priceText ? parseInt(priceText) : null;
          }

          // Description
          const descEl = document.querySelector('.desciptifBienContent .offreContent p');
          if (descEl) prop.description = descEl.textContent.trim();

          // Location from breadcrumbs
          const breadcrumbs = document.querySelectorAll('.linkArian li');
          if (breadcrumbs.length >= 3) {
            // Department is usually 3rd item
            const deptEl = breadcrumbs[2].querySelector('a');
            if (deptEl) {
              const deptText = deptEl.textContent.trim();
              prop.location_department = deptText;
            }
            
            // City is usually 4th item
            if (breadcrumbs.length >= 4) {
              const cityEl = breadcrumbs[3].querySelector('a');
              if (cityEl) {
                prop.city = cityEl.textContent.trim();
              }
            }
          }

          // Property type from URL or title
          if (url.includes('-maison')) prop.property_type = 'Maison';
          else if (url.includes('-villa')) prop.property_type = 'Villa';
          else if (url.includes('-appartement')) prop.property_type = 'Appartement';

          // Extract all data fields
          const dataItems = document.querySelectorAll('.content-info li.data');
          dataItems.forEach(item => {
            const text = item.textContent.trim();
            
            // Postal code
            if (text.includes('Code postal')) {
              const match = text.match(/:\s*([0-9]+)/);
              if (match) prop.postal_code = match[1].trim();
            }
            
            // Surface habitable
            if (text.includes('Surface habitable')) {
              const match = text.match(/:\s*([0-9]+)/);
              if (match) prop.building_surface = parseInt(match[1]);
            }
            
            // Terrain
            if (text.includes('surface terrain')) {
              const match = text.match(/:\s*([0-9\s]+)/);
              if (match) {
                const landText = match[1].replace(/\s/g, '');
                prop.land_surface = parseInt(landText);
              }
            }
            
            // Rooms
            if (text.includes('Nombre de pièces')) {
              const match = text.match(/:\s*([0-9]+)/);
              if (match) prop.rooms = parseInt(match[1]);
            }
            
            // Bedrooms
            if (text.includes('Nombre de chambre')) {
              const match = text.match(/:\s*([0-9]+)/);
              if (match) prop.bedrooms = parseInt(match[1]);
            }
            
            // Bathrooms
            if (text.includes('Nb de salle d\'eau')) {
              const match = text.match(/:\s*([0-9]+)/);
              if (match) prop.bathrooms = parseInt(match[1]);
            }
            
            // Year built
            if (text.includes('Année de construction')) {
              const match = text.match(/:\s*([0-9]+)/);
              if (match) prop.year_built = parseInt(match[1]);
            }
            
            // Heating
            if (text.includes('Mode de chauffage')) {
              const match = text.match(/:\s*(.+)/);
              if (match) prop.heating_system = match[1].trim();
            }
            
            // Pool
            if (text.includes('Terrain piscinable')) {
              prop.pool = text.includes('OUI');
            }
          });

          // Images - get ALL images from slider
          prop.images = [];
          const sliderImages = document.querySelectorAll('.module_Slider_Content .container_ImgSlider_Mdl picture img');
          sliderImages.forEach((img, index) => {
            let imgUrl = img.getAttribute('src') || img.getAttribute('data-src');
            if (imgUrl) {
              // Ensure full URL
              if (imgUrl.startsWith('//')) {
                imgUrl = 'https:' + imgUrl;
              }
              // Get highest quality version (1600xauto)
              if (!imgUrl.includes('1600xauto')) {
                imgUrl = imgUrl.replace(/\d+xauto/, '1600xauto');
              }
              prop.images.push(imgUrl);
            }
          });

          return prop;
        }, url);

        // Validation
        if (property.reference && property.price) {
          properties.push(property);
          console.log(`   ✅ ${property.reference}: ${property.title?.substring(0, 60)}...`);
        } else {
          console.log(`   ⚠️  Skipped: Missing reference or price`);
        }

      } catch (propError) {
        console.error(`   ❌ Error scraping property: ${propError.message}`);
      }

      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n📊 Scraped ${properties.length} properties\n`);

    // ===== PART 3: Save to database =====
    let inserted = 0;
    if (properties.length > 0) {
      inserted = await savePropertiesToDB(properties, 'cyrano', supabase);
    }

    console.log(`\n🎉 Scraping complete!`);
    console.log(`   Total: ${properties.length}`);
    console.log(`   Inserted/Updated: ${inserted}`);

    await browser.close();

    // Send response
    res.json({
      success: true,
      source: 'cyrano-immobilier',
      totalScraped: properties.length,
      inserted,
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

module.exports = { scrapeCyrano };
