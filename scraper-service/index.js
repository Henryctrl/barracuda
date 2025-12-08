const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chromium = require('@sparticuz/chromium');
const { createClient } = require('@supabase/supabase-js');
// Railway injects env vars directly, no dotenv needed in production
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

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Barracuda Scraper Service Running', version: '1.0.0' });
});

// Scrape endpoint
app.post('/scrape', async (req, res) => {
  const { searchUrl, maxPages = 3 } = req.body;

  if (!searchUrl) {
    return res.status(400).json({ error: 'searchUrl required' });
  }

  console.log('🎯 Starting scrape:', searchUrl);

  try {
    // Launch browser (use system chromium in production)
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
    
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    let totalScraped = 0;
    let inserted = 0;
    let updated = 0;
    const properties = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`📄 Scraping page ${pageNum}...`);
      
      const url = pageNum === 1 ? searchUrl : `${searchUrl}?page=${pageNum}`;
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await page.waitForSelector('.property-list, .properties, [class*="property"]', {
        timeout: 10000,
      }).catch(() => console.log('No properties found on page'));

      // Extract properties (adapt to CAD-IMMO structure)
      const pageProperties = await page.evaluate(() => {
        const items = [];
        
        // Find property cards - adjust selectors for CAD-IMMO
        const propertyCards = document.querySelectorAll('[class*="property"], .property-card, [data-property]');
        
        propertyCards.forEach(card => {
          try {
            const title = card.querySelector('h2, h3, [class*="title"]')?.textContent?.trim();
            const priceText = card.querySelector('[class*="price"]')?.textContent?.trim();
            const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, '')) : null;
            
            const link = card.querySelector('a')?.href;
            
            if (title && price && link) {
              items.push({
                title,
                price,
                url: link,
                // Add more fields as needed
              });
            }
          } catch (e) {
            console.error('Error parsing property:', e);
          }
        });
        
        return items;
      });

      // Insert into Supabase
      for (const property of pageProperties) {
        const { error } = await supabase
          .from('properties')
          .upsert({
            ...property,
            source: 'cadimmo',
            scraped_at: new Date().toISOString(),
            is_active: true,
          }, {
            onConflict: 'url',
            ignoreDuplicates: false,
          });

        if (!error) {
          inserted++;
          properties.push(property);
        }
      }

      totalScraped += pageProperties.length;
    }

    await browser.close();

    console.log(`✅ Scraping complete: ${totalScraped} properties`);

    res.json({
      success: true,
      totalScraped,
      inserted,
      updated,
      properties: properties.slice(0, 5), // Return first 5 as sample
    });

  } catch (error) {
    console.error('❌ Scraping error:', error);
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
