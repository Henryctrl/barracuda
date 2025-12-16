'use client';

import { useState, useEffect } from 'react';
import { Loader2, MapPin, Database, RefreshCw, AlertTriangle, Info, XCircle } from 'lucide-react';
import MainHeader from '../../../components/MainHeader';

type ScrapeResult = {
  success: boolean;
  source?: string;
  totalScraped: number;
  inserted: number;
  validation?: {
    valid: number;
    invalid: number;
    total: number;
  };
  imageStats?: {
    withImages: number;
    avgImagesPerProperty: string | number;
  };
  poolCount?: number;
  message?: string;
};

type GeocodeResult = {
  success: boolean;
  message: string;
  processed: number;
  geocoded: number;
  failed: number;
  results?: Array<{
    id: string;
    location: string;
    coordinates: { lat: number; lng: number };
  }>;
  errors?: Array<{
    propertyId: string;
    location: string;
    reason: string;
    details?: string;
  }>;
};

type ErrorLog = {
    id: string;
    timestamp: string;
    level: 'error' | 'warning' | 'info';
    source: string;
    message: string;
    details?: string | Record<string, any> | null;
    created_at: string;
  };
  

export default function AdminDashboard() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ScrapeResult | GeocodeResult>>({});
  const [error, setError] = useState('');
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [showErrorLogs, setShowErrorLogs] = useState(false);

  const SCRAPERS = [
    { id: 'cadimmo', name: 'CAD-IMMO', url: 'https://cad-immo.com/fr/ventes', icon: '🏠', color: 'blue' },
    { id: 'eleonor', name: 'Agence Eleonor', url: 'https://www.agence-eleonor.fr/fr/vente', icon: '🏡', color: 'purple' },
    { id: 'beauxvillages', name: 'Beaux Villages', url: 'https://beauxvillages.com/fr/nos-biens_fr', icon: '🏘️', color: 'emerald' },
    { id: 'leggett', name: 'Leggett', url: 'https://www.leggett-immo.com/acheter-vendre-une-maison/mainSearch/page:1', icon: '🏰', color: 'pink' },
    { id: 'cyrano', name: 'Cyrano', url: 'https://www.cyranoimmobilier.com/vente/1', icon: '🏛️', color: 'teal' },
    { id: 'charbit', name: 'Charbit', url: 'https://charbit-immo.fr/fr/ventes', icon: '🏢', color: 'indigo' },
  ];

  // Fetch error logs on mount
  useEffect(() => {
    fetchErrorLogs();
  }, []);

  const fetchErrorLogs = async () => {
    try {
      const response = await fetch('/api/errors');
      if (response.ok) {
        const data = await response.json();
        setErrorLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch error logs:', err);
    }
  };

  const triggerScraper = async (scraperId: string, scraperUrl: string, maxPages: number = 2) => {
    setLoading(scraperId);
    setError('');

    const endpoint = scraperId === 'cadimmo' ? '/scrape' : `/scrape-${scraperId}`;

    try {
      const response = await fetch(`https://barracuda-production.up.railway.app${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchUrl: scraperUrl,
          maxPages,
          ...(scraperId !== 'cadimmo' && scraperId !== 'eleonor' ? { maxProperties: 50 } : {}),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(prev => ({ ...prev, [scraperId]: data }));
        
        setTimeout(() => {
          geocodeProperties(50);
        }, 1000);
      } else {
        setError(`${scraperId.toUpperCase()}: ${data.error || 'Failed to scrape'}`);
      }
    } catch (err) {
      setError(`${scraperId.toUpperCase()} Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
    setLoading(null);
  };

  const scrapeAll = async () => {
    setLoading('all');
    setError('');
    setResults({});

    for (const scraper of SCRAPERS) {
      try {
        await triggerScraper(scraper.id, scraper.url, 2);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`Failed to scrape ${scraper.name}:`, err);
      }
    }

    setLoading(null);
  };

  const geocodeProperties = async (limit: number = 100) => {
    setLoading('geocode');
    setError('');

    try {
      const response = await fetch('/api/geocode-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.NEXT_PUBLIC_CRON_SECRET || '',
        },
        body: JSON.stringify({ limit }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(prev => ({ ...prev, geocode: data }));
      } else {
        setError('Geocoding: ' + (data.error || 'Failed to geocode'));
      }
    } catch (err) {
      setError('Geocoding Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
    setLoading(null);
  };

  const isScrapeResult = (result: ScrapeResult | GeocodeResult): result is ScrapeResult => {
    return 'totalScraped' in result;
  };

  const isGeocodeResult = (result: ScrapeResult | GeocodeResult): result is GeocodeResult => {
    return 'geocoded' in result;
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle size={16} color="#ff0000" />;
      case 'warning': return <AlertTriangle size={16} color="#ffaa00" />;
      case 'info': return <Info size={16} color="#00ffff" />;
      default: return <Info size={16} />;
    }
  };

  // Helper function to safely render log details
    // Helper function to safely render log details
    const renderLogDetails = (details: unknown) => {
        if (typeof details === 'string') {
          return details as string;
        }
        if (details === null || details === undefined) {
          return 'null';
        }
        try {
          return JSON.stringify(details, null, 2);
        } catch {
          return String(details);
        }
      };
    

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d0d21', fontFamily: "'Orbitron', sans-serif" }}>
      <MainHeader />
      
      <main style={{ padding: '30px 20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px', borderBottom: '2px solid #ff00ff', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#ff00ff', textTransform: 'uppercase', marginBottom: '10px' }}>
            {'// ADMIN CONTROL PANEL'}
          </h1>
          <p style={{ color: '#00ffff', fontSize: '0.9rem' }}>
            Manage property scrapers, geocoding, and system monitoring
          </p>
        </div>

        {/* Error Logs Section */}
        <div style={{ marginBottom: '40px', padding: '20px', backgroundColor: 'rgba(255, 0, 0, 0.05)', border: '2px solid #ff0000', borderRadius: '8px' }}>
          <button
            onClick={() => {
              setShowErrorLogs(!showErrorLogs);
              if (!showErrorLogs) fetchErrorLogs();
            }}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ff0000',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={24} />
              System Error Logs ({errorLogs.length})
            </span>
            <span>{showErrorLogs ? '▼' : '▶'}</span>
          </button>

          {showErrorLogs && (
            <div style={{ marginTop: '20px' }}>
              {errorLogs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#00ff00', padding: '20px' }}>
                  ✅ No errors logged! System is healthy.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                  {errorLogs.map(log => (
                    <div
                      key={log.id}
                      style={{
                        padding: '15px',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        border: `1px solid ${log.level === 'error' ? '#ff0000' : log.level === 'warning' ? '#ffaa00' : '#00ffff'}`,
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        {getLevelIcon(log.level)}
                        <span style={{ color: '#00ffff', fontSize: '0.8rem' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span style={{ color: '#ff00ff', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          [{log.source}]
                        </span>
                      </div>
                      <div style={{ color: '#ffffff', marginBottom: '5px' }}>
                        {log.message}
                      </div>
                      {log.details && (
  <details style={{ marginTop: '8px' }}>
    <summary style={{ cursor: 'pointer', color: '#00ffff', fontSize: '0.75rem' }}>
      View Details
    </summary>
    <pre style={{
      marginTop: '8px',
      padding: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: '4px',
      fontSize: '0.7rem',
      overflow: 'auto',
      color: '#00ff00',
    }}>
      {String(renderLogDetails(log.details))}
    </pre>
  </details>
)}

                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={fetchErrorLogs}
                style={{
                  marginTop: '15px',
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  border: '1px solid #ff00ff',
                  color: '#ff00ff',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                }}
              >
                <RefreshCw size={14} style={{ display: 'inline', marginRight: '5px' }} />
                Refresh Logs
              </button>
            </div>
          )}
        </div>

        {/* Main Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '40px' }}>
          <button
            onClick={scrapeAll}
            disabled={loading !== null}
            style={{
              padding: '20px',
              backgroundColor: loading === 'all' ? '#00ff00' : 'transparent',
              border: '2px solid #00ff00',
              color: loading === 'all' ? '#0d0d21' : '#00ff00',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
              opacity: loading && loading !== 'all' ? 0.5 : 1,
            }}
          >
            {loading === 'all' ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Scraping All...
              </>
            ) : (
              <>
                <Database size={20} />
                🚀 Scrape All Sources
              </>
            )}
          </button>

          <button
            onClick={() => geocodeProperties(100)}
            disabled={loading !== null}
            style={{
              padding: '20px',
              backgroundColor: loading === 'geocode' ? '#ff00ff' : 'transparent',
              border: '2px solid #ff00ff',
              color: loading === 'geocode' ? '#0d0d21' : '#ff00ff',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
              opacity: loading && loading !== 'geocode' ? 0.5 : 1,
            }}
          >
            {loading === 'geocode' ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Geocoding...
              </>
            ) : (
              <>
                <MapPin size={20} />
                📍 Geocode Properties
              </>
            )}
          </button>
        </div>

        {/* Individual Scrapers */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#00ffff', marginBottom: '20px', textTransform: 'uppercase' }}>
            Individual Scrapers
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            {SCRAPERS.map(scraper => (
              <button
                key={scraper.id}
                onClick={() => triggerScraper(scraper.id, scraper.url, 2)}
                disabled={loading !== null}
                style={{
                  padding: '15px 20px',
                  backgroundColor: 'transparent',
                  border: `2px solid var(--color-${scraper.color}, #00ffff)`,
                  color: `var(--color-${scraper.color}, #00ffff)`,
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.3s ease',
                  opacity: loading && loading !== scraper.id ? 0.5 : 1,
                }}
              >
                {loading === scraper.id ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Scraping...
                  </>
                ) : (
                  <>
                    {scraper.icon} {scraper.name}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            border: '2px solid #ff0000',
            borderRadius: '8px',
            color: '#ff0000',
            marginBottom: '30px',
            fontWeight: 'bold',
          }}>
            ❌ {error}
          </div>
        )}

        {/* Results Display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.entries(results).map(([key, result]) => {
            if (isGeocodeResult(result)) {
              return (
                <div key={key} style={{
                  padding: '25px',
                  backgroundColor: 'rgba(255, 0, 255, 0.1)',
                  border: '2px solid #ff00ff',
                  borderRadius: '8px',
                }}>
                  <h3 style={{ fontSize: '1.5rem', color: '#ff00ff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📍 Geocoding Results
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ padding: '15px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff00' }}>{result.processed}</div>
                      <div style={{ fontSize: '0.8rem', color: '#a0a0ff' }}>Processed</div>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff00' }}>{result.geocoded}</div>
                      <div style={{ fontSize: '0.8rem', color: '#a0a0ff' }}>Geocoded</div>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff0000' }}>{result.failed}</div>
                      <div style={{ fontSize: '0.8rem', color: '#a0a0ff' }}>Failed</div>
                    </div>
                  </div>

                  {/* ERROR DISPLAY */}
                  {result.errors && result.errors.length > 0 && (
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(255, 0, 0, 0.1)', border: '1px solid #ff0000', borderRadius: '8px' }}>
                      <h4 style={{ color: '#ff0000', marginBottom: '15px', fontSize: '1.1rem' }}>
                        ⚠️ Geocoding Errors ({result.errors.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                        {result.errors.map((err, idx) => (
                          <div key={idx} style={{
                            padding: '12px',
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            borderLeft: '3px solid #ff0000',
                            borderRadius: '4px',
                          }}>
                            <div style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '5px' }}>
                              Property ID: <span style={{ color: '#ff00ff', fontFamily: 'monospace' }}>{err.propertyId}</span>
                            </div>
                            <div style={{ color: '#00ffff', fontSize: '0.85rem', marginBottom: '5px' }}>
                              Location: {err.location}
                            </div>
                            <div style={{ color: '#ffaa00', fontSize: '0.85rem', marginBottom: '5px' }}>
                              Reason: {err.reason}
                            </div>
                            {err.details && (
                              <div style={{ color: '#a0a0ff', fontSize: '0.75rem', marginTop: '5px', fontStyle: 'italic' }}>
                                Details: {err.details}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.results && result.results.length > 0 && (
                    <details style={{ marginTop: '15px' }}>
                      <summary style={{ cursor: 'pointer', color: '#00ffff', fontSize: '0.9rem', textDecoration: 'underline' }}>
                        View Sample Results ({result.results.length})
                      </summary>
                      <pre style={{
                        marginTop: '10px',
                        padding: '15px',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        overflow: 'auto',
                        maxHeight: '300px',
                        color: '#00ff00',
                      }}>
                        {JSON.stringify(result.results, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            }

            if (isScrapeResult(result)) {
              const scraper = SCRAPERS.find(s => s.id === key);
              return (
                <div key={key} style={{
                  padding: '25px',
                  backgroundColor: 'rgba(0, 255, 255, 0.05)',
                  border: '2px solid #00ffff',
                  borderRadius: '8px',
                }}>
                  <h3 style={{ fontSize: '1.5rem', color: '#00ffff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {scraper?.icon} {scraper?.name || key.toUpperCase()} Results
                    {result.totalScraped > 0 ? ' ✅' : ' ⚠️'}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                    <div style={{ padding: '15px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff00' }}>{result.totalScraped}</div>
                      <div style={{ fontSize: '0.8rem', color: '#a0a0ff' }}>Scraped</div>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff00' }}>{result.inserted}</div>
                      <div style={{ fontSize: '0.8rem', color: '#a0a0ff' }}>Inserted</div>
                    </div>
                    {result.imageStats && (
                      <>
                        <div style={{ padding: '15px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff00' }}>{result.imageStats.withImages}</div>
                          <div style={{ fontSize: '0.8rem', color: '#a0a0ff' }}>With Images</div>
                        </div>
                        <div style={{ padding: '15px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff00' }}>{result.imageStats.avgImagesPerProperty}</div>
                          <div style={{ fontSize: '0.8rem', color: '#a0a0ff' }}>Avg Images</div>
                        </div>
                      </>
                    )}
                    {result.poolCount !== undefined && (
                      <div style={{ padding: '15px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff00' }}>{result.poolCount}</div>
                        <div style={{ fontSize: '0.8rem', color: '#a0a0ff' }}>🏊 With Pool</div>
                      </div>
                    )}
                  </div>
                  <details style={{ marginTop: '15px' }}>
                    <summary style={{ cursor: 'pointer', color: '#00ffff', fontSize: '0.9rem', textDecoration: 'underline' }}>
                      View Full Response
                    </summary>
                    <pre style={{
                      marginTop: '10px',
                      padding: '15px',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: '300px',
                      color: '#00ff00',
                    }}>
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              );
            }

            return null;
          })}
        </div>
      </main>
    </div>
  );
}
