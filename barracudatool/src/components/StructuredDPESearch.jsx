'use client';

import React, { useState } from 'react';
import { StructuredDPESearchService } from '../services/structuredDpeSearchService';

export default function StructuredDPESearch() {
  const [address, setAddress] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    try {
      // Try structured search first
      let searchResult = await StructuredDPESearchService.hierarchicalSearch(address);
      
      // If no results, try fallback search
      if (searchResult.success && searchResult.total_found === 0) {
        console.log('No results with structured search, trying fallback...');
        const fallbackResult = await StructuredDPESearchService.fallbackSearch(address);
        if (fallbackResult.success) {
          searchResult = {
            ...searchResult,
            ...fallbackResult,
            message: `${searchResult.message}. ${fallbackResult.message}`
          };
        }
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
    <div style={{ 
      padding: '20px', 
      maxWidth: '1400px', 
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      <h1>🎯 Structured DPE Search - No Duplicates</h1>
      
      <div style={{ 
        backgroundColor: '#d1ecf1',
        border: '1px solid #bee5eb',
        padding: '15px',
        borderRadius: '6px',
        marginBottom: '20px'
      }}>
        <strong>🧠 Smart Logic:</strong> Department → Postal Code → City → Street → House Number → Remove Duplicates
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
              🏠 Address (Structured Search):
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
              {loading ? '🔍 Searching...' : '🎯 Structured Search'}
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
              <div style={{ 
                backgroundColor: results.total_found > 0 ? '#d4edda' : '#fff3cd', 
                color: results.total_found > 0 ? '#155724' : '#856404', 
                padding: '15px', 
                borderRadius: '6px',
                marginBottom: '20px',
                border: `1px solid ${results.total_found > 0 ? '#c3e6cb' : '#ffeaa7'}`
              }}>
                <strong>
                  {results.total_found > 0 ? '✅ STRUCTURED SEARCH SUCCESS' : '⚠️ NO EXACT MATCHES'}
                </strong>
                <div>{results.message}</div>
                {results.filters_applied && (
                  <div style={{ fontSize: '14px', marginTop: '5px' }}>
                    Applied filters: {JSON.stringify(results.filters_applied, null, 2)}
                  </div>
                )}
              </div>

              {results.results && results.results.length > 0 && (
                <div>
                  <h2>📊 Unique DPE Records ({results.results.length})</h2>
                  <div style={{ 
                    display: 'grid', 
                    gap: '20px',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))'
                  }}>
                    {results.results.map((item, index) => (
                      <div 
                        key={`${item['N°DPE']}-${index}`}
                        style={{
                          border: item._exactness_score >= 90 ? '2px solid #28a745' : '1px solid #ddd',
                          borderRadius: '10px',
                          padding: '20px',
                          backgroundColor: item._exactness_score >= 90 ? '#f8fff8' : '#fff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ marginBottom: '15px' }}>
                          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
                            🏠 {item['Adresse_brute'] || item['Adresse_(BAN)'] || 'Address not available'}
                          </h4>
                          <div style={{ color: '#666', fontSize: '14px' }}>
                            📮 {item['Code_postal_(BAN)']} {item['Nom__commune_(BAN)']}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
                            🎯 Exactness: {item._exactness_score}/100 | 🆔 {item['N°DPE']}
                          </div>
                          {item['Date_établissement_DPE'] && (
                            <div style={{ color: '#666', fontSize: '11px' }}>
                              📅 Established: {new Date(item['Date_établissement_DPE']).toLocaleDateString()}
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
                          {item['Type_bâtiment'] && (
                            <div>🏢 <strong>Type:</strong> {item['Type_bâtiment']}</div>
                          )}
                          {item['Coût_total_5_usages'] && (
                            <div>💰 <strong>Annual Cost:</strong> {Math.round(item['Coût_total_5_usages'])}€</div>
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
