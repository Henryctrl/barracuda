'use client';
import { Loader2, X } from 'lucide-react';
import { DPERecord, ParcelSearchResult } from '../types'; // We will create this types file next

interface SearchResultsPanelProps {
  results: (DPERecord | ParcelSearchResult)[];
  isLoading: boolean;
  onClose: () => void;
  onResultClick: (result: DPERecord | ParcelSearchResult) => void;
  searchType: 'landSize' | 'dpe';
}

export function SearchResultsPanel({ results, isLoading, onClose, onResultClick, searchType }: SearchResultsPanelProps) {
  if (isLoading) {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center gap-3 rounded-lg border-2 border-accent-cyan bg-container-bg p-4 shadow-glow-cyan backdrop-blur-sm">
        <Loader2 className="animate-spin text-accent-cyan" size={24} />
        <span className="font-bold text-accent-cyan">ANALYZING SECTOR...</span>
      </div>
    );
  }

  return (
    <div className="absolute top-20 sm:top-4 right-4 z-20 w-96 max-h-[calc(100vh-10rem)] flex flex-col rounded-lg border-2 border-accent-magenta bg-container-bg p-4 shadow-glow-magenta backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-accent-magenta [filter:drop-shadow(0_0_4px_#ff00ff)]">SEARCH RESULTS ({results.length})</h3>
        <button onClick={onClose} className="text-accent-magenta/70 hover:text-accent-magenta"><X size={20} /></button>
      </div>
      <div className="overflow-y-auto space-y-2 pr-2">
        {results.length === 0 && <p className="text-center text-text-primary/70">No results found for this area and criteria.</p>}
        {results.map((result, index) => (
          <button
            key={index}
            onClick={() => onResultClick(result)}
            className="w-full text-left p-3 rounded-lg transition-all bg-container-bg/50 border border-accent-cyan/20 hover:bg-accent-cyan/10 hover:border-accent-cyan"
          >
            {searchType === 'dpe' ? (
              <DpeResultItem result={result as DPERecord} />
            ) : (
              <ParcelResultItem result={result as ParcelSearchResult} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

const DpeResultItem = ({ result }: { result: DPERecord }) => (
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
    <div className="text-sm text-text-primary/80">
      Area: <span className="font-mono text-accent-cyan">{result.contenance} m²</span>
    </div>
  </div>
);
