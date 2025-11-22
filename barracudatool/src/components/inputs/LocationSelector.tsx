'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';

interface LocationFeature {
  properties: {
    label: string;
    city?: string;
    postcode?: string;
    context?: string; // Department/Region info
    id?: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface LocationSelectorProps {
  value: string; // We store as a comma-separated string for database compatibility
  onChange: (value: string) => void;
}

export default function LocationSelector({ value, onChange }: LocationSelectorProps) {
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
    if (JSON.stringify(current) !== JSON.stringify(selectedLocations)) {
      setSelectedLocations(current);
    }
  }, [value]);

  // Debounce search
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Querying specifically for municipalities (towns) or postcodes usually makes sense for "Search Criteria"
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&type=municipality`);
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

  // Handle Selection
  const handleSelect = (feature: LocationFeature) => {
    const label = `${feature.properties.label} (${feature.properties.context?.split(',')[0] || ''})`; // e.g. "Nice (33)"
    if (!selectedLocations.includes(label)) {
      const newLocations = [...selectedLocations, label];
      setSelectedLocations(newLocations);
      onChange(newLocations.join('; ')); // Update parent
    }
    setQuery('');
    setSuggestions([]);
  };

  // Handle Removal
  const handleRemove = (locToRemove: string) => {
    const newLocations = selectedLocations.filter(loc => loc !== locToRemove);
    setSelectedLocations(newLocations);
    onChange(newLocations.join('; '));
  };

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Tailwind Classes
  const inputClass = "w-full bg-[#0d0d21] border border-[#00ffff] rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-[#ff00ff] placeholder-white/30";
  const chipClass = "flex items-center gap-1 bg-[#ff00ff]/20 border border-[#ff00ff] text-white px-2 py-1 rounded text-xs";

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Selected Chips */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedLocations.map((loc, idx) => (
          <div key={idx} className={chipClass}>
            <MapPin size={10} />
            {loc}
            <button type="button" onClick={() => handleRemove(loc)} className="hover:text-[#ff00ff] ml-1">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          className={inputClass}
          placeholder="Search city, region, or postcode..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00ffff]">
            <Loader2 className="animate-spin" size={16} />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[#0d0d21] border border-[#00ffff] rounded shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((feature, idx) => (
            <div
              key={idx}
              className="p-2 hover:bg-[#00ffff]/20 cursor-pointer text-sm text-white border-b border-[#00ffff]/20 last:border-0"
              onClick={() => handleSelect(feature)}
            >
              <div className="font-bold">{feature.properties.label}</div>
              <div className="text-xs text-gray-400">{feature.properties.context}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
