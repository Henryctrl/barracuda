import { NextRequest, NextResponse } from 'next/server';
import { BanAPI } from '@/lib/ban-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    
    if (!query && (!lat || !lng)) {
      return NextResponse.json(
        { error: 'Query or coordinates required' }, 
        { status: 400 }
      );
    }

    let result;
    if (query) {
      // Text search
      result = await BanAPI.searchAddresses(query, {
        limit: parseInt(searchParams.get('limit') || '15'),
        autocomplete: searchParams.get('autocomplete') === 'true'
      });
    } else {
      // Reverse geocoding
      result = await BanAPI.reverseGeocode(
        parseFloat(lng!), 
        parseFloat(lat!)
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Address API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch addresses' }, 
      { status: 500 }
    );
  }
}
