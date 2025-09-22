'use client';
import { useState, useMemo } from 'react';
import { RefreshCw, X, SlidersHorizontal, ArrowRight } from 'lucide-react';

export interface SearchParams {
  type: 'landSize' | 'dpe';
  radiusKm: number;
  center: [number, number];
  [key: string]: any; 
}

interface SearchControlProps {
  radiusKm: number;
  setRadiusKm: (radius: number) => void;
  resetCenter: () => void;
  onClose: () => void;
  onSearch: (params: SearchParams) => void;
  center: [number, number];
}

type SearchType = 'landSize' | 'dpe';

export function SearchControl({ radiusKm, setRadiusKm, resetCenter, onClose, onSearch, center }: SearchControlProps) {
  const [searchType, setSearchType] = useState<SearchType>('landSize');
  
  const [targetLandSize, setTargetLandSize] = useState(1000);
  const [landLeniency, setLandLeniency] = useState(0.1);
  const [targetConsumption, setTargetConsumption] = useState(150);
  const [targetEmissions, setTargetEmissions] = useState(30);
  const [dpeLeniency, setDpeLeniency] = useState(0.2);

  const { minLand, maxLand } = useMemo(() => {
    const delta = targetLandSize * landLeniency;
    return {
      minLand: Math.round(targetLandSize - delta),
      maxLand: Math.round(targetLandSize + delta),
    };
  }, [targetLandSize, landLeniency]);

  const { minConso, maxConso, minEmissions, maxEmissions } = useMemo(() => {
    const consoDelta = targetConsumption * dpeLeniency;
    const emissionsDelta = targetEmissions * dpeLeniency;
    return {
      minConso: Math.round(targetConsumption - consoDelta),
      maxConso: Math.round(targetConsumption + consoDelta),
      minEmissions: Math.round(targetEmissions - emissionsDelta),
      maxEmissions: Math.round(targetEmissions + emissionsDelta),
    };
  }, [targetConsumption, targetEmissions, dpeLeniency]);

  const handleSearchClick = () => {
    let params: SearchParams = {
        type: searchType,
        radiusKm,
        center
    };
    if (searchType === 'landSize') {
      params = { ...params, minSize: minLand, maxSize: maxLand };
    } else {
      params = { ...params, idealConsumption: targetConsumption, idealEmissions: targetEmissions, minConsumption: minConso, maxConsumption: maxConso, minEmissions: minEmissions, maxEmissions: maxEmissions };
    }
    onSearch(params);
  };

  const LeniencySelector = ({ value, setValue }: { value: number, setValue: (val: number) => void }) => (
    <div className="flex w-full rounded-md bg-background-dark p-1 border border-accent-cyan/30 mt-1">
      {[0.0, 0.1, 0.2, 0.3, 0.5].map(val => (
        <button
          key={val}
          onClick={() => setValue(val)}
          // CORRECTED: Uses cyan for active state to match the theme
          className={`w-1/4 rounded py-1 text-xs font-bold transition-all ${value === val ? 'bg-accent-cyan text-background-dark shadow-glow-cyan' : 'text-accent-cyan/70 hover:text-accent-cyan/90'}`}
        >
          ±{val * 100}%
        </button>
      ))}
    </div>
  );

  return (
    <div className="absolute top-20 sm:top-4 left-4 z-20 w-80 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-lg border-2 border-accent-cyan bg-container-bg p-4 shadow-glow-cyan backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-accent-cyan flex items-center gap-2 [filter:drop-shadow(0_0_4px_#00ffff)]">
          <SlidersHorizontal size={20} />
          AREA SEARCH
        </h3>
        <button onClick={onClose} className="text-accent-cyan/70 hover:text-accent-cyan"><X size={20} /></button>
      </div>
      <div className="mt-4 border-t border-dashed border-accent-cyan/50 pt-4 space-y-4">
        <div className="flex w-full rounded-md bg-background-dark p-1 border border-accent-cyan/50">
          <button onClick={() => setSearchType('landSize')} className={`w-1/2 rounded py-1 text-sm font-bold transition-all ${searchType === 'landSize' ? 'bg-accent-cyan text-background-dark shadow-glow-cyan' : 'text-accent-cyan/70'}`}>Land Size</button>
          <button onClick={() => setSearchType('dpe')} className={`w-1/2 rounded py-1 text-sm font-bold transition-all ${searchType === 'dpe' ? 'bg-accent-cyan text-background-dark shadow-glow-cyan' : 'text-accent-cyan/70'}`}>DPE Rating</button>
        </div>
        <div>
          <label htmlFor="radius" className="block text-sm font-semibold text-text-primary/80">Search Radius: <span className="font-bold text-accent-magenta">{radiusKm.toFixed(1)} km</span></label>
          <input id="radius" type="range" min="0.1" max="20" step="0.1" value={radiusKm} onChange={(e) => setRadiusKm(parseFloat(e.target.value))} className="w-full h-2 bg-accent-cyan/20 rounded-lg appearance-none cursor-pointer range-thumb mt-2" />
        </div>
        <div className="border-t border-dashed border-accent-cyan/30 pt-4">
          {searchType === 'landSize' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-primary/80">Target Land Area (m²)</label>
                <input type="number" value={targetLandSize} onChange={e => setTargetLandSize(Number(e.target.value))} className="w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white focus:outline-none focus:border-accent-magenta" />
                <div className="text-xs text-accent-cyan/70 mt-1 flex items-center justify-center gap-2"><span>{minLand} m²</span> <ArrowRight size={12} /> <span>{maxLand} m²</span></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary/80">Leniency</label>
                <LeniencySelector value={landLeniency} setValue={setLandLeniency} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-primary/80">Ideal Consumption (kWh/m²)</label>
                <input type="number" value={targetConsumption} onChange={e => setTargetConsumption(Number(e.target.value))} className="w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white focus:outline-none focus:border-accent-magenta" />
                 <div className="text-xs text-accent-cyan/70 mt-1 flex items-center justify-center gap-2"><span>{minConso}</span> <ArrowRight size={12} /> <span>{maxConso}</span></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary/80">Ideal Emissions (kgCO₂/m²)</label>
                <input type="number" value={targetEmissions} onChange={e => setTargetEmissions(Number(e.target.value))} className="w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white focus:outline-none focus:border-accent-magenta" />
                <div className="text-xs text-accent-cyan/70 mt-1 flex items-center justify-center gap-2"><span>{minEmissions}</span> <ArrowRight size={12} /> <span>{maxEmissions}</span></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary/80">Leniency</label>
                <LeniencySelector value={dpeLeniency} setValue={setDpeLeniency} />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-dashed border-accent-cyan/30">
          <button onClick={resetCenter} className="flex-1 flex items-center justify-center gap-2 text-sm bg-container-bg border-2 border-accent-yellow text-accent-yellow rounded-md px-3 py-2 hover:bg-accent-yellow hover:text-background-dark transition-all"><RefreshCw size={16} /> Recenter</button>
          <button onClick={handleSearchClick} className="flex-1 text-sm bg-accent-magenta border-2 border-accent-magenta text-white rounded-md px-3 py-2 font-bold hover:bg-opacity-80 transition-all">Search Area</button>
        </div>
      </div>
    </div>
  );
}
