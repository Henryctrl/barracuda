
data-quality-checker.js

// data-quality-checker.js
// Run this to check your existing Supabase data for issues

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDataQuality() {
  console.log('🔍 Checking data quality...\n');

  // Fetch all properties
  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .eq('source', 'cadimmo');

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  console.log(`Found ${properties.length} properties\n`);

  const issues = {
    suspiciousRooms: [],
    suspiciousSurface: [],
    invalidPrice: [],
    bedroomsExceedsRooms: [],
    hugeLandSurface: []
  };

  properties.forEach(prop => {
    // Check rooms
    if (prop.rooms && prop.rooms > 50) {
      issues.suspiciousRooms.push({
        id: prop.source_id,
        url: prop.url,
        rooms: prop.rooms,
        title: prop.title
      });
    }

    // Check surface
    if (prop.surface && (prop.surface < 10 || prop.surface > 2000)) {
      issues.suspiciousSurface.push({
        id: prop.source_id,
        url: prop.url,
        surface: prop.surface,
        title: prop.title
      });
    }

    // Check price
    if (!prop.price || prop.price < 1000 || prop.price > 10000000) {
      issues.invalidPrice.push({
        id: prop.source_id,
        url: prop.url,
        price: prop.price,
        title: prop.title
      });
    }

    // Check bedrooms vs rooms
    if (prop.bedrooms && prop.rooms && prop.bedrooms > prop.rooms) {
      issues.bedroomsExceedsRooms.push({
        id: prop.source_id,
        url: prop.url,
        bedrooms: prop.bedrooms,
        rooms: prop.rooms,
        title: prop.title
      });
    }
  });

  // Print results
  console.log('=== DATA QUALITY REPORT ===\n');

  console.log(`🔴 Suspicious Rooms (> 50): ${issues.suspiciousRooms.length}`);
  issues.suspiciousRooms.slice(0, 5).forEach(p => {
    console.log(`   ${p.id}: ${p.rooms} rooms - ${p.title}`);
  });

  console.log(`\n🔴 Suspicious Surface: ${issues.suspiciousSurface.length}`);
  issues.suspiciousSurface.slice(0, 5).forEach(p => {
    console.log(`   ${p.id}: ${p.surface}m² - ${p.title}`);
  });

  console.log(`\n🔴 Invalid Price: ${issues.invalidPrice.length}`);
  issues.invalidPrice.slice(0, 5).forEach(p => {
    console.log(`   ${p.id}: €${p.price} - ${p.title}`);
  });

  console.log(`\n🔴 Bedrooms > Rooms: ${issues.bedroomsExceedsRooms.length}`);
  issues.bedroomsExceedsRooms.slice(0, 5).forEach(p => {
    console.log(`   ${p.id}: ${p.bedrooms} bedrooms / ${p.rooms} rooms - ${p.title}`);
  });

  const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
  const healthScore = ((properties.length - totalIssues) / properties.length * 100).toFixed(1);

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total properties: ${properties.length}`);
  console.log(`Properties with issues: ${totalIssues}`);
  console.log(`Health score: ${healthScore}%`);

  if (healthScore < 80) {
    console.log(`\n⚠️  Database needs cleaning! Run the new scraper to fix.`);
  } else {
    console.log(`\n✅ Data quality looks good!`);
  }
}

checkDataQuality().catch(console.error);