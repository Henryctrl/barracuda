// src/app/dpe-search/page.tsx
'use client'
import { useState } from 'react'

// Interface for DPE records from the ADEME API
interface DPERecord {
  'numero_dpe': string;
  'adresse_brut': string;
  'nom_commune_ban': string;
  'code_postal_ban': string;
  'etiquette_dpe': string;
  'etiquette_ges': string;
  '_geopoint': string;
  '_distance'?: number;
}

export default function DpeSearchPage() {
  const [latitude, setLatitude] = useState('46.0569')
  const [longitude, setLongitude] = useState('0.9242')
  const [postalCode, setPostalCode] = useState('87330') 
  const [results, setResults] = useState<DPERecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchInfo, setSearchInfo] = useState('')

  // --- Core DPE Search Logic (Unchanged) ---
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const findDPEByPostalCodeAndCoords = async () => {
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
      const dataset = 'dpe03existant';
      const queryParams = new URLSearchParams({
          qs: `code_postal_ban:"${postalCode}"`,
          size: '10000',
          select: 'numero_dpe,adresse_brut,nom_commune_ban,code_postal_ban,etiquette_dpe,etiquette_ges,_geopoint'
      }).toString();
      const url = `https://data.ademe.fr/data-fair/api/v1/datasets/${dataset}/lines?${queryParams}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`GRID OFFLINE: HTTP ${response.status}`);
      
      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        setSearchInfo(`NO ASSETS FOUND IN SECTOR ${postalCode}.`);
        setLoading(false);
        return;
      }
      
      setSearchInfo(`GRID RESPONSE: ${data.results.length} ASSETS DETECTED. CALCULATING PROXIMITY...`);
      const recordsWithDistance = data.results
        .map((record: DPERecord) => {
          if (record._geopoint) {
            const [recordLat, recordLon] = record._geopoint.split(',').map(Number);
            if (!isNaN(recordLat) && !isNaN(recordLon)) {
              record._distance = calculateDistance(lat, lon, recordLat, recordLon);
              return record;
            }
          }
          return null;
        })
        .filter((record: DPERecord | null): record is DPERecord => record !== null && record._distance !== undefined)
        .sort((a: DPERecord, b: DPERecord) => a._distance! - b._distance!)

      if (recordsWithDistance.length === 0) {
        setSearchInfo(`ASSET DATA CORRUPTED. CANNOT CALCULATE PROXIMITY.`);
        setLoading(false);
        return;
      }

      setResults(recordsWithDistance);
      setSearchInfo(`ANALYSIS COMPLETE. ${recordsWithDistance.length} VALID ASSETS. CLOSEST TARGET: ${Math.round(recordsWithDistance[0]._distance!)}m`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`SYSTEM FAILURE: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  // --- Cyberpunk Theming Styles ---
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0d0d21',
      padding: '40px',
      fontFamily: "'Orbitron', sans-serif",
      color: '#00ffff',
    },
    main: {
      maxWidth: '900px',
      margin: 'auto',
      border: '2px solid #ff00ff',
      borderRadius: '10px',
      padding: '30px',
      backgroundColor: 'rgba(10, 10, 30, 0.8)',
      boxShadow: '0 0 25px rgba(255, 0, 255, 0.6)',
    },
    header: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      color: '#ff00ff',
      textShadow: '0 0 10px #ff00ff',
      textAlign: 'center' as const,
      marginBottom: '10px',
    },
    subHeader: {
      textAlign: 'center' as const,
      color: '#00ffff',
      textShadow: '0 0 8px #00ffff',
      marginBottom: '30px',
    },
    inputGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
    },
    label: {
      fontSize: '0.9rem',
      color: '#ff00ff',
      marginBottom: '8px',
      textTransform: 'uppercase' as const,
    },
    input: {
      backgroundColor: '#000',
      border: '2px solid #00ffff',
      borderRadius: '5px',
      color: '#00ffff',
      fontFamily: "'Orbitron', sans-serif",
      padding: '10px',
      fontSize: '1rem',
      boxShadow: 'inset 0 0 10px rgba(0, 255, 255, 0.5)',
    },
    button: {
      width: '100%',
      padding: '15px',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      color: '#fff',
      backgroundColor: '#ff00ff',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      textShadow: '0 0 5px #fff',
      boxShadow: '0 0 20px #ff00ff',
      transition: 'all 0.3s ease',
    },
    buttonDisabled: {
      backgroundColor: '#555',
      boxShadow: 'none',
      cursor: 'not-allowed',
      color: '#999',
    },
    messageBox: {
      marginTop: '20px',
      padding: '15px',
      borderRadius: '5px',
      textAlign: 'center' as const,
      fontWeight: 'bold',
    },
    errorBox: {
      backgroundColor: 'rgba(255, 0, 100, 0.2)',
      border: '1px solid #ff0064',
      color: '#ff0064',
    },
    infoBox: {
      backgroundColor: 'rgba(0, 255, 255, 0.2)',
      border: '1px solid #00ffff',
      color: '#00ffff',
    },
    resultsHeader: {
      marginTop: '40px',
      borderTop: '2px dashed #ff00ff',
      paddingTop: '30px',
      textAlign: 'center' as const,
    },
    resultCard: {
      border: '1px solid #00ffff',
      borderRadius: '8px',
      marginBottom: '15px',
      padding: '20px',
      backgroundColor: '#0a0a25',
      boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
      transition: 'all 0.3s ease',
    },
    resultCardHighlight: {
      border: '1px solid #ff00ff',
      boxShadow: '0 0 25px rgba(255, 0, 255, 0.7)',
    },
    cardHeader: {
      fontSize: '1.2rem',
      color: '#ff00ff',
      fontWeight: 'bold',
      marginBottom: '15px',
    },
    cardGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
    },
    dataPoint: {
      fontSize: '0.9rem',
    },
    dataLabel: {
      color: '#00ffff',
      opacity: 0.7,
      display: 'block',
    },
    dataValue: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
    dpeNumber: {
      marginTop: '15px',
      fontSize: '0.8rem',
      textAlign: 'right' as const,
      color: '#aaa',
      fontStyle: 'italic',
    },
  };
  
  // Helper to get color class for DPE ratings
  const getDpeColor = (rating: string) => {
    switch (rating) {
      case 'A': return '#00ff00';
      case 'B': return '#adff2f';
      case 'C': return '#ffff00';
      case 'D': return '#ffd700';
      case 'E': return '#ffa500';
      case 'F': return '#ff4500';
      case 'G': return '#ff0000';
      default: return '#808080';
    }
  };

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        <h1 style={styles.header}>DPE GRID SCANNER</h1>
        <p style={styles.subHeader}>INPUT TARGET COORDINATES AND SECTOR ID TO INITIATE PROXIMITY ANALYSIS</p>

        <div style={styles.inputGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="postalCode">SECTOR ID (POSTAL)</label>
            <input id="postalCode" type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="87330" style={styles.input}/>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="latitude">GRID LATITUDE</label>
            <input id="latitude" type="text" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="46.0569" style={styles.input}/>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="longitude">GRID LONGITUDE</label>
            <input id="longitude" type="text" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="0.9242" style={styles.input}/>
          </div>
        </div>
        
        <button onClick={findDPEByPostalCodeAndCoords} disabled={loading} style={{...styles.button, ...(loading && styles.buttonDisabled)}}>
          {loading ? 'SCANNING GRID...' : 'EXECUTE SCAN'}
        </button>

        {error && <div style={{...styles.messageBox, ...styles.errorBox}}>{error}</div>}
        {searchInfo && <div style={{...styles.messageBox, ...styles.infoBox}}>{searchInfo}</div>}

        {results.length > 0 && (
          <div style={styles.resultsHeader}>
             <h2 style={styles.header}>SCAN RESULTS</h2>
             <p style={styles.subHeader}>ASSETS SORTED BY PROXIMITY</p>
            {results.map((dpe, index) => (
              <div key={dpe.numero_dpe} style={{...styles.resultCard, ...(index === 0 && styles.resultCardHighlight)}}>
                <div style={styles.cardHeader}>TARGET #{index + 1} - {dpe.adresse_brut}</div>
                <div style={styles.cardGrid}>
                  <div style={styles.dataPoint}>
                    <span style={styles.dataLabel}>PROXIMITY</span>
                    <span style={styles.dataValue}>{Math.round(dpe._distance ?? 0)} meters</span>
                  </div>
                   <div style={styles.dataPoint}>
                    <span style={styles.dataLabel}>LOCATION</span>
                    <span style={styles.dataValue}>{dpe.nom_commune_ban} ({dpe.code_postal_ban})</span>
                  </div>
                  <div style={styles.dataPoint}>
                    <span style={styles.dataLabel}>ENERGY CLASS</span>
                    <span style={{...styles.dataValue, color: getDpeColor(dpe.etiquette_dpe)}}>
                      {dpe.etiquette_dpe}
                    </span>
                  </div>
                  <div style={styles.dataPoint}>
                    <span style={styles.dataLabel}>GHG EMISSIONS</span>
                    <span style={{...styles.dataValue, color: getDpeColor(dpe.etiquette_ges)}}>
                      {dpe.etiquette_ges}
                    </span>
                  </div>
                </div>
                <div style={styles.dpeNumber}>ID: {dpe.numero_dpe}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
