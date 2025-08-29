// barracudatool/src/app/api/dvf-plus/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface DVFRecord {
  id_mutation: string | null;
  date_mutation: string | null;
  valeur_fonciere: number | null;
  type_local: string | null;
  surface_reelle_bati: number | null;
  surface_terrain: number | null;
  nom_commune: string | null;
  code_postal: string | null;
  code_parcelle: string | null;
  raw: any;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const rayonStr = searchParams.get('rayon') || '1000';
  const exactCadastralId = searchParams.get('cadastralId');

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: 'Missing lat/lng parameters', resultats: [] }, { status: 400 });
  }

  const lat = Number(latStr), lng = Number(lngStr), rayon = Number(rayonStr);
  const cap = Math.min(Math.max(Number(searchParams.get('limit') || '50'), 1), 100);
  
  if (!isFinite(lat) || !isFinite(lng) || !isFinite(rayon)) {
    return NextResponse.json({ error: 'Invalid lat/lng/rayon parameters', resultats: [] }, { status: 400 });
  }

  // CHRISTIAN QUEST DVF API (Recommended by Etalab)
  const API_URL = 'https://dvf.api.cquest.org/dvf/transactions';
  
  const params = new URLSearchParams({
    'lat': lat.toString(),
    'lon': lng.toString(),
    'rayon': rayon.toString(),
    'limit': cap.toString()
  });
  
  const dvfUrl = `${API_URL}?${params}`;
  console.log(`📡 CHRISTIAN QUEST DVF API request -> ${dvfUrl}${exactCadastralId ? ` (searching for: ${exactCadastralId})` : ''}`);
  console.log(`🌍 Coordinates: lat=${lat}, lng=${lng}, radius=${rayon}m`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const resp = await fetch(dvfUrl, {
      signal: controller.signal,
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; DVF-API-Client/1.0)'
      },
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const text = await resp.text();
      console.warn('Christian Quest DVF API error:', resp.status, text.slice(0, 300));
      return NextResponse.json({
        error: `DVF API returned ${resp.status}: ${resp.statusText}`,
        resultats: [],
        debug: text.slice(0, 200)
      }, { status: 200 });
    }

    const payload = await resp.json();
    
    // Christian Quest API returns array of transactions
    const rows = Array.isArray(payload) ? payload : (payload?.results || []);

    console.log(`📍 Christian Quest API returned ${rows.length} transactions`);

    // Process Christian Quest DVF results
    const allResults: DVFRecord[] = rows.map((record: any): DVFRecord => {
      return {
        id_mutation: record.id_mutation || null,
        date_mutation: record.date_mutation || null,
        valeur_fonciere: record.valeur_fonciere || null,
        type_local: record.type_local || null,
        surface_reelle_bati: record.surface_reelle_bati || null,
        surface_terrain: record.surface_terrain || null,
        nom_commune: record.nom_commune || null,
        code_postal: record.code_postal || null,
        code_parcelle: record.id_parcelle || record.code_parcelle || null,
        raw: record,
      };
    });

    // Enhanced filtering for exact parcel match
    let filteredResults: DVFRecord[] = allResults;
    
    if (exactCadastralId) {
      const expectedCommune = exactCadastralId.slice(0, 5);
      console.log(`🔍 QUEST API: Looking for parcel ${exactCadastralId} in commune ${expectedCommune}`);
      console.log(`📍 Found ${allResults.length} total sales in search area`);
      
      // Get unique communes found in results
      const foundCommunes = [...new Set(allResults
        .map(r => r.code_postal?.slice(0, 5) || '')
        .filter(code => code.length === 5)
      )];
      console.log(`📍 Communes in Quest API results:`, foundCommunes.sort());
      
      // Filter by commune first
      const sameCommune = allResults.filter((result: DVFRecord) => {
        const resultCommune = result.code_postal?.slice(0, 5) || '';
        return resultCommune === expectedCommune;
      });
      
      console.log(`📍 Found ${sameCommune.length} sales in target commune ${expectedCommune}`);
      
      if (sameCommune.length > 0) {
        // Look for exact parcel match within the commune
        filteredResults = sameCommune.filter((result: DVFRecord) => {
          const parcelCode = result.code_parcelle || '';
          
          // Try different matching strategies
          const exactMatch = parcelCode === exactCadastralId;
          const partialMatch = parcelCode.includes(exactCadastralId.slice(-8)) || 
                              exactCadastralId.includes(parcelCode);
          
          if (exactMatch || partialMatch) {
            console.log(`✅ QUEST API MATCH FOUND! Parcel: ${parcelCode}`);
            return true;
          }
          
          return false;
        });
        
        if (filteredResults.length === 0) {
          console.log(`❌ No exact parcel match found in commune ${expectedCommune}`);
          console.log(`📋 Available parcels in commune:`, 
            sameCommune.map(r => r.code_parcelle).filter(p => p).slice(0, 10)
          );
        } else {
          console.log(`✅ QUEST API SUCCESS! ${filteredResults.length} exact sales found for parcel ${exactCadastralId}`);
        }
      } else {
        console.log(`❌ No sales found in commune ${expectedCommune} via Quest API`);
        filteredResults = [];
      }
    }

    // Sort by date (most recent first)
    const sortedResults: DVFRecord[] = filteredResults
      .filter((r: DVFRecord): boolean => r.date_mutation !== null && r.valeur_fonciere !== null)
      .sort((a: DVFRecord, b: DVFRecord): number => {
        if (!a.date_mutation || !b.date_mutation) return 0;
        const dateA = new Date(a.date_mutation);
        const dateB = new Date(b.date_mutation);
        return dateB.getTime() - dateA.getTime();
      });

    return NextResponse.json({ 
      status: 'success', 
      resultats: sortedResults,
      total: sortedResults.length,
      total_in_radius: allResults.length,
      source: 'Christian Quest DVF API (Recommended by Etalab)',
      exact_parcel_id: exactCadastralId,
      expected_commune: exactCadastralId ? exactCadastralId.slice(0, 5) : null,
      coordinates: `lat=${lat}, lng=${lng}`,
      radius_meters: rayon,
      api_used: 'christian_quest'
    });

  } catch (e: any) {
    clearTimeout(timeoutId);
    console.error('Christian Quest DVF API failed', e?.message || e);
    
    if (e.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout', resultats: [] }, { status: 200 });
    }
    
    return NextResponse.json({ 
      error: e?.message || 'Christian Quest API failed', 
      resultats: [],
      debug_url: dvfUrl 
    }, { status: 200 });
  }
}
