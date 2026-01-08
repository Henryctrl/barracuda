// src/app/api/search/dpe/route.ts
import { NextResponse } from 'next/server';

// Helper function to calculate distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Interface for what we expect back from ADEME
interface DPERecord {
    numero_dpe: string;
    adresse_ban: string;
    date_etablissement_dpe: string;
    etiquette_dpe: string;
    etiquette_ges: string;
    surface_habitable_logement: number;
    conso_5_usages_par_m2_ep: number;
    conso_5_usages_par_m2_ef: number;
    emission_ges_5_usages_par_m2: number;
    type_batiment: string;
    type_generateur_chauffage_principal: string;
    _geopoint: string;
    nom_commune_ban: string;
    _distance?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius'); // in meters
  const minConsumption = searchParams.get('minConsumption');
  const maxConsumption = searchParams.get('maxConsumption');
  const minEmissions = searchParams.get('minEmissions');
  const maxEmissions = searchParams.get('maxEmissions');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!lat || !lon || !radius || !minConsumption || !maxConsumption || !minEmissions || !maxEmissions) {
    return NextResponse.json({ error: 'Missing required search parameters' }, { status: 400 });
  }

  const centerLat = parseFloat(lat);
  const centerLon = parseFloat(lon);
  const radiusMeters = parseFloat(radius);

  if (isNaN(centerLat) || isNaN(centerLon) || isNaN(radiusMeters)) {
    return NextResponse.json({ error: 'Invalid lat/lon/radius parameters' }, { status: 400 });
  }

  try {
    const dataset = 'dpe-v2-logements-existants';
    
    // Build query string for consumption and emissions
    let qs = `conso_5_usages_par_m2_ep:[${minConsumption} TO ${maxConsumption}] AND emission_ges_5_usages_par_m2:[${minEmissions} TO ${maxEmissions}]`;
    
    // Add date filtering if provided
    if (startDate && endDate) {
      qs += ` AND date_etablissement_dpe:[${startDate} TO ${endDate}]`;
    } else if (startDate) {
      qs += ` AND date_etablissement_dpe:[${startDate} TO *]`;
    } else if (endDate) {
      qs += ` AND date_etablissement_dpe:[* TO ${endDate}]`;
    }
    
    const queryParams = new URLSearchParams({
        qs: qs,
        size: '1000',
        select: 'numero_dpe,adresse_ban,date_etablissement_dpe,etiquette_dpe,etiquette_ges,surface_habitable_logement,conso_5_usages_par_m2_ep,conso_5_usages_par_m2_ef,emission_ges_5_usages_par_m2,type_batiment,type_generateur_chauffage_principal,_geopoint,nom_commune_ban',
    }).toString();
    
    const url = `https://data.ademe.fr/data-fair/api/v1/datasets/${dataset}/lines?${queryParams}`;
    
    const apiResponse = await fetch(url);
    if (!apiResponse.ok) throw new Error(`ADEME API Error: ${apiResponse.statusText}`);
    
    const data = await apiResponse.json();
    if (!data.results || data.results.length === 0) {
      return NextResponse.json([]);
    }
    
    // Filter by radius and calculate distance
    const recordsWithinRadius = data.results
      .map((record: DPERecord) => {
        if (record._geopoint) {
          const [recordLat, recordLon] = record._geopoint.split(',').map(Number);
          if (!isNaN(recordLat) && !isNaN(recordLon)) {
            const distance = calculateDistance(centerLat, centerLon, recordLat, recordLon);
            if (distance <= radiusMeters) {
              record._distance = distance;
              return record;
            }
          }
        }
        return null;
      })
      .filter((record: DPERecord | null): record is DPERecord => record !== null && record._distance !== undefined)
      .sort((a: DPERecord, b: DPERecord) => (a._distance ?? Infinity) - (b._distance ?? Infinity));

    return NextResponse.json(recordsWithinRadius);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown DPE search API error';
    return NextResponse.json({ error: 'Failed to fetch DPE data', details: errorMessage }, { status: 500 });
  }
}
