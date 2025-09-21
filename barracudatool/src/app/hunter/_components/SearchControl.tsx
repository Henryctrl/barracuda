// src/app/hunter/_components/SearchControl.tsx
import { useState } from 'react';
import { RefreshCw, X, SlidersHorizontal } from 'lucide-react';

interface SearchControlProps {
  radiusKm: number;
  setRadiusKm: (radius: number) => void;
  resetCenter: () => void;
  onClose: () => void;
}

type SearchType = 'landSize' | 'dpe';

export function SearchControl({ radiusKm, setRadiusKm, resetCenter, onClose }: SearchControlProps) {
  const [searchType, setSearchType] = useState<SearchType>('landSize');

  const handleSearch = () => {
    console.log(`Searching for ${searchType} within a ${radiusKm}km radius.`);
    alert('Search logic not yet implemented. See console for parameters.');
  };

  return (
    <div className="absolute top-20 sm:top-4 left-4 z-20 w-80 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-lg border-2 border-accent-cyan bg-container-bg p-4 shadow-glow-cyan backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-accent-cyan flex items-center gap-2 [filter:drop-shadow(0_0_4px_#00ffff)]">
          <SlidersHorizontal size={20} />
          AREA SEARCH
        </h3>
        <button onClick={onClose} className="text-accent-cyan/70 hover:text-accent-cyan">
          <X size={20} />
        </button>
      </div>

      <div className="mt-4 border-t border-dashed border-accent-cyan/50 pt-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-text-primary/80 mb-2">Search Type</label>
          <div className="flex w-full rounded-md bg-background-dark p-1 border border-accent-cyan/50">
            <button
              onClick={() => setSearchType('landSize')}
              className={`w-1/2 rounded py-1 text-sm font-bold transition-all ${searchType === 'landSize' ? 'bg-accent-cyan text-background-dark shadow-glow-cyan' : 'text-accent-cyan/70'}`}
            >
              Land Size
            </button>
            <button
              onClick={() => setSearchType('dpe')}
              className={`w-1/2 rounded py-1 text-sm font-bold transition-all ${searchType === 'dpe' ? 'bg-accent-cyan text-background-dark shadow-glow-cyan' : 'text-accent-cyan/70'}`}
            >
              DPE Rating
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="radius" className="block text-sm font-semibold text-text-primary/80">
            Search Radius: <span className="font-bold text-accent-magenta">{radiusKm.toFixed(1)} km</span>
          </label>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-text-primary/70">0.1km</span>
            <input
              id="radius"
              type="range"
              min="0.1"
              max="20"
              step="0.1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
              className="w-full h-2 bg-accent-cyan/20 rounded-lg appearance-none cursor-pointer range-thumb"
            />
            <span className="text-xs text-text-primary/70">20km</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button onClick={resetCenter} className="flex-1 flex items-center justify-center gap-2 text-sm bg-container-bg border-2 border-accent-yellow text-accent-yellow rounded-md px-3 py-2 hover:bg-accent-yellow hover:text-background-dark transition-all">
            <RefreshCw size={16} />
            Recenter
          </button>
          <button onClick={handleSearch} className="flex-1 text-sm bg-accent-magenta border-2 border-accent-magenta text-white rounded-md px-3 py-2 font-bold hover:bg-opacity-80 transition-all">
            Search Area
          </button>
        </div>
      </div>
    </div>
  );
}
