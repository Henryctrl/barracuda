'use client';

import { useState } from 'react';

export default function DPESearch() {
  const [searchParams, setSearchParams] = useState({
    address: '',
    energyClass: '',
    ghgClass: '',
    size: 10
  });
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const energyClasses = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/dpe?${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      setResults(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">DPE Logements Search</h1>
      
      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <input
              type="text"
              value={searchParams.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter address..."
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Energy Class</label>
            <select
              value={searchParams.energyClass}
              onChange={(e) => handleInputChange('energyClass', e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All classes</option>
              {energyClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">GHG Class</label>
            <select
              value={searchParams.ghgClass}
              onChange={(e) => handleInputChange('ghgClass', e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All classes</option>
              {energyClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Results</label>
            <select
              value={searchParams.size}
              onChange={(e) => handleInputChange('size', parseInt(e.target.value))}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search DPE Data'}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">
              Results ({results.length} of {total} total)
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Address</th>
                  <th className="px-4 py-2 text-left">Energy Class</th>
                  <th className="px-4 py-2 text-left">GHG Class</th>
                  <th className="px-4 py-2 text-left">Surface</th>
                  <th className="px-4 py-2 text-left">Construction Year</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">
                      {item.Adresse_brute || 'N/A'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-white ${getEnergyClassColor(item.Classe_energetique)}`}>
                        {item.Classe_energetique || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-white ${getEnergyClassColor(item.Classe_GES)}`}>
                        {item.Classe_GES || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {item.Surface_habitable_logement || 'N/A'} m²
                    </td>
                    <td className="px-4 py-2">
                      {item.Annee_construction || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {!loading && results.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          No results found. Try adjusting your search criteria.
        </div>
      )}
    </div>
  );
}

// Helper function for energy class colors
function getEnergyClassColor(energyClass) {
  const colors = {
    'A': 'bg-green-600',
    'B': 'bg-green-500',
    'C': 'bg-yellow-500',
    'D': 'bg-orange-500',
    'E': 'bg-red-500',
    'F': 'bg-red-600',
    'G': 'bg-red-700'
  };
  return colors[energyClass] || 'bg-gray-500';
}
