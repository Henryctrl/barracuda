const { savePropertiesToDB } = require('../utils/database');

// ========================================
// CHARBIT IMMOBILIER SCRAPER v2.0
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

    // ===== PART 1: Collect all property URLs + HERO IMAGES from listing pages =====
    const propertyData = new Map(); // Store { url, heroImage }
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

        // Extract property links AND their hero images
        const listings = await page.evaluate(() => {
          const results = [];
          
          // Find all property card containers
          const cards = document.querySelectorAll('.property, .module-listing-template-3 > div > div');
          
          cards.forEach(card => {
            // Find the link
            const link = card.querySelector('a[href*="/propriete/vente"]');
            if (!link || !link.href || !link.href.includes('/propriete/vente+')) {
              return;
            }

            const url = link.href;
            
            // Find the hero image - could be in picture tag or img directly
            let heroImage = null;
            
            // Method 1: Look for main image in the card
            const img = card.querySelector('img[src*="cloudfront"], img[data-src*="cloudfront"]');
            if (img) {
              heroImage = img.getAttribute('src') || img.getAttribute('data-src');
              if (heroImage && heroImage.startsWith('//')) {
                heroImage = 'https:' + heroImage;
              }
            }

            // Method 2: Look in picture source
            if (!heroImage) {
              const picture = card.querySelector('picture source[srcset*="cloudfront"]');
              if (picture) {
                const srcset = picture.getAttribute('srcset');
                if (srcset) {
                  // Extract first URL from srcset
                  const match = srcset.match(/(https?:\/\/[^\s,]+)/);
                  if (match) heroImage = match[1];
                }
              }
            }

            // Method 3: Look in background-image style
            if (!heroImage) {
              const bgEl = card.querySelector('[style*="background-image"]');
              if (bgEl) {
                const style = bgEl.getAttribute('style');
                const match = style.match(/url\(['"](https?:\/\/[^'"]+)['"]\)/);
                if (match) heroImage = match[1];
              }
            }

            results.push({ url, heroImage });
          });
          
          return results;
        });

        console.log(`   Found ${listings.length} property listings on page ${currentPageNum}`);
        
        if (listings.length === 0) {
          console.log(`   ✅ No more properties found. Stopping at page ${currentPageNum}`);
          break;
        }

        listings.forEach(item => {
          if (item.url && !propertyData.has(item.url)) {
            propertyData.set(item.url, { heroImage: item.heroImage });
          }
        });

        currentPageNum++;

      } catch (pageError) {
        console.error(`❌ Error scraping listing page ${currentPageNum}:`, pageError.message);
        break;
      }
    }

    console.log(`\n✅ Found ${propertyData.size} total property URLs with hero images\n`);

    // ===== PART 2: Scrape detailed data from each property page =====
    const properties = [];
    const propertyArray = Array.from(propertyData.entries());
    const limit = maxProperties || propertyArray.length;
    
    console.log(`🔍 Scraping details for ${Math.min(limit, propertyArray.length)} properties...\n`);

    for (let i = 0; i < Math.min(limit, propertyArray.length); i++) {
      const [url, listingInfo] = propertyArray[i];
      console.log(`[${i + 1}/${Math.min(limit, propertyArray.length)}] Scraping: ${url}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const property = await page.evaluate((url, heroImageFromListing) => {
          const prop = { url };
          const clean = (txt) => txt ? txt.replace(/\s+/g, ' ').trim() : '';

          // Title
          const titleEl = document.querySelector('h1');
          if (titleEl) {
            const titleText = clean(titleEl.textContent);
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

          // ===== FIX 1: BEDROOMS - Count "chambre" in Surfaces section =====
          prop.bedrooms = 0;
          prop.bathrooms = 0;
          
          const surfacesEl = document.querySelector('.module-property-info-template-5');
          if (surfacesEl) {
            const surfaceItems = surfacesEl.querySelectorAll('li');
            
            surfaceItems.forEach(li => {
              const text = clean(li.textContent).toLowerCase();
              
              // Count bedrooms - look for "chambre" but not "salle" to avoid "salle de bain avec chambre"
              if (text.includes('chambre') && !text.includes('salle')) {
                prop.bedrooms++;
              }
              
              // Count bathrooms
              if (text.includes('salle de bains') || text.includes('salle de bain')) {
                prop.bathrooms++;
              }
              
              // Also count "salle d'eau" as bathrooms
              if (text.includes("salle d'eau") || text.includes("salle d eau")) {
                prop.bathrooms++;
              }
            });
          }

          // Fallback: if no Surfaces section, try to extract from description
          if (prop.bedrooms === 0 && prop.description) {
            const descLower = prop.description.toLowerCase();
            
            // Look for patterns like "3 chambres", "trois chambres"
            const chambreMatch = descLower.match(/(\d+)\s*chambres?/);
            if (chambreMatch) {
              prop.bedrooms = parseInt(chambreMatch[1]);
            }
            
            // French number words
            const numberWords = {
              'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
              'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10
            };
            
            if (prop.bedrooms === 0) {
              for (const [word, num] of Object.entries(numberWords)) {
                const regex = new RegExp(`\\b${word}\\s+chambres?\\b`, 'i');
                if (regex.test(descLower)) {
                  prop.bedrooms = num;
                  break;
                }
              }
            }
          }

          // Set to null if still 0 (no bedrooms found)
          if (prop.bedrooms === 0) prop.bedrooms = null;
          if (prop.bathrooms === 0) prop.bathrooms = null;

          // ===== FIX 2: IMAGES - Prioritize hero image from listing =====
          const allImages = [];
          
          // Method 1: Main slider images
          const sliderImages = document.querySelectorAll('.module_Slider_Content img, .slider img');
          sliderImages.forEach(img => {
            let imgUrl = img.getAttribute('src') || img.getAttribute('data-src');
            if (imgUrl && imgUrl.includes('d36vnx92dgl2c5.cloudfront.net')) {
              if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
              imgUrl = imgUrl.replace(/\/\d+x\d+\//, '/original/');
              if (!allImages.includes(imgUrl)) {
                allImages.push(imgUrl);
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
              if (!allImages.includes(imgUrl)) {
                allImages.push(imgUrl);
              }
            }
          });

          // Store hero image separately
          prop.heroImageFromListing = heroImageFromListing;
          prop.allImagesFromDetail = allImages;

          return prop;
        }, url, listingInfo.heroImage);

        // ===== FIX 2 CONTINUED: Organize images with hero first =====
        const finalImages = [];
        
        // 1. Add hero image from listing page first (if found)
        if (property.heroImageFromListing) {
          let heroImg = property.heroImageFromListing.replace(/\/\d+x\d+\//, '/original/');
          finalImages.push(heroImg);
        }
        
        // 2. Add remaining images (excluding the hero if it appears again)
        if (property.allImagesFromDetail) {
          property.allImagesFromDetail.forEach(img => {
            // Normalize both URLs for comparison
            const normalizedImg = img.replace(/\/\d+x\d+\//, '/original/');
            const normalizedHero = property.heroImageFromListing 
              ? property.heroImageFromListing.replace(/\/\d+x\d+\//, '/original/')
              : null;
            
            // Only add if it's not the hero or if there's no hero
            if (!normalizedHero || normalizedImg !== normalizedHero) {
              if (!finalImages.includes(normalizedImg)) {
                finalImages.push(normalizedImg);
              }
            }
          });
        }
        
        property.images = finalImages.slice(0, 15);

        // Validation
        if (property.price && (property.reference || property.title)) {
          properties.push(property);
          console.log(`   ✅ ${property.reference || 'N/A'}: ${property.title?.substring(0, 50)}... [Beds: ${property.bedrooms || 0}, Pool: ${property.pool}, Imgs: ${property.images.length}]`);
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
          heroImageMatched: !!p.heroImageFromListing,
          scraper_version: '2.0'
        }),
        scraped_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      }));

      inserted = await savePropertiesToDB(propertiesForDB, 'charbit', supabase);
    }

    // Calculate stats
    const bedroomStats = properties.filter(p => p.bedrooms && p.bedrooms > 0);
    const heroMatchStats = properties.filter(p => p.heroImageFromListing);

    console.log(`\n🎉 Scraping complete!`);
    console.log(`   Total: ${properties.length}`);
    console.log(`   Inserted/Updated: ${inserted}`);
    console.log(`   With Bedrooms: ${bedroomStats.length} (avg: ${bedroomStats.length > 0 ? (bedroomStats.reduce((sum, p) => sum + p.bedrooms, 0) / bedroomStats.length).toFixed(1) : 0})`);
    console.log(`   With Pool: ${properties.filter(p => p.pool).length}`);
    console.log(`   Hero Image Matched: ${heroMatchStats.length}/${properties.length}`);

    await browser.close();

    // Send response
    res.json({
      success: true,
      source: 'charbit-immobilier',
      totalScraped: properties.length,
      inserted,
      bedroomStats: {
        withBedrooms: bedroomStats.length,
        avgBedrooms: bedroomStats.length > 0 
          ? (bedroomStats.reduce((sum, p) => sum + p.bedrooms, 0) / bedroomStats.length).toFixed(1)
          : 0
      },
      poolCount: properties.filter(p => p.pool).length,
      heroImageMatched: heroMatchStats.length,
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
