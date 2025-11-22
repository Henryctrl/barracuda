'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';

interface LocationFeature {
  properties: {
    label: string;
    city?: string;
    postcode?: string;
    context?: string;
    type: 'municipality' | 'locality' | 'street' | 'housenumber';
    id?: string;
    name: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface LocationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function LocationSelector({ value, onChange, className }: LocationSelectorProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(
    value ? value.split(';').map(s => s.trim()).filter(Boolean) : []
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal state if parent value changes externally
  useEffect(() => {
    const current = value ? value.split(';').map(s => s.trim()).filter(Boolean) : [];
    // JSON stringify comparison is fine for simple string arrays
    if (JSON.stringify(current) !== JSON.stringify(selectedLocations)) {
      setSelectedLocations(current);
    }
    // We added selectedLocations to dependency array to satisfy linter,
    // but we check equality to prevent loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        setSuggestions(data.features || []);
      } catch (error) {
        console.error("Location search failed", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const formatLabel = (feature: LocationFeature): string => {
    const { properties } = feature;
    if (properties.type !== 'municipality' && !properties.city) {
      const contextParts = properties.context?.split(', ');
      const department = contextParts?.find(p => /^\d+$/.test(p.split(' ')[0]));
      if (department) return `${properties.name} (Dept. ${department.split(' ')[0]})`;
      return properties.name;
    }
    return `${properties.city} (${properties.postcode})`;
  };

  const handleSelect = (feature: LocationFeature) => {
    const label = formatLabel(feature);
    if (!selectedLocations.includes(label)) {
      const newLocations = [...selectedLocations, label];
      setSelectedLocations(newLocations);
      onChange(newLocations.join('; '));
    }
    setQuery('');
    setSuggestions([]);
  };

  const handleRemove = (locToRemove: string) => {
    const newLocations = selectedLocations.filter(loc => loc !== locToRemove);
    setSelectedLocations(newLocations);
    onChange(newLocations.join('; '));
  };
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setSuggestions([]);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const inputClass = "w-full bg-[#0d0d21] border border-[#00ffff] rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-[#ff00ff] placeholder-white/30";
  const chipClass = "flex items-center gap-1 bg-[#ff00ff]/20 border border-[#ff00ff] text-white px-2 py-1 rounded text-xs whitespace-nowrap";

  return (
    <div className={`relative w-full ${className || ''}`} ref={wrapperRef}>
      <div className="flex flex-wrap gap-2 mb-2 min-h-[30px]">
        {selectedLocations.map((loc, idx) => (
          <div key={idx} className={chipClass}>
            <MapPin size={10} />
            {loc}
            <button type="button" onClick={() => handleRemove(loc)} className="hover:text-[#ff00ff] ml-1"><X size={12} /></button>
          </div>
        ))}
      </div>
      <div className="relative">
        <input type="text" className={inputClass} placeholder="Search city, department, region..." value={query} onChange={(e) => setQuery(e.target.value)} />
        {isLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00ffff]"><Loader2 className="animate-spin" size={16} /></div>}
      </div>
      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[#0d0d21] border border-[#00ffff] rounded shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((feature, idx) => (
            <div key={idx} className="p-3 hover:bg-[#00ffff]/20 cursor-pointer text-sm text-white border-b border-[#00ffff]/20 last:border-0" onClick={() => handleSelect(feature)}>
              <div className="font-bold">{feature.properties.label}</div>
              <div className="text-xs text-gray-400">{feature.properties.context}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
