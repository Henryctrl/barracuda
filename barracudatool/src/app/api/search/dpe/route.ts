// src/app/api/search/dpe/route.ts
import { NextResponse } from 'next/server';

// Interface for what we expect back from ADEME
interface DPERecord {
    numero_dpe: string;
    adresse_ban: string;
    _geopoint: string;
    conso_5_usages_par_m2_ep: number;
    emission_ges_5_usages_par_m2: number;
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
  const idealConsumption = searchParams.get('idealConsumption');
  const idealEmissions = searchParams.get('idealEmissions');

  if (!lat || !lon || !radius || !minConsumption || !maxConsumption || !minEmissions || !maxEmissions || !idealConsumption || !idealEmissions) {
    return NextResponse.json({ error: 'Missing required search parameters' }, { status: 400 });
  }

  try {
    const dataset = 'dpe-v2-logements-existants'; // Using the v2 dataset
    const queryParams = new URLSearchParams({
        // Use geofilter.distance to find records within a radius of a point
        'geofilter.distance': `${lat},${lon},${radius}`,
        // Add the consumption and emission filters directly into the query
        qs: `conso_5_usages_par_m2_ep:[${minConsumption} TO ${maxConsumption}] AND emission_ges_5_usages_par_m2:[${minEmissions} TO ${maxEmissions}]`,
        size: '100', // Let's limit to 100 results to keep it fast
        select: 'numero_dpe,adresse_ban,_geopoint,conso_5_usages_par_m2_ep,emission_ges_5_usages_par_m2',
    }).toString();
    
    const url = `https://data.ademe.fr/data-fair/api/v1/datasets/${dataset}/lines?${queryParams}`;
    
    const apiResponse = await fetch(url);
    if (!apiResponse.ok) throw new Error(`ADEME API Error: ${apiResponse.statusText}`);
    
    const data = await apiResponse.json();
    if (!data.results || data.results.length === 0) {
      return NextResponse.json([]);
    }
    
    // The API has already done the filtering. Now we just rank the results.
    const rankedRecords = data.results.sort((a: DPERecord, b: DPERecord) => {
        const scoreA = Math.abs(Number(idealConsumption) - a.conso_5_usages_par_m2_ep) + Math.abs(Number(idealEmissions) - a.emission_ges_5_usages_par_m2);
        const scoreB = Math.abs(Number(idealConsumption) - b.conso_5_usages_par_m2_ep) + Math.abs(Number(idealEmissions) - b.emission_ges_5_usages_par_m2);
        return scoreA - scoreB;
    });

    return NextResponse.json(rankedRecords);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown DPE search API error';
    return NextResponse.json({ error: 'Failed to fetch DPE data', details: errorMessage }, { status: 500 });
  }
}
