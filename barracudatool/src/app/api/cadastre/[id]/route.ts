// barracudatool/src/app/api/cadastre/[id]/route.ts

import { NextResponse } from 'next/server';

interface IgnParcelProperties {
  code_insee: string;
  commune: string;
  section: string;
  numero: string;
  contenance: number;
}

// This API route handles GET requests to /api/cadastre/[id]
// It now includes a fallback to the geo.api.gouv.fr service.
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const parcelId = params.id;
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!parcelId) {
    return NextResponse.json(
      { error: 'A valid Parcel ID is required' },
      { status: 400 }
    );
  }

  const match = parcelId.match(/^(\d{5})\d{3}(\w{2})(\w{4})$/);

  if (!match) {
    console.error(`Failed to parse parcelId: ${parcelId}`);
    return NextResponse.json(
      { error: 'Invalid parcel ID format for parsing' },
      { status: 400 }
    );
  }

  const [, code_insee, section, numero] = match;

  const queryParams = new URLSearchParams({
    code_insee,
    section,
    numero,
  }).toString();
  
  const apiUrl = `https://apicarto.ign.fr/api/cadastre/parcelle?${queryParams}`;

  try {
    const response = await fetch(apiUrl);

    // --- FALLBACK LOGIC ---
    // If the primary API fails with a 404, we try the fallback.
    if (response.status === 404) {
      console.log(`IGN API returned 404. Attempting fallback to geo.api.gouv.fr`);
      
      if (!lat || !lon) {
        return NextResponse.json(
          { error: 'Primary API failed and lat/lon coordinates were not provided for fallback.' },
          { status: 400 }
        );
      }

      const fallbackUrl = `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&format=json&fields=nom,code,codeDepartement,codeRegion,codesPostaux,surface,population`;
      
      const fallbackResponse = await fetch(fallbackUrl);

      if (!fallbackResponse.ok) {
        throw new Error(`Fallback API (geo.api.gouv.fr) failed with status: ${fallbackResponse.status}`);
      }

      const fallbackData = await fallbackResponse.json();
      
      // Return the data from the successful fallback API call
      return NextResponse.json(fallbackData[0] || { message: "Fallback successful but returned no data." });
    }

    if (!response.ok) {
        throw new Error(`Primary API (apicarto.ign.fr) failed with status: ${response.status}`);
    }
    // --- END FALLBACK LOGIC ---

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const properties = data.features[0].properties as IgnParcelProperties;
      return NextResponse.json(properties);
    } else {
      return NextResponse.json(
        { error: `API returned an empty result for query: ${queryParams}` },
        { status: 404 }
      );
    }

  } catch (error: any) {
    console.error('Cadastre API backend error:', error.message);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
