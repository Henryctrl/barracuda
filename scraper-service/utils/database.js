async function savePropertiesToDB(properties, source, supabase) {
    let inserted = 0;
  
    for (const prop of properties) {
      try {
        let sourceId, city, department, postalCode;
  
        if (source === 'cadimmo') {
          const urlParts = prop.url.split('+');
          sourceId = urlParts[urlParts.length - 1] || `cadimmo-${Date.now()}`;
          city = 'Bergerac';
          if (urlParts.length >= 3) {
            city = urlParts[2].split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
          }
          department = '24';
          postalCode = '24100';
        } else if (source === 'eleonor') {
          const refMatch = prop.url.match(/VM\d+/);
          sourceId = refMatch ? refMatch[0] : `eleonor-${Date.now()}`;
          city = prop.city || 'Unknown';
          postalCode = prop.postal_code || '24000';
          department = postalCode?.substring(0, 2) || '24';
        }
  
        const dbData = {
          source,
          source_id: sourceId,
          reference: prop.reference,
          url: prop.url,
          title: prop.title,
          description: prop.description,
          price: prop.price,
          location_city: city,
          location_postal_code: postalCode,
          location_department: department,
          property_type: prop.property_type,
          surface: prop.building_surface,
          building_surface: prop.building_surface,
          land_surface: prop.land_surface,
          rooms: prop.rooms,
          bedrooms: prop.bedrooms,
          floors: prop.floors || null,
          images: prop.images || [],
          data_quality_score: prop.data_quality_score,
          validation_errors: prop.validation_errors,
          last_seen_at: new Date().toISOString(),
          raw_data: { 
            scrapedAt: new Date().toISOString(),
            scraper_version: '2.4',
            source,
            imageCount: prop.images?.length || 0
          }
        };
  
        const { error } = await supabase
          .from('properties')
          .upsert(dbData, { onConflict: 'source,source_id', returning: 'minimal' });
  
        if (error) {
          console.error(`Save error:`, error.message);
        } else {
          inserted++;
        }
  
      } catch (err) {
        console.error('Save error:', err.message);
      }
    }
  
    return inserted;
  }
  
  module.exports = { savePropertiesToDB };
  