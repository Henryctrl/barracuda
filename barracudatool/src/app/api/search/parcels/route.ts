import { NextResponse } from 'next/server';

// Helper to calculate a bounding box for our search circle
function getBoundingBox(lat: number, lon: number, radiusMeters: number): [number, number, number, number] {
    const latRadian = lat * (Math.PI / 180);
    const degLat = radiusMeters / 111320;
    const degLon = radiusMeters / (111320 * Math.cos(latRadian));

    const minLat = lat - degLat;
    const maxLat = lat + degLat;
    const minLon = lon - degLon;
    const maxLon = lon + degLon;
    
    return [minLon, minLat, maxLon, maxLat];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');
  const radiusStr = searchParams.get('radius');
  const minSizeStr = searchParams.get('minSize');
  const maxSizeStr = searchParams.get('maxSize');

  if (!latStr || !lonStr || !radiusStr || !minSizeStr || !maxSizeStr) {
    return NextResponse.json({ error: 'Missing required search parameters' }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  const radius = parseFloat(radiusStr);
  const minSize = parseFloat(minSizeStr);
  const maxSize = parseFloat(maxSizeStr);

  const bbox = getBoundingBox(lat, lon, radius);

  // *** THIS IS THE CORRECTED API CALL ***
  const queryParams = new URLSearchParams({
    // Use the 'geom' parameter with a Polygon representing our bounding box.
    geom: JSON.stringify({
        "type": "Polygon",
        "coordinates": [[
            [bbox[0], bbox[1]],
            [bbox[2], bbox[1]],
            [bbox[2], bbox[3]],
            [bbox[0], bbox[3]],
            [bbox[0], bbox[1]]
        ]]
    }),
    // Crucially, specify the 'PCI' (Plan Cadastral Informatisé) as the source.
    // This source includes the 'contenance' property in its results.
    source: 'PCI',
    limit: '1000' // Get up to 1000 results to filter.
  }).toString();
  
  // We use the same endpoint as before, but with the corrected parameters.
  const apiUrl = `https://apicarto.ign.fr/api/cadastre/parcelle?${queryParams}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`IGN API failed with status: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return NextResponse.json([]);
    }

    // Now that the source is correct, the 'contenance' field will exist.
    // We can now filter by size on our server.
    const parcels = data.features.filter((feature: any) => {
        const contenance = feature.properties?.contenance;
        return contenance >= minSize && contenance <= maxSize;
    }).map((feature: any) => {
        if (!feature.properties?.bbox) return null;
        
        const parcelBbox = feature.properties.bbox;
        const parcelLon = parcelBbox[0] + (parcelBbox[2] - parcelBbox[0]) / 2;
        const parcelLat = parcelBbox[1] + (parcelBbox[3] - parcelBbox[1]) / 2;
        
        return {
            id: feature.properties.id,
            contenance: feature.properties.contenance,
            center: [parcelLon, parcelLat],
        };
    }).filter((p: any) => p !== null);

    return NextResponse.json(parcels);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Parcel search API backend error:', errorMessage);
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}
