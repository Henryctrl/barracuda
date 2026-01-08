'use client';
import { useState, useMemo } from 'react';
import { RefreshCw, X, SlidersHorizontal, ArrowRight, Loader2, ChevronUp, MapPin } from 'lucide-react';
import { DPERecord as DpeSearchResult, ParcelSearchResult } from '../types';

export interface SearchParams {
  type: 'landSize' | 'dpe';
  radiusKm: number;
  center: [number, number];
  [key: string]: unknown; 
}

interface SearchPanelProps {
  onClose: () => void;
  onSearch: (params: SearchParams) => void;
  onRecenter: () => void;
  center: [number, number];
  results: (DpeSearchResult | ParcelSearchResult)[];
  isLoading: boolean;
  onResultClick: (result: DpeSearchResult | ParcelSearchResult) => void;
  onResultLocate: (result: DpeSearchResult | ParcelSearchResult) => void;
}

type SearchType = 'landSize' | 'dpe';

export function SearchPanel({ onClose, onSearch, onRecenter, center, results, isLoading, onResultClick, onResultLocate }: SearchPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>('landSize');
  
  const [radiusKm, setRadiusKm] = useState(2);
  const [targetLandSize, setTargetLandSize] = useState(1000);
  const [landLeniency, setLandLeniency] = useState(0.1);
  
  // DPE: Min/Max inputs
  const [dpeMinConsumption, setDpeMinConsumption] = useState(0);
  const [dpeMaxConsumption, setDpeMaxConsumption] = useState(300);
  const [dpeMinEmissions, setDpeMinEmissions] = useState(0);
  const [dpeMaxEmissions, setDpeMaxEmissions] = useState(60);
  
  // DPE: Date filters
  const [dpeStartDate, setDpeStartDate] = useState('');
  const [dpeEndDate, setDpeEndDate] = useState('');
  
  // DPE: Auto-increment toggle
  const [dpeAutoIncrement, setDpeAutoIncrement] = useState(false);

  const { minLand, maxLand } = useMemo(() => ({ 
    minLand: Math.round(targetLandSize - (targetLandSize * landLeniency)), 
    maxLand: Math.round(targetLandSize + (targetLandSize * landLeniency)) 
  }), [targetLandSize, landLeniency]);

  const handleSearchClick = () => {
    let params: SearchParams = { type: searchType, radiusKm, center };
    if (searchType === 'landSize') {
      params = { ...params, minSize: minLand, maxSize: maxLand };
    } else {
      // Use auto-increment logic if enabled
      const finalMaxConso = dpeAutoIncrement ? dpeMinConsumption + 1 : dpeMaxConsumption;
      const finalMaxEmissions = dpeAutoIncrement ? dpeMinEmissions + 1 : dpeMaxEmissions;
      
      params = { 
        ...params, 
        minConsumption: dpeMinConsumption, 
        maxConsumption: finalMaxConso, 
        minEmissions: dpeMinEmissions, 
        maxEmissions: finalMaxEmissions,
        startDate: dpeStartDate,
        endDate: dpeEndDate
      };
    }
    onSearch(params);
    if (!isCollapsed) setIsCollapsed(true);
  };

  const handleExpandContract = () => {
    // Min values -1, Max values +1
    if (!dpeAutoIncrement) {
      setDpeMinConsumption(prev => Math.max(0, prev - 1));
      setDpeMaxConsumption(prev => prev + 1);
      setDpeMinEmissions(prev => Math.max(0, prev - 1));
      setDpeMaxEmissions(prev => prev + 1);
    } else {
      // In auto mode, just decrease min
      setDpeMinConsumption(prev => Math.max(0, prev - 1));
      setDpeMinEmissions(prev => Math.max(0, prev - 1));
    }
    
    // Adjust dates by ±1 day
    if (dpeStartDate) {
      const startDate = new Date(dpeStartDate);
      startDate.setDate(startDate.getDate() - 1);
      setDpeStartDate(startDate.toISOString().split('T')[0]);
    }
    if (dpeEndDate) {
      const endDate = new Date(dpeEndDate);
      endDate.setDate(endDate.getDate() + 1);
      setDpeEndDate(endDate.toISOString().split('T')[0]);
    }
  };

  const LeniencySelector = ({ value, setValue }: { value: number, setValue: (val: number) => void }) => (
    <div className="flex w-full rounded-md bg-background-dark p-1 border border-accent-cyan/30 mt-1">
      {[0.0, 0.1, 0.2, 0.3, 0.5].map(val => (
        <button 
          key={val} 
          onClick={() => setValue(val)} 
          className={`w-1/4 rounded py-1 text-xs font-bold transition-all ${
            value === val 
              ? 'bg-accent-cyan text-background-dark shadow-glow-cyan' 
              : 'text-accent-cyan/70 hover:text-accent-cyan/90'
          }`}
        >
          ±{val * 100}%
        </button>
      ))}
    </div>
  );

  return (
    <div className="absolute top-[88px] sm:top-16 left-4 z-[15] w-96 max-h-[calc(100vh-10rem)] flex flex-col rounded-lg border-2 border-accent-cyan shadow-glow-cyan backdrop-blur-sm bg-background-dark/75">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-lg font-bold text-accent-cyan flex items-center gap-2 [filter:drop-shadow(0_0_4px_#00ffff)]">
          <SlidersHorizontal size={20} /> AREA SEARCH
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="text-accent-cyan/70 hover:text-accent-cyan"
          >
            <ChevronUp className={`transition-transform ${isCollapsed ? '' : 'rotate-180'}`} size={20} />
          </button>
          <button onClick={onClose} className="text-accent-cyan/70 hover:text-accent-cyan">
            <X size={20} />
          </button>
        </div>
      </div>
      
      <div className={`px-4 pb-4 transition-all duration-300 overflow-y-auto ${
        isCollapsed ? 'max-h-0 py-0' : 'max-h-[600px] border-t border-dashed border-accent-cyan/30 pt-4'
      }`}>
        <div className="space-y-4">
          <div className="flex w-full rounded-md bg-background-dark p-1 border border-accent-cyan/50">
            <button 
              onClick={() => setSearchType('landSize')} 
              className={`w-1/2 rounded py-1 text-sm font-bold transition-all ${
                searchType === 'landSize' 
                  ? 'bg-accent-cyan text-background-dark shadow-glow-cyan' 
                  : 'text-accent-cyan/70'
              }`}
            >
              Land Size
            </button>
            <button 
              onClick={() => setSearchType('dpe')} 
              className={`w-1/2 rounded py-1 text-sm font-bold transition-all ${
                searchType === 'dpe' 
                  ? 'bg-accent-cyan text-background-dark shadow-glow-cyan' 
                  : 'text-accent-cyan/70'
              }`}
            >
              DPE Rating
            </button>
          </div>

          <div>
            <label htmlFor="radius" className="block text-sm font-semibold text-text-primary/80">
              Search Radius: <span className="font-bold text-accent-magenta">{radiusKm.toFixed(1)} km</span>
            </label>
            <input 
              id="radius" 
              type="range" 
              min="0.1" 
              max="20" 
              step="0.1" 
              value={radiusKm} 
              onChange={(e) => setRadiusKm(parseFloat(e.target.value))} 
              className="w-full h-2 bg-accent-cyan/20 rounded-lg appearance-none cursor-pointer range-thumb mt-2" 
            />
          </div>

          {searchType === 'landSize' ? (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-text-primary/80">Target Land Area (m²)</label>
              <input 
                type="number" 
                value={targetLandSize} 
                onChange={e => setTargetLandSize(e.target.value === '' ? 0 : Number(e.target.value))} 
                className="w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white focus:outline-none focus:border-accent-magenta" 
              />
              <div className="text-xs text-accent-cyan/70 mt-1 flex items-center justify-center gap-2">
                <span>{minLand} m²</span> <ArrowRight size={12} /> <span>{maxLand} m²</span>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary/80">Leniency</label>
                <LeniencySelector value={landLeniency} setValue={setLandLeniency} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Auto-increment toggle */}
              <div className="flex items-center justify-between p-2 bg-background-dark border border-accent-yellow/30 rounded-md">
                <span className="text-xs font-semibold text-text-primary/80">Auto Max (Min + 1)</span>
                <button
                  onClick={() => setDpeAutoIncrement(!dpeAutoIncrement)}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    dpeAutoIncrement ? 'bg-accent-cyan' : 'bg-accent-cyan/20'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    dpeAutoIncrement ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Consumption inputs */}
              <div className="grid grid-cols-2 gap-x-2">
                <div>
                  <label className="block text-xs font-semibold text-text-primary/80">Min Consumption</label>
                  <input 
                    type="number" 
                    value={dpeMinConsumption} 
                    onChange={e => setDpeMinConsumption(e.target.value === '' ? 0 : Number(e.target.value))} 
                    className="w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white text-sm focus:outline-none focus:border-accent-magenta" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary/80">Max Consumption</label>
                  <input 
                    type="number" 
                    value={dpeAutoIncrement ? dpeMinConsumption + 1 : dpeMaxConsumption}
                    onChange={e => !dpeAutoIncrement && setDpeMaxConsumption(e.target.value === '' ? 0 : Number(e.target.value))}
                    disabled={dpeAutoIncrement}
                    className={`w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white text-sm focus:outline-none focus:border-accent-magenta ${
                      dpeAutoIncrement ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>
              <div className="text-xs text-accent-cyan/70 flex items-center justify-center gap-2">
                <span>{dpeMinConsumption} kWh/m²</span> <ArrowRight size={12} /> 
                <span>{dpeAutoIncrement ? dpeMinConsumption + 1 : dpeMaxConsumption} kWh/m²</span>
              </div>

              {/* Emissions inputs */}
              <div className="grid grid-cols-2 gap-x-2">
                <div>
                  <label className="block text-xs font-semibold text-text-primary/80">Min Emissions</label>
                  <input 
                    type="number" 
                    value={dpeMinEmissions} 
                    onChange={e => setDpeMinEmissions(e.target.value === '' ? 0 : Number(e.target.value))} 
                    className="w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white text-sm focus:outline-none focus:border-accent-magenta" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary/80">Max Emissions</label>
                  <input 
                    type="number" 
                    value={dpeAutoIncrement ? dpeMinEmissions + 1 : dpeMaxEmissions}
                    onChange={e => !dpeAutoIncrement && setDpeMaxEmissions(e.target.value === '' ? 0 : Number(e.target.value))}
                    disabled={dpeAutoIncrement}
                    className={`w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white text-sm focus:outline-none focus:border-accent-magenta ${
                      dpeAutoIncrement ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>
              <div className="text-xs text-accent-cyan/70 flex items-center justify-center gap-2">
                <span>{dpeMinEmissions} kgCO₂/m²</span> <ArrowRight size={12} /> 
                <span>{dpeAutoIncrement ? dpeMinEmissions + 1 : dpeMaxEmissions} kgCO₂/m²</span>
              </div>

              {/* Date filters */}
              <div className="grid grid-cols-2 gap-x-2">
                <div>
                  <label className="block text-xs font-semibold text-text-primary/80">Start Date</label>
                  <input 
                    type="date" 
                    value={dpeStartDate} 
                    onChange={e => setDpeStartDate(e.target.value)} 
                    className="w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white text-sm focus:outline-none focus:border-accent-magenta" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary/80">End Date</label>
                  <input 
                    type="date" 
                    value={dpeEndDate} 
                    onChange={e => setDpeEndDate(e.target.value)} 
                    className="w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white text-sm focus:outline-none focus:border-accent-magenta" 
                  />
                </div>
              </div>

              {/* Expand/Contract button */}
              <button
                onClick={handleExpandContract}
                className="w-full flex items-center justify-center gap-2 text-sm bg-accent-yellow/20 border-2 border-accent-yellow/50 text-accent-yellow rounded-md px-3 py-2 font-bold hover:bg-accent-yellow/30 transition-all"
              >
                Expand Range (Min -1, Max +1)
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 pt-4 border-t border-dashed border-accent-cyan/30">
            <button 
              onClick={onRecenter} 
              className="flex-1 flex items-center justify-center gap-2 text-sm bg-background-dark/75 border-2 border-accent-yellow text-accent-yellow rounded-md px-3 py-2 hover:bg-accent-yellow hover:text-background-dark transition-all"
            >
              <RefreshCw size={16} /> Recenter
            </button>
            <button 
              onClick={handleSearchClick} 
              className="flex-1 text-sm bg-accent-magenta border-2 border-accent-magenta text-white rounded-md px-3 py-2 font-bold hover:bg-opacity-80 transition-all"
            >
              Search Area
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 border-t border-accent-cyan/50">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-accent-cyan">
            <Loader2 className="animate-spin" size={16} />
            <span>ANALYZING SECTOR...</span>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-text-primary/80">Found {results.length} results.</p>
            {results.map((result, index) => (
              <div key={index} className="relative">
                <button 
                  onClick={() => onResultClick(result)} 
                  className="w-full text-left p-3 rounded-lg transition-all bg-container-bg/50 border border-accent-cyan/20 hover:bg-accent-cyan/10 hover:border-accent-cyan"
                >
                  {searchType === 'dpe' ? (
                    <DpeResultItem result={result as DpeSearchResult} />
                  ) : (
                    <ParcelResultItem result={result as ParcelSearchResult} />
                  )}
                </button>
                <button
                  onClick={() => onResultLocate(result)}
                  className="absolute top-2 right-2 p-2 bg-accent-magenta/80 hover:bg-accent-magenta rounded-md transition-all"
                  title="Show on map"
                >
                  <MapPin size={16} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-text-primary/70">No results yet. Configure your search and press &quot;Search This Area&quot;.</p>
        )}
      </div>
    </div>
  );
}

const DpeResultItem = ({ result }: { result: DpeSearchResult }) => (
  <div>
    <div className="font-bold text-white">{result.adresse_ban}</div>
    <div className="text-sm text-text-primary/80 grid grid-cols-2 gap-x-4">
      <span>Conso: <span className="font-mono text-accent-cyan">{result.conso_5_usages_par_m2_ep} kWh/m²</span></span>
      <span>Emissions: <span className="font-mono text-accent-cyan">{result.emission_ges_5_usages_par_m2} kgCO₂/m²</span></span>
    </div>
  </div>
);

const ParcelResultItem = ({ result }: { result: ParcelSearchResult }) => (
  <div>
    <div className="font-bold text-white">Parcel ID: {result.id}</div>
    <div className="text-sm text-text-primary/80">Area: <span className="font-mono text-accent-cyan">{result.contenance} m²</span></div>
  </div>
);
