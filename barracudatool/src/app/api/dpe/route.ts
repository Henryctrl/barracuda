// File: src/app/api/dpe/route.ts
import { NextResponse } from 'next/server';

// Helper function to calculate distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Interface for the DPE records from the API
interface DPERecord {
  'numero_dpe': string;
  'adresse_brut': string;
  'nom_commune_ban': string;
  'code_postal_ban': string;
  'code_insee_ban': string;  // ADDED
  'etiquette_dpe': string;
  'etiquette_ges': string;
  '_geopoint': string;
  '_distance'?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postalCode = searchParams.get('postalCode');
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');

  if (!postalCode || !latStr || !lonStr) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'Invalid latitude or longitude' }, { status: 400 });
  }
  
  try {
    const dataset = 'dpe03existant';
    const queryParams = new URLSearchParams({
        qs: `code_postal_ban:"${postalCode}"`,
        size: '10000',
        select: 'numero_dpe,adresse_brut,surface_habitable_logement,adresse_ban,nom_commune_ban,code_postal_ban,code_insee_ban,etiquette_dpe,etiquette_ges,_geopoint,type_generateur_chauffage_principal,type_batiment,date_etablissement_dpe,conso_5_usages_par_m2_ep,conso_5_usages_par_m2_ef,emission_ges_5_usages_par_m2',
    }).toString();
    const url = `https://data.ademe.fr/data-fair/api/v1/datasets/${dataset}/lines?${queryParams}`;
    
    const apiResponse = await fetch(url);
    if (!apiResponse.ok) throw new Error(`ADEME API Error: ${apiResponse.statusText}`);
    
    const data = await apiResponse.json();
    if (!data.results || data.results.length === 0) {
      return NextResponse.json([]);
    }
    
    const recordsWithDistance = data.results
      .map((record: DPERecord) => {
        if (record._geopoint) {
          const [recordLat, recordLon] = record._geopoint.split(',').map(Number);
          if (!isNaN(recordLat) && !isNaN(recordLon)) {
            record._distance = calculateDistance(lat, lon, recordLat, recordLon);
            return record;
          }
        }
        return null;
      })
      .filter((record: DPERecord | null): record is DPERecord => record !== null && record._distance !== undefined)
      .sort((a: DPERecord, b: DPERecord) => (a._distance ?? Infinity) - (b._distance ?? Infinity));

    return NextResponse.json(recordsWithDistance);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown DPE API error';
    return NextResponse.json({ error: 'Failed to fetch DPE data', details: errorMessage }, { status: 500 });
  }
}
