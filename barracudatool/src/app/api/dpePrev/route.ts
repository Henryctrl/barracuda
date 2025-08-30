import { NextRequest, NextResponse } from 'next/server';
import { DpeAPI } from '@/lib/dpe-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = parseFloat(searchParams.get('radius') || '1.0'); // Default 1km
    
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Coordinates required for DPE lookup' }, 
        { status: 400 }
      );
    }

    console.log(`🔍 API: FIXED DPE search at ${lat}, ${lng} within ${radius * 1000}m`);
    
    const dpeData = await DpeAPI.getDpeNearCoordinates(
      parseFloat(lng),
      parseFloat(lat),
      radius
    );

    if (dpeData.length === 0) {
      console.log(`❌ No DPE certificates found at this location using fixed method`);
      return NextResponse.json({
        found: false,
        nearby: [],
        count: 0,
        message: 'No DPE certificates found for this location'
      });
    }

    console.log(`✅ FIXED METHOD: Found ${dpeData.length} DPE certificates`);

    return NextResponse.json({
      found: true,
      nearby: dpeData,
      count: dpeData.length,
      closest: dpeData[0] // Most relevant certificate
    });
  } catch (error) {
    console.error('❌ DPE API route error:', error);
    return NextResponse.json({
      found: false,
      error: 'Failed to fetch DPE data',
      nearby: [],
      count: 0
    }, { status: 500 });
  }
}
