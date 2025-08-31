'use client'
import React, { useState } from 'react'
import Button from './ui/Button'
import Card from './ui/Card'
import type { PropertyData } from '../app/intelligent-property/page'

interface PropertyIntelligenceProps {
  selectedProperty: PropertyData | null
  isLoading: boolean
}

export default function PropertyIntelligence({ selectedProperty, isLoading }: PropertyIntelligenceProps) {
  const [showAllMatches, setShowAllMatches] = useState(false)
  const [showSalesHistory, setShowSalesHistory] = useState(false)

  const formatEnergyClass = (energyClass: string) => {
    const colors = {
      'A': '#00a651', 'B': '#4cb847', 'C': '#f4e300', 'D': '#f0c61b',
      'E': '#ee8700', 'F': '#e2001a', 'G': '#8b0000'
    };
    return (
      <span style={{ 
        backgroundColor: colors[energyClass as keyof typeof colors] || '#ccc',
        color: ['A', 'B', 'C'].includes(energyClass) ? 'white' : 'black',
        padding: '4px 8px', 
        borderRadius: '4px', 
        fontWeight: 'bold',
        fontSize: '12px'
      }}>
        {energyClass || 'N/A'}
      </span>
    );
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-neon-green'
    if (score >= 70) return 'text-neon-yellow'
    return 'text-neon-orange'
  }

  const getConfidenceBorder = (score: number) => {
    if (score >= 90) return 'border-neon-green/70 bg-green-900/20'
    if (score >= 70) return 'border-neon-yellow/70 bg-yellow-900/20'
    return 'border-neon-orange/70 bg-red-900/20'
  }

  if (isLoading) {
    return (
      <Card neonColor="green" className="backdrop-blur-md h-full">
        <div className="text-center">
          <h3 className="font-retro text-lg font-bold text-neon-green uppercase tracking-wider mb-4">
            🧠 Analyzing Property
          </h3>
          <div className="space-y-3 text-neon-cyan text-sm">
            <div className="animate-pulse">🔍 Querying IGN Cadastral Database...</div>
            <div className="animate-pulse">📍 Standardizing Address with BAN...</div>
            <div className="animate-pulse">⚡ Matching DPE Records...</div>
            <div className="animate-pulse">💰 Retrieving Sales History...</div>
            <div className="animate-pulse">🎯 Calculating Confidence Scores...</div>
          </div>
        </div>
      </Card>
    )
  }

  if (!selectedProperty) {
    return (
      <Card neonColor="green" className="backdrop-blur-md h-full">
        <div className="text-center">
          <h3 className="font-retro text-lg font-bold text-neon-green uppercase tracking-wider mb-4">
            🧠 Property Intelligence
          </h3>
          <div className="text-center text-text-secondary text-sm">
            <div className="text-6xl mb-4">🎯</div>
            <p className="font-retro mb-4">
              Click on any cadastral parcel to perform intelligent analysis using official French government data
            </p>
            <div className="text-neon-green text-xs font-retro bg-surface/30 p-3 rounded">
              ✅ IGN Cadastral Authority<br/>
              ✅ ADEME Energy Database<br/>
              ✅ BAN Address Registry<br/>
              ✅ DVF Sales Records
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card neonColor="green" className="backdrop-blur-md h-full">
      <div className="text-center mb-4">
        <h3 className="font-retro text-lg font-bold text-neon-green uppercase tracking-wider">
          🧠 Property Intelligence
        </h3>
        <div className={`text-sm mt-2 ${getConfidenceColor(selectedProperty.dataQuality.overall)}`}>
          Overall Confidence: {selectedProperty.dataQuality.overall}%
        </div>
      </div>
      
      <div className="space-y-4 overflow-y-auto">
        {/* Data Quality Overview */}
        <div className={`bg-surface/50 p-3 rounded border-2 ${getConfidenceBorder(selectedProperty.dataQuality.overall)}`}>
          <h4 className="font-retro text-sm mb-3 text-neon-green">
            📊 DATA QUALITY ANALYSIS
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-white">Cadastral:</span>
              <span className={`ml-2 ${getConfidenceColor(selectedProperty.dataQuality.cadastralConfidence)}`}>
                {selectedProperty.dataQuality.cadastralConfidence}%
              </span>
            </div>
            <div>
              <span className="text-white">Address:</span>
              <span className={`ml-2 ${getConfidenceColor(selectedProperty.dataQuality.addressConfidence)}`}>
                {selectedProperty.dataQuality.addressConfidence}%
              </span>
            </div>
            <div>
              <span className="text-white">DPE:</span>
              <span className={`ml-2 ${getConfidenceColor(selectedProperty.dataQuality.dpeConfidence)}`}>
                {selectedProperty.dataQuality.dpeConfidence}%
              </span>
            </div>
            <div>
              <span className="text-white">Overall:</span>
              <span className={`ml-2 font-bold ${getConfidenceColor(selectedProperty.dataQuality.overall)}`}>
                {selectedProperty.dataQuality.overall}%
              </span>
            </div>
          </div>
        </div>

        {/* Cadastral Information */}
        <div className="bg-surface/50 p-3 rounded border border-neon-cyan/30">
          <h4 className="text-neon-cyan font-retro text-sm mb-2">📋 CADASTRAL DATA (IGN)</h4>
          <div className="text-white text-xs space-y-1">
            <div>Parcel ID: <span className="text-neon-cyan font-mono">{selectedProperty.parcelId}</span></div>
            <div>Area: <span className="text-neon-yellow">{selectedProperty.area} m²</span></div>
            <div>Section: <span className="text-neon-cyan">{selectedProperty.section}{selectedProperty.numero}</span></div>
            <div>Commune: <span className="text-neon-cyan">{selectedProperty.commune}</span></div>
            <div>Department: <span className="text-white">{selectedProperty.department}</span></div>
            {selectedProperty.constructionYear && (
              <div>Built: <span className="text-neon-orange">{selectedProperty.constructionYear}</span></div>
            )}
            {selectedProperty.buildingType && (
              <div>Type: <span className="text-white">{selectedProperty.buildingType}</span></div>
            )}
          </div>
        </div>

        {/* Address Information */}
        {selectedProperty.standardizedAddress && (
          <div className="bg-surface/50 p-3 rounded border border-neon-purple/30">
            <h4 className="text-neon-purple font-retro text-sm mb-2">📍 STANDARDIZED ADDRESS (BAN)</h4>
            <div className="text-white text-xs space-y-1">
              <div>Address: <span className="text-neon-cyan">{selectedProperty.standardizedAddress}</span></div>
              {selectedProperty.postalCode && (
                <div>Postal Code: <span className="text-neon-yellow">{selectedProperty.postalCode}</span></div>
              )}
            </div>
          </div>
        )}

        {/* DPE Information */}
        <div className="bg-surface/50 p-3 rounded border border-neon-purple/30">
          <h4 className="text-neon-purple font-retro text-sm mb-2">⚡ ENERGY PERFORMANCE (ADEME)</h4>
          
          {selectedProperty.exactDpe ? (
            <div className="space-y-2">
              <div className="text-neon-green font-bold text-sm">✅ EXACT DPE MATCH FOUND</div>
              <div className="bg-green-900/20 p-2 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs">Energy/GHG Classes:</span>
                  <div className="flex space-x-2">
                    {formatEnergyClass(selectedProperty.exactDpe.energyClass)}
                    {formatEnergyClass(selectedProperty.exactDpe.ghgClass)}
                  </div>
                </div>
                <div className="text-xs space-y-1 text-white">
                  <div>Consumption: <span className="text-neon-yellow">{selectedProperty.exactDpe.consumption} kWh/m²/year</span></div>
                  <div>Surface: <span className="text-neon-yellow">{selectedProperty.exactDpe.surface} m²</span></div>
                  <div>Certificate: <span className="text-neon-cyan">{selectedProperty.exactDpe.id}</span></div>
                  <div>Established: <span className="text-neon-cyan">{new Date(selectedProperty.exactDpe.establishmentDate).toLocaleDateString()}</span></div>
                  {selectedProperty.exactDpe.annualCost && (
                    <div>Annual Cost: <span className="text-neon-orange">€{Math.round(selectedProperty.exactDpe.annualCost)}</span></div>
                  )}
                </div>
              </div>
            </div>
          ) : selectedProperty.dpeMatches.length > 0 ? (
            <div className="space-y-2">
              <div className="text-neon-orange font-bold text-sm">⚠️ NO EXACT MATCH - {selectedProperty.dpeMatches.length} CANDIDATES</div>
              <div className="text-xs text-white mb-2">
                Best match has {Math.max(...selectedProperty.dpeMatches.map(m => m.confidenceScore))}% confidence
              </div>
              <Button 
                neonColor="orange"
                size="sm"
                className="w-full"
                onClick={() => setShowAllMatches(true)}
              >
                🔍 View All {selectedProperty.dpeMatches.length} Candidates
              </Button>
            </div>
          ) : (
            <div className="text-neon-red font-bold text-sm">❌ NO DPE CERTIFICATES FOUND</div>
          )}
        </div>

        {/* Sales History */}
        {selectedProperty.salesHistory.length > 0 && (
          <div className="bg-surface/50 p-3 rounded border border-neon-green/30">
            <h4 className="text-neon-green font-retro text-sm mb-2">💰 SALES HISTORY (DVF)</h4>
            <div className="space-y-2">
              <div className="text-neon-green font-bold text-sm">
                ✅ {selectedProperty.salesHistory.length} TRANSACTION{selectedProperty.salesHistory.length > 1 ? 'S' : ''} FOUND
              </div>
              {selectedProperty.salesHistory.slice(0, 2).map((sale, index) => (
                <div key={index} className="bg-green-900/20 p-2 rounded text-xs">
                  <div className="text-white space-y-1">
                    <div>Date: <span className="text-neon-cyan">{sale.date}</span></div>
                    <div>Price: <span className="text-neon-yellow">€{sale.price.toLocaleString()}</span></div>
                    <div>Price/m²: <span className="text-neon-orange">€{sale.pricePerSqm}/m²</span></div>
                    <div>Type: <span className="text-white">{sale.type}</span></div>
                  </div>
                </div>
              ))}
              {selectedProperty.salesHistory.length > 2 && (
                <Button 
                  neonColor="green"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowSalesHistory(true)}
                >
                  💰 View All {selectedProperty.salesHistory.length} Sales
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DPE Candidates Modal */}
      {showAllMatches && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowAllMatches(false)}
        >
          <div
            className="max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Card neonColor="orange" className="backdrop-blur-md">
              <div className="text-center mb-4">
                <h3 className="font-retro text-lg font-bold uppercase tracking-wider text-neon-orange">
                  🔍 All DPE Candidates
                </h3>
                <div className="text-xs text-white mt-2">
                  Found {selectedProperty!.dpeMatches.length} potential matches - none meet exact criteria
                </div>
              </div>
              <div className="space-y-4 p-4">
                {selectedProperty!.dpeMatches.map((candidate, index) => (
                  <div key={index} className={`bg-surface/50 p-3 rounded border ${
                    candidate.confidenceScore >= 90 ? 'border-neon-green/50' :
                    candidate.confidenceScore >= 70 ? 'border-neon-yellow/50' : 
                    'border-neon-red/50'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-white font-bold text-sm">
                        🆔 {candidate.id}
                      </h4>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        candidate.confidenceScore >= 90 ? 'bg-green-600 text-white' :
                        candidate.confidenceScore >= 70 ? 'bg-yellow-600 text-black' :
                        'bg-red-600 text-white'
                      }`}>
                        {candidate.confidenceScore}% confidence
                      </span>
                    </div>
                    
                    <div className="text-white text-xs space-y-1">
                      <div>📍 <strong>Address:</strong> {candidate.address}</div>
                      
                      <div className="flex items-center space-x-4">
                        <div>⚡ <strong>Energy:</strong> {formatEnergyClass(candidate.energyClass)}</div>
                        <div>🌱 <strong>GHG:</strong> {formatEnergyClass(candidate.ghgClass)}</div>
                      </div>
                      
                      <div>📐 <strong>Surface:</strong> {candidate.surface} m²</div>
                      <div>⚡ <strong>Consumption:</strong> {candidate.consumption} kWh/m²</div>
                      <div>📅 <strong>Established:</strong> {new Date(candidate.establishmentDate).toLocaleDateString()}</div>
                      
                      <div className="mt-2 p-2 rounded text-xs bg-red-900/30 text-red-300">
                        <strong>Match reason:</strong> {candidate.matchReason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                neonColor="cyan" 
                size="sm"
                variant="secondary"
                className="w-full mt-4"
                onClick={() => setShowAllMatches(false)}
              >
                Close
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* Sales History Modal */}
      {showSalesHistory && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowSalesHistory(false)}
        >
          <div
            className="max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Card neonColor="green" className="backdrop-blur-md">
              <div className="text-center mb-4">
                <h3 className="font-retro text-lg font-bold uppercase tracking-wider text-neon-green">
                  💰 Complete Sales History
                </h3>
                <div className="text-xs text-white mt-2">
                  {selectedProperty!.salesHistory.length} transactions found in DVF database
                </div>
              </div>
              <div className="space-y-4 p-4">
                {selectedProperty!.salesHistory.map((sale, index) => (
                  <div key={index} className="bg-surface/50 p-3 rounded border border-neon-green/50">
                    <div className="text-white text-xs space-y-1">
                      {index === 0 && (
                        <div className="text-neon-green font-bold text-xs mb-2">MOST RECENT SALE</div>
                      )}
                      <div>Date: <span className="text-neon-cyan">{sale.date}</span></div>
                      <div>Price: <span className="text-neon-yellow">€{sale.price.toLocaleString()}</span></div>
                      <div>Surface: <span className="text-neon-yellow">{sale.surface} m²</span></div>
                      <div>Price/m²: <span className="text-neon-orange">€{sale.pricePerSqm}/m²</span></div>
                      <div>Type: <span className="text-white">{sale.type}</span></div>
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                neonColor="cyan" 
                size="sm"
                variant="secondary"
                className="w-full mt-4"
                onClick={() => setShowSalesHistory(false)}
              >
                Close
              </Button>
            </Card>
          </div>
        </div>
      )}
    </Card>
  )
}
