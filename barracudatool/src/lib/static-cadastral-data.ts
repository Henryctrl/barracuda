// Static Paris cadastral plots
export const parisStaticParcels = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[[2.3520, 48.8560], [2.3530, 48.8560], [2.3530, 48.8570], [2.3520, 48.8570], [2.3520, 48.8560]]]
        },
        properties: {
          cadastral_id: 'PARIS_01_001',
          surface_area: 1250,
          commune: 'Paris 1er',
          section: 'AB',
          parcel_number: '001',
          zone_type: 'Ub',
          last_sale_price: 875000,
          last_sale_date: '2023-03-15',
          price_per_sqm: 700,
          dpe_energy: 'C',
          dpe_ghg: 'B'
        }
      },
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[[2.3535, 48.8565], [2.3545, 48.8565], [2.3545, 48.8575], [2.3535, 48.8575], [2.3535, 48.8565]]]
        },
        properties: {
          cadastral_id: 'PARIS_01_002',
          surface_area: 950,
          commune: 'Paris 1er',
          section: 'AB',
          parcel_number: '002',
          zone_type: 'UCa',
          last_sale_price: 720000,
          last_sale_date: '2023-07-22',
          price_per_sqm: 758,
          dpe_energy: 'B',
          dpe_ghg: 'A'
        }
      },
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[[2.3505, 48.8555], [2.3515, 48.8555], [2.3515, 48.8565], [2.3505, 48.8565], [2.3505, 48.8555]]]
        },
        properties: {
          cadastral_id: 'PARIS_01_003',
          surface_area: 800,
          commune: 'Paris 1er',
          section: 'AC',
          parcel_number: '003',
          zone_type: 'N',
          dpe_energy: 'A',
          dpe_ghg: 'A'
        }
      }
    ]
  };
  
  // FIX: TypeScript error with proper typing
  export const getDPEColor = (rating: string): string => {
    const colors: Record<string, string> = {
      'A': '#00ff00', // Green
      'B': '#7fff00', // Lime green  
      'C': '#ffff00', // Yellow
      'D': '#ffa500', // Orange
      'E': '#ff8000', // Dark orange
      'F': '#ff4500', // Red orange
      'G': '#ff0000'  // Red
    };
    return colors[rating] || '#ffffff';
  };
  