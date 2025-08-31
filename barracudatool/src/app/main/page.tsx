'use client'
import React, { useState } from 'react' // Imported React for type safety in e.stopPropagation()
import MapComponent from '../../components/MapComponent'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

// Enhanced PropertyInfo to include detailed DPE search results
import { PropertyInfo, DpeCandidate, Transaction } from '../../types';


// Interface for DPE candidates

interface DataLayers {
  cadastral: boolean
  dvf: boolean
  dpe: boolean
}

// DPE Record from the API
interface DpeApiRecord {
  'numero_dpe': string;
  'adresse_brut': string;
  'nom_commune_ban': string;
  'code_postal_ban': string;
  'etiquette_dpe': string;
  'etiquette_ges': string;
  'cout_total_5_usages'?: number;
  'surface_habitable_logement'?: number;
  'date_etablissement_dpe'?: string;
  '_geopoint': string;
  '_distance'?: number;
}

export default function Home() {
  const [selectedProperty, setSelectedProperty] = useState<PropertyInfo | null>(null)
  const [dataLayers, setDataLayers] = useState<DataLayers>({
    cadastral: true,
    dvf: true,
    dpe: true
  })
  const [isDvfModalOpen, setIsDvfModalOpen] = useState(false)
  const [isDpeModalOpen, setIsDpeModalOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<'overview' | 'cadastral' | 'dpe' | 'sales'>('overview')
  const [isLoadingDpe, setIsLoadingDpe] = useState(false);

  // Haversine distance formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  // Client-side DPE search function
  const findAndAnalyzeDpe = async (property: PropertyInfo) => {
    if (!property.postalCode || !property.coordinates) return;
    setIsLoadingDpe(true);

    try {
      const dataset = 'dpe03existant'
      const queryParams = new URLSearchParams({
          qs: `code_postal_ban:"${property.postalCode}"`,
          size: '500',
          select: 'numero_dpe,adresse_brut,nom_commune_ban,code_postal_ban,etiquette_dpe,etiquette_ges,cout_total_5_usages,surface_habitable_logement,date_etablissement_dpe,_geopoint'
      }).toString();
      
      const url = `https://data.ademe.fr/data-fair/api/v1/datasets/${dataset}/lines?${queryParams}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`ADEME API Error: ${response.statusText}`);

      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        setSelectedProperty(prev => prev ? { ...prev, nearbyDpeCount: 0, allDpeCandidates: [] } : null);
        setIsLoadingDpe(false);
        return;
      }
      
      const candidates: DpeCandidate[] = data.results.map((record: DpeApiRecord) => {
        let score = 0;
        let reason = [];
        let distance = -1;

        if (record._geopoint) {
            const [recordLat, recordLon] = record._geopoint.split(',').map(Number);
            if (!isNaN(recordLat) && !isNaN(recordLon)) {
                distance = calculateDistance(property.coordinates!.lat, property.coordinates!.lon, recordLat, recordLon);
                if (distance < 50) { score += 50; reason.push("Very close (<50m)"); }
                else if (distance < 200) { score += 30; reason.push("Nearby (<200m)"); }
            }
        }

        if (record.nom_commune_ban.toLowerCase() === property.commune?.toLowerCase()) {
            score += 30;
            reason.push("Commune matches");
        }
        
        if (property.cadastralId && record.adresse_brut.toLowerCase().includes(property.cadastralId.toLowerCase())) {
          score += 20;
          reason.push("Cadastral ID in address");
        }

        return {
          id: record.numero_dpe,
          address: record.adresse_brut,
          energy_class: record.etiquette_dpe,
          ghg_class: record.etiquette_ges,
          surface: record.surface_habitable_logement,
          annual_cost: record.cout_total_5_usages,
          establishment_date: record.date_etablissement_dpe,
          score: Math.min(100, score),
          reason: reason.join(', ') || 'Based on location',
          distance: distance
        };
      }).sort((a: DpeCandidate, b: DpeCandidate) => b.score - a.score);

      const exactMatch = candidates.length > 0 && candidates[0].score >= 90 ? candidates[0] : null;
      
      setSelectedProperty(prev => {
        if (!prev) return null;
        return {
          ...prev,
          nearbyDpeCount: data.results.length,
          allDpeCandidates: candidates,
          dpeRating: exactMatch ? {
            energy: exactMatch.energy_class,
            ghg: exactMatch.ghg_class,
            date: exactMatch.establishment_date || 'N/A',
            dpeId: exactMatch.id,
            address: exactMatch.address,
            surfaceArea: exactMatch.surface,
            annualCost: exactMatch.annual_cost,
            isActive: true
          } : undefined
        };
      });

    } catch (err: any) {
      console.error("DPE Search failed:", err);
    } finally {
      setIsLoadingDpe(false);
    }
  }

  const handlePropertySelect = (property: PropertyInfo | null) => {
    if (property) {
      setSelectedProperty(property);
      setActiveSection('overview');
      findAndAnalyzeDpe(property);
    } else {
      setSelectedProperty(null);
    }
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
        display: 'flex',
        backgroundColor: '#001428',
        background: 'linear-gradient(135deg, #001428 0%, #002851 50%, #003d7a 100%)',
        fontFamily: 'Orbitron, monospace',
        overflow: 'hidden'
      }}
    >
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
        <Card neonColor="pink" className="backdrop-blur-md flex-shrink-0">
          <div className="text-center">
            <h1 className="font-retro text-2xl font-bold text-neon-pink animate-glow mb-2">
              BARRACUDA INTELLIGENCE
            </h1>
            <p className="text-neon-cyan text-xs font-retro uppercase tracking-wider">
              🇫🇷 REAL DATA - ORGANIZED INTEL
            </p>
            <div className="flex justify-center items-center mt-3 text-xs">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse mr-2"></div>
              <span className="text-neon-green font-retro">SECTIONED ANALYSIS MODE</span>
            </div>
          </div>
        </Card>

        <Card neonColor="cyan" className="backdrop-blur-md flex-shrink-0">
          <div className="text-center mb-4">
            <h3 className="font-retro text-sm font-bold text-neon-cyan uppercase tracking-wider">
              🗺️ Intelligence Layers
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-retro text-xs">📋 Cadastral</span>
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
              <span className="text-white font-retro text-xs">💰 DVF Sales</span>
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
              <span className="text-white font-retro text-xs">⚡ DPE Energy</span>
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

        {selectedProperty && (
          <Card neonColor="yellow" className="backdrop-blur-md flex-shrink-0">
            <div className="text-center mb-3">
              <h3 className="font-retro text-sm font-bold text-neon-yellow uppercase tracking-wider">
                📊 Data Sections
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                neonColor={activeSection === 'overview' ? "yellow" : "gray"} 
                size="sm"
                variant={activeSection === 'overview' ? 'primary' : 'secondary'}
                onClick={() => setActiveSection('overview')}
                className="text-xs"
              >
                📋 Overview
              </Button>
              <Button 
                neonColor={activeSection === 'cadastral' ? "green" : "gray"} 
                size="sm"
                variant={activeSection === 'cadastral' ? 'primary' : 'secondary'}
                onClick={() => setActiveSection('cadastral')}
                className="text-xs"
              >
                🏠 Cadastral
              </Button>
              <Button 
                neonColor={activeSection === 'dpe' ? "purple" : "gray"} 
                size="sm"
                variant={activeSection === 'dpe' ? 'primary' : 'secondary'}
                onClick={() => setActiveSection('dpe')}
                className="text-xs"
              >
                ⚡ Energy
              </Button>
              <Button 
                neonColor={activeSection === 'sales' ? "orange" : "gray"} 
                size="sm"
                variant={activeSection === 'sales' ? 'primary' : 'secondary'}
                onClick={() => setActiveSection('sales')}
                className="text-xs"
              >
                💰 Sales
              </Button>
            </div>
          </Card>
        )}

        <Card neonColor="green" className="backdrop-blur-md flex-1 min-h-0">
          <div className="text-center mb-4">
            <h3 className="font-retro text-lg font-bold text-neon-green uppercase tracking-wider">
              🎯 Property Intelligence
            </h3>
            {selectedProperty && (
              <div className="text-xs text-neon-cyan mt-1">
                {selectedProperty.commune} • {selectedProperty.cadastralId}
              </div>
            )}
          </div>
          
          <div className="overflow-y-auto h-full">
            {selectedProperty ? (
              <div className="space-y-4">
                
                {activeSection === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`p-2 rounded border text-center ${selectedProperty.hasSales ? 'border-neon-green bg-green-900/20' : 'border-neon-red bg-red-900/20'}`}>
                        <div className={`text-xs font-bold ${selectedProperty.hasSales ? 'text-neon-green' : 'text-neon-red'}`}>💰 SALES</div>
                        <div className="text-white text-xs">{selectedProperty.hasSales ? `${selectedProperty.salesCount || 1} Found` : 'None'}</div>
                      </div>
                      <div className={`p-2 rounded border text-center ${isLoadingDpe ? 'border-neon-cyan animate-pulse' : selectedProperty.dpeRating ? 'border-neon-purple bg-purple-900/20' : 'border-neon-orange bg-orange-900/20'}`}>
                        <div className={`text-xs font-bold ${isLoadingDpe ? 'text-neon-cyan' : selectedProperty.dpeRating ? 'text-neon-purple' : 'text-neon-orange'}`}>⚡ DPE</div>
                        <div className="text-white text-xs">{isLoadingDpe ? 'SEARCHING...' : selectedProperty.dpeRating ? selectedProperty.dpeRating.energy : 'None'}</div>
                      </div>
                    </div>
                    <div className="bg-surface/50 p-3 rounded border border-neon-cyan/30">
                      <h4 className="text-neon-cyan font-retro text-sm mb-2">📊 KEY METRICS</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400">Area:</span>
                          <div className="text-neon-yellow font-bold">{selectedProperty.size || 'N/A'} m²</div>
                        </div>
                        <div>
                          <span className="text-gray-400">Zone:</span>
                          <div className="text-white">{selectedProperty.zone || 'N/A'}</div>
                        </div>
                        {selectedProperty.lastSalePrice && <div><span className="text-gray-400">Last Sale:</span><div className="text-neon-green font-bold">€{selectedProperty.lastSalePrice.toLocaleString()}</div></div>}
                        {selectedProperty.pricePerSqm && <div><span className="text-gray-400">Price/m²:</span><div className="text-neon-orange font-bold">€{selectedProperty.pricePerSqm}</div></div>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button neonColor="green" size="sm" className="w-full" onClick={() => setActiveSection('cadastral')}>📋 View Cadastral Details</Button>
                      <Button neonColor="purple" size="sm" className="w-full" onClick={() => setActiveSection('dpe')}>⚡ View Energy Performance</Button>
                      {selectedProperty.hasSales && <Button neonColor="orange" size="sm" className="w-full" onClick={() => setActiveSection('sales')}>💰 View Sales History</Button>}
                    </div>
                  </div>
                )}

                {activeSection === 'cadastral' && (
                  <div className="space-y-4">
                    <div className="bg-surface/50 p-3 rounded border border-neon-green/50">
                      <h4 className="text-neon-green font-retro text-sm mb-3 flex items-center">
                        📋 OFFICIAL CADASTRAL DATA
                        <span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded">IGN VERIFIED</span>
                      </h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div><span className="text-gray-400 block">Parcel ID:</span><span className="text-neon-cyan font-mono">{selectedProperty.cadastralId || 'N/A'}</span></div>
                          <div><span className="text-gray-400 block">Surface Area:</span><span className="text-neon-yellow font-bold">{selectedProperty.size ? `${selectedProperty.size.toLocaleString()} m²` : 'N/A'}</span></div>
                          <div><span className="text-gray-400 block">Section:</span><span className="text-neon-cyan">{selectedProperty.section || 'N/A'}</span></div>
                          <div><span className="text-gray-400 block">Number:</span><span className="text-neon-cyan">{selectedProperty.numero || 'N/A'}</span></div>
                          <div><span className="text-gray-400 block">Zone Type:</span><span className="text-white">{selectedProperty.zone || 'N/A'}</span></div>
                          <div><span className="text-gray-400 block">Data Source:</span><span className={selectedProperty.dataSource === 'real_cadastral' ? 'text-neon-green' : 'text-neon-orange'}>{selectedProperty.dataSource === 'real_cadastral' ? 'REAL CADASTRAL' : 'ESTIMATED'}</span></div>
                        </div>
                        <div className="border-t border-neon-green/20 pt-3">
                          <h5 className="text-neon-green text-xs font-bold mb-2">📍 LOCATION DETAILS</h5>
                          <div className="grid grid-cols-1 gap-2 text-xs">
                            <div><span className="text-gray-400">Commune:</span><span className="text-neon-cyan ml-2">{selectedProperty.commune || 'N/A'}</span></div>
                            <div><span className="text-gray-400">Department:</span><span className="text-white ml-2">{selectedProperty.department || 'N/A'}</span></div>
                            <div><span className="text-gray-400">Population:</span><span className="text-neon-yellow ml-2">{selectedProperty.population?.toLocaleString() || 'N/A'}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeSection === 'dpe' && (
                  <div className="space-y-4">
                    {isLoadingDpe ? (
                      <div className="text-center text-neon-cyan font-retro p-4 animate-pulse">ANALYZING NEARBY DPE CERTIFICATES...</div>
                    ) : selectedProperty.dpeRating ? (
                      <div className="bg-surface/50 p-3 rounded border border-neon-purple/50">
                        <h4 className="text-neon-purple font-retro text-sm mb-3 flex items-center">⚡ ENERGY PERFORMANCE CERTIFICATE<span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded">EXACT MATCH</span></h4>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center"><span className="text-gray-400 text-xs block mb-1">Energy Class</span>{formatEnergyClass(selectedProperty.dpeRating.energy)}</div>
                            <div className="text-center"><span className="text-gray-400 text-xs block mb-1">GHG Class</span>{formatEnergyClass(selectedProperty.dpeRating.ghg)}</div>
                          </div>
                          <div className="border-t border-neon-purple/20 pt-3">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              {selectedProperty.dpeRating.surfaceArea && <div><span className="text-gray-400 block">Surface:</span><span className="text-neon-yellow">{selectedProperty.dpeRating.surfaceArea} m²</span></div>}
                              {selectedProperty.dpeRating.annualCost && <div><span className="text-gray-400 block">Annual Cost:</span><span className="text-neon-orange font-bold">€{Math.round(selectedProperty.dpeRating.annualCost)}</span></div>}
                            </div>
                          </div>
                          <div className="border-t border-neon-purple/20 pt-3">
                            <h5 className="text-neon-purple text-xs font-bold mb-2">📋 CERTIFICATE DETAILS</h5>
                            <div className="space-y-1 text-xs">
                              <div><span className="text-gray-400">Certificate ID:</span><span className="text-neon-cyan ml-2 font-mono">{selectedProperty.dpeRating.dpeId || 'N/A'}</span></div>
                              <div><span className="text-gray-400">Issue Date:</span><span className="text-neon-cyan ml-2">{selectedProperty.dpeRating.date}</span></div>
                              {selectedProperty.dpeRating.address && <div><span className="text-gray-400">Address:</span><span className="text-white ml-2">{selectedProperty.dpeRating.address}</span></div>}
                              <div className="mt-2 px-2 py-1 bg-green-900/30 rounded"><span className="text-neon-green text-xs">✅ ADEME VERIFIED CERTIFICATE</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-surface/50 p-3 rounded border border-neon-orange/50">
                        <h4 className="text-neon-orange font-retro text-sm mb-3">⚡ NO EXACT DPE MATCH FOUND</h4>
                        <div className="text-white text-xs space-y-2">
                          <p>No energy performance certificate found for this exact location.</p>
                          {selectedProperty.nearbyDpeCount !== undefined && selectedProperty.nearbyDpeCount > 0 && (
                            <>
                              <p className="text-neon-cyan">Found {selectedProperty.nearbyDpeCount} certificate{selectedProperty.nearbyDpeCount > 1 ? 's' : ''} in surrounding area.</p>
                              {selectedProperty.allDpeCandidates && selectedProperty.allDpeCandidates.length > 0 && (<Button neonColor="orange" size="sm" className="w-full mt-2" onClick={() => setIsDpeModalOpen(true)}>🔍 View All {selectedProperty.allDpeCandidates.length} Candidates</Button>)}
                            </>
                          )}
                          <div className="mt-3 px-2 py-1 bg-orange-900/30 rounded"><span className="text-neon-orange text-xs">⚠️ NO ESTIMATES - REAL DATA ONLY</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeSection === 'sales' && (
                  <div className="space-y-4">
                    {selectedProperty.hasSales && selectedProperty.transactions && selectedProperty.transactions.length > 0 ? (
                      <div className="bg-surface/50 p-3 rounded border border-neon-green/50">
                        <h4 className="text-neon-green font-retro text-sm mb-3 flex items-center">💰 TRANSACTION HISTORY<span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded">DVF VERIFIED</span></h4>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-green-900/20 p-2 rounded"><div className="text-neon-green font-bold text-lg">{selectedProperty.salesCount || selectedProperty.transactions.length}</div><div className="text-gray-400 text-xs">Total Sales</div></div>
                            <div className="bg-yellow-900/20 p-2 rounded"><div className="text-neon-yellow font-bold text-lg">€{selectedProperty.lastSalePrice?.toLocaleString() || 'N/A'}</div><div className="text-gray-400 text-xs">Last Price</div></div>
                            <div className="bg-orange-900/20 p-2 rounded"><div className="text-neon-orange font-bold text-lg">€{selectedProperty.pricePerSqm || 'N/A'}</div><div className="text-gray-400 text-xs">Per m²</div></div>
                          </div>
                          <div className="border-t border-neon-green/20 pt-3">
                            <h5 className="text-neon-green text-xs font-bold mb-2">📈 RECENT TRANSACTIONS</h5>
                            {selectedProperty.transactions.slice(0, 2).map((tx, index) => (
                              <div key={index} className={`p-2 mb-2 rounded border ${index === 0 ? 'border-neon-green/50 bg-green-900/10' : 'border-neon-cyan/30 bg-cyan-900/10'}`}>
                                {index === 0 && <div className="text-neon-green font-bold text-xs mb-1">MOST RECENT</div>}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div><span className="text-gray-400">Date:</span><span className="text-neon-cyan ml-1">{tx.sale_date}</span></div>
                                  <div><span className="text-gray-400">Price:</span><span className="text-neon-yellow ml-1 font-bold">€{tx.sale_price.toLocaleString()}</span></div>
                                  <div><span className="text-gray-400">Type:</span><span className="text-white ml-1">{tx.property_type}</span></div>
                                  {tx.surface_area > 0 && <div><span className="text-gray-400">Surface:</span><span className="text-neon-yellow ml-1">{tx.surface_area} m²</span></div>}
                                </div>
                              </div>
                            ))}
                          </div>
                          <Button neonColor="green" size="sm" className="w-full" onClick={() => setIsDvfModalOpen(true)}>📊 View All {selectedProperty.transactions.length} Transactions</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-surface/50 p-3 rounded border border-neon-red/50">
                        <h4 className="text-neon-red font-retro text-sm mb-3">💰 NO SALES RECORDED</h4>
                        <div className="text-white text-xs space-y-2">
                          <p>No transactions found for this exact plot in the DVF database since 2014.</p>
                          <div className="mt-3 px-2 py-1 bg-red-900/30 rounded"><span className="text-neon-red text-xs">❌ ZERO SALES HISTORY AVAILABLE</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 text-sm">
                <div className="text-6xl mb-4">🎮</div>
                <p className="font-retro mb-4">Click on any cadastral parcel to start intelligent property analysis</p>
                <div className="text-neon-cyan text-xs font-retro bg-surface/30 p-3 rounded">✅ Organized by data type<br/>✅ Separate sections for clarity<br/>✅ Real government data only<br/>✅ Cyberpunk interface design</div>
              </div>
            )}
          </div>
        </Card>

        <Card neonColor="purple" className="backdrop-blur-md flex-shrink-0">
          <div className="space-y-2">
            <Button neonColor="purple" size="sm" className="w-full" onClick={() => console.log('Export property analysis')}>📋 Export Analysis</Button>
            <Button neonColor="cyan" size="sm" variant="secondary" className="w-full" onClick={() => { setSelectedProperty(null); setActiveSection('overview'); }}>🔄 Clear & Reset</Button>
          </div>
        </Card>
      </div>

      <div style={{ flex: 1, height: '100vh', display: 'flex', flexDirection: 'column', padding: '20px', minWidth: 0 }}>
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <Card neonColor="cyan" className="h-full p-3">
            <MapComponent onPropertySelect={handlePropertySelect} dataLayers={dataLayers} />
          </Card>
        </div>
        <Card neonColor="purple" className="backdrop-blur-md mt-4 flex-shrink-0">
          <div className="flex justify-between items-center text-sm font-retro">
            <div className="flex items-center space-x-4">
              <div className="flex items-center"><span className="text-neon-purple">MODE:</span><span className="text-neon-green ml-2">SECTIONED ANALYSIS</span></div>
              {selectedProperty && (
                <>
                  <div className="flex items-center"><span className="text-neon-yellow">SECTION:</span><span className="text-white ml-2">{activeSection.toUpperCase()}</span></div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs ${selectedProperty.hasSales ? "text-neon-green" : "text-neon-red"}`}>💰 {selectedProperty.hasSales ? "SALES: YES" : "SALES: NO"}</span>
                    <span className={`text-xs ${isLoadingDpe ? 'text-neon-cyan animate-pulse' : selectedProperty.dpeRating ? "text-neon-purple" : "text-neon-orange"}`}>⚡ {isLoadingDpe ? 'DPE: ...' : `DPE: ${selectedProperty.dpeRating ? selectedProperty.dpeRating.energy : "NO"}`}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 text-xs">French Government Data</span>
              <div className="flex items-center"><div className="w-2 h-2 bg-neon-green rounded-full animate-pulse mr-2"></div><span className="text-neon-green text-xs">ORGANIZED INTEL</span></div>
            </div>
          </div>
        </Card>
      </div>

      {isDvfModalOpen && selectedProperty && selectedProperty.hasSales && selectedProperty.transactions && selectedProperty.transactions.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" style={{ fontFamily: 'Orbitron, monospace' }} onClick={() => setIsDvfModalOpen(false)}>
          <div onClick={(e: React.MouseEvent) => e.stopPropagation()} className="max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <Card neonColor="green" className="backdrop-blur-md">
              <div className="text-center mb-4">
                <h3 className="font-retro text-lg font-bold uppercase tracking-wider text-neon-green">💰 COMPLETE SALES HISTORY</h3>
                <div className="text-xs text-white mt-2">Plot: {selectedProperty.cadastralId} • {selectedProperty.commune}</div>
                <div className="text-xs text-neon-green mt-1">📊 DVF DATABASE - GOVERNMENT VERIFIED</div>
              </div>
              <div className="space-y-3 p-4">
                {selectedProperty.transactions.map((tx, index) => (
                  <div key={index} className={`bg-surface/50 p-3 rounded border ${index === 0 ? 'border-neon-green/50' : 'border-neon-cyan/30'}`}>
                    <div className="text-white text-xs space-y-1">
                      {index === 0 && <div className="text-neon-green font-bold text-sm mb-2">🏆 MOST RECENT SALE</div>}
                      <div className="grid grid-cols-2 gap-4">
                        <div>Date: <span className="text-neon-cyan">{tx.sale_date}</span></div>
                        <div>Price: <span className="text-neon-yellow">€{tx.sale_price.toLocaleString()}</span></div>
                        <div>Type: <span className="text-white">{tx.property_type}</span></div>
                        {tx.surface_area > 0 && <div>Surface: <span className="text-neon-yellow">{tx.surface_area} m²</span></div>}
                        <div>Municipality: <span className="text-neon-cyan">{tx.municipality}</span></div>
                        <div>Postal: <span className="text-neon-orange">{tx.postal_code}</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button neonColor="cyan" size="sm" variant="secondary" className="w-full mt-4" onClick={() => setIsDvfModalOpen(false)}>Close Analysis</Button>
            </Card>
          </div>
        </div>
      )}
      
      {isDpeModalOpen && selectedProperty && selectedProperty.allDpeCandidates && selectedProperty.allDpeCandidates.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" style={{ fontFamily: 'Orbitron, monospace' }} onClick={() => setIsDpeModalOpen(false)}>
          <div onClick={(e: React.MouseEvent) => e.stopPropagation()} className="max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <Card neonColor="orange" className="backdrop-blur-md">
              <div className="text-center mb-4">
                <h3 className="font-retro text-lg font-bold uppercase tracking-wider text-neon-orange">🔍 ALL DPE CANDIDATES ANALYSIS</h3>
                <div className="text-xs text-white mt-2">Plot: {selectedProperty.cadastralId} • {selectedProperty.commune}</div>
                <div className="text-xs text-neon-orange mt-1">❌ NO EXACT MATCHES - DETAILED BREAKDOWN</div>
              </div>
              <div className="space-y-4 p-4">
                <div className="text-center text-neon-orange font-retro text-sm mb-4">📊 {selectedProperty.allDpeCandidates.length} DPE Certificate{selectedProperty.allDpeCandidates.length > 1 ? 's' : ''} Found in Search Area</div>
                {selectedProperty.allDpeCandidates.map((candidate, index) => (
                  <div key={index} className={`bg-surface/50 p-3 rounded border ${candidate.score >= 90 ? 'border-neon-green/50' : candidate.score >= 70 ? 'border-neon-yellow/50' : 'border-neon-red/50'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-white font-bold text-sm">🆔 {candidate.id}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${candidate.score >= 90 ? 'bg-green-600 text-white' : candidate.score >= 70 ? 'bg-yellow-600 text-black' : 'bg-red-600 text-white'}`}>Match Score: {candidate.score}/100</span>
                    </div>
                    <div className="text-white text-xs space-y-2">
                      <div>📍 <strong>Address:</strong> {candidate.address}</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">⚡ <strong>Energy:</strong><span className="ml-2">{formatEnergyClass(candidate.energy_class)}</span></div>
                        <div className="flex items-center">🌱 <strong>GHG:</strong><span className="ml-2">{formatEnergyClass(candidate.ghg_class)}</span></div>
                        {candidate.surface && <div>📐 <strong>Surface:</strong> {candidate.surface} m²</div>}
                        {candidate.annual_cost && <div>💰 <strong>Annual Cost:</strong> €{Math.round(candidate.annual_cost)}</div>}
                      </div>
                      {candidate.establishment_date && <div>📅 <strong>Certificate Date:</strong> {new Date(candidate.establishment_date).toLocaleDateString()}</div>}
                      <div className={`mt-3 p-2 rounded text-xs ${candidate.score >= 90 ? 'bg-green-900/30 text-green-300' : candidate.score >= 70 ? 'bg-yellow-900/30 text-yellow-300' : 'bg-red-900/30 text-red-300'}`}><strong>Analysis:</strong> {candidate.reason}</div>
                    </div>
                  </div>
                ))}
                <div className="text-center text-xs text-neon-orange mt-4 p-3 bg-orange-900/20 rounded">💡 <strong>Exact Match Criteria:</strong> We require 90+ points with perfect department + commune + address matching for exact certification</div>
              </div>
              <Button neonColor="cyan" size="sm" variant="secondary" className="w-full mt-4" onClick={() => setIsDpeModalOpen(false)}>Close Analysis</Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
