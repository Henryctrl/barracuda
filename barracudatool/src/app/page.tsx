'use client'
import { useState } from 'react'
import MapComponent from '../components/MapComponent'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function Home() {
  const [activeView, setActiveView] = useState('regions')

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" 
             style={{
               backgroundImage: 'linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)',
               backgroundSize: '50px 50px',
               animation: 'pulse 4s ease-in-out infinite'
             }} />
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 z-20">
        <Card neonColor="pink" className="backdrop-blur-md border-4">
          <h1 className="font-retro text-3xl font-bold text-neon-pink animate-glow">
            BARRACUDA
          </h1>
          <p className="text-neon-cyan text-lg font-retro mt-1">
            Real Estate Intelligence
          </p>
          <div className="text-text-secondary text-xs mt-2">
            🎮 Retro Arcade Edition v1.0
          </div>
        </Card>
      </div>

      {/* Enhanced Control Panel */}
      <div className="absolute top-4 right-4 z-20">
        <Card neonColor="cyan" className="backdrop-blur-md border-4 min-w-[200px]">
          <h3 className="font-retro text-lg font-bold text-neon-cyan mb-4">
            CONTROL PANEL
          </h3>
          
          <div className="space-y-3">
            <Button 
              neonColor="cyan" 
              size="sm"
              variant={activeView === 'search' ? 'primary' : 'secondary'}
              onClick={() => {
                setActiveView('search')
                console.log('Search mode activated')
              }}
              className="w-full"
            >
              🔍 SEARCH
            </Button>
            
            <Button 
              neonColor="yellow" 
              size="sm"
              variant={activeView === 'filters' ? 'primary' : 'secondary'}
              onClick={() => {
                setActiveView('filters')
                console.log('Filter mode activated')
              }}
              className="w-full"
            >
              ⚡ FILTERS
            </Button>
            
            <Button 
              neonColor="green" 
              size="sm"
              variant={activeView === 'data' ? 'primary' : 'secondary'}
              onClick={() => {
                setActiveView('data')
                console.log('Data mode activated')
              }}
              className="w-full"
            >
              📊 DATA
            </Button>
          </div>
        </Card>
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-4 left-4 z-20">
        <Card neonColor="green" className="backdrop-blur-md">
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-neon-green font-retro">
              STATUS: ONLINE
            </div>
            <div className="text-text-secondary">
              MODE: {activeView.toUpperCase()}
            </div>
            <div className="text-neon-yellow animate-pulse">
              ● SCANNING
            </div>
          </div>
        </Card>
      </div>

      {/* Map Container */}
      <div className="h-screen p-4">
        <MapComponent />
      </div>
    </main>
  )
}
