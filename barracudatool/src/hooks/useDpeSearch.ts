// src/hooks/useDpeSearch.ts
import { useState, useCallback } from 'react';
import { DPERecord } from '../types/dpe'; // We'll centralize types

// --- Helper Function ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const useDpeSearch = () => {
  const [results, setResults] = useState<DPERecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInfo, setSearchInfo] = useState('');

  const searchDPE = useCallback(async (postalCode: string, latitude: string, longitude: string) => {
    setLoading(true);
    setError('');
    setResults([]);
    setSearchInfo('INITIALIZING SECTOR SCAN...');

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || !postalCode) {
      setError('CRITICAL ERROR: INVALID COORDINATES OR SECTOR ID');
      setLoading(false);
      return;
    }

    try {
      setSearchInfo(`QUERYING ADEME GRID FOR SECTOR ${postalCode}...`);
      const dataset = 'dpe-v2-logements-existants';
      const queryParams = new URLSearchParams({
          where: `code_postal_ban = "${postalCode}"`,
          limit: '1000', // Using a reasonable limit
          select: 'numero_dpe, adresse_ban as adresse_brut, nom_commune_ban, code_postal_ban, etiquette_dpe, etiquette_ges, geopoint'
      }).toString();
      
      const url = `https://data.ademe.fr/api/v2/catalog/datasets/${dataset}/records?${queryParams}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`GRID OFFLINE: HTTP ${response.status}`);
      
      const data = await response.json();
      const records = data.records?.map((r: any) => r.record.fields) || [];

      if (!records || records.length === 0) {
        setSearchInfo(`NO ASSETS FOUND IN SECTOR ${postalCode}.`);
        setLoading(false);
        return;
      }
      
      setSearchInfo(`GRID RESPONSE: ${records.length} ASSETS DETECTED. CALCULATING PROXIMITY...`);
      const recordsWithDistance = records
        .map((record: DPERecord) => {
          if (record.geopoint) {
            const { lat: recordLat, lon: recordLon } = record.geopoint;
            if (typeof recordLat === 'number' && typeof recordLon === 'number') {
              record._distance = calculateDistance(lat, lon, recordLat, recordLon);
              return record;
            }
          }
          return null;
        })
        .filter((record: DPERecord | null): record is DPERecord => record !== null && record._distance !== undefined)
        .sort((a: DPERecord, b: DPERecord) => a._distance! - b._distance!);

      if (recordsWithDistance.length === 0) {
        setSearchInfo(`ASSET DATA CORRUPTED. CANNOT CALCULATE PROXIMITY.`);
        setLoading(false);
        return;
      }

      setResults(recordsWithDistance);
      setSearchInfo(`ANALYSIS COMPLETE. ${recordsWithDistance.length} VALID ASSETS. CLOSEST TARGET: ${Math.round(recordsWithDistance[0]._distance!)}m`);
    } catch (err: any) {
      setError(`SYSTEM FAILURE: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []); // useCallback ensures the function reference is stable

  return { results, loading, error, searchInfo, searchDPE };
};
