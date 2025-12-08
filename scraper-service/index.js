const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chromium = require('@sparticuz/chromium');
const { createClient } = require('@supabase/supabase-js');

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

app.get('/', (req, res) => {
  res.json({ status: 'Barracuda Scraper Service Running', version: '1.0.0' });
});

app.post('/scrape', async (req, res) => {
  try {
    const { searchUrl, maxPages = 3 } = req.body;

    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    console.log('🎯 Starting scrape:', searchUrl);

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

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract each property link individually
        const propertyUrls = await page.evaluate(() => {
          const links = document.querySelectorAll('a[href*="/fr/propriete/"]');
          return Array.from(links).map(link => link.href).filter((url, index, self) => 
            self.indexOf(url) === index // Remove duplicates
          );
        });

        console.log(`Found ${propertyUrls.length} unique property URLs`);

        // Visit each property page individually to get accurate data
        for (const propUrl of propertyUrls.slice(0, 12)) { // Limit to 12 per page
          try {
            const propertyPage = await browser.newPage();
            await propertyPage.goto(propUrl, { waitUntil: 'networkidle2', timeout: 15000 });
            await new Promise(resolve => setTimeout(resolve, 1000));

            const propertyData = await propertyPage.evaluate(() => {
              const data = {};
              
              // Get title from h1
              const titleEl = document.querySelector('h1');
              data.title = titleEl ? titleEl.textContent.trim() : '';

              // Get price
              const priceEl = document.querySelector('[class*="price"], [class*="Price"]');
              const priceText = priceEl ? priceEl.textContent : '';
              const priceMatch = priceText.match(/(\d[\d\s]+)/);
              data.price = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, '')) : null;

              // Get details
              const bodyText = document.body.textContent;
              
              const surfaceMatch = bodyText.match(/(\d+)\s*m²/);
              data.surface = surfaceMatch ? parseInt(surfaceMatch[1]) : null;

              const roomsMatch = bodyText.match(/(\d+)\s*pièces?/);
              data.rooms = roomsMatch ? parseInt(roomsMatch[1]) : null;

              const bedroomsMatch = bodyText.match(/(\d+)\s*chambres?/);
              data.bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1]) : null;

              // Get image
              const imgEl = document.querySelector('img[src*="cloudfront"]');
              data.image = imgEl ? imgEl.src : '';

              return data;
            });

            if (propertyData.price && propertyData.price > 10000) {
              allProperties.push({
                url: propUrl,
                ...propertyData
              });
            }

            await propertyPage.close();
          } catch (propError) {
            console.error(`Error scraping ${propUrl}:`, propError.message);
          }
        }

        currentPage++;
      } catch (pageError) {
        console.error(`Error on page ${currentPage}:`, pageError.message);
        break;
      }
    }

    await browser.close();

    console.log(`✅ Scraping complete: ${allProperties.length} total properties`);

    // Save to Supabase
    let inserted = 0;

    for (const prop of allProperties) {
      try {
        const urlParts = prop.url.split('+');
        const sourceId = urlParts[urlParts.length - 1] || `cadimmo-${Date.now()}`;

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

        if (!error) {
          inserted++;
        }
      } catch (err) {
        console.error('Save error:', err.message);
      }
    }

    res.json({
      success: true,
      totalScraped: allProperties.length,
      inserted,
      updated: 0,
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
