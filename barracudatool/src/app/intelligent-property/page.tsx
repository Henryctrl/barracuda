'use client'
import { useState } from 'react'
import IntelligentMap from '../../components/IntelligentMap'
import PropertyIntelligence from '../../components/PropertyIntelligence'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export interface PropertyData {
  // Cadastral Information
  parcelId: string
  coordinates: { lat: number; lon: number }
  area: number
  commune: string
  department: string
  section: string
  numero: string
  
  // Address Data
  standardizedAddress?: string
  postalCode?: string
  
  // Building Information
  constructionYear?: number
  buildingType?: string
  floors?: number
  
  // DPE Information
  dpeMatches: Array<{
    id: string
    address: string
    energyClass: string
    ghgClass: string
    consumption: number
    surface: number
    establishmentDate: string
    expiryDate: string
    isActive: boolean
    confidenceScore: number
    matchReason: string
    annualCost?: number
  }>
  exactDpe?: {
    id: string
    address: string
    energyClass: string
    ghgClass: string
    consumption: number
    surface: number
    establishmentDate: string
    expiryDate: string
    isActive: boolean
    annualCost?: number
  }
  
  // Sales Information
  salesHistory: Array<{
    date: string
    price: number
    surface: number
    pricePerSqm: number
    type: string
  }>
  
  // Data Quality
  dataQuality: {
    cadastralConfidence: number
    addressConfidence: number
    dpeConfidence: number
    overall: number
  }
}

interface DataLayers {
  cadastral: boolean
  dpe: boolean
  sales: boolean
  buildings: boolean
}

export default function IntelligentPropertyPage() {
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null)
  const [dataLayers, setDataLayers] = useState<DataLayers>({
    cadastral: true,
    dpe: true,
    sales: true,
    buildings: true
  })
  const [isLoading, setIsLoading] = useState(false)
  const [searchMode, setSearchMode] = useState<'precision' | 'comprehensive'>('precision')

  const handlePropertySelect = (property: PropertyData | null) => {
    setSelectedProperty(property)
  }

  const handleSearch = (parcelId: string) => {
    setIsLoading(true)
    // This will be handled by the IntelligentMap component
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
      {/* Left Control Panel */}
      <div 
        style={{
          width: '380px',
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
            <h1 className="font-retro text-2xl font-bold text-neon-pink animate-glow mb-2">
              BARRACUDA INTELLIGENCE
            </h1>
            <p className="text-neon-cyan text-xs font-retro uppercase tracking-wider">
              🇫🇷 OFFICIAL GOVERNMENT DATA ONLY
            </p>
            <div className="flex justify-center items-center mt-3 text-xs">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse mr-2"></div>
              <span className="text-neon-green font-retro">INTELLIGENT MATCHING ACTIVE</span>
            </div>
          </div>
        </Card>

        {/* Search Mode */}
        <Card neonColor="yellow" className="backdrop-blur-md flex-shrink-0">
          <div className="text-center mb-4">
            <h3 className="font-retro text-sm font-bold text-neon-yellow uppercase tracking-wider">
              🎯 Search Mode
            </h3>
          </div>
          <div className="space-y-3">
            <Button 
              neonColor="yellow" 
              size="sm"
              variant={searchMode === 'precision' ? 'primary' : 'secondary'}
              onClick={() => setSearchMode('precision')}
              className="w-full"
            >
              🎯 Precision Mode
            </Button>
            <Button 
              neonColor="orange" 
              size="sm"
              variant={searchMode === 'comprehensive' ? 'primary' : 'secondary'}
              onClick={() => setSearchMode('comprehensive')}
              className="w-full"
            >
              🔍 Comprehensive Mode
            </Button>
            <div className="text-xs text-neon-cyan mt-2">
              {searchMode === 'precision' ? 
                'Only exact matches (90%+ confidence)' : 
                'All viable matches (70%+ confidence)'
              }
            </div>
          </div>
        </Card>

        {/* Data Layers */}
        <Card neonColor="cyan" className="backdrop-blur-md flex-shrink-0">
          <div className="text-center mb-4">
            <h3 className="font-retro text-sm font-bold text-neon-cyan uppercase tracking-wider">
              🗺️ Intelligence Layers
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-retro text-xs">📋 IGN Cadastral</span>
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
              <span className="text-white font-retro text-xs">⚡ ADEME DPE</span>
              <Button
                neonColor={dataLayers.dpe ? "green" : "orange"}
                size="sm"
                variant={dataLayers.dpe ? "primary" : "secondary"}
                onClick={() => setDataLayers({...dataLayers, dpe: !dataLayers.dpe})}
              >
                {dataLayers.dpe ? "ON" : "OFF"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-retro text-xs">💰 DVF Sales</span>
              <Button
                neonColor={dataLayers.sales ? "green" : "orange"}
                size="sm"
                variant={dataLayers.sales ? "primary" : "secondary"}
                onClick={() => setDataLayers({...dataLayers, sales: !dataLayers.sales})}
              >
                {dataLayers.sales ? "ON" : "OFF"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-retro text-xs">🏠 Buildings</span>
              <Button
                neonColor={dataLayers.buildings ? "green" : "orange"}
                size="sm"
                variant={dataLayers.buildings ? "primary" : "secondary"}
                onClick={() => setDataLayers({...dataLayers, buildings: !dataLayers.buildings})}
              >
                {dataLayers.buildings ? "ON" : "OFF"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Property Intelligence Panel */}
        <div className="flex-1 min-h-0">
          <PropertyIntelligence 
            selectedProperty={selectedProperty}
            isLoading={isLoading}
          />
        </div>

        {/* System Status */}
        <Card neonColor="purple" className="backdrop-blur-md flex-shrink-0">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neon-purple">APIs:</span>
              <span className="text-neon-green">ONLINE</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neon-purple">Quality:</span>
              <span className="text-neon-green">GOVERNMENT VERIFIED</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neon-purple">Mode:</span>
              <span className="text-neon-yellow">{searchMode.toUpperCase()}</span>
            </div>
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
            <IntelligentMap 
              onPropertySelect={handlePropertySelect}
              dataLayers={dataLayers}
              searchMode={searchMode}
              setIsLoading={setIsLoading}
            />
          </Card>
        </div>
        
        {/* Status Bar */}
        <Card neonColor="purple" className="backdrop-blur-md mt-4 flex-shrink-0">
          <div className="flex justify-between items-center text-xs font-retro">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-neon-purple">SOURCE:</span>
                <span className="text-neon-green ml-2">IGN + ADEME + BAN</span>
              </div>
              <div className="flex items-center">
                <span className="text-neon-yellow">MODE:</span>
                <span className="text-white ml-2">{searchMode.toUpperCase()}</span>
              </div>
              {selectedProperty && (
                <div className="flex items-center">
                  <span className="text-neon-cyan">CONFIDENCE:</span>
                  <span className={`ml-2 ${
                    selectedProperty.dataQuality.overall >= 90 ? 'text-neon-green' :
                    selectedProperty.dataQuality.overall >= 70 ? 'text-neon-yellow' :
                    'text-neon-orange'
                  }`}>
                    {selectedProperty.dataQuality.overall}%
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-text-secondary">Official French Government Data</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse mr-2"></div>
                <span className="text-neon-green">INTELLIGENT</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
