async function savePropertiesToDB(properties, source, supabase) {
    if (!properties || properties.length === 0) {
      console.log('⚠️  No properties to save');
      return 0;
    }
  
    console.log(`💾 Saving ${properties.length} properties to database...`);
  
    const propertiesToInsert = properties.map(property => ({
      source,
      source_id: property.source_id || null,
      url: property.url,
      title: property.title || null,
      description: property.description || null,
      price: property.price || null,
      location_city: property.city || null,
      location_postal_code: property.postal_code || null,
      property_type: property.property_type || null,
      surface: property.building_surface || null,
      rooms: property.rooms || null,
      bedrooms: property.bedrooms || null,
      images: property.images ? JSON.stringify(property.images) : null,
      raw_data: JSON.stringify({
        source,
        scrapedAt: new Date().toISOString(),
        imageCount: property.images?.length || 0,
        scraper_version: '2.4'
      }),
      scraped_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      is_active: true,
      reference: property.reference || null,
      land_surface: property.land_surface || null,
      building_surface: property.building_surface || null,
      data_quality_score: property.data_quality_score || null,
      validation_errors: property.validation_errors ? JSON.stringify(property.validation_errors) : null,
      
      // ===== NEW FIELDS - ADD THESE! =====
      drainage_system: property.drainage_system || null,
      heating_system: property.heating_system || null,
      pool: property.pool === true, // Ensure boolean
      property_condition: property.property_condition || null,
      year_built: property.year_built || null,
      energy_consumption: property.energy_consumption || null,
      co2_emissions: property.co2_emissions || null,
      bathrooms: property.bathrooms || null,
      wc_count: property.wc_count || null
    }));
  
    try {
      const { data, error } = await supabase
        .from('properties')
        .upsert(propertiesToInsert, {
          onConflict: 'reference',
          ignoreDuplicates: false
        })
        .select();
  
      if (error) {
        console.error('❌ Supabase error:', error);
        return 0;
      }
  
      console.log(`✅ Successfully saved/updated ${data?.length || propertiesToInsert.length} properties`);
      return data?.length || propertiesToInsert.length;
  
    } catch (error) {
      console.error('❌ Database save failed:', error);
      return 0;
    }
  }
  
  module.exports = { savePropertiesToDB };