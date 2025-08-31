// src/types/dpe.ts
export interface DPERecord {
    numero_dpe: string;
    adresse_brut: string;
    nom_commune_ban: string;
    code_postal_ban: string;
    etiquette_dpe: string;
    etiquette_ges: string;
    geopoint: { lat: number, lon: number };
    _distance?: number;
  }
  