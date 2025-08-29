// barracudatool/src/app/page.tsx

'use client'
import { useState } from 'react'
import MapComponent from '../components/MapComponent'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

interface PropertyInfo {
  cadastralId: string | null
  size: number | null
  zone: string | null
  commune?: string
  department?: string
  population?: number
  lastSaleDate?: string
  lastSalePrice?: number
  pricePerSqm?: number
  section?: string
  numero?: string
  dataSource: 'real_cadastral' | 'no_data'
  dpeRating?: {
    energy: string
    ghg: string
    date: string
    consumption?: number
  }
  transactions?: Array<{
    sale_date: string
    sale_price: number
    property_type: string
    surface_area: number
    municipality: string
    postal_code: string
  }>
  hasSales?: boolean
  salesCount?: number
}

interface DataLayers {
  cadastral: boolean
  dvf: boolean
  dpe: boolean
}

export default function Home() {
  const [viewMode, setViewMode] = useState<'cadastral' | 'market'>('cadastral')
  const [selectedProperty, setSelectedProperty] = useState<PropertyInfo | null>(null)
  const [dataLayers, setDataLayers] = useState<DataLayers>({
    cadastral: true,
    dvf: true,
    dpe: false
  })
  const [isDvfModalOpen, setIsDvfModalOpen] = useState(false)

  const handlePropertySelect = (property: PropertyInfo | null) => {
    setSelectedProperty(property)
  }

  return (
    <div 
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        backgroundColor: '#001428',
        background: 'linear-gradient(135deg, #001428 0%, #002851 50%, #003d7a 100%)',
        fontFamily: 'Orbitron, monospace',
        overflow: 'hidden'
      }}
    >
      {/* Left Sidebar */}
      <div 
        style={{
          width: '350px',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '20px',
          overflowY: 'auto',
          borderRight: '2px solid rgba(0, 255, 255, 0.2)',
          flexShrink: 0
        }}
      >
        {/* Header */}
        <Card neonColor="pink" className="backdrop-blur-md flex-shrink-0">
          <div className="text-center">
            <h1 className="font-retro text-3xl font-bold text-neon-pink animate-glow mb-2">
              BARRACUDA
            </h1>
            <p className="text-neon-cyan text-sm font-retro uppercase tracking-wider">
              100% REAL DATA - NO ESTIMATES
            </p>
            <div className="flex justify-center items-center mt-3 text-xs">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse mr-2"></div>
              <span className="text-neon-green font-retro">EXACT PLOT MODE ACTIVE</span>
            </div>
          </div>
        </Card>

        {/* Data Layers Toggle */}
        <Card neonColor="cyan" className="backdrop-blur-md flex-shrink-0">
          <div className="text-center mb-4">
            <h3 className="font-retro text-lg font-bold text-neon-cyan uppercase tracking-wider">
              🗺️ Data Layers
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-retro text-sm">📋 Cadastral Plots</span>
              <Button
                neonColor={dataLayers.cadastral ? "green" : "orange"}
                size="sm"
                variant={dataLayers.cadastral ? "primary" : "secondary"}
                onClick={() => setDataLayers({...dataLayers, cadastral: !dataLayers.cadastral})}
              >
                {dataLayers.cadastral ? "ON" : "OFF"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-retro text-sm">💰 DVF Sales</span>
              <Button
                neonColor={dataLayers.dvf ? "green" : "orange"}
                size="sm"
                variant={dataLayers.dvf ? "primary" : "secondary"}
                onClick={() => setDataLayers({...dataLayers, dvf: !dataLayers.dvf})}
              >
                {dataLayers.dvf ? "ON" : "OFF"}
              </Button>
            </div>
          </div>
        </Card>

        {/* View Mode */}
        <Card neonColor="yellow" className="backdrop-blur-md flex-shrink-0">
          <div className="text-center mb-4">
            <h3 className="font-retro text-lg font-bold text-neon-yellow uppercase tracking-wider">
              👁️ View Mode
            </h3>
          </div>
          <div className="space-y-3">
            <Button 
              neonColor="yellow" 
              size="md"
              variant={viewMode === 'cadastral' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('cadastral')}
              className="w-full"
            >
              📊 Plot Analysis
            </Button>
            <Button 
              neonColor="orange" 
              size="md"
              variant={viewMode === 'market' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('market')}
              className="w-full"
            >
              📈 Market View
            </Button>
          </div>
        </Card>

        {/* Property Information Panel */}
        <Card neonColor="green" className="backdrop-blur-md flex-1 min-h-0">
          <div className="text-center mb-4">
            <h3 className="font-retro text-lg font-bold text-neon-green uppercase tracking-wider">
              🏠 Exact Plot Info
            </h3>
          </div>
          
          <div className="overflow-y-auto">
            {selectedProperty ? (
              <div className="space-y-4">
                {/* PROMINENT SALE STATUS */}
                <div className={`bg-surface/50 p-3 rounded border-2 ${
                  selectedProperty.hasSales 
                    ? 'border-neon-green/70 bg-green-900/20' 
                    : 'border-neon-orange/70 bg-red-900/20'
                }`}>
                  <h4 className={`font-retro text-sm mb-3 ${
                    selectedProperty.hasSales ? 'text-neon-green' : 'text-neon-orange'
                  }`}>
                    📊 EXACT PLOT SALE STATUS
                  </h4>
                  <div className="text-white text-xs space-y-2">
                    {selectedProperty.hasSales ? (
                      <>
                        <div className="text-neon-green font-bold text-sm">
                          ✅ THIS EXACT PLOT HAS BEEN SOLD
                        </div>
                        <div>Last Sale: <span className="text-neon-cyan">{selectedProperty.lastSaleDate}</span></div>
                        <div>Sale Price: <span className="text-neon-yellow">€{selectedProperty.lastSalePrice?.toLocaleString()}</span></div>
                        {selectedProperty.pricePerSqm && (
                          <div>Price/m²: <span className="text-neon-orange">€{selectedProperty.pricePerSqm}/m²</span></div>
                        )}
                        {selectedProperty.salesCount && selectedProperty.salesCount > 1 && (
                          <div className="text-neon-purple">
                            Total Sales: <span className="font-bold">{selectedProperty.salesCount}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-neon-orange font-bold text-sm">
                          ❌ NO SALES RECORDED FOR THIS EXACT PLOT
                        </div>
                        <div className="text-text-secondary">
                          This exact plot has no recorded sales in the DVF database since 2014
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Cadastral Info */}
                <div className="bg-surface/50 p-3 rounded border border-neon-green/30">
                  <h4 className="text-neon-green font-retro text-sm mb-2">📋 EXACT CADASTRAL DATA</h4>
                  <div className="text-white text-xs space-y-1">
                    <div>Plot ID: <span className="text-neon-cyan">{selectedProperty.cadastralId || 'N/A'}</span></div>
                    <div>Size: <span className="text-neon-yellow">{selectedProperty.size ? `${selectedProperty.size} m²` : 'N/A'}</span>
                      {selectedProperty.dataSource === 'real_cadastral' && (
                        <span className="text-neon-green ml-2">(REAL)</span>
                      )}
                    </div>
                    <div>Zone: <span className="text-white">{selectedProperty.zone || 'N/A'}</span></div>
                    {selectedProperty.section && selectedProperty.numero && (
                      <div>Section: <span className="text-neon-cyan">{selectedProperty.section}{selectedProperty.numero}</span></div>
                    )}
                    <div>Commune: <span className="text-neon-cyan">{selectedProperty.commune || 'N/A'}</span></div>
                    <div>Department: <span className="text-white">{selectedProperty.department || 'N/A'}</span></div>
                  </div>
                </div>

                {/* DVF Sales Button - ONLY show if there are REAL sales */}
                {selectedProperty.hasSales && selectedProperty.transactions && selectedProperty.transactions.length > 0 && (
                  <Button 
                    neonColor="green"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setIsDvfModalOpen(true)}
                  >
                    💰 View Real Sales ({selectedProperty.salesCount || 1})
                  </Button>
                )}

                {/* Location Info */}
                <div className="bg-surface/50 p-3 rounded border border-neon-purple/30">
                  <h4 className="text-neon-purple font-retro text-sm mb-2">📍 LOCATION</h4>
                  <div className="text-white text-xs space-y-1">
                    <div>Commune: <span className="text-neon-cyan">{selectedProperty.commune}</span></div>
                    <div>Population: <span className="text-neon-yellow">{selectedProperty.population?.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-text-secondary text-sm">
                <div className="text-4xl mb-4">🎯</div>
                <p className="font-retro">Click on a cadastral parcel to check if that exact plot has been sold</p>
                <div className="text-neon-orange text-xs mt-2 font-retro">
                  100% REAL DATA - NO ESTIMATES
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Export Tools */}
        <Card neonColor="purple" className="backdrop-blur-md flex-shrink-0">
          <div className="space-y-2">
            <Button 
              neonColor="purple" 
              size="sm"
              className="w-full"
              onClick={() => console.log('Export property list')}
            >
              📋 Export Results
            </Button>
            <Button 
              neonColor="cyan" 
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => setSelectedProperty(null)}
            >
              🔄 Clear Selection
            </Button>
          </div>
        </Card>
      </div>

      {/* Main Map Area */}
      <div 
        style={{
          flex: 1,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          minWidth: 0
        }}
      >
        {/* Map Container */}
        <div 
          style={{ 
            flex: 1,
            minHeight: 0,
            position: 'relative'
          }}
        >
          <Card neonColor="cyan" className="h-full p-3">
            <MapComponent 
              onPropertySelect={handlePropertySelect}
              dataLayers={dataLayers}
              viewMode={viewMode}
            />
          </Card>
        </div>
        
        {/* Status Bar */}
        <Card neonColor="purple" className="backdrop-blur-md mt-4 flex-shrink-0">
          <div className="flex justify-between items-center text-sm font-retro">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <span className="text-neon-purple">MODE:</span>
                <span className="text-neon-green ml-2">REAL DATA ONLY</span>
              </div>
              <div className="flex items-center">
                <span className="text-neon-yellow">VIEW:</span>
                <span className="text-white ml-2">{viewMode.toUpperCase()}</span>
              </div>
              {selectedProperty && (
                <div className="flex items-center">
                  <span className={selectedProperty.hasSales ? "text-neon-green" : "text-neon-orange"}>
                    STATUS:
                  </span>
                  <span className="text-white ml-2">
                    {selectedProperty.hasSales ? "SOLD" : "NO SALES"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-text-secondary">French Government Data Only</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse mr-2"></div>
                <span className="text-neon-green">100% REAL DATA</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* REAL DATA ONLY DVF Modal */}
      {isDvfModalOpen && selectedProperty && selectedProperty.hasSales && selectedProperty.transactions && selectedProperty.transactions.length > 0 && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            fontFamily: 'Orbitron, monospace'
          }}
          onClick={() => setIsDvfModalOpen(false)}
        >
          <div
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <Card neonColor="green" className="backdrop-blur-md w-96 max-h-[80vh] overflow-y-auto">
              <div className="text-center mb-4">
                <h3 className="font-retro text-lg font-bold uppercase tracking-wider text-neon-green">
                  💰 REAL DVF Sales Data
                </h3>
                <div className="text-xs text-white mt-2">
                  Plot: {selectedProperty.cadastralId} • {selectedProperty.commune}
                </div>
                <div className="text-xs text-neon-green mt-1">
                  100% VERIFIED GOVERNMENT DATA
                </div>
              </div>
              <div className="space-y-4 p-4">
                <div className="text-center text-neon-green font-retro text-sm mb-4">
                  ✅ {selectedProperty.transactions.length} REAL Sale{selectedProperty.transactions.length > 1 ? 's' : ''} Found for This Exact Plot
                </div>
                {selectedProperty.transactions.map((tx, index) => (
                  <div key={index} className={`bg-surface/50 p-3 rounded border ${
                    index === 0 ? 'border-neon-green/50' : 'border-neon-cyan/30'
                  }`}>
                    <div className="text-white text-xs space-y-1">
                      {index === 0 && (
                        <div className="text-neon-green font-bold text-xs mb-1">MOST RECENT SALE</div>
                      )}
                      <div>Date: <span className="text-neon-cyan">{tx.sale_date}</span></div>
                      <div>Price: <span className="text-neon-yellow">€{tx.sale_price.toLocaleString()}</span></div>
                      <div>Type: <span className="text-white">{tx.property_type}</span></div>
                      {tx.surface_area > 0 && (
                        <div>Surface: <span className="text-neon-yellow">{tx.surface_area} m²</span></div>
                      )}
                      <div>Municipality: <span className="text-neon-cyan">{tx.municipality}</span></div>
                      <div>Postal Code: <span className="text-neon-orange">{tx.postal_code}</span></div>
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                neonColor="cyan" 
                size="sm"
                variant="secondary"
                className="w-full mt-4"
                onClick={() => setIsDvfModalOpen(false)}
              >
                Close
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
