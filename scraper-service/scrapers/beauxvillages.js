const { validatePropertyData } = require('../utils/validation');
const { savePropertiesToDB } = require('../utils/database');

// ========================================
// HELPER: Fetch existing properties with prices
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

async function extractBeauxVillagesListingCards(page) {
  console.log('🔍 Extracting Beaux Villages listing cards...');
  
  const cards = await page.evaluate(() => {
    const results = [];
    const clean = s => s ? s.replace(/\s+/g, ' ').trim() : '';

    // Find all property cards - they typically have a link to /property/
    const propertyLinks = Array.from(document.querySelectorAll('a[href*="/property/"]'));
    console.log(`Found ${propertyLinks.length} property links`);

    propertyLinks.forEach(link => {
      try {
        const url = link.href;
        
        // Find the card container
        let card = link.closest('div.property-card') || 
                   link.closest('div[class*="property"]') ||
                   link.closest('div.listing-item') ||
                   link.closest('article');
        
        if (!card) {
          // Try going up several levels
          let current = link.parentElement;
          for (let i = 0; i < 8 && current; i++) {
            const hasPrice = current.textContent.includes('€');
            if (hasPrice) {
              card = current;
              break;
            }
            current = current.parentElement;
          }
        }

        if (!card) {
          console.log(`No card container found for: ${url}`);
          return;
        }

        // Extract price
        let price = null;
        const cardText = clean(card.textContent);
        const priceMatch = cardText.match(/€\s*([\d,\s]+)/);
        if (priceMatch) {
          price = parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10);
        }

        // Extract reference from URL (e.g., "348023-BVI81468" -> "BVI81468")
        let reference = null;
        const urlMatch = url.match(/property\/\d+-([A-Z]+\d+)/i);
        if (urlMatch) {
          reference = urlMatch[1];
        }

        // Extract basic info from card text
        let bedrooms = null;
        const bedroomsMatch = cardText.match(/(\d+)\s*chambres?/i);
        if (bedroomsMatch) bedrooms = parseInt(bedroomsMatch[1], 10);

        let building_surface = null;
        const surfaceMatch = cardText.match(/(\d+)\s*m[²2]/i);
        if (surfaceMatch) building_surface = parseInt(surfaceMatch[1], 10);

        results.push({
          url,
          reference,
          price,
          bedrooms,
          building_surface
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

async function extractBeauxVillagesPropertyData(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const propertyData = await page.evaluate(() => {
      const data = {};
      const clean = (txt) => txt ? txt.replace(/\s+/g, ' ').trim() : '';

      // Helper to get value from label-result pairs
      const getValue = (labelText) => {
        const labels = Array.from(document.querySelectorAll('.label-r, .label-r-com'));
        for (const label of labels) {
          if (clean(label.textContent).toLowerCase().includes(labelText.toLowerCase())) {
            let result = label.nextElementSibling;
            if (result && (result.classList.contains('result-r') || result.classList.contains('result-r-com'))) {
              return clean(result.textContent);
            }
          }
        }
        return null;
      };

      // ===== REFERENCE =====
      const refi2Span = document.querySelector('span.refi2');
      if (refi2Span) {
        data.reference = clean(refi2Span.textContent);
      }

      // Fallback: extract from URL
      if (!data.reference) {
        const urlMatch = window.location.pathname.match(/property\/\d+-([A-Z]+\d+)/i);
        if (urlMatch) {
          data.reference = urlMatch[1];
        }
      }

      // ===== TITLE =====
      const h1 = document.querySelector('h1');
      data.title = h1 ? clean(h1.textContent) : '';

      // ===== PRICE =====
      const priceDiv = document.querySelector('.ip-detail-price, div.ip-detail-price');
      if (priceDiv) {
        const priceText = clean(priceDiv.textContent);
        const priceMatch = priceText.match(/€\s*([\d,\s]+)/);
        if (priceMatch) {
          data.price = parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10);
        }
      }

      // ===== PROPERTY TYPE =====
      const typeValue = getValue('Type de bien');
      if (typeValue) {
        const typeLower = typeValue.toLowerCase();
        if (typeLower.includes('maison') || typeLower.includes('villa')) {
          data.property_type = 'House/Villa';
        } else if (typeLower.includes('appartement')) {
          data.property_type = 'Apartment';
        } else if (typeLower.includes('terrain')) {
          data.property_type = 'Land';
        } else if (typeLower.includes('immeuble')) {
          data.property_type = 'Building';
        } else {
          data.property_type = typeValue;
        }
      } else {
        data.property_type = null;
      }

      // ===== BASIC DETAILS =====
      const chambresValue = getValue('Chambres');
      data.bedrooms = chambresValue ? parseInt(chambresValue, 10) : null;

      const bathroomsValue = getValue('Salle des bains');
      data.bathrooms = bathroomsValue ? parseInt(bathroomsValue, 10) : null;

      const roomsValue = getValue('N° pieces');
      data.rooms = roomsValue ? parseInt(roomsValue, 10) : null;

      // ===== SURFACES =====
      const habitableValue = getValue('Surface habitable');
      if (habitableValue) {
        const match = habitableValue.match(/(\d+)/);
        data.building_surface = match ? parseInt(match[1], 10) : null;
      } else {
        data.building_surface = null;
      }

      const terrainValue = getValue('Surface terrain');
      if (terrainValue) {
        const match = terrainValue.match(/(\d+)/);
        data.land_surface = match ? parseInt(match[1], 10) : null;
      } else {
        data.land_surface = null;
      }

      // ===== LOCATION =====
      const secteurValue = getValue('Secteur');
      data.city = secteurValue || null;

      const deptValue = getValue('Département');
      data.location_department = deptValue || null;

      // Try to extract postal code from description or other text
      data.postal_code = null;
      const pageText = document.body.textContent;
      const postalMatch = pageText.match(/\b(\d{5})\b/);
      if (postalMatch) {
        data.postal_code = postalMatch[1];
      }

      // ===== POOL =====
      const poolValue = getValue('Piscine');
      if (poolValue) {
        const poolLower = poolValue.toLowerCase();
        data.pool = poolLower.includes('oui') || poolLower.includes('yes');
      } else {
        data.pool = false;
      }

      // Check title and description for pool mentions
      if (!data.pool) {
        const fullText = document.body.textContent.toLowerCase();
        if (fullText.includes('piscine') && 
            (fullText.includes('avec piscine') || fullText.includes('et piscine'))) {
          data.pool = true;
        }
      }

      // ===== PROPERTY CONDITION =====
      const etatValue = getValue('État');
      if (etatValue) {
        const etatLower = etatValue.toLowerCase();
        if (etatLower.includes('excellent')) {
          data.property_condition = 'Excellent';
        } else if (etatLower.includes('bon')) {
          data.property_condition = 'Good';
        } else if (etatLower.includes('mise à jour') || etatLower.includes('travaux')) {
          data.property_condition = 'To Renovate';
        } else if (etatLower.includes('neuf') || etatLower.includes('récent')) {
          data.property_condition = 'New/Recent';
        } else {
          data.property_condition = etatValue;
        }
      } else {
        data.property_condition = null;
      }

      // ===== DRAINAGE =====
      const drainageValue = getValue('Eaux usées');
      if (drainageValue) {
        const drainageLower = drainageValue.toLowerCase();
        if (drainageLower.includes('tout') && drainageLower.includes('égout')) {
          data.drainage_system = 'Mains';
        } else if (drainageLower.includes('fosse') || drainageLower.includes('septique')) {
          data.drainage_system = 'Individual (Septic)';
        } else {
          data.drainage_system = drainageValue;
        }
      } else {
        data.drainage_system = null;
      }

      // ===== HEATING =====
      const heatingValue = getValue('Chauffage');
      data.heating_system = heatingValue || null;

      // ===== ENERGY (DPE) =====
      data.energy_consumption = null;
      data.co2_emissions = null;

      // Look for energy consumption
      const consumptionEl = document.querySelector('.line2');
      if (consumptionEl) {
        const siblings = Array.from(consumptionEl.parentElement.querySelectorAll('.line1, .line2'));
        siblings.forEach((el, i) => {
          const text = clean(el.textContent);
          if (text.includes('kWh')) {
            const prev = siblings[i - 1];
            if (prev) {
              const match = prev.textContent.match(/(\d+)/);
              if (match) data.energy_consumption = parseInt(match[1], 10);
            }
          }
          if (text.includes('kg CO2')) {
            const prev = siblings[i - 1];
            if (prev) {
              const match = prev.textContent.match(/(\d+)/);
              if (match) data.co2_emissions = parseInt(match[1], 10);
            }
          }
        });
      }

      // Fallback: search in page text
      if (!data.energy_consumption) {
        const match = pageText.match(/consumption[^\d]*(\d+)\s*kWh/i);
        if (match) data.energy_consumption = parseInt(match[1], 10);
      }

      if (!data.co2_emissions) {
        const match = pageText.match(/emission[^\d]*(\d+)\s*kg\s*CO2/i);
        if (match) data.co2_emissions = parseInt(match[1], 10);
      }

      // ===== IMAGES =====
      const images = [];
      
      // Get hero images from prop-mason
      const masonImages = document.querySelectorAll('#prop-mason img');
      masonImages.forEach(img => {
        const src = img.src || img.getAttribute('data-src');
        if (src && src.startsWith('http') && !images.includes(src)) {
          images.push(src);
        }
      });

      // Get all gallery images
      const galleryImages = document.querySelectorAll('#ipgalleryplug img, .ip-galleryplug-img img');
      galleryImages.forEach(img => {
        const src = img.src || img.getAttribute('data-src');
        if (src && src.startsWith('http') && !images.includes(src)) {
          images.push(src);
        }
      });

      // Also check for images in links
      const imageLinks = document.querySelectorAll('a[href*=".jpg"], a[href*=".jpeg"], a[href*=".png"]');
      imageLinks.forEach(link => {
        const href = link.href;
        if (href && !images.includes(href)) {
          images.push(href);
        }
      });

      data.allImages = images;

      // ===== DESCRIPTION =====
      const descriptionCol = document.querySelector('.description-col');
      if (descriptionCol) {
        // Get all paragraphs and list items, excluding headers
        const textElements = descriptionCol.querySelectorAll('p, li');
        let descriptionText = '';
        textElements.forEach(el => {
          const text = clean(el.textContent);
          if (text && text.length > 20 && !text.startsWith('Prix honoraires')) {
            descriptionText += text + ' ';
          }
        });
        data.description = descriptionText.trim().substring(0, 1000);
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

async function scrapeBeauxVillages(req, res, { puppeteer, chromium, supabase }) {
  try {
    const { searchUrl, maxPages = 3, priceUpdateMode = false } = req.body;

    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    console.log(`🎯 Starting Beaux Villages scrape: ${searchUrl}`);
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
      const existingPropertiesMap = await getExistingProperties(supabase, 'beaux-villages');
      const priceChanges = [];

      console.log(`🔍 Checking ${existingPropertiesMap.size} properties for price changes...\n`);

      let checked = 0;
      for (const [reference, existingData] of existingPropertiesMap.entries()) {
        checked++;
        console.log(`   [${checked}/${existingPropertiesMap.size}] Checking ${reference}...`);

        const detailData = await extractBeauxVillagesPropertyData(page, existingData.url);

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
        await savePropertiesToDB(allProperties, 'beaux-villages', supabase);
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

    // PART 1: Collect all listings
    // Beaux Villages pagination: start=0, start=43, start=86, etc. (increments of 43)
    let startIndex = 0;
    const incrementSize = 43;

    while (currentPageNum <= maxPages) {
      console.log(`📄 Scraping Beaux Villages listing page ${currentPageNum} (start=${startIndex})...`);

      const pageUrl = `${searchUrl}${searchUrl.includes('?') ? '&' : '?'}start=${startIndex}`;

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Scroll to load lazy images
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(resolve => setTimeout(resolve, 1000));

        const cards = await extractBeauxVillagesListingCards(page);

        if (cards.length === 0) {
          console.log(`   ✅ Reached end of Beaux Villages listings at page ${currentPageNum - 1}`);
          break;
        }

        cards.forEach(card => {
          if (card.url && card.reference && !propertyMap.has(card.reference)) {
            propertyMap.set(card.reference, card);
          }
        });

        console.log(`   Found ${cards.length} Beaux Villages properties on page ${currentPageNum}`);
        currentPageNum++;
        startIndex += incrementSize;
      } catch (pageError) {
        console.error(`Error on listing page ${currentPageNum}:`, pageError.message);
        break;
      }
    }

    console.log(`\n✅ Found ${propertyMap.size} unique Beaux Villages properties from listing pages\n`);

    // PART 2: Smart filtering - separate existing vs new
    const existingPropertiesMap = await getExistingProperties(supabase, 'beaux-villages');
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
          price: existingData.currentPrice, // Keep existing price
          last_seen_at: new Date().toISOString()
        };
        
        console.log(`   ✅ ${reference} (still active)`);
        allProperties.push(updateData);
      }

      console.log(`\n✅ ${existingProperties.length} existing properties marked as active\n`);
    }

    // PART 4: Full detail scraping for NEW properties
    if (newProperties.length > 0) {
      console.log(`🔍 Full scraping for ${newProperties.length} NEW properties...\n`);

      for (const { reference, listingData } of newProperties) {
        const detailData = await extractBeauxVillagesPropertyData(page, listingData.url);

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
          building_surface: detailData.building_surface || listingData.building_surface
        };

        if (!propertyData.price) {
          console.log(`⚠️  Skipping ${listingData.url} - no valid price`);
          continue;
        }

        // Images: use first image as hero
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
          source: 'beaux-villages',
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
            source: 'beaux-villages',
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
      await savePropertiesToDB(allProperties, 'beaux-villages', supabase);
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

module.exports = { scrapeBeauxVillages };
