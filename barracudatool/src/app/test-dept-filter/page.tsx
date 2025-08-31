// src/app/dpe-search/page.tsx
'use client'
import { useState } from 'react'

// Interface remains the same, as the fields are correct
interface DPERecord {
  'numero_dpe': string;
  'adresse_brut': string;
  'nom_commune_ban': string;
  'code_postal_ban': string;
  'etiquette_dpe': string;
  'etiquette_ges': string;
  '_geopoint': string;
  '_distance'?: number; // We will calculate and add this ourselves
}

export default function DpeSearchPage() {
  const [latitude, setLatitude] = useState('46.0569')
  const [longitude, setLongitude] = useState('0.9242')
  // We add a postal code input for our new strategy
  const [postalCode, setPostalCode] = useState('87330') 
  const [results, setResults] = useState<DPERecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchInfo, setSearchInfo] = useState('')

  // Haversine distance formula to calculate distance between two lat/lon points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // The new client-side search strategy
  const findDPEByPostalCodeAndCoords = async () => {
    setLoading(true)
    setError('')
    setResults([])
    setSearchInfo('')

    const lat = parseFloat(latitude)
    const lon = parseFloat(longitude)

    if (isNaN(lat) || isNaN(lon) || !postalCode) {
      setError('Please enter valid coordinates and a postal code.')
      setLoading(false)
      return
    }

    try {
      console.log(`🎯 Fetching all DPE records for postal code: ${postalCode}`)

      const dataset = 'dpe03existant'
      
      // STEP 1: Fetch all records for a given postal code.
      // We use 'qs' for a structured query, which is more reliable.
      const queryParams = new URLSearchParams({
          qs: `code_postal_ban:"${postalCode}"`,
          size: '1000', // Fetch a large number of records to ensure we get everything
          select: 'numero_dpe,adresse_brut,nom_commune_ban,code_postal_ban,etiquette_dpe,etiquette_ges,_geopoint'
      }).toString();
      
      const url = `https://data.ademe.fr/data-fair/api/v1/datasets/${dataset}/lines?${queryParams}`

      console.log(`🔍 Querying URL: ${url}`)
      const response = await fetch(url)

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: HTTP ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      if (!data.results || data.results.length === 0) {
        setSearchInfo(`No DPE records found for postal code ${postalCode}.`)
        setLoading(false)
        return
      }
      
      console.log(`✅ Found ${data.results.length} records for postal code ${postalCode}. Now calculating distances...`)

      // STEP 2 & 3: Calculate distance for each record and sort
      const recordsWithDistance = data.results
        .map((record: DPERecord) => {
          if (record._geopoint) {
            const [recordLat, recordLon] = record._geopoint.split(',').map(Number);
            if (!isNaN(recordLat) && !isNaN(recordLon)) {
              // Add the calculated distance to the record object
              record._distance = calculateDistance(lat, lon, recordLat, recordLon);
              return record;
            }
          }
          return null; // Exclude records without valid coordinates
        })
        .filter((record: DPERecord | null): record is DPERecord => record !== null && record._distance !== undefined)
        .sort((a: DPERecord, b: DPERecord) => a._distance! - b._distance!)

      if (recordsWithDistance.length === 0) {
        setSearchInfo(`Found ${data.results.length} records, but none had valid coordinates for distance calculation.`);
        setLoading(false)
        return
      }

      setResults(recordsWithDistance)
      setSearchInfo(`Success! Found ${recordsWithDistance.length} valid records. The closest is ${Math.round(recordsWithDistance[0]._distance!)}m away.`)

    } catch (err: any) {
      setError(`Search failed: ${err.message}`)
      console.error('❌ Search failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h1>DPE Search (Client-Side Workaround)</h1>
      <p>Enter a postal code to fetch local records, then enter coordinates to find the closest property within that area.</p>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Postal Code (e.g., 87330)"
          style={{ padding: '8px', width: '33%' }}
        />
        <input
          type="text"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          placeholder="Latitude (e.g., 46.0569)"
          style={{ padding: '8px', width: '33%' }}
        />
        <input
          type="text"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          placeholder="Longitude (e.g., 0.9242)"
          style={{ padding: '8px', width: '33%' }}
        />
      </div>
      
      <button onClick={findDPEByPostalCodeAndCoords} disabled={loading} style={{ padding: '10px 20px', cursor: 'pointer' }}>
        {loading ? 'Searching...' : 'Find Closest DPE'}
      </button>

      {error && <p style={{ color: 'red', marginTop: '20px' }}>{error}</p>}
      {searchInfo && <p style={{ color: 'green', marginTop: '20px' }}>{searchInfo}</p>}

      {results.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h2>Search Results (Closest First in {postalCode})</h2>
          {results.map((dpe, index) => (
            <div key={dpe['numero_dpe']} style={{ border: '1px solid #ccc', borderRadius: '5px', padding: '15px', marginBottom: '10px', backgroundColor: index === 0 ? '#e8f5e9' : 'white' }}>
              <h3 style={{ marginTop: 0 }}>#{index + 1} - {dpe['adresse_brut']}</h3>
              <p><strong>Distance:</strong> {Math.round(dpe._distance ?? 0)} meters</p>
              <p><strong>Location:</strong> {dpe['nom_commune_ban']} ({dpe['code_postal_ban']})</p>
              <p>
                <strong>DPE Class:</strong> {dpe['etiquette_dpe']} | 
                <strong> GES Class:</strong> {dpe['etiquette_ges']}
              </p>
              <p style={{ fontSize: '12px', color: '#666' }}>DPE Number: {dpe['numero_dpe']}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
