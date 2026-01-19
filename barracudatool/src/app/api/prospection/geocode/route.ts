// src/app/api/prospection/geocode/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return NextResponse.json({
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
        formatted_address: feature.properties.label,
        town: feature.properties.city,
        postcode: feature.properties.postcode
      });
    }

    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
