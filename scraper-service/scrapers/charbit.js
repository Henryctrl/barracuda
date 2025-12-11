const { savePropertiesToDB } = require('../utils/database');

// ========================================
// CHARBIT IMMOBILIER SCRAPER v2.3
// + Land Surface Extraction
// + French Government Geo API for postal codes
// ========================================

async function scrapeCharbit(req, res, { puppeteer, chromium, supabase }) {
  const { 
    searchUrl = 'https://charbit-immo.fr/fr/ventes', 
    maxPages = 3, 
    maxProperties = null 
  } = req.body;

  console.log('🎯 Starting Charbit Immobilier scrape v2.3:', searchUrl);

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // ===== HELPER: Fetch postal code from Geo API =====
    async function getPostalCodeFromCity(cityName) {
      if (!cityName) return null;
      
      try {
        const cleanCity = cityName
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .trim();
        
        console.log(`      🔍 Looking up postal code for: ${cityName}`);
        
        const response = await fetch(
          `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(cleanCity)}&fields=codesPostaux&limit=1`
        );
        
        if (!response.ok) {
          console.log(`      ⚠️  Geo API failed: ${response.status}`);
          return null;
        }
        
        const data = await response.json();
        
        if (data && data.length > 0 && data[0].codesPostaux && data[0].codesPostaux.length > 0) {
          const postalCode = data[0].codesPostaux[0];
          console.log(`      ✅ Found: ${postalCode}`);
          return postalCode;
        } else {
          console.log(`      ⚠️  No postal code found for ${cityName}`);
          return null;
        }
      } catch (error) {
        console.error(`      ❌ Error fetching postal code:`, error.message);
        return null;
      }
    }

    // ===== PART 1: Collect property URLs + hero images =====
    const propertyData = new Map();
    let currentPageNum = 1;

    while (currentPageNum <= maxPages) {
      const pageUrl = currentPageNum === 1 
        ? searchUrl 
        : `${searchUrl}?page=${currentPageNum}`;
      
      console.log(`📄 Scraping Charbit listing page ${currentPageNum}: ${pageUrl}`);

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(resolve => setTimeout(resolve, 1500));

        const listings = await page.evaluate(() => {
          const results = [];
          const cards = document.querySelectorAll('.property, .module-listing-template-3 > div > div');
          
          cards.forEach(card => {
            const link = card.querySelector('a[href*="/propriete/vente"]');
            if (!link || !link.href || !link.href.includes('/propriete/vente+')) return;

            const url = link.href;
            let heroImage = null;
            
            const img = card.querySelector('img[src*="cloudfront"], img[data-src*="cloudfront"]');
            if (img) {
              heroImage = img.getAttribute('src') || img.getAttribute('data-src');
              if (heroImage && heroImage.startsWith('//')) {
                heroImage = 'https:' + heroImage;
              }
            }

            if (!heroImage) {
              const picture = card.querySelector('picture source[srcset*="cloudfront"]');
              if (picture) {
                const srcset = picture.getAttribute('srcset');
                if (srcset) {
                  const match = srcset.match(/(https?:\/\/[^\s,]+)/);
                  if (match) heroImage = match[1];
                }
              }
            }

            results.push({ url, heroImage });
          });
          
          return results;
        });

        console.log(`   Found ${listings.length} properties on page ${currentPageNum}`);
        
        if (listings.length === 0) {
          console.log(`   ✅ No more properties. Stopping.`);
          break;
        }

        listings.forEach(item => {
          if (item.url && !propertyData.has(item.url)) {
            propertyData.set(item.url, { heroImage: item.heroImage });
          }
        });

        currentPageNum++;

      } catch (pageError) {
        console.error(`❌ Error on listing page ${currentPageNum}:`, pageError.message);
        break;
      }
    }

    console.log(`\n✅ Found ${propertyData.size} properties with hero images\n`);

    // ===== PART 2: Scrape detailed data =====
    const properties = [];
    const propertyArray = Array.from(propertyData.entries());
    const limit = maxProperties || propertyArray.length;
    
    console.log(`🔍 Scraping details for ${Math.min(limit, propertyArray.length)} properties...\n`);

    for (let i = 0; i < Math.min(limit, propertyArray.length); i++) {
      const [url, listingInfo] = propertyArray[i];
      console.log(`[${i + 1}/${Math.min(limit, propertyArray.length)}] ${url}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const property = await page.evaluate((url, heroImageFromListing) => {
          const prop = { url };
          const clean = (txt) => txt ? txt.replace(/\s+/g, ' ').trim() : '';

          // Title & City
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

          // Details from summary
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

          // Property type
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

          // Prestations - pool detection
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

          if (!prop.pool) {
            const titleLower = (prop.title || '').toLowerCase();
            const descLower = (prop.description || '').toLowerCase();
            if (titleLower.includes('piscine') || descLower.includes('piscine')) {
              prop.pool = true;
            }
          }

          // ===== BEDROOMS & BATHROOMS =====
          prop.bedrooms = 0;
          prop.bathrooms = 0;
          
          const surfacesEl = document.querySelector('.module-property-info-template-5');
          if (surfacesEl) {
            const surfaceItems = surfacesEl.querySelectorAll('li');
            
            surfaceItems.forEach(li => {
              const text = clean(li.textContent).toLowerCase();
              
              if (text.includes('chambre')) {
                if (!text.includes('salle') && !text.includes('suite')) {
                  prop.bedrooms++;
                }
              }
              
              if (text.includes('salle de bains') || 
                  text.includes('salle de bain') ||
                  text.includes('salle d\'eau') || 
                  text.includes('salle d eau') ||
                  text.includes('salle de douche')) {
                prop.bathrooms++;
              }
            });
          }

          // Fallback from description
          if (prop.bedrooms === 0 && prop.description) {
            const descLower = prop.description.toLowerCase();
            
            const chambreMatches = descLower.match(/(\d+)\s*chambres?(?!\s+d'enfant)/gi);
            if (chambreMatches) {
              chambreMatches.forEach(match => {
                const num = parseInt(match.match(/\d+/)[0]);
                prop.bedrooms += num;
              });
            }
            
            const numberWords = {
              'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
              'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10
            };
            
            for (const [word, num] of Object.entries(numberWords)) {
              const regex = new RegExp(`\\b${word}\\s+chambres?\\b`, 'gi');
              const matches = descLower.match(regex);
              if (matches) {
                prop.bedrooms += (num * matches.length);
              }
            }
            
            if (prop.bedrooms === 0) {
              const individualChambreMatches = descLower.match(/chambre\s+de\s+[\d.]+\s*m/gi);
              if (individualChambreMatches) {
                prop.bedrooms = individualChambreMatches.length;
              }
            }

            if (descLower.includes('suite parentale')) {
              prop.bedrooms += 1;
            }
          }

          if (prop.bathrooms === 0 && prop.description) {
            const descLower = prop.description.toLowerCase();
            const bathroomMatches = descLower.match(/salle\s+de\s+(bains?|douche|d['']eau)/gi);
            if (bathroomMatches) {
              prop.bathrooms = bathroomMatches.length;
            }
          }

          if (prop.bedrooms === 0) prop.bedrooms = null;
          if (prop.bathrooms === 0) prop.bathrooms = null;

          // ===== LAND SURFACE EXTRACTION =====
          prop.land_surface = null;

          // Method 1: From Surfaces section (most reliable)
          if (surfacesEl) {
            const surfaceItems = surfacesEl.querySelectorAll('li');
            
            surfaceItems.forEach(li => {
              const text = clean(li.textContent);
              const textLower = text.toLowerCase();
              
              if (textLower.includes('terrain') || textLower.includes('parcelle')) {
                const spans = li.querySelectorAll('span');
                if (spans.length > 0) {
                  const surfaceText = clean(spans[0].textContent);
                  
                  // Extract m²
                  const m2Match = surfaceText.match(/(\d+(?:\s*\d+)*)\s*m/i);
                  if (m2Match) {
                    prop.land_surface = parseInt(m2Match[1].replace(/\s+/g, ''));
                  }
                  
                  // Extract hectares and convert to m²
                  const haMatch = surfaceText.match(/([\d.,]+)\s*(?:ha|hectares?)/i);
                  if (haMatch && !prop.land_surface) {
                    const ha = parseFloat(haMatch[1].replace(',', '.'));
                    prop.land_surface = Math.round(ha * 10000);
                  }
                }
              }
            });
          }

          // Method 2: From description (fallback)
          if (!prop.land_surface && prop.description) {
            const descText = prop.description;
            
            // Pattern: "X m²" or "X m2"
            const m2Patterns = [
              /(?:terrain|parcelle|parc).*?(\d+(?:\s*\d+)*)\s*m[²2]/i,
              /(\d+(?:\s*\d+)*)\s*m[²2].*?(?:terrain|parcelle)/i,
              /sur\s+(?:un\s+)?(?:terrain|parcelle).*?(\d+(?:\s*\d+)*)\s*m/i
            ];
            
            for (const pattern of m2Patterns) {
              const match = descText.match(pattern);
              if (match) {
                const value = match[1].replace(/\s+/g, '');
                prop.land_surface = parseInt(value);
                break;
              }
            }
            
            // Pattern: "X Ha" (hectares)
            if (!prop.land_surface) {
              const haPatterns = [
                /(?:terrain|parcelle).*?([\d.,]+)\s*(?:ha|hectares?)\b/i,
                /([\d.,]+)\s*(?:ha|hectares?)\b/i
              ];
              
              for (const pattern of haPatterns) {
                const match = descText.match(pattern);
                if (match) {
                  const ha = parseFloat(match[1].replace(',', '.'));
                  prop.land_surface = Math.round(ha * 10000);
                  break;
                }
              }
            }
            
            // Pattern: Complex notation "1ha 13ca 4a"
            // 1 hectare = 10,000 m²
            // 1 are (a) = 100 m²
            // 1 centiare (ca) = 1 m²
            if (!prop.land_surface) {
              const complexMatch = descText.match(/(\d+)\s*ha(?:\s+(\d+)\s*ca)?(?:\s+(\d+)\s*a)?/i);
              if (complexMatch) {
                const ha = parseInt(complexMatch[1]) || 0;
                const ca = parseInt(complexMatch[2]) || 0;
                const a = parseInt(complexMatch[3]) || 0;
                prop.land_surface = (ha * 10000) + (a * 100) + ca;
              }
            }
          }

          // Validation: Ignore unrealistic values
          if (prop.land_surface) {
            if (prop.land_surface < 50 || prop.land_surface > 1000000) {
              prop.land_surface = null;
            }
          }

          // Images
          const allImages = [];
          
          const sliderImages = document.querySelectorAll('.module-slider img, .slider img');
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

          prop.heroImageFromListing = heroImageFromListing;
          prop.allImagesFromDetail = allImages;

          return prop;
        }, url, listingInfo.heroImage);

        // Organize images with hero first
        const finalImages = [];
        
        if (property.heroImageFromListing) {
          let heroImg = property.heroImageFromListing.replace(/\/\d+x\d+\//, '/original/');
          finalImages.push(heroImg);
        }
        
        if (property.allImagesFromDetail) {
          property.allImagesFromDetail.forEach(img => {
            const normalizedImg = img.replace(/\/\d+x\d+\//, '/original/');
            const normalizedHero = property.heroImageFromListing 
              ? property.heroImageFromListing.replace(/\/\d+x\d+\//, '/original/')
              : null;
            
            if (!normalizedHero || normalizedImg !== normalizedHero) {
              if (!finalImages.includes(normalizedImg)) {
                finalImages.push(normalizedImg);
              }
            }
          });
        }
        
        property.images = finalImages.slice(0, 15);

        // API-based postal code lookup
        if (property.city) {
          property.postal_code = await getPostalCodeFromCity(property.city);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Validation
        if (property.price && (property.reference || property.title)) {
          properties.push(property);
          console.log(`   ✅ ${property.reference || 'N/A'}: ${property.city} (${property.postal_code || 'N/A'}), Land=${property.land_surface || 0}m², Beds=${property.bedrooms || 0}, Baths=${property.bathrooms || 0}`);
        } else {
          console.log(`   ⚠️  Skipped: Missing data`);
        }

      } catch (propError) {
        console.error(`   ❌ Error: ${propError.message}`);
      }

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
        land_surface: p.land_surface,
        city: p.city,
        postal_code: p.postal_code,
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
          scraper_version: '2.3',
          postal_code_api: 'geo.api.gouv.fr'
        }),
        scraped_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      }));

      inserted = await savePropertiesToDB(propertiesForDB, 'charbit', supabase);
    }

    // Calculate stats
    const bedroomStats = properties.filter(p => p.bedrooms && p.bedrooms > 0);
    const bathroomStats = properties.filter(p => p.bathrooms && p.bathrooms > 0);
    const postalCodeStats = properties.filter(p => p.postal_code);
    const landSurfaceStats = properties.filter(p => p.land_surface && p.land_surface > 0);

    console.log(`\n🎉 Scraping complete!`);
    console.log(`   Total: ${properties.length}`);
    console.log(`   Inserted/Updated: ${inserted}`);
    console.log(`   With Bedrooms: ${bedroomStats.length} (avg: ${bedroomStats.length > 0 ? (bedroomStats.reduce((sum, p) => sum + p.bedrooms, 0) / bedroomStats.length).toFixed(1) : 0})`);
    console.log(`   With Bathrooms: ${bathroomStats.length}`);
    console.log(`   With Land Surface: ${landSurfaceStats.length} (avg: ${landSurfaceStats.length > 0 ? (landSurfaceStats.reduce((sum, p) => sum + p.land_surface, 0) / landSurfaceStats.length).toFixed(0) : 0} m²)`);
    console.log(`   With Postal Code: ${postalCodeStats.length}/${properties.length} (${((postalCodeStats.length / properties.length) * 100).toFixed(0)}%)`);
    console.log(`   With Pool: ${properties.filter(p => p.pool).length}`);

    await browser.close();

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
      bathroomStats: {
        withBathrooms: bathroomStats.length
      },
      landSurfaceStats: {
        withLandSurface: landSurfaceStats.length,
        avgLandSurface: landSurfaceStats.length > 0 
          ? Math.round(landSurfaceStats.reduce((sum, p) => sum + p.land_surface, 0) / landSurfaceStats.length)
          : 0
      },
      postalCodeCoverage: {
        found: postalCodeStats.length,
        total: properties.length,
        percentage: `${((postalCodeStats.length / properties.length) * 100).toFixed(0)}%`,
        source: 'geo.api.gouv.fr'
      },
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
