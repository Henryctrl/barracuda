const { savePropertiesToDB } = require('../utils/database');

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

    // ===== PART 1: Collect all property URLs =====
    const propertyUrls = new Set();
    let currentPageNum = 1;

    while (currentPageNum <= maxPages) {
      const pageUrl = searchUrl.replace(/\/\d+$/, '') + `/${currentPageNum}`;
      console.log(`📄 Scraping Cyrano listing page ${currentPageNum}: ${pageUrl}`);

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // FIXED: Updated regex to include all property types
        const links = await page.evaluate(() => {
          const results = [];
          const propertyLinks = document.querySelectorAll('a[href*="/vente/"]');
          
          propertyLinks.forEach(link => {
            const href = link.href;
            // Match detail pages with ID and property type
            if (href && /\/\d+-(maison|villa|appartement|propriete|immeuble|terrain)$/.test(href)) {
              results.push(href);
            }
          });
          
          return [...new Set(results)];
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

    // ===== PART 2: Scrape detailed data =====
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
            const deptEl = breadcrumbs[2].querySelector('a');
            if (deptEl) {
              prop.location_department = deptEl.textContent.trim();
            }
            
            if (breadcrumbs.length >= 4) {
              const cityEl = breadcrumbs[3].querySelector('a');
              if (cityEl) {
                prop.city = cityEl.textContent.trim();
              }
            }
          }

          // FIXED: Property type - added more types
          if (url.includes('-maison')) prop.property_type = 'Maison';
          else if (url.includes('-villa')) prop.property_type = 'Villa';
          else if (url.includes('-appartement')) prop.property_type = 'Appartement';
          else if (url.includes('-propriete')) prop.property_type = 'Propriete';
          else if (url.includes('-immeuble')) prop.property_type = 'Immeuble';
          else if (url.includes('-terrain')) prop.property_type = 'Terrain';

          // Extract all data fields with case-insensitive matching
          const dataItems = document.querySelectorAll('.content-info li.data');
          dataItems.forEach(item => {
            const text = item.textContent.trim();
            const textLower = text.toLowerCase();
            
            // Postal code
            if (textLower.includes('code postal')) {
              const match = text.match(/:\s*([0-9]+)/);
              if (match) prop.postal_code = match[1].trim();
            }
            
            // Surface habitable
            if (textLower.includes('surface habitable')) {
              const match = text.match(/:\s*([0-9]+)/);
              if (match) prop.building_surface = parseInt(match[1]);
            }
            
            // Terrain
            if (textLower.includes('surface terrain')) {
              const match = text.match(/:\s*([0-9\s]+)/);
              if (match) {
                const landText = match[1].replace(/\s/g, '');
                prop.land_surface = parseInt(landText);
              }
            }
            
            // Rooms
            if (textLower.includes('nombre de pièces') || textLower.includes('nombre de pieces')) {
              const match = text.match(/:\s*([0-9]+)/);
              if (match) prop.rooms = parseInt(match[1]);
            }
            
            // Bedrooms
            if (textLower.includes('nombre de chambre')) {
              const match = text.match(/:\s*([0-9]+)/);
              if (match) prop.bedrooms = parseInt(match[1]);
            }
            
            // Bathrooms
            if (textLower.includes('nb de salle d\'eau') || textLower.includes('salle d\'eau')) {
              const match = text.match(/:\s*([0-9]+)/);
              if (match) prop.bathrooms = parseInt(match[1]);
            }
            
            // Year built
            if (textLower.includes('année de construction')) {
              const match = text.match(/:\s*([0-9]+)/);
              if (match) prop.year_built = parseInt(match[1]);
            }
            
            // Heating
            if (textLower.includes('mode de chauffage')) {
              const match = text.match(/:\s*(.+)/);
              if (match) prop.heating_system = match[1].trim();
            }
          });

          // FIXED: Pool detection - check title and description
          prop.pool = false;
          const poolKeywords = ['piscine', 'pool'];
          const titleLower = (prop.title || '').toLowerCase();
          const descLower = (prop.description || '').toLowerCase();
          
          if (poolKeywords.some(keyword => 
              titleLower.includes(keyword) || descLower.includes(keyword))) {
            prop.pool = true;
          }

          // Images
          prop.images = [];
          const sliderImages = document.querySelectorAll('.module_Slider_Content .container_ImgSlider_Mdl picture img');
          sliderImages.forEach((img) => {
            let imgUrl = img.getAttribute('src') || img.getAttribute('data-src');
            if (imgUrl) {
              if (imgUrl.startsWith('//')) {
                imgUrl = 'https:' + imgUrl;
              }
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
          console.log(`   ✅ ${property.reference}: ${property.title?.substring(0, 60)}... [Pool: ${property.pool}]`);
        } else {
          console.log(`   ⚠️  Skipped: Missing reference or price`);
        }

      } catch (propError) {
        console.error(`   ❌ Error scraping property: ${propError.message}`);
      }

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
    console.log(`   With Pool: ${properties.filter(p => p.pool).length}`);

    await browser.close();

    res.json({
      success: true,
      source: 'cyrano-immobilier',
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

module.exports = { scrapeCyrano };
