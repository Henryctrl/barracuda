// File: src/app/api/dvf/route.ts
import { NextResponse } from 'next/server';

// --- Interfaces ---
interface ParcelInfo {
  id: string;
  sterr: number;
}

interface DVFRecord {
  idmutinvar: string;
  datemut: string;
  valeurfonc: string;
  libtypbien: string;
  sbati: string;
  sterr: string;
  l_idpar: ParcelInfo[];
  l_addr: string;
}

interface DataGouvMutation {
  id_mutation: string;
  date_mutation: string;
  valeur_fonciere: number;
  adresse_nom_voie: string;
  type_local: string;
  surface_reelle_bati: number | null;
  surface_terrain: number | null;
  id_parcelle: string;
}

interface DataGouvApiResponse {
  data: DataGouvMutation[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inseeCode = searchParams.get('inseeCode');
  const targetParcelId = searchParams.get('targetParcelId');

  if (!inseeCode || !targetParcelId) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  const section = targetParcelId.substring(5, 10);
  if (!section) {
    return NextResponse.json({ error: 'Could not extract section from parcel ID' }, { status: 400 });
  }

  try {
    const apiUrl = `https://dvf-api.data.gouv.fr/mutations/${inseeCode}/${section}`;
    
    console.log(`Fetching DVF data from: ${apiUrl}`);
    
    const apiResponse = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!apiResponse.ok) {
      if (apiResponse.status === 404) {
        return NextResponse.json([]);
      }
      throw new Error(`Failed to fetch DVF data: ${apiResponse.status} ${apiResponse.statusText}`);
    }
    
    const responseData: DataGouvApiResponse = await apiResponse.json();

    const mutationsData = new Map<string, DataGouvMutation[]>();
    responseData.data.forEach(item => {
      const mutationGroup = mutationsData.get(item.id_mutation) || [];
      mutationGroup.push(item);
      mutationsData.set(item.id_mutation, mutationGroup);
    });

    const relevantMutations = new Map<string, DVFRecord>();
    for (const [mutationId, items] of mutationsData.entries()) {
      const includesTarget = items.some(item => item.id_parcelle === targetParcelId);

      if (includesTarget) {
        let totalLandArea = 0;
        let totalHabitableArea = 0;
        const uniqueParcels = new Map<string, ParcelInfo>();
        // CORRECTED: Changed 'let' to 'const' as 'primaryItem' is never reassigned
        const primaryItem = items[0];

        items.forEach(item => {
          if (!uniqueParcels.has(item.id_parcelle)) {
            uniqueParcels.set(item.id_parcelle, {
              id: item.id_parcelle,
              sterr: item.surface_terrain ?? 0,
            });
            totalLandArea += item.surface_terrain ?? 0;
            totalHabitableArea += item.surface_reelle_bati ?? 0;
          }
        });

        relevantMutations.set(mutationId, {
          idmutinvar: mutationId,
          datemut: primaryItem.date_mutation,
          valeurfonc: String(primaryItem.valeur_fonciere),
          libtypbien: primaryItem.type_local || 'Multiple',
          sbati: String(totalHabitableArea),
          sterr: String(totalLandArea),
          l_addr: primaryItem.adresse_nom_voie,
          l_idpar: Array.from(uniqueParcels.values()),
        });
      }
    }

    const filteredSales = Array.from(relevantMutations.values())
      .sort((a, b) => new Date(b.datemut).getTime() - new Date(a.datemut).getTime());

    return NextResponse.json(filteredSales);

  } catch (error) {
    console.error('DVF API Route Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process DVF data', details: errorMessage }, { status: 500 });
  }
}
