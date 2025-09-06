// File: src/app/api/dvf/route.ts (Corrected)
import { NextResponse } from 'next/server';

// Interface to type the API's paginated response structure
interface DVFApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  features: any[]; 
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inseeCode = searchParams.get('inseeCode');
  const targetParcelId = searchParams.get('targetParcelId');

  if (!inseeCode || !targetParcelId) {
    return NextResponse.json({ error: 'Missing required query parameters: inseeCode and targetParcelId' }, { status: 400 });
  }

  try {
    let allSales: any[] = [];
    let nextUrl: string | null = `https://apidf-preprod.cerema.fr/dvf_opendata/geomutations/?code_insee=${inseeCode}`;
    
    while (nextUrl) {
      // FIX: Added 'Response' type
      const apiResponse: Response = await fetch(nextUrl, {
        headers: { 'Accept': 'application/json' },
        redirect: 'follow' 
      });

      if (!apiResponse.ok) {
        throw new Error(`Failed to fetch DVF data: ${apiResponse.status} ${apiResponse.statusText}`);
      }
      
      // FIX: Added 'DVFApiResponse' type
      const data: DVFApiResponse = await apiResponse.json();
      allSales = allSales.concat(data.features);
      nextUrl = data.next;
    }

    const filteredSales = allSales
      .filter(feature => {
        const parcelList = feature.properties?.l_idpar;
        return Array.isArray(parcelList) && parcelList.includes(targetParcelId);
      })
      .map(feature => feature.properties)
      .sort((a, b) => new Date(b.datemut).getTime() - new Date(a.datemut).getTime());

    return NextResponse.json(filteredSales);

  } catch (error) {
    console.error('DVF API Route Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch or process DVF data', details: errorMessage }, { status: 500 });
  }
}
