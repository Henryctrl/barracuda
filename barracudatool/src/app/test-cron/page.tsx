'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function TestCronPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const triggerCron = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/cron/daily-scrape');
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to run cron job');
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0d21] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-[#00ff00] mb-8">
          Test Daily Scrape Cron Job
        </h1>

        <button
          onClick={triggerCron}
          disabled={loading}
          className="px-8 py-4 bg-[#00ff00] text-black font-bold rounded text-lg hover:bg-[#00ff00]/80 disabled:opacity-50 flex items-center gap-3"
        >
          {loading && <Loader2 className="animate-spin" size={20} />}
          {loading ? 'Running Cron Job...' : 'Trigger Daily Scrape Now'}
        </button>

        {error && (
          <div className="mt-8 p-6 bg-red-900/50 border border-red-500 rounded text-white">
            <h2 className="text-xl font-bold mb-2">Error:</h2>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-8 p-6 bg-green-900/50 border border-green-500 rounded">
            <h2 className="text-2xl font-bold text-[#00ff00] mb-4">
              ✅ Cron Job Completed!
            </h2>
            <div className="space-y-2 text-white">
              <p><strong>Duration:</strong> {result.duration}</p>
              <p><strong>Properties Scraped:</strong> {result.scraped}</p>
              <p><strong>Properties Inserted:</strong> {result.inserted}</p>
              <p><strong>Matches Created:</strong> {result.matched}</p>
              <p><strong>Message:</strong> {result.message}</p>
            </div>
            
            <details className="mt-6">
              <summary className="cursor-pointer text-[#00ffff] hover:underline">
                View Full Response
              </summary>
              <pre className="mt-4 p-4 bg-black/50 rounded text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
