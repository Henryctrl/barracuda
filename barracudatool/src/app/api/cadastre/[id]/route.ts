import { NextResponse } from 'next/server';

// This API route handles GET requests to /api/cadastre/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const parcelId = params.id;

  if (!parcelId) {
    return NextResponse.json(
      { error: 'Parcel ID is required' },
      { status: 400 }
    );
  }

  // Use the reliable cadastre.data.gouv.fr API endpoint
  const apiUrl = `https://cadastre.data.gouv.fr/api/edge/parcel/${parcelId}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Parcel not found in the external database' },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch from cadastre.data.gouv.fr. Status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Cadastre API backend error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
