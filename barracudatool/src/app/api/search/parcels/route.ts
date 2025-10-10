import { NextResponse } from 'next/server';

function getBoundingBox(lat: number, lon: number, radiusMeters: number): [number, number, number, number] {
    const latRadian = lat * (Math.PI / 180);
    const degLat = radiusMeters / 111320;
    const degLon = radiusMeters / (111320 * Math.cos(latRadian));
    return [lon - degLon, lat - degLat, lon + degLon, lat + degLat];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');
  
  if (!latStr || !lonStr) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  
  const bbox = getBoundingBox(lat, lon, 5000);

  const searchGeometry = {
      "type": "Polygon",
      "coordinates": [[
          [bbox[0], bbox[1]],
          [bbox[2], bbox[1]],
          [bbox[2], bbox[3]],
          [bbox[0], bbox[3]],
          [bbox[0], bbox[1]]
      ]]
  };

  let apiUrl = `https://apicarto.ign.fr/api/cadastre/parcelle?source=PCI&limit=20`; // Limit to 20 for a clean test
  apiUrl += `&geom=${encodeURIComponent(JSON.stringify(searchGeometry))}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
          error: "IGN API Request Failed", 
          status: response.status, 
          details: errorText 
      }, { status: 500 });
    }

    // Directly return the raw JSON from the API. NO FILTERING.
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: "An exception occurred while fetching from IGN.", 
        details: errorMessage,
        apiUrl: apiUrl,
      },
      { status: 500 }
    );
  }
}
