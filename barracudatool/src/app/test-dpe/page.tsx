'use client'
import { useState } from 'react'
import { DpeAPI } from '../../lib/dpe-api'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function TestDPE() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testCoords, setTestCoords] = useState({ lat: 44.80342783639408, lng: 0.4767371153748235 })

  const runDpeTest = async () => {
    setLoading(true)
    console.log(`🧪 Testing CORRECTED DPE API at coordinates: ${testCoords.lat}, ${testCoords.lng}`)
    
    try {
      // Test corrected method
      const directResults = await DpeAPI.getDpeNearCoordinates(testCoords.lng, testCoords.lat, 2.0) // 2km radius
      
      // Test API route
      const response = await fetch(`/api/dpe?lat=${testCoords.lat}&lng=${testCoords.lng}&radius=2.0`)
      const apiResults = await response.json()
      
      const results = {
        timestamp: new Date().toISOString(),
        coordinates: testCoords,
        testType: 'corrected',
        directAPI: {
          found: directResults.length > 0,
          count: directResults.length,
          certificates: directResults.slice(0, 5),
          error: null
        },
        viaRoute: {
          found: apiResults.found || false,
          count: apiResults.count || 0,
          certificates: apiResults.nearby?.slice(0, 5) || [],
          error: apiResults.error || null
        }
      }
      
      console.log('🧪 CORRECTED DPE Test Results:', results)
      setTestResults(results)
    } catch (error: unknown) {
      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      console.error('❌ DPE Test Failed:', errorMessage)
      setTestResults({
        timestamp: new Date().toISOString(),
        coordinates: testCoords,
        testType: 'corrected',
        error: errorMessage,
        directAPI: { found: false, count: 0, certificates: [], error: errorMessage },
        viaRoute: { found: false, count: 0, certificates: [], error: errorMessage }
      })
    } finally {
      setLoading(false)
    }
  }

  const runDebugTest = async () => {
    setLoading(true)
    console.log(`🔬 Running DEEP DEBUG for coordinates: ${testCoords.lat}, ${testCoords.lng}`)
    
    try {
      const debugResults = await DpeAPI.debugDpeSearch(testCoords.lng, testCoords.lat)
      
      setTestResults({
        timestamp: new Date().toISOString(),
        coordinates: testCoords,
        testType: 'debug',
        debugResults
      })
      
      console.log('🔬 Deep debug results:', debugResults)
    } catch (error: unknown) {
      let errorMessage = 'Debug test failed'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setTestResults({
        timestamp: new Date().toISOString(),
        coordinates: testCoords,
        testType: 'debug',
        error: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  const runCorrectedFieldTest = async () => {
    setLoading(true)
    console.log(`🔧 Testing CORRECTED field names for coordinates: ${testCoords.lat}, ${testCoords.lng}`)
    
    try {
      const coordTest = await DpeAPI.testCoordinateFields()
      console.log('🧪 Coordinate field test:', coordTest)
      
      const correctedResults = await DpeAPI.getDpeNearCoordinates(testCoords.lng, testCoords.lat, 2.0)
      console.log('✅ CORRECTED results:', correctedResults)
      
      setTestResults({
        timestamp: new Date().toISOString(),
        coordinates: testCoords,
        testType: 'corrected-fields',
        coordinateFieldTest: coordTest,
        correctedResults: {
          found: correctedResults.length > 0,
          count: correctedResults.length,
          certificates: correctedResults.slice(0, 5)
        }
      })
    } catch (error: unknown) {
      let errorMessage = 'Corrected field test failed'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setTestResults({
        timestamp: new Date().toISOString(),
        coordinates: testCoords,
        testType: 'corrected-fields',
        error: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  const testLocations = [
    { name: "Your Known DPE Location", lat: 44.80342783639408, lng: 0.4767371153748235 },
    { name: "Paris Center", lat: 48.8566, lng: 2.3522 },
    { name: "Lyon", lat: 45.7640, lng: 4.8357 },
    { name: "Marseille", lat: 43.2965, lng: 5.3698 },
    { name: "Toulouse", lat: 43.6047, lng: 1.4442 }
  ]

  const getEnergyClassColor = (energyClass: string) => {
    switch(energyClass) {
      case 'A': return 'bg-green-600'
      case 'B': return 'bg-green-500'
      case 'C': return 'bg-yellow-500 text-black'
      case 'D': return 'bg-yellow-600 text-black'
      case 'E': return 'bg-orange-500'
      case 'F': return 'bg-red-500'
      case 'G': return 'bg-red-700'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <Card neonColor="cyan" className="text-center">
          <h1 className="text-3xl font-bold text-neon-cyan mb-4">🔧 CORRECTED DPE API Test Lab</h1>
          <p className="text-white">Testing with correct field names: Coordonnée_cartographique_X_(BAN)</p>
          <div className="text-neon-yellow text-sm mt-2">Using proper French field names with accents</div>
        </Card>

        {/* Test Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Coordinate Input */}
          <Card neonColor="yellow">
            <h2 className="text-xl font-bold text-neon-yellow mb-4">📍 Test Coordinates</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm mb-2">Latitude:</label>
                <input 
                  type="number" 
                  step="0.000001"
                  value={testCoords.lat}
                  onChange={(e) => setTestCoords({...testCoords, lat: parseFloat(e.target.value)})}
                  className="w-full p-2 bg-slate-800 border border-neon-yellow/30 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Longitude:</label>
                <input 
                  type="number" 
                  step="0.000001"
                  value={testCoords.lng}
                  onChange={(e) => setTestCoords({...testCoords, lng: parseFloat(e.target.value)})}
                  className="w-full p-2 bg-slate-800 border border-neon-yellow/30 rounded text-white"
                />
              </div>
              <Button 
                neonColor="yellow" 
                onClick={runDpeTest}
                disabled={loading}
                className="w-full"
              >
                {loading ? '🔄 Testing...' : '🧪 Run CORRECTED DPE Test'}
              </Button>
              <Button 
                neonColor="red" 
                onClick={runDebugTest}
                disabled={loading}
                className="w-full"
              >
                {loading ? '🔄 Deep Debugging...' : '🔬 Deep Debug API'}
              </Button>
              <Button 
                neonColor="purple" 
                onClick={runCorrectedFieldTest}
                disabled={loading}
                className="w-full"
              >
                {loading ? '🔄 Testing Fields...' : '🔧 Test CORRECTED Fields'}
              </Button>
            </div>
          </Card>

          {/* Quick Test Locations */}
          <Card neonColor="green">
            <h2 className="text-xl font-bold text-neon-green mb-4">🏙️ Quick Test Locations</h2>
            <div className="space-y-2">
              {testLocations.map((location, index) => (
                <Button
                  key={index}
                  neonColor={index === 0 ? "pink" : "green"}
                  variant="secondary"
                  size="sm"
                  className="w-full text-left"
                  onClick={() => {
                    setTestCoords({ lat: location.lat, lng: location.lng })
                    setTimeout(runCorrectedFieldTest, 100)
                  }}
                >
                  {index === 0 ? '🎯' : '📍'} {location.name} ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Test Results */}
        {testResults && (
          <Card neonColor="purple" className="overflow-hidden">
            <h2 className="text-xl font-bold text-neon-purple mb-4">
              📊 {testResults.testType === 'debug' ? 'DEBUG ANALYSIS' : 
                   testResults.testType === 'corrected-fields' ? 'CORRECTED FIELDS TEST' : 'Test Results'}
            </h2>
            
            {testResults.testType === 'debug' ? (
              /* Debug Results Display */
              <div className="space-y-6">
                <div className="text-neon-cyan text-sm">🔬 Deep debugging analysis complete - check console for detailed logs</div>
              </div>
            ) : testResults.testType === 'corrected-fields' ? (
              /* Corrected Fields Test Display */
              <div className="space-y-6">
                <div className="text-neon-green text-sm">🔧 Testing corrected field names with French accents</div>
                
                {testResults.coordinateFieldTest && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-neon-green">📍 Coordinate Field Test</h3>
                    <div className="p-3 rounded border border-green-500/50">
                      <div className="text-sm space-y-1">
                        <div>Total Records Tested: <span className="text-yellow-400">{testResults.coordinateFieldTest.totalTested}</span></div>
                        <div>With Coordinates: <span className="text-green-400">{testResults.coordinateFieldTest.withCoordinates}</span></div>
                        {testResults.coordinateFieldTest.samples?.length > 0 && (
                          <div className="mt-2">
                            <div className="font-bold">Sample Records with Coordinates:</div>
                            {testResults.coordinateFieldTest.samples.map((sample: any, i: number) => (
                              <div key={i} className="text-xs ml-2 mt-1">
                                📍 {sample['Adresse_(BAN)']} in {sample['Nom__commune_(BAN)']} - Energy: {sample['Etiquette_DPE']}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {testResults.correctedResults && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-neon-cyan">🎯 Nearby DPE Search Results</h3>
                    <div className={`p-4 rounded border-2 ${
                      testResults.correctedResults.found 
                        ? 'border-green-500 bg-green-900/20' 
                        : 'border-red-500 bg-red-900/20'
                    }`}>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="font-bold">Status:</span>
                          <span className={`ml-2 ${testResults.correctedResults.found ? 'text-green-400' : 'text-red-400'}`}>
                            {testResults.correctedResults.found ? '✅ FOUND' : '❌ NOT FOUND'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold">Count:</span>
                          <span className="ml-2 text-yellow-400">{testResults.correctedResults.count} certificates</span>
                        </div>
                      </div>
                    </div>

                    {/* Certificates Found */}
                    {testResults.correctedResults.certificates.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-neon-green">📋 Found DPE Certificates:</h4>
                        {testResults.correctedResults.certificates.map((cert: any, index: number) => (
                          <div key={index} className="bg-slate-800 p-3 rounded border border-green-500/30">
                            <div className="text-xs space-y-1">
                              <div><span className="font-bold">Address:</span> {cert.adresse_bien}</div>
                              <div><span className="font-bold">Commune:</span> {cert.commune_bien}</div>
                              <div>
                                <span className="font-bold">Energy Class:</span> 
                                <span className={`ml-2 px-2 py-1 rounded font-bold ${getEnergyClassColor(cert.etiquette_dpe)}`}>
                                  {cert.etiquette_dpe}
                                </span>
                              </div>
                              <div><span className="font-bold">Consumption:</span> {cert.consommation_energie} kWh/m²/year</div>
                              <div><span className="font-bold">Date:</span> {cert.date_reception_dpe}</div>
                              {cert.distance && (
                                <div><span className="font-bold">Distance:</span> <span className="text-neon-green">{cert.distance.toFixed(2)} km</span></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Regular Test Results */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Direct API Results */}
                {testResults.directAPI && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-neon-cyan">🔗 Direct DPE API</h3>
                    <div className={`p-4 rounded border-2 ${
                      testResults.directAPI.found 
                        ? 'border-green-500 bg-green-900/20' 
                        : 'border-red-500 bg-red-900/20'
                    }`}>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="font-bold">Status:</span>
                          <span className={`ml-2 ${testResults.directAPI.found ? 'text-green-400' : 'text-red-400'}`}>
                            {testResults.directAPI.found ? '✅ FOUND' : '❌ NOT FOUND'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold">Count:</span>
                          <span className="ml-2 text-yellow-400">{testResults.directAPI.count} certificates</span>
                        </div>
                        {testResults.directAPI.error && (
                          <div className="text-red-400">
                            <span className="font-bold">Error:</span> {testResults.directAPI.error}
                          </div>
                        )}
                      </div>
                    </div>

                    {testResults.directAPI.certificates.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-neon-green">📋 Found Certificates:</h4>
                        {testResults.directAPI.certificates.map((cert: any, index: number) => (
                          <div key={index} className="bg-slate-800 p-3 rounded border border-cyan-500/30">
                            <div className="text-xs space-y-1">
                              <div><span className="font-bold">Address:</span> {cert.adresse_bien}</div>
                              <div>
                                <span className="font-bold">Energy:</span> 
                                <span className={`ml-2 px-2 py-1 rounded font-bold ${getEnergyClassColor(cert.etiquette_dpe)}`}>
                                  {cert.etiquette_dpe}
                                </span>
                              </div>
                              <div><span className="font-bold">Consumption:</span> {cert.consommation_energie} kWh/m²/year</div>
                              <div><span className="font-bold">Date:</span> {cert.date_reception_dpe}</div>
                              {cert.distance && (
                                <div><span className="font-bold">Distance:</span> <span className="text-neon-green">{cert.distance.toFixed(2)} km</span></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* API Route Results */}
                {testResults.viaRoute && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-neon-orange">🌐 Via API Route</h3>
                    <div className={`p-4 rounded border-2 ${
                      testResults.viaRoute.found 
                        ? 'border-green-500 bg-green-900/20' 
                        : 'border-red-500 bg-red-900/20'
                    }`}>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="font-bold">Status:</span>
                          <span className={`ml-2 ${testResults.viaRoute.found ? 'text-green-400' : 'text-red-400'}`}>
                            {testResults.viaRoute.found ? '✅ FOUND' : '❌ NOT FOUND'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold">Count:</span>
                          <span className="ml-2 text-yellow-400">{testResults.viaRoute.count} certificates</span>
                        </div>
                        {testResults.viaRoute.error && (
                          <div className="text-red-400">
                            <span className="font-bold">Error:</span> {testResults.viaRoute.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Test Metadata */}
            <div className="mt-6 pt-4 border-t border-purple-500/30">
              <div className="text-xs text-gray-400 space-y-1">
                <div><span className="font-bold">Test Time:</span> {testResults.timestamp}</div>
                <div><span className="font-bold">Coordinates:</span> {testResults.coordinates.lat}, {testResults.coordinates.lng}</div>
                <div><span className="font-bold">Test Type:</span> {testResults.testType}</div>
                <div><span className="font-bold">Search Radius:</span> 2000m (corrected method)</div>
              </div>
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card neonColor="cyan">
          <h2 className="text-xl font-bold text-neon-cyan mb-4">📝 CORRECTED Testing Approach</h2>
          <div className="text-white text-sm space-y-2">
            <p><strong>🔧 Key Fix:</strong> Using correct French field names with accents</p>
            <p><strong>📍 Coordinates:</strong> Coordonnée_cartographique_X_(BAN) and Coordonnée_cartographique_Y_(BAN)</p>
            <p><strong>🎯 Field Test:</strong> Purple button tests which records actually have coordinates</p>
            <p><strong>📊 Results:</strong> Should now find real DPE certificates if they exist in the area</p>
            <p><strong>✅ Success Indicator:</strong> Look for "With Coordinates" count greater than 0 in field test</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
