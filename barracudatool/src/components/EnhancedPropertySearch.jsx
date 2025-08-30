'use client';

import React, { useState } from 'react';
import { EnhancedPropertyService } from '../services/enhancedPropertyService';

export default function EnhancedPropertySearch() {
  const [address, setAddress] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    try {
      const propertyData = await EnhancedPropertyService.getPropertyIntelligence(address);
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
      <h1>🏠 Enhanced Property Intelligence - Cadastre.com Style</h1>
      
      <div style={{ 
        backgroundColor: '#d1ecf1',
        border: '1px solid #bee5eb',
        padding: '15px',
        borderRadius: '6px',
        marginBottom: '20px'
      }}>
        <strong>🚀 Enhanced Logic:</strong> Address → Coordinates → Cadastral Parcel → Complete Property Intelligence (DPE + Building + Planning)
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
              🏠 Address (Complete Property Intelligence):
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 18 Avenue Beauséjour, 87330 Nouic"
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
              {loading ? '🔍 Analyzing...' : '🏠 Get Property Intelligence'}
            </button>

            <button
              type="button"
              onClick={() => setAddress('18 Avenue Beauséjour, 87330 Nouic')}
              style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
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
              {/* Property Overview */}
              <div style={{ 
                backgroundColor: '#d4edda', 
                color: '#155724', 
                padding: '15px', 
                borderRadius: '6px',
                marginBottom: '20px',
                border: '1px solid #c3e6cb'
              }}>
                <strong>✅ PROPERTY INTELLIGENCE FOUND</strong>
                <div>{results.message}</div>
                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                  Parcel ID: <code>{results.parcel_id}</code> | Coordinates: {results.coordinates.lat.toFixed(6)}, {results.coordinates.lon.toFixed(6)}
                </div>
              </div>

              {/* Property Details */}
              <div style={{ marginBottom: '30px' }}>
                <h2>🏠 Property Information</h2>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '15px',
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '6px'
                }}>
                  <div><strong>📍 Address:</strong> {results.coordinates.label}</div>
                  <div><strong>🆔 Parcel ID:</strong> {results.properties.id}</div>
                  <div><strong>📮 Postal Code:</strong> {results.coordinates.postcode}</div>
                  <div><strong>🏘️ City:</strong> {results.coordinates.city}</div>
                  {results.properties.fieldArea && (
                    <div><strong>📐 Land Area:</strong> {results.properties.fieldArea} m²</div>
                  )}
                </div>
              </div>

              {/* DPE Records */}
              {results.dpe_list && results.dpe_list.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h2>⚡ Energy Performance Certificates ({results.dpe_list.length})</h2>
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
                          <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                            🆔 {dpe.id} {dpe.is_live && <span style={{ color: '#28a745' }}>✅ ACTIVE</span>}
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
                          {dpe.annual_cost && <div>💰 <strong>Annual Cost:</strong> {Math.round(dpe.annual_cost)}€</div>}
                          {dpe.establishment_date && (
                            <div>🔍 <strong>DPE Date:</strong> {new Date(dpe.establishment_date).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Building Information */}
              {results.buildings && results.buildings.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h2>🏢 Building Information ({results.buildings.length} buildings)</h2>
                  <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px' }}>
                    <div>Buildings found in cadastral database</div>
                  </div>
                </div>
              )}

              {/* Planning Information */}
              {results.plu && (
                <div style={{ marginBottom: '30px' }}>
                  <h2>🏛️ Urban Planning Zone</h2>
                  <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px' }}>
                    <div><strong>Zone:</strong> {results.plu.name}</div>
                    <div><strong>Description:</strong> {results.plu.description}</div>
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
              <strong>❌ Property Intelligence Failed</strong>
              <div>{results.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
