// File: src/app/api/address/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lon = searchParams.get('lon');
  const lat = searchParams.get('lat');

  if (!lon || !lat) {
    return NextResponse.json({ error: 'Missing longitude or latitude' }, { status: 400 });
  }

  try {
    const banResponse = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}&limit=6`);
    if (!banResponse.ok) {
      throw new Error(`BAN API error: ${banResponse.statusText}`);
    }
    const banJson = await banResponse.json();
    return NextResponse.json(banJson.features || []);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown address API error';
    return NextResponse.json({ error: 'Failed to fetch address data', details: errorMessage }, { status: 500 });
  }
}
