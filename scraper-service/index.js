const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chromium = require('@sparticuz/chromium');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const { scrapeCadImmo } = require('./scrapers/cadimmo');
const { scrapeEleonor, debugEleonorProperty } = require('./scrapers/eleonor');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('✅ Supabase client created successfully');

// ========================================
// ROUTES
// ========================================

app.get('/', (req, res) => {
  res.json({ 
    status: 'Barracuda Scraper Service v2.4',
    features: ['CAD-IMMO scraper', 'Agence Eleonor scraper with listing extraction'],
    endpoints: ['/scrape', '/scrape-eleonor', '/debug-eleonor-property']
  });
});

app.post('/scrape', async (req, res) => {
  await scrapeCadImmo(req, res, { puppeteer, chromium, supabase });
});

app.post('/scrape-eleonor', async (req, res) => {
  await scrapeEleonor(req, res, { puppeteer, chromium, supabase });
});

app.post('/debug-eleonor-property', async (req, res) => {
  await debugEleonorProperty(req, res, { puppeteer, chromium });
});

app.get('/test-logs', (req, res) => {
  console.log('========================================');
  console.log('🧪 TEST ENDPOINT CALLED');
  console.log('Time:', new Date().toISOString());
  console.log('========================================');
  
  res.json({ 
    message: 'Check Railway logs now!',
    time: new Date().toISOString()
  });
});

// ========================================
// SERVER START
// ========================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Scraper service v2.4 running on port ${PORT}`);
});
