'use client';

import { useState } from 'react';

export default function TestScraper() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; scraped: number; inserted: number; updated: number; errors: number; properties: unknown[] } | null>(null);


  const testScrape = async () => {
    setLoading(true);
    
    // Leboncoin RSS URL for Nice apartments
    const searchUrl = 'https://www.leboncoin.fr/recherche?category=9&locations=Nice_06000&real_estate_type=1';
    
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchUrl, source: 'leboncoin' }),
    });
    
    const data = await response.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0d21] p-8 text-white">
      <h1 className="text-2xl font-bold mb-4">Scraper Test</h1>
      
      <button
        onClick={testScrape}
        disabled={loading}
        className="px-6 py-3 bg-[#ff00ff] rounded font-bold hover:bg-[#ff00ff]/80"
      >
        {loading ? 'Scraping...' : 'Test Scrape Leboncoin'}
      </button>

      {result && (
        <div className="mt-6 bg-white/10 p-4 rounded">
          <pre className="text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
