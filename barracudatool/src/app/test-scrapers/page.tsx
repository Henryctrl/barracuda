'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

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
  message?: string;
};

type PriceUpdateResult = {
  success: boolean;
  message: string;
  stats: {
    checked: number;
    price_changes: number;
  };
  priceChanges: Array<{
    reference: string;
    oldPrice: number;
    newPrice: number;
    change: number;
    percentChange: string;
  }>;
};

type DebugResult = {
  url: string;
  debug: {
    title: unknown;
    price: unknown;
    reference: unknown;
    features: unknown;
    classNames: string[];
    numberedElements: unknown[];
  };
};

// Type guards
function isScrapeResult(result: ScrapeResult | DebugResult | PriceUpdateResult): result is ScrapeResult {
  return 'totalScraped' in result;
}

function isPriceUpdateResult(result: ScrapeResult | DebugResult | PriceUpdateResult): result is PriceUpdateResult {
  return 'priceChanges' in result;
}

export default function TestScrapersPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ScrapeResult | DebugResult | PriceUpdateResult>>({});
  const [error, setError] = useState('');

  const scrapeCadImmo = async () => {
    setLoading('cadimmo');
    setError('');

    try {
      const response = await fetch('https://barracuda-production.up.railway.app/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchUrl: 'https://cad-immo.com/fr/ventes',
          maxPages: 3
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResults(prev => ({ ...prev, cadimmo: data }));
      } else {
        setError('CAD-IMMO: ' + (data.error || 'Failed to scrape'));
      }
    } catch (err) {
      setError('CAD-IMMO Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
    setLoading(null);
  };

  const scrapeEleonor = async () => {
    setLoading('eleonor');
    setError('');

    try {
      const response = await fetch('https://barracuda-production.up.railway.app/scrape-eleonor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchUrl: 'https://www.agence-eleonor.fr/fr/vente'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResults(prev => ({ ...prev, eleonor: data }));
      } else {
        setError('Eleonor: ' + (data.error || 'Failed to scrape'));
      }
    } catch (err) {
      setError('Eleonor Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
    setLoading(null);
  };

  const weeklyPriceUpdate = async () => {
    setLoading('priceupdate');
    setError('');

    try {
      const response = await fetch('https://barracuda-production.up.railway.app/scrape-eleonor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchUrl: 'https://www.agence-eleonor.fr/fr/vente',
          priceUpdateMode: true
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResults(prev => ({ ...prev, priceupdate: data }));
      } else {
        setError('Price Update: ' + (data.error || 'Failed to check prices'));
      }
    } catch (err) {
      setError('Price Update Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
    setLoading(null);
  };

  const debugEleonor = async () => {
    setLoading('debug');
    setError('');

    try {
      const response = await fetch('https://barracuda-production.up.railway.app/debug-eleonor-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://www.agence-eleonor.fr/fr/vente/maison-ancienne-15-pieces-issigeac-24560,VM17325'
        })
      });
      
      const data = await response.json();
      console.log('🔍 DEBUG DATA:', data);
      alert('Debug complete! Check browser console (F12)');
      setResults(prev => ({ ...prev, debug: data }));
    } catch (err) {
      setError('Debug Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
    setLoading(null);
  };

  const scrapeAll = async () => {
    setLoading('all');
    setError('');
    setResults({});

    try {
      const cadResponse = await fetch('https://barracuda-production.up.railway.app/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchUrl: 'https://cad-immo.com/fr/ventes',
          maxPages: 3
        })
      });
      const cadData = await cadResponse.json();
      setResults(prev => ({ ...prev, cadimmo: cadData }));

      const eleoResponse = await fetch('https://barracuda-production.up.railway.app/scrape-eleonor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchUrl: 'https://www.agence-eleonor.fr/fr/vente'
        })
      });
      const eleoData = await eleoResponse.json();
      setResults(prev => ({ ...prev, eleonor: eleoData }));

    } catch (err) {
      setError('Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
    setLoading(null);
  };

  const cadResult = results.cadimmo && isScrapeResult(results.cadimmo) ? results.cadimmo : null;
  const eleonorResult = results.eleonor && isScrapeResult(results.eleonor) ? results.eleonor : null;
  const priceUpdateResult = results.priceupdate && isPriceUpdateResult(results.priceupdate) ? results.priceupdate : null;

  return (
    <div className="min-h-screen bg-[#0d0d21] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-[#00ff00] mb-2">
          🦈 Test Property Scrapers
        </h1>
        <p className="text-gray-400 mb-8">
          Test each agency scraper individually or run all at once
        </p>

        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={scrapeCadImmo}
            disabled={loading !== null}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded text-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-3"
          >
            {loading === 'cadimmo' && <Loader2 className="animate-spin" size={20} />}
            {loading === 'cadimmo' ? 'Scraping CAD-IMMO...' : '🏠 Scrape CAD-IMMO'}
          </button>

          <button
            onClick={scrapeEleonor}
            disabled={loading !== null}
            className="px-6 py-3 bg-purple-600 text-white font-bold rounded text-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-3"
          >
            {loading === 'eleonor' && <Loader2 className="animate-spin" size={20} />}
            {loading === 'eleonor' ? 'Scraping Eleonor...' : '🏡 Scrape Agence Eleonor'}
          </button>

          <button
            onClick={weeklyPriceUpdate}
            disabled={loading !== null}
            className="px-6 py-3 bg-orange-600 text-white font-bold rounded text-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-3"
          >
            {loading === 'priceupdate' && <Loader2 className="animate-spin" size={20} />}
            {loading === 'priceupdate' ? 'Checking Prices...' : '💰 Weekly Price Update'}
          </button>

          <button
            onClick={debugEleonor}
            disabled={loading !== null}
            className="px-6 py-3 bg-yellow-600 text-white font-bold rounded text-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-3"
          >
            {loading === 'debug' && <Loader2 className="animate-spin" size={20} />}
            🔍 Debug Eleonor Property
          </button>

          <button
            onClick={scrapeAll}
            disabled={loading !== null}
            className="px-6 py-3 bg-[#00ff00] text-black font-bold rounded text-lg hover:bg-[#00ff00]/80 disabled:opacity-50 flex items-center gap-3"
          >
            {loading === 'all' && <Loader2 className="animate-spin" size={20} />}
            {loading === 'all' ? 'Scraping All...' : '🚀 Scrape All Agencies'}
          </button>
        </div>

        {error && (
          <div className="mb-8 p-6 bg-red-900/50 border border-red-500 rounded text-white">
            <h2 className="text-xl font-bold mb-2">❌ Error:</h2>
            <p>{error}</p>
          </div>
        )}

        {/* CAD-IMMO Results */}
        {cadResult && (
          <div className="mb-8 p-6 bg-blue-900/30 border border-blue-500 rounded">
            <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center gap-2">
              {cadResult.totalScraped > 0 ? '✅' : '⚠️'} CAD-IMMO Results
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white mb-4">
              <div className="bg-black/30 p-4 rounded">
                <div className="text-2xl font-bold text-[#00ff00]">{cadResult.totalScraped}</div>
                <div className="text-sm text-gray-400">Scraped</div>
              </div>
              <div className="bg-black/30 p-4 rounded">
                <div className="text-2xl font-bold text-[#00ff00]">{cadResult.inserted}</div>
                <div className="text-sm text-gray-400">Inserted</div>
              </div>
              <div className="bg-black/30 p-4 rounded">
                <div className="text-2xl font-bold text-[#00ff00]">{cadResult.imageStats?.withImages || 0}</div>
                <div className="text-sm text-gray-400">With Images</div>
              </div>
              <div className="bg-black/30 p-4 rounded">
                <div className="text-2xl font-bold text-[#00ff00]">{cadResult.imageStats?.avgImagesPerProperty || 0}</div>
                <div className="text-sm text-gray-400">Avg Images</div>
              </div>
            </div>
            
            <details className="mt-4">
              <summary className="cursor-pointer text-[#00ffff] hover:underline">
                View Full Response
              </summary>
              <pre className="mt-4 p-4 bg-black/50 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(cadResult, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Eleonor Results */}
        {eleonorResult && (
          <div className="mb-8 p-6 bg-purple-900/30 border border-purple-500 rounded">
            <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
              {eleonorResult.totalScraped > 0 ? '✅' : '⚠️'} Agence Eleonor Results
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white mb-4">
              <div className="bg-black/30 p-4 rounded">
                <div className="text-2xl font-bold text-[#00ff00]">{eleonorResult.totalScraped}</div>
                <div className="text-sm text-gray-400">Scraped</div>
              </div>
              <div className="bg-black/30 p-4 rounded">
                <div className="text-2xl font-bold text-[#00ff00]">{eleonorResult.inserted || 0}</div>
                <div className="text-sm text-gray-400">Inserted</div>
              </div>
              <div className="bg-black/30 p-4 rounded">
                <div className="text-2xl font-bold text-[#00ff00]">{eleonorResult.imageStats?.withImages || 0}</div>
                <div className="text-sm text-gray-400">With Images</div>
              </div>
              <div className="bg-black/30 p-4 rounded">
                <div className="text-2xl font-bold text-[#00ff00]">{eleonorResult.imageStats?.avgImagesPerProperty || 0}</div>
                <div className="text-sm text-gray-400">Avg Images</div>
              </div>
            </div>
            
            {eleonorResult.totalScraped === 0 && (
              <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-500 rounded text-yellow-200">
                ⚠️ No properties found. The scraper may need debugging.
              </div>
            )}
            
            <details className="mt-4">
              <summary className="cursor-pointer text-[#00ffff] hover:underline">
                View Full Response
              </summary>
              <pre className="mt-4 p-4 bg-black/50 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(eleonorResult, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Price Update Results */}
        {priceUpdateResult && (
          <div className="mb-8 p-6 bg-orange-900/30 border border-orange-500 rounded">
            <h2 className="text-2xl font-bold text-orange-400 mb-4 flex items-center gap-2">
              💰 Weekly Price Update Results
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-white mb-4">
              <div className="bg-black/30 p-4 rounded">
                <div className="text-2xl font-bold text-[#00ff00]">{priceUpdateResult.stats.checked}</div>
                <div className="text-sm text-gray-400">Properties Checked</div>
              </div>
              <div className="bg-black/30 p-4 rounded">
                <div className="text-2xl font-bold text-yellow-400">{priceUpdateResult.stats.price_changes}</div>
                <div className="text-sm text-gray-400">Price Changes</div>
              </div>
              <div className="bg-black/30 p-4 rounded">
                <div className="text-2xl font-bold text-blue-400">
                  {priceUpdateResult.stats.price_changes > 0 
                    ? `${((priceUpdateResult.stats.price_changes / priceUpdateResult.stats.checked) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </div>
                <div className="text-sm text-gray-400">Change Rate</div>
              </div>
            </div>

            {priceUpdateResult.priceChanges.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xl font-bold text-white mb-3">🎯 Price Changes Detected:</h3>
                <div className="space-y-3">
                  {priceUpdateResult.priceChanges.map((change, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded border ${
                        change.change < 0 
                          ? 'bg-green-900/20 border-green-500' 
                          : 'bg-red-900/20 border-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {change.change < 0 ? '📉' : '📈'}
                          </span>
                          <div>
                            <div className="font-bold text-white">{change.reference}</div>
                            <div className="text-sm text-gray-400">
                              €{change.oldPrice.toLocaleString()} → €{change.newPrice.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            change.change < 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {change.percentChange}%
                          </div>
                          <div className="text-sm text-gray-400">
                            {change.change < 0 ? '-' : '+'}€{Math.abs(change.change).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {priceUpdateResult.stats.price_changes === 0 && (
              <div className="mt-4 p-4 bg-blue-900/30 border border-blue-500 rounded text-blue-200">
                ✅ All prices are up to date! No changes detected.
              </div>
            )}
            
            <details className="mt-4">
              <summary className="cursor-pointer text-[#00ffff] hover:underline">
                View Full Response
              </summary>
              <pre className="mt-4 p-4 bg-black/50 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(priceUpdateResult, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Debug Results */}
        {results.debug && !isScrapeResult(results.debug) && !isPriceUpdateResult(results.debug) && (
          <div className="mb-8 p-6 bg-yellow-900/30 border border-yellow-500 rounded">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">
              🔍 Debug Results
            </h2>
            <details open>
              <summary className="cursor-pointer text-[#00ffff] hover:underline mb-4">
                View Debug Data
              </summary>
              <pre className="mt-4 p-4 bg-black/50 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(results.debug, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
