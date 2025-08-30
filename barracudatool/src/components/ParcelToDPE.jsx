'use client';

import React, { useState } from 'react';
import { ParcelToDPEService } from '../services/parcelToDpeService';

export default function ParcelToDPE() {
  const [parcelId, setParcelId] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    const data = await ParcelToDPEService.getDPEForParcel(parcelId);
    setResults(data);
    setLoading(false);
  };

  const formatEnergyClass = (energyClass) => {
    const colors = {
      'A': '#00a651', 'B': '#4cb847', 'C': '#f4e300', 'D': '#f0c61b',
      'E': '#ee8700', 'F': '#e2001a', 'G': '#8b0000'
    };
    return (
      <span style={{ 
        backgroundColor: colors[energyClass] || '#ccc',
        color: ['A', 'B', 'C'].includes(energyClass) ? 'white' : 'black',
        padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold'
      }}>
        {energyClass || 'N/A'}
      </span>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <h1>🆔 Parcel ID → DPE Data (FIXED)</h1>
      
      <div style={{ backgroundColor: '#d1ecf1', border: '1px solid #bee5eb', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
        <strong>⚡ Fixed Logic:</strong> Parcel ID → Cadastral Info → Location-based DPE Search → Filtered Results
        <br />
        <small>Now works without coordinates - uses commune name and department for DPE search</small>
      </div>
      
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <form onSubmit={handleSearch}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              📍 Cadastral Parcel ID:
            </label>
            <input
              type="text"
              value={parcelId}
              onChange={(e) => setParcelId(e.target.value.toUpperCase())}
              placeholder="e.g., 24037000DM0316"
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                fontSize: '16px',
                fontFamily: 'monospace'
              }}
              required
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Format: DEPARTMENT(2) + MUNICIPALITY(3) + SECTION(3) + PARCEL(4)
            </small>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: loading ? '#6c757d' : '#dc3545',
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Getting Data...' : 'Get DPE Data'}
            </button>

            <button
              type="button"
              onClick={() => setParcelId('24037000DM0316')}
              style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Test Bergerac
            </button>

            <button
              type="button"
              onClick={() => setParcelId('87108000AC0123')}
              style={{ padding: '8px 16px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Test Nouic
            </button>
          </div>
        </form>
      </div>

      {results && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          {results.success ? (
            <div>
              {/* Success Header */}
              <div style={{ 
                backgroundColor: '#d4edda', 
                color: '#155724', 
                padding: '15px', 
                borderRadius: '6px',
                marginBottom: '20px',
                border: '1px solid #c3e6cb'
              }}>
                <strong>✅ PARCEL FOUND</strong>
                <div>{results.message}</div>
              </div>

              {/* Parcel Information */}
              {results.parcel_info && (
                <div style={{ marginBottom: '30px' }}>
                  <h2>🗺️ Cadastral Parcel Information</h2>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '15px',
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '6px'
                  }}>
                    <div><strong>🆔 Parcel ID:</strong> <code>{results.parcel_info.id}</code></div>
                    <div><strong>🏘️ Commune:</strong> {results.parcel_info.commune_name} ({results.parcel_info.commune})</div>
                    <div><strong>📍 Section:</strong> {results.parcel_info.section}</div>
                    <div><strong>🔢 Number:</strong> {results.parcel_info.numero}</div>
                    <div><strong>🗾 Department:</strong> {results.parcel_info.departement}</div>
                    {results.parcel_info.contenance && (
                      <div><strong>📐 Land Area:</strong> {results.parcel_info.contenance} m²</div>
                    )}
                  </div>
                </div>
              )}

              {/* DPE Records */}
              {results.dpe_records && results.dpe_records.length > 0 ? (
                <div style={{ marginBottom: '30px' }}>
                  <h2>⚡ DPE Certificates Found ({results.dpe_records.length})</h2>
                  <div style={{ 
                    display: 'grid', 
                    gap: '15px',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))'
                  }}>
                    {results.dpe_records.map((dpe, index) => (
                      <div 
                        key={index}
                        style={{
                          border: dpe.is_live ? '2px solid #28a745' : '1px solid #ddd',
                          borderRadius: '8px',
                          padding: '15px',
                          backgroundColor: dpe.is_live ? '#f8fff8' : '#fff'
                        }}
                      >
                        <div style={{ marginBottom: '10px' }}>
                          <h4 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '16px' }}>
                            🆔 {dpe.id}
                            {dpe.is_live && <span style={{ color: '#28a745', marginLeft: '10px' }}>✅ ACTIVE</span>}
                          </h4>
                          <div style={{ color: '#666', fontSize: '12px' }}>
                            📍 {dpe.address}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>
                            📮 {dpe.postal_code} {dpe.commune}
                          </div>
                        </div>
                        
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr', 
                          gap: '10px', 
                          marginBottom: '10px' 
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '3px', fontSize: '12px' }}>⚡ Energy</div>
                            {formatEnergyClass(dpe.energy_class)}
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '3px', fontSize: '12px' }}>🌱 GHG</div>
                            {formatEnergyClass(dpe.ghg_class)}
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                          {dpe.surface && <div>📐 <strong>Surface:</strong> {dpe.surface} m²</div>}
                          {dpe.construction_year && <div>📅 <strong>Built:</strong> {dpe.construction_year}</div>}
                          {dpe.building_type && <div>🏢 <strong>Type:</strong> {dpe.building_type}</div>}
                          {dpe.annual_cost && <div>💰 <strong>Annual Cost:</strong> {Math.round(dpe.annual_cost)}€</div>}
                          {dpe.establishment_date && (
                            <div>📋 <strong>DPE Date:</strong> {new Date(dpe.establishment_date).toLocaleDateString()}</div>
                          )}
                          {dpe.expiry_date && (
                            <div style={{ color: dpe.is_live ? '#28a745' : '#dc3545' }}>
                              📅 <strong>Expires:</strong> {new Date(dpe.expiry_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '30px' }}>
                  <h2>⚡ DPE Certificates</h2>
                  <div style={{ 
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    padding: '15px',
                    borderRadius: '6px',
                    color: '#856404'
                  }}>
                    <strong>No DPE certificates found for this parcel location.</strong>
                    <div style={{ marginTop: '10px' }}>
                      Possible reasons:
                      <ul>
                        <li>No properties on this parcel have DPE certificates</li>
                        <li>The parcel may be undeveloped land</li>
                        <li>Properties may be exempt from DPE requirements</li>
                      </ul>
                    </div>
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
              <strong>❌ LOOKUP FAILED</strong>
              <div>{results.error}</div>
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <strong>Tips:</strong>
                <ul>
                  <li>Check the cadastral ID format (e.g., 24037000DM0316)</li>
                  <li>Ensure the parcel exists in the French cadastral database</li>
                  <li>Try the test buttons for known working IDs</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
