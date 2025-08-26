'use client'
import { useState } from 'react'
import MapComponent from '../components/MapComponent'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

// Define property type
interface PropertyInfo {
  cadastralId: string
  size: number
  zone: string
  lastSaleDate?: string
  lastSalePrice?: number
  pricePerSqm?: number
  dpeRating?: {
    energy: string
    ghg: string
    date: string
  }
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
        overflow: 'hidden' // CRITICAL: Prevent page scrolling
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
          flexShrink: 0 // CRITICAL: Prevent sidebar from shrinking
        }}
      >
        {/* Header */}
        <Card neonColor="pink" className="backdrop-blur-md flex-shrink-0">
          <div className="text-center">
            <h1 className="font-retro text-3xl font-bold text-neon-pink animate-glow mb-2">
              BARRACUDA
            </h1>
            <p className="text-neon-cyan text-sm font-retro uppercase tracking-wider">
              Property Prospection Tool
            </p>
            <div className="flex justify-center items-center mt-3 text-xs">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse mr-2"></div>
              <span className="text-neon-green font-retro">SCANNING PROPERTIES</span>
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
            <div className="flex items-center justify-between">
              <span className="text-white font-retro text-sm">⚡ DPE Ratings</span>
              <Button
                neonColor={dataLayers.dpe ? "green" : "orange"}
                size="sm"
                variant={dataLayers.dpe ? "primary" : "secondary"}
                onClick={() => setDataLayers({...dataLayers, dpe: !dataLayers.dpe})}
              >
                {dataLayers.dpe ? "ON" : "OFF"}
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
              🏠 Property Info
            </h3>
          </div>
          
          <div className="overflow-y-auto">
            {selectedProperty ? (
              <div className="space-y-4">
                {/* Cadastral Info */}
                <div className="bg-surface/50 p-3 rounded border border-neon-green/30">
                  <h4 className="text-neon-green font-retro text-sm mb-2">📋 CADASTRAL</h4>
                  <div className="text-white text-xs space-y-1">
                    <div>Plot ID: <span className="text-neon-cyan">{selectedProperty.cadastralId}</span></div>
                    <div>Size: <span className="text-neon-yellow">{selectedProperty.size} m²</span></div>
                    <div>Zone: <span className="text-white">{selectedProperty.zone}</span></div>
                  </div>
                </div>

                {/* Transaction History */}
                {selectedProperty.lastSaleDate && (
                  <div className="bg-surface/50 p-3 rounded border border-neon-green/30">
                    <h4 className="text-neon-green font-retro text-sm mb-2">💰 LAST SALE</h4>
                    <div className="text-white text-xs space-y-1">
                      <div>Date: <span className="text-neon-cyan">{selectedProperty.lastSaleDate}</span></div>
                      <div>Price: <span className="text-neon-yellow">€{selectedProperty.lastSalePrice?.toLocaleString()}</span></div>
                      <div>Price/m²: <span className="text-neon-orange">€{selectedProperty.pricePerSqm}</span></div>
                    </div>
                  </div>
                )}

                {/* DPE Rating */}
                {selectedProperty.dpeRating && (
                  <div className="bg-surface/50 p-3 rounded border border-neon-green/30">
                    <h4 className="text-neon-green font-retro text-sm mb-2">⚡ DPE RATING</h4>
                    <div className="text-white text-xs space-y-1">
                      <div>Energy: <span className="text-neon-yellow">{selectedProperty.dpeRating.energy}</span></div>
                      <div>GHG: <span className="text-neon-orange">{selectedProperty.dpeRating.ghg}</span></div>
                      <div>Date: <span className="text-neon-cyan">{selectedProperty.dpeRating.date}</span></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-text-secondary text-sm">
                <div className="text-4xl mb-4">🎯</div>
                <p className="font-retro">Click on a property plot to view detailed information</p>
                <Button
                  neonColor="cyan"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSelectedProperty({
                      cadastralId: "750114000A0456",
                      size: 850,
                      zone: "UCa"
                    })
                  }}
                >
                  🎲 Demo Property
                </Button>
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
              📋 Export List
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
          minWidth: 0 // CRITICAL: Allow flex item to shrink
        }}
      >
        {/* Map Container */}
        <div 
          style={{ 
            flex: 1,
            minHeight: 0, // CRITICAL: Allow flex item to shrink
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
                <span className="text-neon-purple">DATA:</span>
                <span className="text-neon-green ml-2">
                  {Object.values(dataLayers).filter(Boolean).length} LAYERS ACTIVE
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-neon-yellow">MODE:</span>
                <span className="text-white ml-2">{viewMode.toUpperCase()}</span>
              </div>
              {selectedProperty && (
                <div className="flex items-center">
                  <span className="text-neon-green">SELECTED:</span>
                  <span className="text-white ml-2">{selectedProperty.cadastralId}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-text-secondary">France Cadastral Database</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse mr-2"></div>
                <span className="text-neon-green">READY FOR PROSPECTION</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
