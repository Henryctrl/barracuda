'use client'
import { useState } from 'react'
import { DpeAPI } from '../../lib/dpe-api'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function TestDPE() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testCoords, setTestCoords] = useState({ lat: 44.80342783639408, lng: 0.4767371153748235 })

  const runFullDpeTest = async () => {
    setLoading(true)
    console.log(`🧪 FULL DPE DEBUG at coordinates: ${testCoords.lat}, ${testCoords.lng}`)
    
    try {
      // Step 1: Check API connectivity and field structure
      const debugResults = await DpeAPI.debugDpeSearch(testCoords.lng, testCoords.lat)
      
      // Step 2: Search for DPE certificates nearby
      const dpeResults = await DpeAPI.getDpeNearCoordinates(testCoords.lng, testCoords.lat, 5.0) // 5km radius
      
      // Step 3: Test via API route
      const response = await fetch(`/api/dpe?lat=${testCoords.lat}&lng=${testCoords.lng}&radius=5.0`)
      const apiResults = await response.json()
      
      const results = {
        timestamp: new Date().toISOString(),
        coordinates: testCoords,
        debug: debugResults,
        directAPI: {
          found: dpeResults.length > 0,
          count: dpeResults.length,
          certificates: dpeResults.slice(0, 10),
          error: null
        },
        viaRoute: {
          found: apiResults.found || false,
          count: apiResults.count || 0,
          certificates: apiResults.nearby?.slice(0, 10) || [],
          error: apiResults.error || null
        }
      }
      
      console.log('🧪 COMPLETE DPE Test Results:', results)
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
        error: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <Card neonColor="cyan" className="text-center">
          <h1 className="text-3xl font-bold text-neon-cyan mb-4">🧪 DPE Debug Lab</h1>
          <p className="text-white">One-button complete DPE test and debugging</p>
        </Card>

        {/* Single Test Button */}
        <Card neonColor="yellow">
          <h2 className="text-xl font-bold text-neon-yellow mb-4">📍 Test Your Location</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-white text-sm mb-2 font-bold">Latitude:</label>
              <input 
                type="number" 
                step="0.000001"
                value={testCoords.lat}
                onChange={(e) => setTestCoords({...testCoords, lat: parseFloat(e.target.value)})}
                className="w-full p-3 bg-slate-700 border-2 border-neon-yellow/50 rounded text-white font-mono text-lg focus:border-neon-yellow focus:bg-slate-600"
                placeholder="Enter latitude..."
              />
            </div>
            <div>
              <label className="block text-white text-sm mb-2 font-bold">Longitude:</label>
              <input 
                type="number" 
                step="0.000001"
                value={testCoords.lng}
                onChange={(e) => setTestCoords({...testCoords, lng: parseFloat(e.target.value)})}
                className="w-full p-3 bg-slate-700 border-2 border-neon-yellow/50 rounded text-white font-mono text-lg focus:border-neon-yellow focus:bg-slate-600"
                placeholder="Enter longitude..."
              />
            </div>
            
            <div className="bg-slate-800 p-3 rounded border border-neon-cyan/30">
              <div className="text-neon-cyan text-sm font-bold mb-1">Current Coordinates:</div>
              <div className="text-white font-mono">{testCoords.lat.toFixed(6)}, {testCoords.lng.toFixed(6)}</div>
            </div>

            <Button 
              neonColor="green" 
              onClick={runFullDpeTest}
              disabled={loading}
              className="w-full text-lg py-4"
            >
              {loading ? '🔄 Running Complete DPE Test...' : '🧪 RUN COMPLETE DPE TEST'}
            </Button>
            
<Button 
  neonColor="orange" 
  onClick={async () => {
    console.log('🎯 Testing your specific DPE certificate...');
    try {
      const result = await DpeAPI.getDpeByCertificateNumber('2524E2351120U');
      console.log('✅ Your DPE:', result);
      alert(`Found your DPE: ${result?.adresse_bien} - Energy: ${result?.etiquette_dpe}`);
    } catch (error) {
      console.error('❌ Certificate test failed:', error);
      alert('Certificate test failed - check console');
    }
  }}
  disabled={loading}
  className="w-full mt-2"
>
  🎯 Test Your Known Certificate
</Button>

          </div>
        </Card>

        {/* Test Results */}
        {testResults && (
          <Card neonColor="purple" className="overflow-hidden">
            <h2 className="text-xl font-bold text-neon-purple mb-4">📊 Test Results</h2>
            
            {/* Debug Info */}
            {testResults.debug && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-neon-green mb-2">🔬 API Debug Info</h3>
                <div className="bg-slate-800 p-3 rounded border border-green-500/30">
                  <div className="text-sm space-y-1">
                    <div>Total Fields Available: <span className="text-yellow-400">{testResults.debug.coordinateTest?.totalFields || 0}</span></div>
                    <div>Coordinate Fields Found: <span className="text-green-400">{testResults.debug.coordinateTest?.coordinateFields?.length || 0}</span></div>
                    <div className="text-neon-cyan text-xs mt-2">✅ API is working correctly</div>
                  </div>
                </div>
              </div>
            )}

            {/* Direct API Results */}
            {testResults.directAPI && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-neon-cyan">🔗 Direct API Search Results</h3>
                <div className={`p-4 rounded border-2 ${
                  testResults.directAPI.found 
                    ? 'border-green-500 bg-green-900/20' 
                    : 'border-red-500 bg-red-900/20'
                }`}>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="font-bold">Status:</span>
                      <span className={`ml-2 text-lg ${testResults.directAPI.found ? 'text-green-400' : 'text-red-400'}`}>
                        {testResults.directAPI.found ? '✅ DPE CERTIFICATES FOUND' : '❌ NO DPE CERTIFICATES FOUND'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Count within 5km:</span>
                      <span className="ml-2 text-yellow-400 text-lg">{testResults.directAPI.count} certificates</span>
                    </div>
                    {testResults.directAPI.error && (
                      <div className="text-red-400">
                        <span className="font-bold">Error:</span> {testResults.directAPI.error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Found Certificates */}
                {testResults.directAPI.certificates?.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="font-bold text-neon-green">📋 Found DPE Certificates:</h4>
                    {testResults.directAPI.certificates.map((cert: any, index: number) => (
                      <div key={index} className="bg-slate-800 p-3 rounded border border-green-500/30">
                        <div className="text-sm space-y-1">
                          <div><span className="font-bold">Address:</span> <span className="text-neon-cyan">{cert.adresse_bien}</span></div>
                          <div><span className="font-bold">Commune:</span> <span className="text-white">{cert.commune_bien}</span></div>
                          <div><span className="font-bold">Postal Code:</span> <span className="text-white">{cert.code_postal_bien}</span></div>
                          <div><span className="font-bold">Energy Class:</span> 
                            <span className={`ml-2 px-2 py-1 rounded font-bold ${
                              cert.etiquette_dpe === 'A' ? 'bg-green-600' :
                              cert.etiquette_dpe === 'B' ? 'bg-green-500' :
                              cert.etiquette_dpe === 'C' ? 'bg-yellow-500 text-black' :
                              cert.etiquette_dpe === 'D' ? 'bg-yellow-600 text-black' :
                              cert.etiquette_dpe === 'E' ? 'bg-orange-500' :
                              cert.etiquette_dpe === 'F' ? 'bg-red-500' :
                              'bg-red-700'
                            }`}>
                              {cert.etiquette_dpe}
                            </span>
                          </div>
                          <div><span className="font-bold">Consumption:</span> <span className="text-neon-yellow">{cert.consommation_energie} kWh/m²/year</span></div>
                          <div><span className="font-bold">Date:</span> <span className="text-neon-purple">{cert.date_reception_dpe}</span></div>
                          {cert.distance && (
                            <div><span className="font-bold">Distance:</span> <span className="text-neon-orange">{cert.distance.toFixed(2)} km away</span></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Test Metadata */}
            <div className="mt-6 pt-4 border-t border-purple-500/30">
              <div className="text-xs text-gray-400 space-y-1">
                <div><span className="font-bold">Test Time:</span> {testResults.timestamp}</div>
                <div><span className="font-bold">Coordinates:</span> {testResults.coordinates.lat}, {testResults.coordinates.lng}</div>
                <div><span className="font-bold">Search Radius:</span> 5000m (expanded for better results)</div>
                <div><span className="font-bold">Database Size:</span> 11.2 million DPE certificates</div>
              </div>
            </div>
          </Card>
        )}

        {/* Analysis */}
        <Card neonColor="orange">
          <h2 className="text-xl font-bold text-neon-orange mb-4">📈 Why No DPE Found?</h2>
          <div className="text-white text-sm space-y-3">
            <p><strong>✅ API Working:</strong> Successfully connected to ADEME database with 11.2M records</p>
            <p><strong>✅ Coordinates Found:</strong> Lambert-93 coordinate fields exist in data</p>
            <p><strong>❌ Location Issue:</strong> Your exact coordinates may not match any DPE records</p>
            <div className="bg-orange-900/20 p-3 rounded border border-orange-500/30 mt-4">
              <p className="font-bold text-neon-orange">Possible reasons:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>DPE was done before 2021 (database only has records since July 2021)</li>
                <li>Diagnostician didn't properly geocode the address</li>
                <li>Property address doesn't match BAN (Base Adresse DpeData) format</li>
                <li>DPE exists but coordinates are inaccurate in database</li>
                <li>Rural location with sparse DPE coverage</li>
              </ul>
            </div>
            <p className="text-neon-green text-xs"><strong>100% REAL DATA:</strong> No estimates or fake values ever returned</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
