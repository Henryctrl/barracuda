'use client';

import { useState } from 'react';

export default function DPETest() {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      // Test the API endpoint
      const response = await fetch('/api/dpe?address=Paris&size=5');
      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'API connection successful!',
          data: data,
          status: response.status
        });
      } else {
        setTestResult({
          success: false,
          message: 'API request failed',
          error: data.error,
          status: response.status
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Network error occurred',
        error: error.message,
        status: null
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">DPE API Test</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <button
          onClick={runTest}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test DPE API Connection'}
        </button>

        {testResult && (
          <div className="mt-6">
            <div className={`p-4 rounded ${testResult.success ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
              <h3 className="font-semibold mb-2">
                {testResult.success ? '✅ Success' : '❌ Error'}
              </h3>
              <p className="mb-2">{testResult.message}</p>
              {testResult.status && (
                <p className="text-sm">HTTP Status: {testResult.status}</p>
              )}
              {testResult.error && (
                <p className="text-sm text-red-600">Error: {testResult.error}</p>
              )}
            </div>

            {testResult.success && testResult.data && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Sample Data:</h4>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
