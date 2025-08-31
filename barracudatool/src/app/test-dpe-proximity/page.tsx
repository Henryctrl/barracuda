'use client'
import { useState } from 'react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

interface DPERecord {
  'N°DPE': string
  'Adresse_(BAN)': string
  'Adresse_brute': string
  'Etiquette_DPE': string
  'Etiquette_GES': string
  'Date_établissement_DPE': string
  'Surface_habitable_logement': number
  'Coût_total_5_usages': number
  'Nom__commune_(BAN)': string
  'N°_département_(BAN)': string
  '_geopoint': string
  '_distance'?: number
  '_confidence'?: number
}

interface TestResult {
  strategy: string
  query: string
  results: DPERecord[]
  duration: number
  success: boolean
  error?: string
}

export default function DPECoordinateTest() {
  const [latitude, setLatitude] = useState('46.0569')
  const [longitude, setLongitude] = useState('0.9242')
  const [targetDept, setTargetDept] = useState('87') // Haute-Vienne for Nouic
  const [targetCommune, setTargetCommune] = useState('Nouic')
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null)

  // Haversine distance calculation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000 // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) ** 2 + 
             Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
             Math.sin(dLon/2) ** 2
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  // Test individual search strategy
  const testSearchStrategy = async (strategy: string, query: string): Promise<TestResult> => {
    const startTime = performance.now()
    
    try {
      console.log(`🔍 Testing ${strategy}: ${query}`)
      
      const url = `https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines?${query}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      const duration = performance.now() - startTime
      
      // Add distance calculations for geographic results
      const resultsWithDistance = (data.results || []).map((dpe: any) => {
        if (dpe._geopoint) {
          const [dpeLat, dpeLon] = dpe._geopoint.split(',').map(Number)
          if (!isNaN(dpeLat) && !isNaN(dpeLon)) {
            const distance = calculateDistance(parseFloat(latitude), parseFloat(longitude), dpeLat, dpeLon)
            return { ...dpe, _distance: distance }
          }
        }
        return dpe
      }).sort((a: any, b: any) => (a._distance || Infinity) - (b._distance || Infinity))
      
      return {
        strategy,
        query,
        results: resultsWithDistance,
        duration: Math.round(duration),
        success: true
      }
    } catch (error: any) {
      const duration = performance.now() - startTime
      return {
        strategy,
        query,
        results: [],
        duration: Math.round(duration),
        success: false,
        error: error.message
      }
    }
  }

  // Run comprehensive coordinate test
  const runCoordinateTest = async () => {
    setLoading(true)
    setResults([])
    setSelectedResult(null)
    
    const lat = parseFloat(latitude)
    const lon = parseFloat(longitude)
    
    console.log(`🎯 Testing coordinate-based DPE search for: ${lat}, ${lon}`)
    
    // Test different search strategies
    const strategies = [
      // Strategy 1: Direct coordinate search (should fail gracefully)
      {
        name: "Direct Coordinates",
        query: `q=${lat},${lon}&size=100&select=*`
      },
      
      // Strategy 2: Geopoint field search (testing syntax)
      {
        name: "Geopoint Field",
        query: `q=_geopoint:"${lat},${lon}"&size=100&select=*`
      },
      
      // Strategy 3: Department-based search (your approach)
      {
        name: "Department Filter",
        query: `q=N°_département_(BAN):"${targetDept}"&size=200&select=*`
      },
      
      // Strategy 4: Commune-based search
      {
        name: "Commune Filter", 
        query: `q=Nom__commune_(BAN):"${targetCommune}"&size=100&select=*`
      },
      
      // Strategy 5: Combined department + commune
      {
        name: "Department + Commune",
        query: `q=N°_département_(BAN):"${targetDept}" AND Nom__commune_(BAN):"${targetCommune}"&size=100&select=*`
      },
      
      // Strategy 6: Geographic range (testing bounding box)
      {
        name: "Geographic Range",
        query: `q=N°_département_(BAN):"${targetDept}"&size=500&select=*`
      }
    ]
    
    const testResults: TestResult[] = []
    
    for (const strategy of strategies) {
      const result = await testSearchStrategy(strategy.name, strategy.query)
      testResults.push(result)
      console.log(`✅ ${strategy.name}: ${result.results.length} results in ${result.duration}ms`)
    }
    
    setResults(testResults)
    setLoading(false)
    
    console.log('📊 Test Summary:', testResults.map(r => ({
      strategy: r.strategy,
      count: r.results.length,
      success: r.success,
      closest: r.results[0]?._distance ? `${Math.round(r.results[0]._distance)}m` : 'N/A'
    })))
  }

  const formatEnergyClass = (energyClass: string) => {
    const colors = {
      'A': 'bg-green-600 text-white', 'B': 'bg-green-500 text-white', 
      'C': 'bg-yellow-500 text-black', 'D': 'bg-yellow-600 text-black',
      'E': 'bg-orange-500 text-white', 'F': 'bg-red-500 text-white', 
      'G': 'bg-red-700 text-white'
    };
    return (
      <span className={`px-2 py-1 rounded font-bold text-xs ${colors[energyClass as keyof typeof colors] || 'bg-gray-500 text-white'}`}>
        {energyClass || 'N/A'}
      </span>
    );
  };

  return (
    <div 
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#001428',
        background: 'linear-gradient(135deg, #001428 0%, #002851 50%, #003d7a 100%)',
        fontFamily: 'Orbitron, monospace',
        padding: '20px',
        overflowY: 'auto'
      }}
    >
      <Card neonColor="pink" className="backdrop-blur-md max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-retro text-3xl font-bold text-neon-pink animate-glow mb-2">
            🎯 COORDINATE-BASED DPE SEARCH TEST
          </h1>
          <p className="text-neon-cyan text-sm font-retro uppercase tracking-wider">
            Testing proper geographic approach: Coordinates → Department → Distance filtering
          </p>
        </div>

        {/* Input Section */}
        <Card neonColor="cyan" className="backdrop-blur-md mb-6">
          <h3 className="font-retro text-lg font-bold text-neon-cyan uppercase tracking-wider mb-4">
            📍 Test Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-white font-retro text-sm block mb-2">Latitude:</label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full p-2 rounded bg-surface border border-neon-cyan/30 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-white font-retro text-sm block mb-2">Longitude:</label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full p-2 rounded bg-surface border border-neon-cyan/30 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-white font-retro text-sm block mb-2">Expected Department:</label>
              <input
                type="text"
                value={targetDept}
                onChange={(e) => setTargetDept(e.target.value)}
                className="w-full p-2 rounded bg-surface border border-neon-cyan/30 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-white font-retro text-sm block mb-2">Expected Commune:</label>
              <input
                type="text"
                value={targetCommune}
                onChange={(e) => setTargetCommune(e.target.value)}
                className="w-full p-2 rounded bg-surface border border-neon-cyan/30 text-white font-mono"
              />
            </div>
          </div>
          
          <Button
            neonColor="green"
            size="lg"
            className="w-full mt-4"
            onClick={runCoordinateTest}
            disabled={loading}
          >
            {loading ? '🔍 Running All Tests...' : '🎯 Test All Search Strategies'}
          </Button>

          {/* Preset Buttons */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <Button
              neonColor="yellow"
              size="sm"
              onClick={() => {
                setLatitude('46.0569')
                setLongitude('0.9242')
                setTargetDept('87')
                setTargetCommune('Nouic')
              }}
            >
              📍 Nouic (87)
            </Button>
            <Button
              neonColor="orange"
              size="sm"
              onClick={() => {
                setLatitude('48.8566')
                setLongitude('2.3522')
                setTargetDept('75')
                setTargetCommune('Paris')
              }}
            >
              📍 Paris (75)
            </Button>
            <Button
              neonColor="purple"
              size="sm"
              onClick={() => {
                setLatitude('44.8378')
                setLongitude('-0.5792')
                setTargetDept('33')
                setTargetCommune('Bordeaux')
              }}
            >
              📍 Bordeaux (33)
            </Button>
          </div>
        </Card>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strategy Results */}
            <Card neonColor="green" className="backdrop-blur-md">
              <h3 className="font-retro text-lg font-bold text-neon-green uppercase tracking-wider mb-4">
                📊 Search Strategy Results
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      selectedResult === result 
                        ? 'border-neon-green bg-green-900/30' 
                        : result.success 
                          ? 'border-neon-cyan/30 bg-surface/30 hover:border-neon-cyan' 
                          : 'border-neon-red/30 bg-red-900/20'
                    }`}
                    onClick={() => setSelectedResult(result)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className={`font-retro text-sm font-bold ${
                        result.success ? 'text-neon-cyan' : 'text-neon-red'
                      }`}>
                        {result.strategy}
                      </h4>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          result.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {result.results.length} results
                        </span>
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-bold">
                          {result.duration}ms
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-300 mb-2 font-mono break-all">
                      {result.query}
                    </div>
                    
                    {result.success ? (
                      <div className="text-xs text-white">
                        {result.results.length > 0 ? (
                          <>
                            <div>Closest: {result.results[0]?.['Nom__commune_(BAN)'] || 'Unknown'} 
                              {result.results[0]?._distance && ` (${Math.round(result.results[0]._distance)}m)`}
                            </div>
                            <div>Departments: {[...new Set(result.results.map(r => r['N°_département_(BAN)']).filter(Boolean))].join(', ')}</div>
                          </>
                        ) : (
                          <div className="text-neon-orange">No results found</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-neon-red text-xs">
                        Error: {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Detailed Results */}
            <Card neonColor="purple" className="backdrop-blur-md">
              <h3 className="font-retro text-lg font-bold text-neon-purple uppercase tracking-wider mb-4">
                🔍 Detailed Results
              </h3>
              
              {selectedResult ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="text-center p-3 bg-surface/50 rounded">
                    <div className="text-neon-purple font-bold">{selectedResult.strategy}</div>
                    <div className="text-white text-sm">{selectedResult.results.length} records found</div>
                    <div className="text-gray-400 text-xs">Query time: {selectedResult.duration}ms</div>
                  </div>
                  
                  {selectedResult.results.slice(0, 10).map((dpe, index) => (
                    <div key={dpe['N°DPE'] || index} className="bg-surface/30 p-3 rounded border border-purple-500/30">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-white font-bold text-sm">
                          #{index + 1} - {dpe['N°DPE'] || 'Unknown ID'}
                        </div>
                        {dpe._distance && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-bold">
                            {dpe._distance < 1000 ? `${Math.round(dpe._distance)}m` : `${(dpe._distance/1000).toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs space-y-1">
                        <div>
                          <span className="text-gray-400">Address:</span>
                          <span className="text-white ml-2">{dpe['Adresse_(BAN)'] || dpe['Adresse_brute'] || 'Unknown'}</span>
                        </div>
                        
                        <div className="flex space-x-4">
                          <div>
                            <span className="text-gray-400">Commune:</span>
                            <span className="text-neon-cyan ml-1">{dpe['Nom__commune_(BAN)'] || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Dept:</span>
                            <span className="text-neon-yellow ml-1">{dpe['N°_département_(BAN)'] || 'N/A'}</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-4">
                          <div className="flex items-center">
                            <span className="text-gray-400 mr-1">Energy:</span>
                            {formatEnergyClass(dpe['Etiquette_DPE'])}
                          </div>
                          <div className="flex items-center">
                            <span className="text-gray-400 mr-1">GHG:</span>
                            {formatEnergyClass(dpe['Etiquette_GES'])}
                          </div>
                        </div>
                        
                        {dpe._geopoint && (
                          <div>
                            <span className="text-gray-400">Coordinates:</span>
                            <span className="text-neon-purple ml-1 font-mono">{dpe._geopoint}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  Click on a strategy result to view detailed records
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Instructions */}
        <Card neonColor="yellow" className="backdrop-blur-md mt-6">
          <div className="text-center">
            <h4 className="text-neon-yellow font-retro text-sm font-bold mb-2">
              🧪 TESTING STRATEGY
            </h4>
            <div className="text-white text-xs space-y-1">
              <p><strong>Your Logic:</strong> Coordinates → Department → Distance Filter → Closest Match</p>
              <p><strong>Expected:</strong> Department filter should return many results from the right area</p>
              <p><strong>Problem:</strong> Direct coordinate searches return random/wrong results</p>
              <p><strong>Solution:</strong> Use geographic area search + client-side distance ranking</p>
            </div>
            <div className="text-neon-cyan text-xs mt-3 font-bold">
              🎯 This will prove that your approach is the correct one!
            </div>
          </div>
        </Card>
      </Card>
    </div>
  )
}
