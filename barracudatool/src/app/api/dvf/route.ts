// File: src/app/api/dvf/route.ts
import { NextResponse } from 'next/server';

// --- Interfaces ---
// Your original DVFRecord interface is what your component expects. We will adapt the new API response to fit it.
interface DVFRecord {
  idmutinvar: string;
  datemut: string;
  valeurfonc: string;
  libtypbien: string;
  sbati: string;
  sterr: string;
  l_idpar: string[];
  l_addr: string;
}

// Interface for the new API's response format
interface DataGouvMutation {
  id_mutation: string;
  date_mutation: string;
  valeur_fonciere: number;
  adresse_nom_voie: string;
  type_local: string;
  surface_reelle_bati: number | null;
  surface_terrain: number | null;
  id_parcelle: string;
  // This API groups by mutation, so we'll need to extract all parcels from a single mutation event
}

interface DataGouvApiResponse {
  data: DataGouvMutation[];
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inseeCode = searchParams.get('inseeCode');
  const targetParcelId = searchParams.get('targetParcelId'); // e.g., "871080000E0813"

  if (!inseeCode || !targetParcelId) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  // Extract the section from the parcel ID (e.g., "0000E" from "871080000E0813")
  // The parcel ID format is {inseeCode}{section}{numero}
  const section = targetParcelId.substring(5, 10);
  if (!section) {
    return NextResponse.json({ error: 'Could not extract section from parcel ID' }, { status: 400 });
  }

  try {
    const apiUrl = `https://dvf-api.data.gouv.fr/mutations/${inseeCode}/${section}`;
    
    const apiResponse = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!apiResponse.ok) {
      // Handle cases where a section might have no data, which can return a 404
      if (apiResponse.status === 404) {
        return NextResponse.json([]); // Return an empty array, as it's not an error
      }
      throw new Error(`Failed to fetch DVF data: ${apiResponse.status} ${apiResponse.statusText}`);
    }
    
    const responseData: DataGouvApiResponse = await apiResponse.json();

    // The data needs to be grouped by mutation ID to find all parcels involved in a single sale
    const mutations = new Map<string, DVFRecord>();

    responseData.data.forEach(item => {
      // Find all sales involving the target parcel
      if (item.id_parcelle === targetParcelId) {
        // If this mutation ID is new, create a record
        if (!mutations.has(item.id_mutation)) {
          mutations.set(item.id_mutation, {
            idmutinvar: item.id_mutation,
            datemut: item.date_mutation,
            valeurfonc: String(item.valeur_fonciere),
            libtypbien: item.type_local,
            sbati: String(item.surface_reelle_bati ?? ''),
            sterr: String(item.surface_terrain ?? ''),
            l_addr: item.adresse_nom_voie,
            l_idpar: [], // We will populate this next
          });
        }
      }
    });

    // Now, for each relevant mutation, find all its associated parcels
    responseData.data.forEach(item => {
      const mutation = mutations.get(item.id_mutation);
      if (mutation && !mutation.l_idpar.includes(item.id_parcelle)) {
        mutation.l_idpar.push(item.id_parcelle);
      }
    });

    // Convert the map to an array and sort by date
    const filteredSales = Array.from(mutations.values())
      .sort((a, b) => new Date(b.datemut).getTime() - new Date(a.datemut).getTime());

    return NextResponse.json(filteredSales);

  } catch (error) {
    console.error('DVF API Route Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process DVF data', details: errorMessage }, { status: 500 });
  }
}
