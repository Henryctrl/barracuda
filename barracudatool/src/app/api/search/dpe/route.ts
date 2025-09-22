import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius');
  const minConsumption = searchParams.get('minConsumption');
  const maxConsumption = searchParams.get('maxConsumption');
  const minEmissions = searchParams.get('minEmissions');
  const maxEmissions = searchParams.get('maxEmissions');
  const idealConsumption = searchParams.get('idealConsumption');
  const idealEmissions = searchParams.get('idealEmissions');

  if (!lat || !lon || !radius ) {
    return NextResponse.json({ error: 'Missing required geo parameters' }, { status: 400 });
  }

  // =================================================================
  // TODO: BACKEND DATABASE LOGIC FOR DPE SEARCH
  // 1. Connect to your DPE database.
  // 2. Write a query to find DPE records within the radius that match the energy criteria.
  // 3. IMPORTANT: Your ranking logic will happen here.
  //    - Calculate a "match score" for each result.
  //    - `score = abs(idealConsumption - dpe.conso) + abs(idealEmissions - dpe.emissions)`
  //    - Order the results by this score ASC.
  // =================================================================

  // For now, returning mock data:
  const mockDPEs = [
    { numero_dpe: 'MOCK_DPE_1', adresse_ban: '123 Fake Street', _geopoint: `${Number(lat) + 0.002},${Number(lon)}`, conso_5_usages_par_m2_ep: 140, emission_ges_5_usages_par_m2: 25 },
    { numero_dpe: 'MOCK_DPE_2', adresse_ban: '456 Cyber Avenue', _geopoint: `${Number(lat)},${Number(lon) - 0.002}`, conso_5_usages_par_m2_ep: 160, emission_ges_5_usages_par_m2: 35 },
  ];
  
  // Mock ranking logic
  mockDPEs.sort((a, b) => {
      const scoreA = Math.abs(Number(idealConsumption) - a.conso_5_usages_par_m2_ep) + Math.abs(Number(idealEmissions) - a.emission_ges_5_usages_par_m2);
      const scoreB = Math.abs(Number(idealConsumption) - b.conso_5_usages_par_m2_ep) + Math.abs(Number(idealEmissions) - b.emission_ges_5_usages_par_m2);
      return scoreA - scoreB;
  });

  return NextResponse.json(mockDPEs);
}
