const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chromium = require('@sparticuz/chromium');
const { createClient } = require('@supabase/supabase-js');

// Railway injects env vars directly
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

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Barracuda Scraper Service Running', version: '1.0.0' });
});

// Scraping endpoint
app.post('/scrape', async (req, res) => {
  try {
    const { searchUrl, maxPages = 3 } = req.body;

    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    console.log('🎯 Starting scrape:', searchUrl);

    // Launch browser
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
    let currentPage = 1;

    while (currentPage <= maxPages) {
      console.log(`📄 Scraping page ${currentPage}...`);
      
      const pageUrl = currentPage === 1 
        ? searchUrl 
        : `${searchUrl}?page=${currentPage}`;

      try {
        await page.goto(pageUrl, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });

        // Wait for content to load (use setTimeout instead of waitForTimeout)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract properties using new selectors for /fr/propriete/ URLs
        const properties = await page.evaluate(() => {
          const results = [];
          
          // New selector for CAD-IMMO /fr/ventes page
          const links = document.querySelectorAll('a[href*="/fr/propriete/"]');
          
          console.log(`Found ${links.length} property links`);

          if (links.length === 0) {
            // Debug info
            console.log('Page title:', document.title);
            console.log('Total links:', document.querySelectorAll('a').length);
            return results;
          }

          links.forEach((link) => {
            try {
              const url = link.href;
              if (!url || !url.includes('cad-immo.com')) return;

              // Find parent card container
              let container = link.closest('article') || 
                            link.closest('.property-card') ||
                            link.closest('.listing') ||
                            link.closest('[class*="card"]') ||
                            link.parentElement?.parentElement;

              if (!container) container = link;

              const text = container.textContent || '';

              // Extract price (format: 190 000 €)
              const priceMatch = text.match(/(\d[\d\s]+)\s*€/);
              const price = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, '')) : null;

              if (!price || price < 10000) return; // Skip if no valid price

              // Get image
              const img = link.querySelector('img') || container.querySelector('img');
              const image = img ? (img.src || img.dataset.src) : '';

              // Get title
              let title = '';
              if (img && img.alt) {
                title = img.alt;
              } else {
                const heading = container.querySelector('h2, h3, h4, [class*="title"]');
                title = heading ? heading.textContent.trim() : '';
              }

              // If no title, extract from URL
              if (!title) {
                const urlParts = url.split('+');
                if (urlParts.length > 1) {
                  title = urlParts.slice(1, -1).join(' ');
                }
              }

              // Extract details
              const surfaceMatch = text.match(/(\d+)\s*m²/);
              const surface = surfaceMatch ? parseInt(surfaceMatch[1]) : null;

              const roomsMatch = text.match(/(\d+)\s*pièces?/);
              const rooms = roomsMatch ? parseInt(roomsMatch[1]) : null;

              const bedroomsMatch = text.match(/(\d+)\s*chambres?/);
              const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1]) : null;

              results.push({
                url,
                title: title || 'Property',
                price,
                surface,
                rooms,
                bedrooms,
                image,
              });
            } catch (err) {
              console.error('Error parsing property:', err.message);
            }
          });

          return results;
        });

        console.log(`✅ Found ${properties.length} properties on page ${currentPage}`);
        
        if (properties.length === 0) {
          console.log('⚠️ No properties found on page');
        }

        allProperties.push(...properties);
        currentPage++;
      } catch (pageError) {
        console.error(`❌ Error on page ${currentPage}:`, pageError.message);
        break;
      }
    }

    await browser.close();

    console.log(`✅ Scraping complete: ${allProperties.length} total properties`);

    // Save to Supabase
    let inserted = 0;
    let updated = 0;

    for (const prop of allProperties) {
      try {
        // Extract source_id from URL (last part after +)
        const urlParts = prop.url.split('+');
        const sourceId = urlParts[urlParts.length - 1] || `cadimmo-${Date.now()}`;

        // Extract city from URL
        let city = 'Bergerac';
        if (urlParts.length >= 3) {
          city = urlParts[2].charAt(0).toUpperCase() + urlParts[2].slice(1);
        }

        const { error } = await supabase.from('properties').upsert({
          source: 'cadimmo',
          source_id: sourceId,
          url: prop.url,
          title: prop.title,
          price: prop.price,
          location_city: city,
          location_department: '24',
          location_postal_code: '24100',
          surface: prop.surface,
          rooms: prop.rooms,
          bedrooms: prop.bedrooms,
          images: prop.image ? [prop.image] : [],
          last_seen_at: new Date().toISOString(),
          raw_data: { scrapedAt: new Date().toISOString() },
        }, { onConflict: 'source,source_id' });

        if (error) {
          console.error('❌ Insert error:', error.message);
        } else {
          inserted++;
        }
      } catch (err) {
        console.error('❌ Save error:', err.message);
      }
    }

    res.json({
      success: true,
      totalScraped: allProperties.length,
      inserted,
      updated,
      properties: allProperties.slice(0, 5),
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
  console.log(`🚀 Scraper service running on port ${PORT}`);
});
