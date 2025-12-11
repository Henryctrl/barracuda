//need to make this run locally as the ip is getting found out by page

const { validatePropertyData } = require('../utils/validation');
const { savePropertiesToDB } = require('../utils/database');

// ========================================
// HELPER: Fetch existing properties
// ========================================

async function getExistingProperties(supabase, source) {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('reference, price, previous_price, url')
      .eq('source', source)
      .eq('is_active', true);
    
    if (error) throw error;
    
    const propertiesMap = new Map();
    data.forEach(p => {
      if (p.reference) {
        propertiesMap.set(p.reference, {
          currentPrice: p.price,
          previousPrice: p.previous_price,
          url: p.url
        });
      }
    });
    
    console.log(`📊 Found ${propertiesMap.size} existing properties in database`);
    return propertiesMap;
  } catch (error) {
    console.error('⚠️  Error fetching existing properties:', error);
    return new Map();
  }
}

// ========================================
// LISTING EXTRACTION
// ========================================

async function extractLeggettListingCards(page) {
  console.log('🔍 Extracting Leggett listing cards...');
  
  const cards = await page.evaluate(() => {
    const results = [];
    const clean = s => s ? s.replace(/\s+/g, ' ').trim() : '';

    // Find all property links - they go to /acheter-vendre-une-maison/view/
    const propertyLinks = Array.from(document.querySelectorAll('a[href*="/acheter-vendre-une-maison/view/"]'));
    console.log(`Found ${propertyLinks.length} property links`);

    propertyLinks.forEach(link => {
      try {
        const url = link.href;
        
        // Extract reference from URL: /view/A41688HL22/...
        let reference = null;
        const urlMatch = url.match(/\/view\/([A-Z0-9]+)\//i);
        if (urlMatch) {
          reference = urlMatch[1];
        }

        // Find the card container
        let card = link.closest('.selection-item') || 
                   link.closest('.result-item') ||
                   link;

        // Extract price - look for patterns like "129 900 €"
        let price = null;
        const cardText = clean(card.textContent);
        const priceMatch = cardText.match(/(\d[\d\s,]*)\s*€/);
        if (priceMatch) {
          price = parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10);
        }

        // Extract basic info
        let bedrooms = null;
        const bedroomsMatch = cardText.match(/(\d+)\s*ch(?:ambre|bre)/i);
        if (bedroomsMatch) bedrooms = parseInt(bedroomsMatch[1], 10);

        let building_surface = null;
        const surfaceMatch = cardText.match(/(\d+)\s*m[²2]/i);
        if (surfaceMatch) building_surface = parseInt(surfaceMatch[1], 10);

        let rooms = null;
        const roomsMatch = cardText.match(/(\d+)\s*pièces?/i);
        if (roomsMatch) rooms = parseInt(roomsMatch[1], 10);

        results.push({
          url,
          reference,
          price,
          bedrooms,
          building_surface,
          rooms
        });

      } catch (err) {
        console.error('Card extraction error:', err.message);
      }
    });

    return results;
  });

  console.log(`✅ Extracted ${cards.length} cards from listing page`);
  console.log(`   With prices: ${cards.filter(c => c.price).length}`);
  console.log(`   With references: ${cards.filter(c => c.reference).length}`);
  
  return cards;
}

// ========================================
// DETAIL PAGE EXTRACTION
// ========================================

async function extractLeggettPropertyData(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const propertyData = await page.evaluate(() => {
      const data = {};
      const clean = (txt) => txt ? txt.replace(/\s+/g, ' ').trim() : '';

      // Helper to get characteristic value by label
      const getCharValue = (labelText) => {
        const items = Array.from(document.querySelectorAll('.characteristic-detail-item'));
        for (const item of items) {
          const label = item.querySelector('.characteristic-detail-label');
          const value = item.querySelector('.characteristic-detail-value');
          if (label && value && clean(label.textContent).toLowerCase().includes(labelText.toLowerCase())) {
            return clean(value.textContent);
          }
        }
        return null;
      };

      // ===== REFERENCE =====
      const refValue = getCharValue('référence');
      data.reference = refValue || null;

      // Fallback: extract from URL
      if (!data.reference) {
        const urlMatch = window.location.pathname.match(/\/view\/([A-Z0-9]+)\//i);
        if (urlMatch) {
          data.reference = urlMatch[1];
        }
      }

      // ===== TITLE (from h1) =====
      const h1 = document.querySelector('h1.product-header-localisation');
      data.title = h1 ? clean(h1.textContent) : '';

      // ===== DESCRIPTION TITLE =====
      const descTitle = document.querySelector('.product-characteristics-desc');
      if (descTitle) {
        const descText = clean(descTitle.textContent);
        if (descText) {
          data.title = data.title ? `${data.title} - ${descText}` : descText;
        }
      }

      // ===== PRICE =====
      const priceEl = document.querySelector('.product-header-price');
      if (priceEl) {
        const priceText = clean(priceEl.textContent);
        const priceMatch = priceText.match(/(\d[\d\s,]*)/);
        if (priceMatch) {
          data.price = parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10);
        }
      }

      // ===== PROPERTY TYPE =====
      const typeValue = getCharValue('types de bien');
      if (typeValue) {
        const typeLower = typeValue.toLowerCase();
        if (typeLower.includes('maison') || typeLower.includes('villa')) {
          data.property_type = 'House/Villa';
        } else if (typeLower.includes('appartement')) {
          data.property_type = 'Apartment';
        } else if (typeLower.includes('terrain')) {
          data.property_type = 'Land';
        } else if (typeLower.includes('immeuble') || typeLower.includes('building')) {
          data.property_type = 'Building';
        } else {
          data.property_type = 'House/Villa'; // Default for Leggett
        }
      } else {
        data.property_type = 'House/Villa';
      }

      // ===== EXTRACT FROM HEADER (58 m² - 2 pièces - 1 chbre - ext. 190 m²) =====
      const headerTitle = document.querySelector('.product-header-title');
      if (headerTitle) {
        const headerText = clean(headerTitle.textContent);
        
        // Building surface
        const surfaceMatch = headerText.match(/(\d+)\s*m[²2]/);
        if (surfaceMatch) data.building_surface = parseInt(surfaceMatch[1], 10);

        // Rooms
        const roomsMatch = headerText.match(/(\d+)\s*pièces?/i);
        if (roomsMatch) data.rooms = parseInt(roomsMatch[1], 10);

        // Bedrooms
        const bedroomsMatch = headerText.match(/(\d+)\s*ch(?:ambre|bre)/i);
        if (bedroomsMatch) data.bedrooms = parseInt(bedroomsMatch[1], 10);

        // Land surface (ext.)
        const landMatch = headerText.match(/ext\.\s*(\d[\d\s,]*)\s*m[²2]/i);
        if (landMatch) {
          data.land_surface = parseInt(landMatch[1].replace(/[^\d]/g, ''), 10);
        }
      }

      // ===== BATHROOMS (from characteristics list) =====
      const characteristics = Array.from(document.querySelectorAll('.characteristics-name'));
      for (const char of characteristics) {
        const text = clean(char.textContent);
        const bathroomMatch = text.match(/(\d+)\s*salle.*bains?/i);
        if (bathroomMatch) {
          data.bathrooms = parseInt(bathroomMatch[1], 10);
          break;
        }
      }

      // ===== LOCATION =====
      const cityValue = getCharValue('ville');
      data.city = cityValue || null;

      const deptValue = getCharValue('département');
      data.location_department = deptValue || null;

      // Extract postal code from Google Maps link or title
      const mapLink = document.querySelector('a[href*="maps.google.com"]');
      data.postal_code = null;
      if (mapLink) {
        const mapHref = mapLink.href;
        const postalMatch = mapHref.match(/(\d{5})/);
        if (postalMatch) {
          data.postal_code = postalMatch[1];
        }
      }

      // Fallback: from h1
      if (!data.postal_code && data.title) {
        const titlePostalMatch = data.title.match(/\((\d{5})\)/);
        if (titlePostalMatch) {
          data.postal_code = titlePostalMatch[1];
        }
      }

      // ===== PROPERTY CONDITION =====
      const etatValue = getCharValue('etat');
      if (etatValue) {
        const etatLower = etatValue.toLowerCase();
        if (etatLower.includes('rénover') || etatLower.includes('travaux')) {
          data.property_condition = 'To Renovate';
        } else if (etatLower.includes('bon')) {
          data.property_condition = 'Good';
        } else if (etatLower.includes('excellent')) {
          data.property_condition = 'Excellent';
        } else if (etatLower.includes('neuf') || etatLower.includes('récent')) {
          data.property_condition = 'New/Recent';
        } else {
          data.property_condition = etatValue;
        }
      } else {
        data.property_condition = null;
      }

      // ===== POOL =====
      data.pool = false;
      const featureLinks = Array.from(document.querySelectorAll('.feature-link, .characteristics-bulk a, .characteristics-bulk .point'));
      const pageText = document.body.textContent.toLowerCase();
      
      if (pageText.includes('piscine') || featureLinks.some(el => clean(el.textContent).toLowerCase().includes('piscine'))) {
        data.pool = true;
      }

      // ===== HEATING & DRAINAGE =====
      data.heating_system = null;
      data.drainage_system = null;

      for (const link of featureLinks) {
        const linkText = clean(link.textContent).toLowerCase();
        
        // Drainage
        if (linkText.includes('tout à l\'égout') || linkText.includes('tout-à-l\'égout')) {
          data.drainage_system = 'Mains';
        } else if (linkText.includes('assainissement individuel') || linkText.includes('fosse')) {
          data.drainage_system = 'Individual (Septic)';
        }

        // Heating (basic detection)
        if (linkText.includes('chauffage central')) {
          data.heating_system = 'Central Heating';
        } else if (linkText.includes('cheminée')) {
          data.heating_system = data.heating_system ? `${data.heating_system}, Fireplace` : 'Fireplace';
        }
      }

      // ===== ENERGY (DPE) - Not prominently displayed on Leggett =====
      data.energy_consumption = null;
      data.co2_emissions = null;

      // ===== IMAGES =====
      const images = [];
      
      // Main image
      const mainImg = document.querySelector('.product-carousel-visual');
      if (mainImg && mainImg.src && mainImg.src.startsWith('http')) {
        images.push(mainImg.src);
      }

      // Gallery images (from lightgallery)
      const galleryItems = document.querySelectorAll('#lightgallery .product-carousel-nav-wrapper');
      galleryItems.forEach(item => {
        const dataSrc = item.getAttribute('data-src');
        if (dataSrc && dataSrc.startsWith('http') && !images.includes(dataSrc)) {
          images.push(dataSrc);
        }
      });

      data.allImages = images;

      // ===== DESCRIPTION =====
      const descriptionEl = document.querySelector('.product-characteristics-description');
      if (descriptionEl) {
        let descText = clean(descriptionEl.textContent);
        // Remove the "Lire la description" toggle text
        descText = descText.replace(/Lire la description détaillée/gi, '').trim();
        data.description = descText.substring(0, 1000);
      } else {
        data.description = '';
      }

      return data;
    });

    console.log(`✅ ${propertyData.reference}: ${propertyData.title.substring(0, 60)}...`);
    
    return propertyData;
  } catch (error) {
    console.error(`❌ Error extracting ${url}:`, error.message);
    return null;
  }
}

// ========================================
// MAIN SCRAPER
// ========================================

async function scrapeLeggett(req, res, { puppeteer, chromium, supabase }) {
  try {
    const { searchUrl, maxPages = 3, priceUpdateMode = false } = req.body;

    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    console.log(`🎯 Starting Leggett Immobilier scrape: ${searchUrl}`);
    if (priceUpdateMode) {
      console.log('💰 PRICE UPDATE MODE: Checking all existing properties for price changes\n');
    }

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || chromium.executablePath,
      headless: true,
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const allProperties = [];
    const validationStats = { valid: 0, invalid: 0, total: 0 };

    // ===== PRICE UPDATE MODE =====
    if (priceUpdateMode) {
      const existingPropertiesMap = await getExistingProperties(supabase, 'leggett');
      const priceChanges = [];

      console.log(`🔍 Checking ${existingPropertiesMap.size} properties for price changes...\n`);

      let checked = 0;
      for (const [reference, existingData] of existingPropertiesMap.entries()) {
        checked++;
        console.log(`   [${checked}/${existingPropertiesMap.size}] Checking ${reference}...`);

        const detailData = await extractLeggettPropertyData(page, existingData.url);

        if (!detailData || !detailData.price) {
          console.log(`      ⚠️  Could not get price, skipping`);
          continue;
        }

        const updateData = {
          reference,
          url: existingData.url,
          price: detailData.price,
          last_seen_at: new Date().toISOString()
        };

        // Check for price change
        if (existingData.currentPrice && detailData.price !== existingData.currentPrice) {
          const priceDiff = detailData.price - existingData.currentPrice;
          const percentChange = ((priceDiff / existingData.currentPrice) * 100).toFixed(1);
          
          updateData.previous_price = existingData.currentPrice;
          updateData.price_changed_at = new Date().toISOString();
          updateData.price_drop_amount = priceDiff;
          
          if (priceDiff < 0) {
            console.log(`      💰📉 €${existingData.currentPrice} → €${detailData.price} (${percentChange}% DROP!)`);
          } else {
            console.log(`      💰📈 €${existingData.currentPrice} → €${detailData.price} (+${percentChange}%)`);
          }
          
          priceChanges.push({
            reference,
            oldPrice: existingData.currentPrice,
            newPrice: detailData.price,
            change: priceDiff,
            percentChange
          });
        } else {
          console.log(`      ✅ €${detailData.price} (no change)`);
        }

        allProperties.push(updateData);

        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      await browser.close();

      // Save to database
      if (allProperties.length > 0) {
        console.log(`\n💾 Saving ${allProperties.length} price updates to database...`);
        await savePropertiesToDB(allProperties, 'leggett', supabase);
      }

      const summary = {
        success: true,
        message: `Price check complete for ${allProperties.length} properties`,
        stats: {
          checked: allProperties.length,
          price_changes: priceChanges.length
        },
        priceChanges: priceChanges
      };

      console.log('\n🎉 Price update complete!');
      console.log(`   Checked: ${allProperties.length}`);
      console.log(`   Price changes: ${priceChanges.length}`);

      return res.json(summary);
    }

    // ===== NORMAL SCRAPING MODE =====
let currentPageNum = 1;
const propertyMap = new Map();

// PART 1: Collect all listings (UPDATED WITH DEBUG)
// Leggett pagination: /page:1, /page:2, /page:3, etc.
// PART 1: Collect all listings (UPDATED WITH CLOUDFLARE HANDLING)
while (currentPageNum <= maxPages) {
    console.log(`📄 Scraping Leggett listing page ${currentPageNum}...`);
  
    // Build page URL
    let pageUrl = searchUrl;
    if (currentPageNum > 1) {
      pageUrl = pageUrl.replace(/\/page:\d+/, '');
      pageUrl = `${pageUrl}/page:${currentPageNum}`;
    }
  
    try {
      // Navigate to page (don't wait for full load yet)
      await page.goto(pageUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // ===== CLOUDFLARE CHALLENGE HANDLER =====
      console.log('   ⏳ Waiting for Cloudflare challenge...');
      
      try {
        // Wait for either challenge to disappear OR real content to appear
        await Promise.race([
          // Option A: Title changes from "Just a moment..."
          page.waitForFunction(() => {
            return !document.title.includes('Just a moment') && 
                   !document.body.textContent.includes('Verifying you are human');
          }, { timeout: 20000 }),
          
          // Option B: Real property content appears
          page.waitForSelector('a[href*="/acheter-vendre-une-maison/view/"]', { timeout: 20000 })
        ]);
        
        console.log('   ✅ Cloudflare challenge passed!');
        
      } catch (challengeError) {
        console.log('   ❌ Cloudflare challenge failed or timed out');
        
        // Check if we're still on challenge page
        const currentTitle = await page.title();
        if (currentTitle.includes('Just a moment')) {
          console.log('   ⚠️  Still blocked by Cloudflare - stopping scrape');
          break;
        }
      }
      
      // Wait for network to settle after challenge
      await page.waitForNetworkIdle({ timeout: 10000 }).catch(() => {
        console.log('   ⚠️  Network idle timeout - continuing anyway');
      });
      
      // Extra wait for JavaScript to fully render
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // ===== HUMAN-LIKE SCROLLING =====
      console.log('   🖱️  Scrolling page...');
      
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
  
      // ===== DEBUG: Check what we got =====
      const pageContent = await page.evaluate(() => {
        return {
          title: document.title,
          hasPropertyLinks: document.querySelectorAll('a[href*="/acheter-vendre-une-maison/view/"]').length,
          hasSelectionItems: document.querySelectorAll('.selection-item').length,
          hasResultItems: document.querySelectorAll('.result-item').length,
          bodyText: document.body.textContent.substring(0, 200)
        };
      });
      
      console.log('🔍 Page debug:', JSON.stringify(pageContent, null, 2));
  
      // ===== EXTRACT CARDS =====
      const cards = await extractLeggettListingCards(page);
  
      if (cards.length === 0) {
        console.log(`   ⚠️  No cards found. Possible bot detection or wrong selectors.`);
        console.log(`   💡 Page title: "${pageContent.title}"`);
        
        // If still blocked, stop trying
        if (pageContent.title.includes('Just a moment') || 
            pageContent.title.includes('Access denied')) {
          console.log('   🛑 Cloudflare blocking confirmed - stopping scrape');
          break;
        }
        
        break;
      }
  
      cards.forEach(card => {
        if (card.url && card.reference && !propertyMap.has(card.reference)) {
          propertyMap.set(card.reference, card);
        }
      });
  
      console.log(`   ✅ Found ${cards.length} Leggett properties on page ${currentPageNum}`);
      currentPageNum++;
      
      // Delay between pages to look more human
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (pageError) {
      console.error(`❌ Error on listing page ${currentPageNum}:`, pageError.message);
      break;
    }
  }
  
  console.log(`\n✅ Found ${propertyMap.size} unique Leggett properties from listing pages\n`);
  

    // PART 2: Smart filtering - separate existing vs new
    const existingPropertiesMap = await getExistingProperties(supabase, 'leggett');
    const existingProperties = [];
    const newProperties = [];

    for (const [reference, listingData] of propertyMap.entries()) {
      if (existingPropertiesMap.has(reference)) {
        const existingData = existingPropertiesMap.get(reference);
        existingProperties.push({ reference, listingData, existingData });
      } else {
        newProperties.push({ reference, listingData });
      }
    }

    console.log(`📊 Split: ${existingProperties.length} existing (last_seen update only) + ${newProperties.length} new (full scrape)\n`);

    // PART 3: Quick updates for existing properties (ONLY last_seen_at)
    if (existingProperties.length > 0) {
      console.log('✅ Updating existing properties (marking as still active)...\n');

      for (const { reference, listingData, existingData } of existingProperties) {
        const updateData = {
          reference,
          url: listingData.url,
          price: existingData.currentPrice,
          last_seen_at: new Date().toISOString()
        };
        
        console.log(`   ✅ ${reference} (still active)`);
        allProperties.push(updateData);
      }

      console.log(`\n✅ ${existingProperties.length} existing properties marked as active\n`);
    }

    // PART 4: Full detail scraping for NEW properties
    if (newProperties.length > 0) {
      const maxPropertiesToScrape = req.body.maxProperties || newProperties.length;
      const propertiesToScrape = newProperties.slice(0, maxPropertiesToScrape);
      
      console.log(`🔍 Full scraping for ${propertiesToScrape.length} of ${newProperties.length} NEW properties (limit: ${maxPropertiesToScrape})\n`);
    
      for (const { reference, listingData } of propertiesToScrape) {
        const detailData = await extractLeggettPropertyData(page, listingData.url);

        if (!detailData) {
          console.log(`⚠️  Skipping ${listingData.url} - detail page failed`);
          continue;
        }

        // Merge listing data with detail data
        const propertyData = {
          ...listingData,
          ...detailData,
          price: detailData.price || listingData.price,
          bedrooms: detailData.bedrooms || listingData.bedrooms,
          building_surface: detailData.building_surface || listingData.building_surface,
          rooms: detailData.rooms || listingData.rooms
        };

        if (!propertyData.price) {
          console.log(`⚠️  Skipping ${listingData.url} - no valid price`);
          continue;
        }

        // Images: use all images
        const finalImages = [];
        if (detailData.allImages && detailData.allImages.length > 0) {
          finalImages.push(...detailData.allImages);
        }
        propertyData.images = finalImages.slice(0, 10);

        // Validation
        const validation = validatePropertyData({
          price: propertyData.price,
          surface: propertyData.building_surface,
          rooms: propertyData.rooms,
          bedrooms: propertyData.bedrooms,
          city: propertyData.city,
          postal_code: propertyData.postal_code
        });

        validationStats.total++;
        if (validation.isValid) {
          validationStats.valid++;
        } else {
          validationStats.invalid++;
        }

        const finalProperty = {
          source: 'leggett',
          url: propertyData.url,
          reference: propertyData.reference,
          title: propertyData.title,
          description: propertyData.description || '',
          price: propertyData.price,
          property_type: propertyData.property_type,
          rooms: propertyData.rooms,
          bedrooms: propertyData.bedrooms,
          bathrooms: propertyData.bathrooms,
          building_surface: propertyData.building_surface,
          land_surface: propertyData.land_surface,
          city: propertyData.city,
          location_department: propertyData.location_department,
          postal_code: propertyData.postal_code,
          heating_system: propertyData.heating_system,
          drainage_system: propertyData.drainage_system,
          pool: propertyData.pool,
          property_condition: propertyData.property_condition,
          energy_consumption: propertyData.energy_consumption,
          co2_emissions: propertyData.co2_emissions,
          images: propertyData.images,
          raw_data: JSON.stringify({
            source: 'leggett',
            scrapedAt: new Date().toISOString(),
            imageCount: propertyData.images.length,
            scraper_version: '1.0'
          }),
          scraped_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          validation_errors: JSON.stringify(validation.errors)
        };

        allProperties.push(finalProperty);

        // Delay between property scrapes
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    await browser.close();

    // ===== SAVE TO DATABASE =====
    if (allProperties.length > 0) {
      console.log(`\n💾 Saving ${allProperties.length} properties to database...`);
      await savePropertiesToDB(allProperties, 'leggett', supabase);
    }

    // ===== SUMMARY =====
    const summary = {
      success: true,
      message: `Scraped ${allProperties.length} properties from ${currentPageNum - 1} pages`,
      stats: {
        totalProperties: allProperties.length,
        newProperties: newProperties.length,
        existingUpdated: existingProperties.length,
        pagesScraped: currentPageNum - 1,
        validationStats
      }
    };

    console.log('\n🎉 Scraping complete!');
    console.log(`   Total: ${allProperties.length}`);
    console.log(`   New: ${newProperties.length}`);
    console.log(`   Existing: ${existingProperties.length}`);

    return res.json(summary);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return res.status(500).json({ 
      error: 'Scraping failed', 
      message: error.message 
    });
  }
}

module.exports = { scrapeLeggett };
