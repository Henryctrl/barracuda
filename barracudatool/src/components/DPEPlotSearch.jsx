'use client';

import React, { useState } from 'react';
import { DPESearchService } from '../services/dpeSearchService';

export default function DPEPlotSearch() {
  const [searchMethod, setSearchMethod] = useState('address');
  const [searchParams, setSearchParams] = useState({
    address: '',
    lat: '',
    lon: '',
    radius: 50,
    postalCode: '',
    houseNumber: '',
    street: '',
    cadastralRef: ''
  });
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    try {
      let searchResult;
      
      switch (searchMethod) {
        case 'address':
          searchResult = await DPESearchService.searchByExactAddress(
            searchParams.address, 10
          );
          break;
          
        case 'coordinates':
          searchResult = await DPESearchService.searchByCoordinates(
            parseFloat(searchParams.lat),
            parseFloat(searchParams.lon),
            parseInt(searchParams.radius)
          );
          break;
          
        case 'cadastral':
          searchResult = await DPESearchService.searchByCadastralRef(
            searchParams.cadastralRef
          );
          break;
          
        case 'precise':
          searchResult = await DPESearchService.preciseSearch({
            postalCode: searchParams.postalCode,
            houseNumber: searchParams.houseNumber,
            street: searchParams.street,
            lat: searchParams.lat ? parseFloat(searchParams.lat) : null,
            lon: searchParams.lon ? parseFloat(searchParams.lon) : null
          });
          break;
          
        default:
          throw new Error('Invalid search method');
      }
      
      setResults(searchResult);
      
    } catch (error) {
      setResults({
        success: false,
        error: error.message,
        results: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatEnergyClass = (energyClass) => {
    const colors = {
      'A': '#00a651', 'B': '#4cb847', 'C': '#f4e300', 'D': '#f0c61b',
      'E': '#ee8700', 'F': '#e2001a', 'G': '#8b0000'
    };
    return (
      <span 
        style={{ 
          backgroundColor: colors[energyClass] || '#ccc',
          color: ['A', 'B', 'C'].includes(energyClass) ? 'white' : 'black',
          padding: '4px 8px',
          borderRadius: '4px',
          fontWeight: 'bold',
          fontSize: '14px'
        }}
      >
        {energyClass}
      </span>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🎯 Precise DPE Plot Search - REAL DATA ONLY</h1>
      
      {/* Search Method Selection */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Select Search Method:</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <label>
            <input
              type="radio"
              value="address"
              checked={searchMethod === 'address'}
              onChange={(e) => setSearchMethod(e.target.value)}
            />
            🏠 Full Address Search
          </label>
          <label>
            <input
              type="radio"
              value="coordinates"
              checked={searchMethod === 'coordinates'}
              onChange={(e) => setSearchMethod(e.target.value)}
            />
            📍 GPS Coordinates
          </label>
          <label>
            <input
              type="radio"
              value="cadastral"
              checked={searchMethod === 'cadastral'}
              onChange={(e) => setSearchMethod(e.target.value)}
            />
            📋 Cadastral Reference
          </label>
          <label>
            <input
              type="radio"
              value="precise"
              checked={searchMethod === 'precise'}
              onChange={(e) => setSearchMethod(e.target.value)}
            />
            🎯 Precise Multi-Field
          </label>
        </div>
      </div>

      {/* Search Forms */}
      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        
        {/* Address Search */}
        {searchMethod === 'address' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              🏠 Complete Address:
            </label>
            <input
              type="text"
              value={searchParams.address}
              onChange={(e) => setSearchParams(prev => ({ ...prev, address: e.target.value }))}
              placeholder="e.g., 45 Rue des Amandiers, 75020 Paris"
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                fontSize: '16px'
              }}
              required
            />
            <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
              Use format: [Number] [Street Name], [Postal Code] [City]
            </small>
          </div>
        )}

        {/* Coordinates Search */}
        {searchMethod === 'coordinates' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                📍 Latitude:
              </label>
              <input
                type="number"
                step="any"
                value={searchParams.lat}
                onChange={(e) => setSearchParams(prev => ({ ...prev, lat: e.target.value }))}
                placeholder="48.86471"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                📍 Longitude:
              </label>
              <input
                type="number"
                step="any"
                value={searchParams.lon}
                onChange={(e) => setSearchParams(prev => ({ ...prev, lon: e.target.value }))}
                placeholder="2.38953"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                🎯 Radius (m):
              </label>
              <input
                type="number"
                value={searchParams.radius}
                onChange={(e) => setSearchParams(prev => ({ ...prev, radius: e.target.value }))}
                placeholder="50"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
              />
            </div>
          </div>
        )}

        {/* Cadastral Search */}
        {searchMethod === 'cadastral' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              📋 Cadastral Reference (BAN ID):
            </label>
            <input
              type="text"
              value={searchParams.cadastralRef}
              onChange={(e) => setSearchParams(prev => ({ ...prev, cadastralRef: e.target.value }))}
              placeholder="e.g., 75120_0258_00045"
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #ccc', 
                borderRadius: '4px' 
              }}
              required
            />
            <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
              BAN identifier format: [INSEE]_[Section]_[Number]
            </small>
          </div>
        )}

        {/* Precise Search */}
        {searchMethod === 'precise' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                🏠 House Number:
              </label>
              <input
                type="text"
                value={searchParams.houseNumber}
                onChange={(e) => setSearchParams(prev => ({ ...prev, houseNumber: e.target.value }))}
                placeholder="45"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                🛣️ Street Name:
              </label>
              <input
                type="text"
                value={searchParams.street}
                onChange={(e) => setSearchParams(prev => ({ ...prev, street: e.target.value }))}
                placeholder="Rue des Amandiers"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                📮 Postal Code:
              </label>
              <input
                type="text"
                value={searchParams.postalCode}
                onChange={(e) => setSearchParams(prev => ({ ...prev, postalCode: e.target.value }))}
                placeholder="75020"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px' 
                }}
                required
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: loading ? '#6c757d' : '#007cba',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? '🔍 Searching REAL Data...' : '🎯 Search DPE Records'}
        </button>
      </form>

      {/* Results Display */}
      {results && (
        <div style={{ marginTop: '20px' }}>
          {results.success ? (
            <div>
              <div style={{ 
                backgroundColor: results.results.length > 0 ? '#d4edda' : '#fff3cd', 
                color: results.results.length > 0 ? '#155724' : '#856404', 
                padding: '15px', 
                borderRadius: '6px',
                marginBottom: '20px',
                border: `1px solid ${results.results.length > 0 ? '#c3e6cb' : '#ffeaa7'}`
              }}>
                <strong>
                  {results.results.length > 0 ? '✅ SUCCESS' : '⚠️ NO RESULTS'}
                </strong>
                <div>{results.message}</div>
              </div>

              {results.results.length > 0 && (
                <div>
                  <h2>📊 DPE Records Found ({results.results.length})</h2>
                  <div style={{ 
                    display: 'grid', 
                    gap: '20px',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))'
                  }}>
                    {results.results.map((item, index) => (
                      <div 
                        key={index}
                        style={{
                          border: '1px solid #ddd',
                          borderRadius: '10px',
                          padding: '20px',
                          backgroundColor: '#fff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ marginBottom: '15px' }}>
                          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                            🏠 {item['Adresse_brute'] || item['Adresse_(BAN)'] || 'Address not available'}
                          </h3>
                          <div style={{ color: '#666', fontSize: '14px' }}>
                            📮 {item['Code_postal_(BAN)']} {item['Nom__commune_(BAN)']}
                          </div>
                          {item['N°DPE'] && (
                            <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
                              🆔 DPE: {item['N°DPE']}
                            </div>
                          )}
                        </div>
                        
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr', 
                          gap: '15px', 
                          marginBottom: '15px' 
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>⚡ Energy Class</div>
                            {formatEnergyClass(item['Etiquette_DPE'])}
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>🌱 GHG Class</div>
                            {formatEnergyClass(item['Etiquette_GES'])}
                          </div>
                        </div>

                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                          {item['Surface_habitable_logement'] && (
                            <div>📐 <strong>Surface:</strong> {item['Surface_habitable_logement']} m²</div>
                          )}
                          {item['Année_construction'] && (
                            <div>📅 <strong>Built:</strong> {item['Année_construction']}</div>
                          )}
                          {item['Date_établissement_DPE'] && (
                            <div>🔍 <strong>DPE Date:</strong> {new Date(item['Date_établissement_DPE']).toLocaleDateString()}</div>
                          )}
                          {item['Type_bâtiment'] && (
                            <div>🏢 <strong>Type:</strong> {item['Type_bâtiment']}</div>
                          )}
                          {item['Coût_total_5_usages'] && (
                            <div>💰 <strong>Annual Cost:</strong> {Math.round(item['Coût_total_5_usages'])}€</div>
                          )}
                          {item['_geopoint'] && (
                            <div>📍 <strong>Coordinates:</strong> {item['_geopoint']}</div>
                          )}
                          {item['Identifiant__BAN'] && (
                            <div>📋 <strong>BAN ID:</strong> {item['Identifiant__BAN']}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              backgroundColor: '#f8d7da', 
              color: '#721c24', 
              padding: '15px', 
              borderRadius: '6px',
              border: '1px solid #f5c6cb'
            }}>
              <strong>❌ Search Failed</strong>
              <div>{results.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
