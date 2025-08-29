// barracudatool/src/app/api/dvf-plus/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Add your existing helper functions...

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const rayonStr = searchParams.get('rayon') || '500'; // Smaller radius for exact plot
  const cadastralId = searchParams.get('cadastralId'); // NEW: Accept cadastral ID
  
  if (!latStr || !lngStr) {
    return NextResponse.json({ error: 'Missing lat/lng parameters', resultats: [] }, { status: 400 });
  }

  const lat = Number(latStr), lng = Number(lngStr), rayon = Number(rayonStr);
  
  // Use very small radius for exact plot matching
  const API_URL = 'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/buildingref-france-demande-de-valeurs-foncieres-par-mutation-millesime/records';
  
  const params = new URLSearchParams({
    'geofilter.distance': `${lat},${lng},${rayon}`,
    'limit': '20' // Fewer results for exact matching
  });
  
  const dvfUrl = `${API_URL}?${params}`;
  console.log(`📡 DVF+ exact plot request -> ${dvfUrl}`);

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
      return NextResponse.json({
        error: `API returned ${resp.status}: ${resp.statusText}`,
        resultats: [],
        debug: text.slice(0, 200)
      }, { status: 200 });
    }

    const payload = await resp.json();
    const rows = payload?.results || [];

    const resultats = rows.map((record: any) => {
      const data = record.fields || record;
      return {
        id_mutation: data.idopendata || null,
        date_mutation: data.datemut || null,
        valeur_fonciere: data.valeurfonc || null,
        type_local: data.libtypbien || null,
        surface_reelle_bati: data.sbati || null,
        surface_terrain: data.sterr || null,
        nom_commune: data.dep_name || null,
        code_postal: data.dep_code || null,
        // ADD: Cadastral reference fields for exact matching
        cadastral_ref: data.l_idpar ? data.l_idpar[0] : null,
        section: data.l_section ? data.l_section[0] : null,
        raw: data,
      };
    });

    return NextResponse.json({ 
      status: 'success', 
      resultats,
      total: resultats.length,
      source: 'OpenDataSoft DVF+ (exact plot)',
      query_cadastral_id: cadastralId,
      coordinates: `${lat}, ${lng}`
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
