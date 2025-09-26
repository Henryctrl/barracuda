'use client';
import { useState, useMemo } from 'react';
import { RefreshCw, X, SlidersHorizontal, ArrowRight, Loader2, ChevronUp } from 'lucide-react';
import { DPERecord as DpeSearchResult, ParcelSearchResult } from '../types';

export interface SearchParams {
  type: 'landSize' | 'dpe';
  radiusKm: number;
  center: [number, number];
  [key: string]: any; 
}

interface SearchPanelProps {
  onClose: () => void;
  onSearch: (params: SearchParams) => void;
  onRecenter: () => void; // Added prop for recentering
  center: [number, number];
  results: (DpeSearchResult | ParcelSearchResult)[];
  isLoading: boolean;
  onResultClick: (result: DpeSearchResult | ParcelSearchResult) => void;
}

type SearchType = 'landSize' | 'dpe';

export function SearchPanel({ onClose, onSearch, onRecenter, center, results, isLoading, onResultClick }: SearchPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>('landSize');
  
  const [radiusKm, setRadiusKm] = useState(2);
  const [targetLandSize, setTargetLandSize] = useState(1000);
  const [landLeniency, setLandLeniency] = useState(0.1);
  const [targetConsumption, setTargetConsumption] = useState(150);
  const [targetEmissions, setTargetEmissions] = useState(30);
  const [dpeLeniency, setDpeLeniency] = useState(0.2);

  const { minLand, maxLand } = useMemo(() => ({ minLand: Math.round(targetLandSize - (targetLandSize * landLeniency)), maxLand: Math.round(targetLandSize + (targetLandSize * landLeniency)) }), [targetLandSize, landLeniency]);
  const { minConso, maxConso, minEmissions, maxEmissions } = useMemo(() => ({ minConso: Math.round(targetConsumption - (targetConsumption * dpeLeniency)), maxConso: Math.round(targetConsumption + (targetConsumption * dpeLeniency)), minEmissions: Math.round(targetEmissions - (targetEmissions * dpeLeniency)), maxEmissions: Math.round(targetEmissions + (targetEmissions * dpeLeniency)) }), [targetConsumption, targetEmissions, dpeLeniency]);

  const handleSearchClick = () => {
    let params: SearchParams = { type: searchType, radiusKm, center };
    if (searchType === 'landSize') {
      params = { ...params, minSize: minLand, maxSize: maxLand };
    } else {
      params = { ...params, idealConsumption: targetConsumption, idealEmissions: targetEmissions, minConsumption: minConso, maxConsumption: maxConso, minEmissions: minEmissions, maxEmissions: maxEmissions };
    }
    onSearch(params);
    if (!isCollapsed) setIsCollapsed(true);
  };

  const LeniencySelector = ({ value, setValue }: { value: number, setValue: (val: number) => void }) => (
    <div className="flex w-full rounded-md bg-background-dark p-1 border border-accent-cyan/30 mt-1">
      {[0.0, 0.1, 0.2, 0.3, 0.5].map(val => (
        <button key={val} onClick={() => setValue(val)} className={`w-1/4 rounded py-1 text-xs font-bold transition-all ${value === val ? 'bg-accent-cyan text-background-dark shadow-glow-cyan' : 'text-accent-cyan/70 hover:text-accent-cyan/90'}`}>±{val * 100}%</button>
      ))}
    </div>
  );

  return (
    <div className="absolute top-20 sm:top-4 left-4 z-20 w-96 max-h-[calc(100vh-10rem)] flex flex-col rounded-lg border-2 border-accent-cyan bg-container-bg shadow-glow-cyan backdrop-blur-sm">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-lg font-bold text-accent-cyan flex items-center gap-2 [filter:drop-shadow(0_0_4px_#00ffff)]"><SlidersHorizontal size={20} /> AREA SEARCH</h3>
        <div className="flex items-center gap-2">
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-accent-cyan/70 hover:text-accent-cyan"><ChevronUp className={`transition-transform ${isCollapsed ? '' : 'rotate-180'}`} size={20} /></button>
            <button onClick={onClose} className="text-accent-cyan/70 hover:text-accent-cyan"><X size={20} /></button>
        </div>
      </div>
      
      <div className={`px-4 pb-4 transition-all duration-300 overflow-hidden ${isCollapsed ? 'max-h-0 py-0' : 'max-h-[500px] border-t border-dashed border-accent-cyan/30 pt-4'}`}>
        <div className="space-y-4">
          <div className="flex w-full rounded-md bg-background-dark p-1 border border-accent-cyan/50"><button onClick={() => setSearchType('landSize')} className={`w-1/2 rounded py-1 text-sm font-bold transition-all ${searchType === 'landSize' ? 'bg-accent-cyan text-background-dark shadow-glow-cyan' : 'text-accent-cyan/70'}`}>Land Size</button><button onClick={() => setSearchType('dpe')} className={`w-1/2 rounded py-1 text-sm font-bold transition-all ${searchType === 'dpe' ? 'bg-accent-cyan text-background-dark shadow-glow-cyan' : 'text-accent-cyan/70'}`}>DPE Rating</button></div>
          <div><label htmlFor="radius" className="block text-sm font-semibold text-text-primary/80">Search Radius: <span className="font-bold text-accent-magenta">{radiusKm.toFixed(1)} km</span></label><input id="radius" type="range" min="0.1" max="20" step="0.1" value={radiusKm} onChange={(e) => setRadiusKm(parseFloat(e.target.value))} className="w-full h-2 bg-accent-cyan/20 rounded-lg appearance-none cursor-pointer range-thumb mt-2" /></div>
          {searchType === 'landSize' ? (
            <div className="space-y-4"><label className="block text-sm font-semibold text-text-primary/80">Target Land Area (m²)</label><input type="number" value={targetLandSize} onChange={e => setTargetLandSize(Number(e.target.value))} className="w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white focus:outline-none focus:border-accent-magenta" /><div className="text-xs text-accent-cyan/70 mt-1 flex items-center justify-center gap-2"><span>{minLand} m²</span> <ArrowRight size={12} /> <span>{maxLand} m²</span></div><div><label className="block text-sm font-semibold text-text-primary/80">Leniency</label><LeniencySelector value={landLeniency} setValue={setLandLeniency} /></div></div>
          ) : (
            <div className="space-y-4"><label className="block text-sm font-semibold text-text-primary/80">Ideal Consumption (kWh/m²)</label><input type="number" value={targetConsumption} onChange={e => setTargetConsumption(Number(e.target.value))} className="w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white focus:outline-none focus:border-accent-magenta" /><div className="text-xs text-accent-cyan/70 mt-1 flex items-center justify-center gap-2"><span>{minConso}</span> <ArrowRight size={12} /> <span>{maxConso}</span></div><div><label className="block text-sm font-semibold text-text-primary/80">Ideal Emissions (kgCO₂/m²)</label><input type="number" value={targetEmissions} onChange={e => setTargetEmissions(Number(e.target.value))} className="w-full mt-1 p-2 bg-background-dark border-2 border-accent-cyan/50 rounded-md text-white focus:outline-none focus:border-accent-magenta" /><div className="text-xs text-accent-cyan/70 mt-1 flex items-center justify-center gap-2"><span>{minEmissions}</span> <ArrowRight size={12} /> <span>{maxEmissions}</span></div></div><div><label className="block text-sm font-semibold text-text-primary/80">Leniency</label><LeniencySelector value={dpeLeniency} setValue={setDpeLeniency} /></div></div>
          )}
          <div className="flex items-center gap-2 pt-4 border-t border-dashed border-accent-cyan/30">
            <button onClick={onRecenter} className="flex-1 flex items-center justify-center gap-2 text-sm bg-container-bg border-2 border-accent-yellow text-accent-yellow rounded-md px-3 py-2 hover:bg-accent-yellow hover:text-background-dark transition-all">
                <RefreshCw size={16} /> Recenter
            </button>
            <button onClick={handleSearchClick} className="flex-1 text-sm bg-accent-magenta border-2 border-accent-magenta text-white rounded-md px-3 py-2 font-bold hover:bg-opacity-80 transition-all">
                Search Area
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 border-t border-accent-cyan/50">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-accent-cyan"><Loader2 className="animate-spin" size={16} /><span>ANALYZING SECTOR...</span></div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-text-primary/80">Found {results.length} results.</p>
            {results.map((result, index) => (
              <button key={index} onClick={() => onResultClick(result)} className="w-full text-left p-3 rounded-lg transition-all bg-container-bg/50 border border-accent-cyan/20 hover:bg-accent-cyan/10 hover:border-accent-cyan">
                {searchType === 'dpe' ? <DpeResultItem result={result as DpeSearchResult} /> : <ParcelResultItem result={result as ParcelSearchResult} />}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-text-primary/70">No results yet. Configure your search and press "Search This Area".</p>
        )}
      </div>
    </div>
  );
}

const DpeResultItem = ({ result }: { result: DpeSearchResult }) => (<div><div className="font-bold text-white">{result.adresse_ban}</div><div className="text-sm text-text-primary/80 grid grid-cols-2 gap-x-4"><span>Conso: <span className="font-mono text-accent-cyan">{result.conso_5_usages_par_m2_ep} kWh/m²</span></span><span>Emissions: <span className="font-mono text-accent-cyan">{result.emission_ges_5_usages_par_m2} kgCO₂/m²</span></span></div></div>);
const ParcelResultItem = ({ result }: { result: ParcelSearchResult }) => (<div><div className="font-bold text-white">Parcel ID: {result.id}</div><div className="text-sm text-text-primary/80">Area: <span className="font-mono text-accent-cyan">{result.contenance} m²</span></div></div>);
