// barracudatool/src/app/api/dvf-plus/route.ts
import { NextRequest, NextResponse } from 'next/server';

function metersToDegreeDeltas(latDeg: number, radiusMeters: number) {
  const metersPerDegLat = 111320;
  const latRad = (latDeg * Math.PI) / 180;
  const metersPerDegLon = 111320 * Math.cos(latRad) || 1e-6;
  return { dLat: radiusMeters / metersPerDegLat, dLon: radiusMeters / metersPerDegLon };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const rayonStr = searchParams.get('rayon') || '2000';

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: 'Missing lat/lng parameters', resultats: [] }, { status: 400 });
  }

  const lat = Number(latStr), lng = Number(lngStr), rayon = Number(rayonStr);
  
  // Use geofilter.distance for OpenDataSoft
  const API_URL = 'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/buildingref-france-demande-de-valeurs-foncieres-par-mutation-millesime/records';
  
  // Build URL with proper parameters - NO ORDER_BY since field doesn't exist
  const params = new URLSearchParams({
    'geofilter.distance': `${lat},${lng},${rayon}`,
    'limit': '50'
    // Remove order_by since date_mutation field doesn't exist
  });
  
  const dvfUrl = `${API_URL}?${params}`;
  console.log(`📡 DVF+ request -> ${dvfUrl}`);

  try {
    const resp = await fetch(dvfUrl, {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; DVF-API-Client/1.0)'
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.warn('OpenDataSoft API error:', resp.status, text.slice(0, 300));
      return NextResponse.json({
        error: `API returned ${resp.status}: ${resp.statusText}`,
        resultats: [],
        debug: text.slice(0, 200)
      }, { status: 200 });
    }

    const payload = await resp.json();
    console.log('API Response structure:', Object.keys(payload));
    
    const rows = payload?.results || [];

    const resultats = rows.map((record: any) => {
      // Handle different possible field structures
      const data = record.fields || record;
      console.log('Sample record fields:', Object.keys(data));
      
      return {
        // Try different possible field names for date
        date_mutation: data.date_mutation || data.datemut || data.date_mut || data.mutation_date || null,
        valeur_fonciere: data.valeur_fonciere || data.valeurfonc || data.prix || null,
        type_local: data.type_local || data.typelocal || null,
        surface_reelle_bati: data.surface_reelle_bati || data.sbati || null,
        surface_terrain: data.surface_terrain || data.sterr || null,
        nom_commune: data.nom_commune || data.commune || null,
        code_postal: data.code_postal || data.codpost || null,
        latitude: data.latitude || data.lat || null,
        longitude: data.longitude || data.lon || null,
        raw: data,
      };
    });

    return NextResponse.json({ 
      status: 'success', 
      resultats,
      total: resultats.length,
      source: 'OpenDataSoft DVF+ (no sorting)',
      sample_fields: rows.length > 0 ? Object.keys(rows[0].fields || rows[0]) : []
    });

  } catch (e: any) {
    console.error('DVF+ fetch failed', e.message);
    return NextResponse.json({ 
      error: e.message || 'fetch failed', 
      resultats: [],
      note: 'OpenDataSoft API issue'
    }, { status: 200 });
  }
}
