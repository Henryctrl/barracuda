const { validatePropertyData } = require('../utils/validation');
const { savePropertiesToDB } = require('../utils/database');

// ========================================
// LISTING EXTRACTION
// ========================================

async function extractEleonorListingCards(page) {
  console.log('🔍 Extracting listing cards...');
  
  const cards = await page.evaluate(() => {
    const results = [];
    const clean = s => s ? s.replace(/\s+/g, ' ').trim() : '';

    // Find all links to property pages first
    const propertyLinks = Array.from(document.querySelectorAll('a[href*="/fr/vente/"]'));
    console.log(`Found ${propertyLinks.length} total links with /fr/vente/`);

    // Filter to only property detail pages (contain ,VM)
    const detailLinks = propertyLinks.filter(a => a.href.includes(',VM'));
    console.log(`Found ${detailLinks.length} property detail links`);

    detailLinks.forEach(link => {
      try {
        const url = link.href;
        
        // Find the card container - walk up from the link
        let card = link.closest('article') || 
                   link.closest('[class*="_nhv2ha"]') ||
                   link.closest('div[class*="_1kqnpiud"]');
        
        if (!card) {
          // Try finding parent that has multiple property-related elements
          let current = link.parentElement;
          for (let i = 0; i < 8 && current; i++) {
            const hasPrice = current.querySelector('[class*="_1s1nzvi"], [class*="_11w5q3n"]');
            const hasInfo = current.querySelector('[class*="_eic3rb"]');
            if (hasPrice || hasInfo) {
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
        const priceEl = card.querySelector('span._1s1nzvi, div._11w5q3n, [class*="price"]');
        let price = null;
        if (priceEl) {
          const priceText = clean(priceEl.textContent);
          const match = priceText.match(/(\d[\d\s ]*)\s*€/);
          if (match) {
            price = parseInt(match[1].replace(/[^\d]/g, ''), 10);
          }
        }

        // Extract title
        const titleEl = card.querySelector('h2, h3, [class*="title"]');
        const title = titleEl ? clean(titleEl.textContent) : null;

        // Extract info from iconText or any element with pieces/m²
        let rooms = null;
        let building_surface = null;
        let city = null;
        let postal_code = null;

        const infoEl = card.querySelector('[class*="_eic3rb"], [class*="iconText"]') || card;
        const infoText = clean(infoEl.textContent);

        const roomsMatch = infoText.match(/(\d+)\s*pièces?/i);
        if (roomsMatch) rooms = parseInt(roomsMatch[1], 10);

        const surfaceMatch = infoText.match(/(\d+)\s*m[²2]/i);
        if (surfaceMatch) building_surface = parseInt(surfaceMatch[1], 10);

        const locationMatch = infoText.match(/([A-Za-zÀ-ÿ'\- ]+)\s+(\d{5})/);
        if (locationMatch) {
          city = locationMatch[1].trim();
          postal_code = locationMatch[2];
        }

        // Extract hero image
        let heroImage = null;
        const imgEl = card.querySelector('img[src*="netty"], img[srcset*="netty"]');
        if (imgEl) {
          const src = imgEl.currentSrc || imgEl.src || imgEl.getAttribute('data-src') || (imgEl.getAttribute('srcset') || '').split(' ')[0];
          if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('placeholder')) {
            heroImage = src;
          }
        }

        results.push({
          url,
          price,
          title,
          rooms,
          building_surface,
          city,
          postal_code,
          heroImage
        });

      } catch (err) {
        console.error('Card extraction error:', err.message);
      }
    });

    return results;
  });

  console.log(`✅ Extracted ${cards.length} cards from listing page`);
  console.log(`   With prices: ${cards.filter(c => c.price).length}`);
  console.log(`   With images: ${cards.filter(c => c.heroImage).length}`);
  
  return cards;
}

// ========================================
// DETAIL PAGE EXTRACTION (UPDATED)
// ========================================

async function extractEleonorPropertyData(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const propertyData = await page.evaluate(() => {
      const data = {};
      const clean = (txt) => txt ? txt.replace(/\s+/g, ' ').trim() : '';

      // ===== TITLE =====
      const h1 = document.querySelector('h1');
      data.title = clean(h1 ? h1.textContent : '');

      if (data.title.includes('À vendre -')) {
        data.title = data.title.replace('À vendre - ', '').split('|')[0].trim();
      }

      // ===== REFERENCE (from URL) =====
      const urlParts = window.location.pathname.split(',');
      data.reference = urlParts[urlParts.length - 1] || null;

      // ===== PROPERTY TYPE FROM TITLE =====
      const tl = data.title.toLowerCase();
      if (tl.includes('maison') || tl.includes('villa') || tl.includes('manoir')) {
        data.property_type = 'House/Villa';
      } else if (tl.includes('appartement')) {
        data.property_type = 'Apartment';
      } else if (tl.includes('terrain')) {
        data.property_type = 'Land (Terrain)';
      } else if (tl.includes('immeuble')) {
        data.property_type = 'Building';
      } else {
        data.property_type = null;
      }

      // ===== PRICE =====
      let priceText = '';
      const priceP = document.querySelector('p._1hxffol');

      if (priceP) {
        priceText = clean(priceP.textContent);
      } else {
        const maybe = Array.from(document.querySelectorAll('p, div, span')).find(el => {
          const t = el.textContent;
          return t && t.includes('€') && /\d/.test(t) && t.length < 40;
        });
        priceText = maybe ? clean(maybe.textContent) : '';
      }

      const priceMatch = priceText.match(/(\d[\d\s ]*)\s*€/);
      data.price = priceMatch ? parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10) : null;

      // ===== INITIALIZE =====
      data.rooms = null;
      data.bedrooms = null;
      data.building_surface = null;
      data.land_surface = null;
      data.city = null;
      data.postal_code = null;

      // ===== STRATEGY 1: "Descriptif du bien" section (PRIMARY) =====
      const allText = document.body.textContent;
      
      // Find "Descriptif du bien" heading
      const descriptifHeading = Array.from(document.querySelectorAll('h2, h3, h4, div, p')).find(el => 
        clean(el.textContent) === 'Descriptif du bien' || el.textContent.includes('Descriptif du bien')
      );

      if (descriptifHeading) {
        // Get the next container or sibling elements
        let container = descriptifHeading.nextElementSibling;
        
        // If nextSibling doesn't work, try parent's next section
        if (!container || container.children.length === 0) {
          container = descriptifHeading.parentElement;
        }

        if (container) {
          const descriptifText = clean(container.textContent);

          // Surface : 102 m²
          const surfaceMatch = descriptifText.match(/Surface\s*:?\s*(\d+)\s*m[²2]/i);
          if (surfaceMatch) {
            data.building_surface = parseInt(surfaceMatch[1], 10);
          }

          // Pièces : 4
          const piecesMatch = descriptifText.match(/Pièces?\s*:?\s*(\d+)/i);
          if (piecesMatch) {
            data.rooms = parseInt(piecesMatch[1], 10);
          }

          // Terrain : 35 a OR 2100 m² OR 01 a 50 ca
          const terrainMatch = descriptifText.match(/Terrain\s*:?\s*(\d+)(?:\s*a\s*(\d+)\s*ca)?\s*(a|m²|m2|ha|ca)?/i);
          if (terrainMatch) {
            let val = parseInt(terrainMatch[1], 10);
            const additionalCa = terrainMatch[2] ? parseInt(terrainMatch[2], 10) : 0;
            const unit = terrainMatch[3] ? terrainMatch[3].toLowerCase() : 'a';
            
            // Convert to m²
            if (unit === 'a') {
              val = val * 100 + additionalCa; // "01 a 50 ca" = 100m² + 50m² = 150m²
            } else if (unit === 'ha') {
              val = val * 10000;
            } else if (unit === 'ca') {
              val = val * 1;
            }
            
            data.land_surface = val;
          }
        }
      }

      // ===== STRATEGY 2: "Caractéristiques techniques" section (SECONDARY) =====
      const caracHeading = Array.from(document.querySelectorAll('h2, h3, h4, div, p')).find(el => 
        el.textContent.includes('Caractéristiques techniques')
      );

      if (caracHeading) {
        let caracContainer = caracHeading.nextElementSibling;
        
        if (!caracContainer || caracContainer.children.length === 0) {
          caracContainer = caracHeading.parentElement;
        }

        if (caracContainer) {
          // Get all text content
          const caracText = clean(caracContainer.textContent);

          // Chambres: 2 or just "Chambres 2" or in a row
          if (!data.bedrooms) {
            const bedroomsMatch = caracText.match(/Chambres?\s*:?\s*(\d+)/i);
            if (bedroomsMatch) {
              data.bedrooms = parseInt(bedroomsMatch[1], 10);
            }
          }

          // Localisation: Castillonnès 47330
          if (!data.city || !data.postal_code) {
            const locMatch = caracText.match(/Localisation\s*:?\s*([A-Za-zÀ-ÿ'\- ]+)\s+(\d{5})/i);
            if (locMatch) {
              data.city = locMatch[1].trim();
              data.postal_code = locMatch[2];
            }
          }

          // Also try Référence in case we need to extract from here
          if (!data.reference) {
            const refMatch = caracText.match(/Référence\s*:?\s*(VM\d+)/i);
            if (refMatch) {
              data.reference = refMatch[1];
            }
          }
        }
      }

      // ===== STRATEGY 3: LAST RESORT - Parse from title only if missing =====
      if (!data.rooms) {
        const titleRoomsMatch = data.title.match(/(\d+)\s*pièces?/i);
        if (titleRoomsMatch) {
          data.rooms = parseInt(titleRoomsMatch[1], 10);
          console.log(`⚠️ Using rooms from title: ${data.rooms}`);
        }
      }

      if (!data.bedrooms) {
        const titleBedroomsMatch = data.title.match(/(\d+)\s*chambres?/i);
        if (titleBedroomsMatch) {
          data.bedrooms = parseInt(titleBedroomsMatch[1], 10);
          console.log(`⚠️ Using bedrooms from title: ${data.bedrooms}`);
        }
      }

      // ===== LOCATION FALLBACK - from breadcrumb or title tag if still missing =====
      if (!data.city || !data.postal_code) {
        // Try breadcrumb first
        const breadcrumb = document.querySelector('nav, [class*="breadcrumb"]');
        if (breadcrumb) {
          const bcText = clean(breadcrumb.textContent);
          const loc = bcText.match(/([A-Za-zÀ-ÿ'\- ]+)\s+(\d{5})/);
          if (loc) {
            if (!data.city) data.city = loc[1].trim();
            if (!data.postal_code) data.postal_code = loc[2];
          }
        }

        // Then try title tag
        if (!data.city || !data.postal_code) {
          const docTitle = document.querySelector('title');
          if (docTitle) {
            const t = clean(docTitle.textContent);
            
            const patterns = [
              /([A-Za-zÀ-ÿ'\- ]+)\s+(\d{5})/,
              /-\s+([A-Za-zÀ-ÿ'\- ]+)\s+(\d{5})$/,
              /situé à\s+([A-Za-zÀ-ÿ'\- ]+)\s*\((\d{5})\)/i
            ];
            
            for (const pattern of patterns) {
              const loc = t.match(pattern);
              if (loc) {
                if (!data.city) data.city = loc[1].trim();
                if (!data.postal_code) data.postal_code = loc[2];
                break;
              }
            }
          }
        }
      }

      // Clean up city name if it has "Localisation" prefix
      if (data.city && data.city.toLowerCase().startsWith('localisation')) {
        data.city = data.city.replace(/^localisation\s*/i, '').trim();
      }

      // ===== IMAGES =====
      const LOGO_PATTERNS = ['logo', 'icon', 'placeholder'];
      const images = [];
      document.querySelectorAll('img').forEach(img => {
        const src = img.currentSrc || img.src || img.getAttribute('data-src') || (img.getAttribute('srcset') || '').split(' ')[0];
        if (src && src.includes('netty.') && !LOGO_PATTERNS.some(p => src.toLowerCase().includes(p)) && img.naturalWidth > 100) {
          images.push(src);
        }
      });
      data.additionalImages = Array.from(new Set(images));

      // ===== DESCRIPTION =====
      const descEl = document.querySelector('[class*="description"]') || document.querySelector('.comment') || document.querySelector('section [class*="text"], article [class*="text"]');
      data.description = descEl ? clean(descEl.textContent).substring(0, 500) : '';

      return data;
    });

    console.log(`✅ ${propertyData.reference}: ${propertyData.title.substring(0, 60)}`);
    console.log(`   💰 €${propertyData.price || 'N/A'} | 🛏️ ${propertyData.rooms || 'N/A'} pcs | 🚪 ${propertyData.bedrooms || 'N/A'} ch | 📐 ${propertyData.building_surface || 'N/A'}m²`);
    if (propertyData.land_surface) {
      console.log(`   🌳 ${propertyData.land_surface}m² terrain`);
    }
    console.log(`   📍 ${propertyData.city || 'N/A'} ${propertyData.postal_code || ''}`);

    return propertyData;
  } catch (error) {
    console.error(`❌ Error extracting ${url}:`, error.message);
    return null;
  }
}

// ========================================
// MAIN SCRAPER
// ========================================

async function scrapeEleonor(req, res, { puppeteer, chromium, supabase }) {
  try {
    const { searchUrl, maxPages = 3 } = req.body;

    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    console.log('🎯 Starting Agence Eleonor scrape:', searchUrl);

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || chromium.executablePath,
      headless: true,
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const allProperties = [];
    const validationStats = { valid: 0, invalid: 0, total: 0 };

    let currentPageNum = 1;
    const propertyMap = new Map();

    while (currentPageNum <= maxPages) {
      console.log(`📄 Scraping Eleonor listing page ${currentPageNum}...`);

      const pageUrl = currentPageNum === 1 ? searchUrl : `${searchUrl}${searchUrl.includes('?') ? '&' : '?'}page=${currentPageNum}`;

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(resolve => setTimeout(resolve, 1000));

        const cards = await extractEleonorListingCards(page);

        if (cards.length === 0) {
          console.log(`   ✅ Reached end of Eleonor listings at page ${currentPageNum - 1}`);
          break;
        }

        cards.forEach(card => {
          if (card.url && !propertyMap.has(card.url)) {
            propertyMap.set(card.url, card);
          }
        });

        console.log(`   Found ${cards.length} Eleonor properties on page ${currentPageNum}`);

        currentPageNum++;
      } catch (pageError) {
        console.error(`Error on listing page ${currentPageNum}:`, pageError.message);
        break;
      }
    }

    console.log(`\n✅ Found ${propertyMap.size} unique Eleonor properties from listing pages\n`);

    let scrapedCount = 0;
    for (const [propUrl, listingData] of propertyMap.entries()) {
      const detailData = await extractEleonorPropertyData(page, propUrl);

      if (!detailData) {
        console.log(`⚠️  Skipping ${propUrl} - detail page failed`);
        continue;
      }

      // Merge listing and detail data - detail takes priority
      const propertyData = {
        ...listingData,
        ...detailData,
        price: detailData.price || listingData.price,
        rooms: detailData.rooms || listingData.rooms,
        building_surface: detailData.building_surface || listingData.building_surface,
        city: detailData.city || listingData.city,
        postal_code: detailData.postal_code || listingData.postal_code
      };

      if (!propertyData.price) {
        console.log(`⚠️  Skipping ${propUrl} - no valid price`);
        continue;
      }

      const finalImages = [];
      if (listingData.heroImage) finalImages.push(listingData.heroImage);
      if (propertyData.additionalImages && propertyData.additionalImages.length > 0) {
        propertyData.additionalImages.forEach(img => {
          if (img !== listingData.heroImage) finalImages.push(img);
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
        console.log(`   Scraped ${scrapedCount}/${propertyMap.size} Eleonor properties...`);
      }

      const imageCount = propertyData.images.length;
      console.log(`   ✓ ${imageCount} images`);
    }

    await browser.close();

    console.log(`\n✅ Eleonor scraping complete: ${allProperties.length} properties\n`);

    const inserted = await savePropertiesToDB(allProperties, 'eleonor', supabase);

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
        rooms: p.rooms,
        bedrooms: p.bedrooms,
        surface: p.building_surface,
        land_surface: p.land_surface,
        imageCount: p.images?.length || 0,
        quality: p.data_quality_score
      }))
    });

  } catch (error) {
    console.error('❌ Eleonor scraping failed:', error);
    res.status(500).json({ error: 'Scraping failed', details: error.message });
  }
}

// ========================================
// DEBUG ENDPOINT
// ========================================

async function debugEleonorProperty(req, res, { puppeteer, chromium }) {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'url parameter required' });
    }

    console.log('🔍 Debugging Eleonor property:', url);

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || chromium.executablePath,
      headless: true,
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const debug = await page.evaluate(() => {
      const trySelectors = (selectors) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent.trim()) {
            return {
              selector: sel,
              text: el.textContent.trim(),
              html: el.innerHTML.substring(0, 200)
            };
          }
        }
        return null;
      };

      return {
        title: trySelectors(['h1', '[class*="title"]', '[class*="Title"]', '.property-title', 'h2']),
        price: trySelectors(['[class*="price"]', '[class*="Price"]', '.price', '[class*="montant"]', '[class*="amount"]']),
        reference: trySelectors(['[class*="ref"]', '[class*="Ref"]', '[class*="reference"]', '.reference']),
        features: trySelectors(['[class*="feature"]', '[class*="characteristic"]', '[class*="detail"]', 'ul li', '[class*="info"]']),
        classNames: Array.from(document.querySelectorAll('[class]'))
          .slice(0, 50)
          .map(el => el.className)
          .filter(c => c && typeof c === 'string'),
        numberedElements: Array.from(document.querySelectorAll('*'))
          .filter(el => {
            const text = el.textContent;
            return text && text.length < 100 && /\d+/.test(text) && (text.includes('€') || text.includes('m²') || text.includes('pièce') || text.includes('chambre'));
          })
          .slice(0, 20)
          .map(el => ({
            tag: el.tagName.toLowerCase(),
            class: el.className,
            text: el.textContent.trim()
          }))
      };
    });

    await browser.close();

    res.json({ url, debug });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { scrapeEleonor, debugEleonorProperty };
