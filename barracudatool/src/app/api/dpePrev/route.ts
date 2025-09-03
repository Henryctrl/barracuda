import { NextRequest, NextResponse } from 'next/server';
import { DpeAPI } from '@/lib/dpe-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Coordinates required for DPE lookup' }, 
        { status: 400 }
      );
    }

    console.log(`🔍 API: FIXED DPE search at ${lat}, ${lng}`);
    
    // Corrected: Removed the third 'radius' argument from the function call
    const dpeData = await DpeAPI.getDpeNearCoordinates(
      parseFloat(lng),
      parseFloat(lat)
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ DPE API route error:', errorMessage);
    return NextResponse.json({
      found: false,
      error: 'Failed to fetch DPE data',
      nearby: [],
      count: 0
    }, { status: 500 });
  }
}
