'use client'
import { useState } from 'react'
import MapComponent from '../components/MapComponent'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function Home() {
  const [searchMode, setSearchMode] = useState('regions')
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 1000000,
    propertyType: 'all'
  })

  const handleReset = () => {
    setFilters({
      minPrice: 0,
      maxPrice: 1000000,
      propertyType: 'all'
    })
    setSearchMode('regions')
  }

  return (
    <div 
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        backgroundColor: '#001428',
        background: 'linear-gradient(135deg, #001428 0%, #002851 50%, #003d7a 100%)',
        fontFamily: 'Orbitron, monospace'
      }}
    >
      {/* Animated scanlines background */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.1) 2px, rgba(0,255,255,0.1) 4px)',
          animation: 'scan 3s linear infinite'
        }}
      />

      {/* Left Sidebar - Controls */}
      <div 
        style={{
          width: '320px',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '20px',
          overflowY: 'auto',
          borderRight: '2px solid rgba(0, 255, 255, 0.2)'
        }}
      >
        {/* Header */}
        <Card neonColor="pink" className="backdrop-blur-md">
          <div className="text-center">
            <h1 className="font-retro text-3xl font-bold text-neon-pink animate-glow mb-2">
              BARRACUDA
            </h1>
            <p className="text-neon-cyan text-sm font-retro uppercase tracking-wider">
              Real Estate Intelligence
            </p>
            <div className="flex justify-center items-center mt-3 text-xs">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse mr-2"></div>
              <span className="text-neon-green font-retro">SYSTEM ACTIVE</span>
            </div>
          </div>
        </Card>

        {/* Search Mode */}
        <Card neonColor="cyan" className="backdrop-blur-md">
          <div className="text-center mb-4">
            <h3 className="font-retro text-lg font-bold text-neon-cyan uppercase tracking-wider">
              🎯 Search Mode
            </h3>
          </div>
          <div className="space-y-3">
            <Button 
              neonColor="cyan" 
              size="md"
              variant={searchMode === 'regions' ? 'primary' : 'secondary'}
              onClick={() => setSearchMode('regions')}
              className="w-full"
            >
              📍 REGIONS
            </Button>
            <Button 
              neonColor="pink" 
              size="md"
              variant={searchMode === 'radius' ? 'primary' : 'secondary'}
              onClick={() => setSearchMode('radius')}
              className="w-full"
            >
              ⭕ RADIUS
            </Button>
          </div>
        </Card>

        {/* Filters */}
        <Card neonColor="yellow" className="backdrop-blur-md flex-1">
          <div className="text-center mb-4">
            <h3 className="font-retro text-lg font-bold text-neon-yellow uppercase tracking-wider">
              ⚡ Filters
            </h3>
          </div>
          
          <div className="space-y-6">
            {/* Price Filter */}
            <div>
              <label 
                htmlFor="price-slider"
                className="text-neon-yellow text-sm font-retro block mb-3 uppercase tracking-wide"
              >
                💰 Max Price
              </label>
              <input 
                id="price-slider"
                name="maxPrice"
                type="range"
                min="50000"
                max="2000000"
                step="50000"
                value={filters.maxPrice}
                onChange={(e) => setFilters({...filters, maxPrice: parseInt(e.target.value)})}
                className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-neon-yellow"
                style={{
                  background: `linear-gradient(to right, #ffff00 0%, #ffff00 ${((filters.maxPrice - 50000) / (2000000 - 50000)) * 100}%, #1e3a5f ${((filters.maxPrice - 50000) / (2000000 - 50000)) * 100}%, #1e3a5f 100%)`
                }}
              />
              <div 
                className="text-center text-white text-sm font-retro mt-2 p-2 bg-surface/70 rounded-lg border border-neon-yellow/50"
                style={{ textShadow: '0 0 10px #ffff00' }}
              >
                €{filters.maxPrice.toLocaleString()}
              </div>
            </div>

            {/* Property Type Filter */}
            <div>
              <label 
                htmlFor="property-type"
                className="text-neon-yellow text-sm font-retro block mb-3 uppercase tracking-wide"
              >
                🏠 Property Type
              </label>
              <select 
                id="property-type"
                name="propertyType"
                value={filters.propertyType}
                onChange={(e) => setFilters({...filters, propertyType: e.target.value})}
                className="w-full bg-surface border-2 border-neon-yellow/50 text-white font-retro text-sm p-3 rounded-lg focus:border-neon-yellow focus:outline-none focus:shadow-neon transition-all duration-300"
                style={{ textShadow: '0 0 5px rgba(255,255,255,0.5)' }}
              >
                <option value="all">🌟 ALL TYPES</option>
                <option value="house">🏡 HOUSES</option>
                <option value="apartment">🏢 APARTMENTS</option>
                <option value="land">🌾 LAND</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card neonColor="green" className="backdrop-blur-md">
          <div className="space-y-3">
            <Button 
              neonColor="green" 
              size="md"
              className="w-full"
              onClick={() => console.log('Export data:', { searchMode, filters })}
            >
              💾 EXPORT DATA
            </Button>
            <Button 
              neonColor="orange" 
              size="md"
              variant="secondary"
              className="w-full"
              onClick={handleReset}
            >
              🔄 RESET ALL
            </Button>
          </div>
        </Card>
      </div>

      {/* Main Map Area */}
      <div 
        style={{
          flex: 1,
          height: '100vh',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* Map Container */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Card neonColor="cyan" className="h-full p-3">
            <MapComponent />
          </Card>
        </div>
        
        {/* Status Bar */}
        <Card neonColor="purple" className="backdrop-blur-md">
          <div className="flex justify-between items-center text-sm font-retro">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <span className="text-neon-purple">STATUS:</span>
                <span className="text-neon-green ml-2">OPERATIONAL</span>
              </div>
              <div className="flex items-center">
                <span className="text-neon-yellow">MODE:</span>
                <span className="text-white ml-2">{searchMode.toUpperCase()}</span>
              </div>
              <div className="flex items-center">
                <span className="text-neon-orange">PRICE:</span>
                <span className="text-white ml-2">≤€{(filters.maxPrice / 1000).toFixed(0)}K</span>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-text-secondary">COORDINATES: 48.8566°N, 2.3522°E</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse mr-2"></div>
                <span className="text-neon-green">SCANNING REGIONS</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
