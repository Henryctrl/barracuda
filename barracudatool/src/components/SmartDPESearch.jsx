'use client';

import React, { useState } from 'react';
import { SmartDPESearchService } from '../services/smartDpeSearchService';

export default function SmartDPESearch() {
  const [address, setAddress] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deepSearchEnabled, setDeepSearchEnabled] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    try {
      let searchResult;
      
      if (deepSearchEnabled) {
        console.log('Running deep search...');
        const deepResult = await SmartDPESearchService.deepSearch(address, 10);
        if (deepResult.success) {
          // Process deep results with smart filtering
          const fakeApiResponse = {
            results: deepResult.results,
            total: deepResult.total_searched
          };
          
          // Apply smart filtering to deep results
          searchResult = await SmartDPESearchService.smartAddressSearch(address, deepResult.results.length);
        }
      } else {
        searchResult = await SmartDPESearchService.smartAddressSearch(address, 100);
      }
      
      setResults(searchResult);
      
    } catch (error) {
      setResults({
        success: false,
        error: error.message,
        results: {}
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

  const renderResultGroup = (title, results, bgColor) => {
    if (!results || results.length === 0) return null;
    
    return (
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ 
          backgroundColor: bgColor, 
          padding: '10px 15px', 
          borderRadius: '6px',
          margin: '0 0 15px 0',
          color: 'white'
        }}>
          {title} ({results.length})
        </h3>
        <div style={{ 
          display: 'grid', 
          gap: '15px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))'
        }}>
          {results.map((item, index) => (
            <div 
              key={index}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ marginBottom: '10px' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '16px' }}>
                  🏠 {item['Adresse_brute'] || item['Adresse_(BAN)'] || 'Address not available'}
                </h4>
                <div style={{ color: '#666', fontSize: '12px' }}>
                  📮 {item['Code_postal_(BAN)']} {item['Nom__commune_(BAN)']}
                </div>
                <div style={{ color: '#666', fontSize: '11px', marginTop: '3px' }}>
                  🎯 Exactness: {item._exactness_score}/100 | API Score: {item._original_api_score?.toFixed(1)}
                </div>
                {item['N°DPE'] && (
                  <div style={{ color: '#666', fontSize: '11px' }}>
                    🆔 {item['N°DPE']} | {item['Date_établissement_DPE'] ? new Date(item['Date_établissement_DPE']).toLocaleDateString() : 'N/A'}
                  </div>
                )}
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '10px', 
                marginBottom: '10px' 
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px', fontSize: '12px' }}>⚡ Energy</div>
                  {formatEnergyClass(item['Etiquette_DPE'])}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px', fontSize: '12px' }}>🌱 GHG</div>
                  {formatEnergyClass(item['Etiquette_GES'])}
                </div>
              </div>

              <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                {item['Surface_habitable_logement'] && (
                  <div>📐 {item['Surface_habitable_logement']} m²</div>
                )}
                {item['Coût_total_5_usages'] && (
                  <div>💰 {Math.round(item['Coût_total_5_usages'])}€/year</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
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
      <h1>🎯 Smart DPE Search - Exact Match Priority</h1>
      
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
              🏠 Address Search (Smart Ranking):
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
          
          <div style={{ marginBottom: '15px' }}>
            <label>
              <input
                type="checkbox"
                checked={deepSearchEnabled}
                onChange={(e) => setDeepSearchEnabled(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              🔍 Deep Search (searches up to 1000 records - slower but more thorough)
            </label>
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
              {loading ? '🔍 Searching...' : '🎯 Smart Search'}
            </button>

            <button
              type="button"
              onClick={() => setAddress('18 Avenue Beauséjour, 87330 Nouic')}
              style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Test Nouic
            </button>

            <button
              type="button"
              onClick={() => setAddress('1042 Route de Tirecul, 24240 Monbazillac')}
              style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Test Missing
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
                backgroundColor: '#d4edda', 
                color: '#155724', 
                padding: '15px', 
                borderRadius: '6px',
                marginBottom: '20px',
                border: '1px solid #c3e6cb'
              }}>
                <strong>✅ SMART SEARCH COMPLETE</strong>
                <div>{results.message}</div>
                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                  Analyzed {results.total_api_results} records from {results.total_available?.toLocaleString()} total available
                </div>
              </div>

              {renderResultGroup('🎯 Exact Matches', results.results?.exact_matches, '#28a745')}
              {renderResultGroup('🔍 Close Matches', results.results?.close_matches, '#ffc107')}
              {renderResultGroup('📍 Partial Matches', results.results?.partial_matches, '#fd7e14')}
              {renderResultGroup('🌐 Distant Matches', results.results?.distant_matches, '#6c757d')}
              
              {(!results.results?.exact_matches?.length && 
                !results.results?.close_matches?.length && 
                !results.results?.partial_matches?.length) && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  color: '#666' 
                }}>
                  No meaningful matches found. Try the deep search option or check your address format.
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
