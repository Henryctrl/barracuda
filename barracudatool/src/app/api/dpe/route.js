import { NextResponse } from 'next/server';
import { DPEService } from '../../../services/dpeService';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      address: searchParams.get('address'),
      energyClass: searchParams.get('energyClass'),
      ghgClass: searchParams.get('ghgClass'),
      size: parseInt(searchParams.get('size')) || 20
    };

    const result = await DPEService.fetchDPEData(filters);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: result.data,
      total: result.total,
      count: result.data.length
    });

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { address, energyClass, ghgClass, size } = body;
    
    const result = await DPEService.fetchDPEData({
      address,
      energyClass,
      ghgClass,
      size
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: result.data,
      total: result.total,
      count: result.data.length
    });

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
