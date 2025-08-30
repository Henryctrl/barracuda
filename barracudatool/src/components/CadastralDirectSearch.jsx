'use client';

import React, { useState } from 'react';
import { CadastralDirectService } from '../services/cadastralDirectService';

export default function CadastralDirectSearch() {
  const [cadastralId, setCadastralId] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    try {
      const propertyData = await CadastralDirectService.getPropertyByID(cadastralId);
      setResults(propertyData);
      
    } catch (error) {
      setResults({
        success: false,
        error: error.message
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
    <div style={{ 
      padding: '20px', 
      maxWidth: '1400px', 
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      <h1>🆔 Direct Cadastral ID Lookup</h1>
      
      <div style={{ 
        backgroundColor: '#d1ecf1',
        border: '1px solid #bee5eb',
        padding: '15px',
        borderRadius: '6px',
        marginBottom: '20px'
      }}>
        <strong>⚡ Direct Access:</strong> Enter cadastral parcel ID → Get complete property data (DPE + Building + Cadastral info)
        <br />
        <small><strong>Format:</strong> Department + Municipality + Section + Parcel (e.g., 24037000DM0316)</small>
      </div>
      
      <div style={{ 
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <form onSubmit={handleSearch}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              🆔 Cadastral Parcel ID:
            </label>
            <input
              type="text"
              value={cadastralId}
              onChange={(e) => setCadastralId(e.target.value.toUpperCase())}
              placeholder="e.g., 24037000DM0316"
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                fontSize: '16px',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
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
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? '🔍 Looking up...' : '🆔 Get Property Data'}
            </button>

            <button
              type="button"
              onClick={() => setCadastralId('24037000DM0316')}
              style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Test Bergerac
            </button>

            <button
              type="button"
              onClick={() => setCadastralId('87108000AC0123')}
              style={{ padding: '8px 16px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Test Nouic
            </button>
          </div>
        </form>
      </div>

      {results && (
        <div style={{ 
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
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
                <strong>✅ CADASTRAL PARCEL FOUND</strong>
                <div>{results.message}</div>
              </div>

              {/* Cadastral Information */}
              <div style={{ marginBottom: '30px' }}>
                <h2>🗺️ Cadastral Information</h2>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '15px',
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '6px'
                }}>
                  <div><strong>🆔 Parcel ID:</strong> <code>{results.properties.id}</code></div>
                  <div><strong>🏘️ Municipality:</strong> {results.properties.commune}</div>
                  <div><strong>📍 Section:</strong> {results.properties.section}</div>
                  <div><strong>🔢 Number:</strong> {results.properties.numero}</div>
                  <div><strong>🗾 Department:</strong> {results.properties.departement}</div>
                  {results.properties.fieldArea && (
                    <div><strong>📐 Land Area:</strong> {results.properties.fieldArea} m²</div>
                  )}
                  <div><strong>📍 Coordinates:</strong> [{results.properties.center.coordinates[1].toFixed(6)}, {results.properties.center.coordinates[0].toFixed(6)}]</div>
                </div>
              </div>

              {/* DPE Records */}
              {results.dpe_list && results.dpe_list.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h2>⚡ DPE Certificates Found ({results.dpe_list.length})</h2>
                  <div style={{ 
                    display: 'grid', 
                    gap: '15px',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))'
                  }}>
                    {results.dpe_list.map((dpe, index) => (
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
              )}

              {/* No DPE Found */}
              {(!results.dpe_list || results.dpe_list.length === 0) && (
                <div style={{ marginBottom: '30px' }}>
                  <h2>⚡ DPE Certificates</h2>
                  <div style={{ 
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    padding: '15px',
                    borderRadius: '6px',
                    color: '#856404'
                  }}>
                    No DPE certificates found near this cadastral parcel. This could mean:
                    <ul>
                      <li>No DPE has been issued for properties on this parcel</li>
                      <li>The DPE records don't have precise enough coordinates</li>
                      <li>The parcel may be undeveloped land</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Buildings */}
              {results.buildings && results.buildings.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h2>🏢 Buildings ({results.buildings.length})</h2>
                  <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px' }}>
                    <div>Building footprints found in cadastral database</div>
                    {results.buildings.map((building, index) => (
                      <div key={index} style={{ marginTop: '10px' }}>
                        <strong>Building {index + 1}:</strong> 
                        {building.area && <span> Area: {Math.round(building.area)} m²</span>}
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
              <strong>❌ Cadastral Lookup Failed</strong>
              <div>{results.error}</div>
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <strong>Tips:</strong>
                <ul>
                  <li>Check the cadastral ID format (e.g., 24037000DM0316)</li>
                  <li>Make sure the parcel exists in the French cadastral database</li>
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
