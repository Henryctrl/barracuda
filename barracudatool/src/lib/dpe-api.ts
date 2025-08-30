export interface DpeData {
    numero_dpe: string;
    date_reception_dpe: string;
    adresse_bien: string;
    commune_bien: string;
    code_postal_bien: string;
    etiquette_dpe: string;
    consommation_energie: number;
    estimation_ges: number;
    surface_habitable: number;
    coordonnee_x?: number;
    coordonnee_y?: number;
    distance?: number;
  }
  
  type RawDpe = Record<string, any>;
  
  export class DpeAPI {
    private static readonly BASE_URL =
      'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants';
  
    // Broad text search helper
    private static async searchBroad(query: string, size = 200, from = 0): Promise<RawDpe[]> {
      const params = new URLSearchParams({ size: String(size), from: String(from), q: query });
      const url = `${this.BASE_URL}/lines?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('ADEME search error:', res.status, url);
        return [];
      }
      const data = await res.json();
      return (data?.results ?? []) as RawDpe[];
    }
  
    private static mapRaw(d: RawDpe, defaults?: { commune?: string; postal?: string }): DpeData {
      return {
        numero_dpe: d['N°DPE'] || '',
        date_reception_dpe: d['Date_réception_DPE'] || '',
        adresse_bien: d['Adresse_(BAN)'] || '',
        commune_bien: d['Nom__commune_(BAN)'] || defaults?.commune || '',
        code_postal_bien: d['Code_postal_(BAN)'] || defaults?.postal || '',
        etiquette_dpe: d['Etiquette_DPE'] || '',
        consommation_energie: d['Conso_5_usages_par_m²_é_finale'] || 0,
        estimation_ges: d['Emission_GES_5_usages_par_m²'] || 0,
        surface_habitable: d['Surface_habitable_logement'] || 0,
        coordonnee_x: d['Coordonnée_cartographique_X_(BAN)'],
        coordonnee_y: d['Coordonnée_cartographique_Y_(BAN)'],
      };
    }
  
    private static isValid(d: DpeData): boolean {
      return Boolean(
        d.etiquette_dpe &&
          d.etiquette_dpe !== 'N.C.' &&
          typeof d.consommation_energie === 'number' &&
          d.consommation_energie > 0
      );
    }
  
    // EXACT CERTIFICATE: scan several broad pages containing the number and then exact-match client-side
    static async getDpeByCertificateNumber(certificateNumber: string): Promise<DpeData | null> {
      console.log('🎯 Certificate Search:', certificateNumber);
      const pageSize = 200;
      let scanned = 0;
  
      for (let from = 0; from < 2000; from += pageSize) {
        const results = await this.searchBroad(certificateNumber, pageSize, from);
        scanned += results.length;
        if (!results.length) break;
  
        const exact = results.find((r: RawDpe) => (r['N°DPE'] || '') === certificateNumber);
        if (exact) {
          const mapped = this.mapRaw(exact);
          console.log(`✅ Exact certificate match after scanning ${scanned}:`, mapped.adresse_bien, mapped.etiquette_dpe);
          return mapped;
        }
      }
  
      console.log(`❌ No exact certificate match after scanning ${scanned}`);
      return null;
    }
  
    // ADDRESS SEARCH: reverse geocode → broad search → client-side exact postal/commune + loose address
    static async getDpeNearCoordinates(lng: number, lat: number, radiusKm = 2.0): Promise<DpeData[]> {
      console.log(`🎯 DPE Search by address: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  
      // Reverse geocoding
      const rev = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}&limit=1`);
      if (!rev.ok) return [];
      const revData = await rev.json();
      const f = revData?.features?.[0];
      if (!f) return [];
  
      const props = f.properties;
      const house = (props.housenumber || '').toString();
      const street = (props.street || '').toString();
      const fullAddress = `${house} ${street}`.trim();
      const postal = (props.postcode || '').toString();
      const commune = (props.city || '').toString();
      console.log(`📍 Address: "${fullAddress}", ${commune} (${postal})`);
  
      // Broad query (tokens)
      const broadQuery = `${fullAddress} ${postal} ${commune}`;
      const results = await this.searchBroad(broadQuery, 500, 0);
  
      // Normalize strings
      const norm = (s: string) => s.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  
      const addrNorm = norm(fullAddress);
      const communeNorm = norm(commune);
  
      // Exact on postal & commune, loose on address: startsWith or includes
      const matched = results.filter((r: RawDpe) => {
        const rAddr = norm((r['Adresse_(BAN)'] || '').toString());
        const rPostal = (r['Code_postal_(BAN)'] || '').toString();
        const rCommune = norm((r['Nom__commune_(BAN)'] || '').toString());
  
        const postalOk = rPostal === postal;
        const communeOk = rCommune === communeNorm;
  
        // Allow minor formatting variability (house number position, abbreviations)
        const addressOk =
          rAddr === addrNorm ||
          rAddr.startsWith(addrNorm) ||
          addrNorm.startsWith(rAddr) ||
          rAddr.includes(addrNorm);
  
        return postalOk && communeOk && addressOk;
      });
  
      console.log(`✅ Candidate matches at address: ${matched.length}`);
  
      const mapped = matched.map((r: RawDpe) => this.mapRaw(r, { commune, postal })).filter(this.isValid);
  
      console.log(`🎯 Valid DPE at address: ${mapped.length}`);
      return mapped;
    }
  
    // Minimal debug stub
    static async debugDpeSearch(lng: number, lat: number): Promise<any> {
      return { message: 'debug stub' };
    }
  }
  