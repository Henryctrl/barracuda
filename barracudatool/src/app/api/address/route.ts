// File: src/app/api/address/route.ts
import { NextResponse } from 'next/server';

// Interface for the address features returned by the BAN API
interface BanFeature {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    label: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    distance?: number; // We will add this property
  };
}

// Haversine distance formula to calculate distance between two lat/lon points
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in metres
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lonStr = searchParams.get('lon');
  const latStr = searchParams.get('lat');

  if (!lonStr || !latStr) {
    return NextResponse.json({ error: 'Missing longitude or latitude' }, { status: 400 });
  }

  const lon = parseFloat(lonStr);
  const lat = parseFloat(latStr);

  try {
    const banResponse = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}&limit=10`);
    if (!banResponse.ok) {
      throw new Error(`BAN API error: ${banResponse.statusText}`);
    }
    
    const banJson = await banResponse.json();
    // FIX: Changed 'let' to 'const'
    const features: BanFeature[] = banJson.features || [];

    // 1. Calculate distance for each address from the parcel's center point
    features.forEach(feature => {
      const [featureLon, featureLat] = feature.geometry.coordinates;
      feature.properties.distance = calculateDistance(lat, lon, featureLat, featureLon);
    });

    // 2. Sort the results
    features.sort((a, b) => {
      const aHasNumber = a.properties.housenumber ? 0 : 1;
      const bHasNumber = b.properties.housenumber ? 0 : 1;

      // Prioritize addresses with a housenumber
      if (aHasNumber !== bHasNumber) {
        return aHasNumber - bHasNumber;
      }
      
      // For addresses of the same type (both have numbers or both don't), sort by distance
      return (a.properties.distance ?? Infinity) - (b.properties.distance ?? Infinity);
    });

    return NextResponse.json(features);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown address API error';
    return NextResponse.json({ error: 'Failed to fetch address data', details: errorMessage }, { status: 500 });
  }
}


//OLD CODE THAT ALSO WORKED??????
// // File: src/app/api/address/route.ts
// import { NextResponse } from 'next/server';

// // Interface for the address features returned by the BAN API
// interface BanFeature {
//   geometry: {
//     coordinates: [number, number];
//   };
//   properties: {
//     label: string;
//     housenumber?: string;
//     postcode?: string;
//     city?: string;
//     distance?: number; // We will add this property
//   };
// }

// // Haversine distance formula to calculate distance between two lat/lon points
// const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
//     const R = 6371e3; // Earth's radius in metres
//     const φ1 = lat1 * Math.PI / 180;
//     const φ2 = lat2 * Math.PI / 180;
//     const Δφ = (lat2 - lat1) * Math.PI / 180;
//     const Δλ = (lon2 - lon1) * Math.PI / 180;

//     const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//               Math.cos(φ1) * Math.cos(φ2) *
//               Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//     return R * c; // Distance in metres
// };

