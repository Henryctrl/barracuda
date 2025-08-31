import { NextResponse } from 'next/server';

interface IgnParcelProperties {
  code_insee: string;
  commune: string;
  section: string;
  numero: string;
  contenance: number;
}

// This API route handles GET requests to /api/cadastre/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const parcelId = params.id;

  if (!parcelId) {
    return NextResponse.json(
      { error: 'A valid Parcel ID is required' },
      { status: 400 }
    );
  }

  // --- THE FINAL, ROBUST FIX: Intelligent Parcel ID Parsing ---
  // The parcel ID format can vary. This regular expression is designed
  // to correctly capture the components from different formats.
  // It looks for: (5-digit INSEE)(2-digit prefix)(2-char section)(4-char number)
  const match = parcelId.match(/^(\d{5})\d{2}(\w{2})(\w{4})$/);

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

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `Parcel not found via API Carto for query: ${queryParams}` },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch from API Carto. Status: ${response.status}`);
    }

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

  } catch (error) {
    console.error('Cadastre API backend error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
