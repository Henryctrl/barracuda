// File: src/app/api/dvf/route.ts
import { NextResponse } from 'next/server';

// --- Interfaces (remain unchanged) ---
interface DVFProperties {
  idmutinvar: string;
  datemut: string;
  valeurfonc: string;
  coddep: string;
  codcom: string;
  l_idpar: string[];
  l_addr: string;
  libtypbien: string;
  sbati: string;
  sterr: string;
}

interface DVFFeature {
  type: 'Feature';
  properties: DVFProperties;
  geometry: object;
}

interface DVFApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  features: DVFFeature[]; 
}

// --- Configuration for Robust Fetching ---
const MAX_PAGES_TO_FETCH = 50; // Safety limit to prevent serverless function timeout
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

// Helper function to perform fetch with retries on network/server errors
async function fetchWithRetry(url: string, options: RequestInit, retries = RETRY_COUNT, delay = RETRY_DELAY_MS): Promise<Response> {
  try {
    // Vercel's fetch has a default timeout, which is what's causing the error.
    // This wrapper handles retrying if that timeout or another server error occurs.
    const response = await fetch(url, options);
    if (!response.ok && response.status >= 500 && retries > 0) {
      console.warn(`Request failed with status ${response.status}. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2); // Exponential backoff
    }
    return response;
  } catch (error: any) {
    // Specifically catch the timeout error and retry
    if (error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' && retries > 0) {
      console.warn(`Connection timeout. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error; // Re-throw if it's not a retryable error or retries are exhausted
  }
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inseeCode = searchParams.get('inseeCode');
  const targetParcelId = searchParams.get('targetParcelId');

  if (!inseeCode || !targetParcelId) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  try {
    let foundSales: DVFProperties[] = [];
    let nextUrl: string | null = `https://apidf-preprod.cerema.fr/dvf_opendata/geomutations/?code_insee=${inseeCode}`;
    let pagesFetched = 0;
    
    // Loop through pages with a safety limit to avoid timeouts
    while (nextUrl && pagesFetched < MAX_PAGES_TO_FETCH) {
      const apiResponse: Response = await fetchWithRetry(nextUrl, {
        headers: { 'Accept': 'application/json' },
        redirect: 'follow' 
      });

      if (!apiResponse.ok) {
        throw new Error(`Failed to fetch DVF data after retries: ${apiResponse.status} ${apiResponse.statusText}`);
      }
      
      const data: DVFApiResponse = await apiResponse.json();

      // Filter this page's features and add them to our results immediately
      const salesOnPage = data.features
        .filter(feature => {
          const parcelList = feature.properties?.l_idpar;
          return Array.isArray(parcelList) && parcelList.includes(targetParcelId);
        })
        .map(feature => feature.properties);

      if (salesOnPage.length > 0) {
        foundSales = foundSales.concat(salesOnPage);
      }
      
      nextUrl = data.next;
      pagesFetched++;
    }

    // Warn if we hit the page limit, as data might be incomplete for very large communes
    if (pagesFetched >= MAX_PAGES_TO_FETCH && nextUrl) {
      console.warn(`Reached max page limit (${MAX_PAGES_TO_FETCH}) for INSEE code: ${inseeCode}. Data may be incomplete.`);
    }

    // Sort the final aggregated results by date, descending
    const sortedSales = foundSales.sort((a, b) => new Date(b.datemut).getTime() - new Date(a.datemut).getTime());

    return NextResponse.json(sortedSales);

  } catch (error) {
    console.error('DVF API Route Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch DVF data', details: errorMessage }, { status: 500 });
  }
}
