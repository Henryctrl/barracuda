//src/app/test-scraper/page.tsx

'use client';

import { useState } from 'react';

export default function TestScraper() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ 
    success: boolean; 
    scraped: number; 
    inserted: number; 
    updated: number; 
    errors: number; 
    properties: unknown[] 
  } | null>(null);

  const testScrapeCadImmo = async () => {
    setLoading(true);
    
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        searchUrl: 'https://cad-immo.com/fr/ventes', 
        source: 'cadimmo' 
      }),
    });
    
    const data = await response.json();
    setResult(data);
    setLoading(false);
  };

  const testScrapeLeboncoin = async () => {
    setLoading(true);
    
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        searchUrl: 'https://www.leboncoin.fr/recherche?category=9&locations=Nice_06000&real_estate_type=1', 
        source: 'leboncoin' 
      }),
    });
    
    const data = await response.json();
    setResult(data);
    setLoading(false);
  };

  const testMatching = async () => {
  setLoading(true);
  
  const response = await fetch('/api/match-properties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}), // Empty = match all clients
  });
  
  const data = await response.json();
  setResult(data);
  setLoading(false);
};


  return (
    <div className="min-h-screen bg-[#0d0d21] p-8 text-white">
      <h1 className="text-2xl font-bold mb-4">🔍 Property Scraper Test Dashboard</h1>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={testScrapeCadImmo}
          disabled={loading}
          className="px-6 py-3 bg-[#00ffff] text-[#0d0d21] rounded font-bold hover:bg-[#00ffff]/80 disabled:opacity-50"
        >
          {loading ? 'Scraping...' : '🏠 Test CAD-IMMO (Bergerac)'}
        </button>

        <button
          onClick={testScrapeLeboncoin}
          disabled={loading}
          className="px-6 py-3 bg-[#ff00ff] rounded font-bold hover:bg-[#ff00ff]/80 disabled:opacity-50"
        >
          {loading ? 'Scraping...' : '🌊 Test Leboncoin (Nice)'}
        </button>
      </div>

      {loading && (
        <div className="bg-blue-500/20 border border-blue-500 p-4 rounded mb-4">
          <p className="text-blue-300">⏳ Scraping in progress... This may take 10-30 seconds</p>
        </div>
      )}

      <button
  onClick={testMatching}
  disabled={loading}
  className="px-6 py-3 bg-[#ff00ff] rounded font-bold hover:bg-[#ff00ff]/80 disabled:opacity-50"
>
  {loading ? 'Matching...' : '🎯 Run Property Matching'}
</button>


      {result && (
        <div className="space-y-4">
          <div className={`p-4 rounded ${result.success ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'}`}>
            <h2 className="font-bold text-lg mb-2">
              {result.success ? '✅ Scrape Successful!' : '❌ Scrape Failed'}
            </h2>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Found</p>
                <p className="text-2xl font-bold text-cyan-400">{result.scraped}</p>
              </div>
              <div>
                <p className="text-gray-400">Inserted</p>
                <p className="text-2xl font-bold text-green-400">{result.inserted}</p>
              </div>
              <div>
                <p className="text-gray-400">Updated</p>
                <p className="text-2xl font-bold text-yellow-400">{result.updated}</p>
              </div>
              <div>
                <p className="text-gray-400">Errors</p>
                <p className="text-2xl font-bold text-red-400">{result.errors}</p>
              </div>
            </div>
          </div>

          

          <div className="bg-white/10 p-4 rounded">
            <h3 className="font-bold mb-2">📦 Sample Properties (first 5):</h3>
            <pre className="text-xs overflow-auto max-h-96">
              {JSON.stringify(result.properties, null, 2)}
            </pre>
          </div>

          <div className="bg-white/10 p-4 rounded">
            <h3 className="font-bold mb-2">📊 Full Response:</h3>
            <pre className="text-xs overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
