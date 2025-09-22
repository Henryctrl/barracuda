// src/app/hunter/types.ts
export interface ParcelSearchResult {
    id: string;
    contenance: number;
    geom: {
      coordinates: number[][][]; // Assuming a simple polygon for now
    };
    center: [number, number];
}

// Re-exporting DPERecord to use it across components
export interface DPERecord {
  'numero_dpe': string; 'adresse_ban': string; 'date_etablissement_dpe': string; 'etiquette_dpe': string; 'etiquette_ges': string; 'surface_habitable_logement': number; 'conso_5_usages_par_m2_ep': number; 'conso_5_usages_par_m2_ef': number; 'emission_ges_5_usages_par_m2': number; 'type_batiment': string; 'type_generateur_chauffage_principal': string; '_geopoint': string; 'nom_commune_ban': string; '_distance'?: number;
}
