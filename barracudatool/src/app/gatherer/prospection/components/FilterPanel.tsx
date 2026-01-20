'use client';

import { useState, useRef } from 'react';
import { X, RotateCcw, Search } from 'lucide-react';
import { ProspectionFilters, ProspectionStatus, STATUS_CONFIG } from '../types';

interface BanFeature {
  geometry: { coordinates: [number, number] };
  properties: { label: string; housenumber?: string; postcode?: string; city?: string };
}

interface FilterPanelProps {
  filters: ProspectionFilters;
  onFiltersChange: (filters: ProspectionFilters) => void;
  onClose: () => void;
}

export default function FilterPanel({ filters, onFiltersChange, onClose }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<ProspectionFilters>(filters);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    const emptyFilters: ProspectionFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    setSearchQuery('');
    setSuggestions([]);
  };

  const toggleStatus = (status: ProspectionStatus) => {
    const currentStatuses = localFilters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s: ProspectionStatus) => s !== status)
      : [...currentStatuses, status];
    setLocalFilters({ ...localFilters, status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  // Fetch autocomplete suggestions
  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&type=municipality`
      );
      const data = await response.json();
      setSuggestions(data.features || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
  };

  const handleSuggestionClick = (feature: BanFeature) => {
    const { city } = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    
    setSearchQuery(city || feature.properties.label);
    setSuggestions([]);
    
    setLocalFilters({
      ...localFilters,
      town: city,
      searchCenter: [lon, lat]
    });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setLocalFilters({ ...localFilters, town: undefined });
  };

  return (
    <div className="bg-background-light/95 border-b-2 border-accent-magenta p-4 backdrop-blur-sm">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-accent-magenta font-bold text-lg">FILTER OPTIONS</h3>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1 text-sm bg-transparent border border-text-primary/50 text-text-primary rounded hover:bg-text-primary/10"
            >
              <RotateCcw size={16} className="inline mr-1" />
              RESET
            </button>
            <button onClick={onClose} className="text-accent-magenta hover:text-accent-cyan">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Price Range */}
          <div>
            <label className="block text-text-primary/80 mb-2 font-semibold text-sm">PRICE RANGE (€)</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={localFilters.minPrice || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, minPrice: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 bg-background-dark border border-accent-cyan text-white rounded-md text-sm focus:outline-none focus:border-accent-magenta"
              />
              <input
                type="number"
                placeholder="Max"
                value={localFilters.maxPrice || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, maxPrice: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 bg-background-dark border border-accent-cyan text-white rounded-md text-sm focus:outline-none focus:border-accent-magenta"
              />
            </div>
          </div>

          {/* Town with Autocomplete */}
          <div>
            <label className="block text-text-primary/80 mb-2 font-semibold text-sm">TOWN / LOCATION</label>
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 text-accent-cyan/70" size={16} />
                <input
                  type="text"
                  placeholder="Search town or city..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-9 py-2 bg-background-dark border border-accent-cyan text-white rounded-md text-sm focus:outline-none focus:border-accent-magenta"
                />
                {searchQuery.length > 0 && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 text-accent-cyan/70 hover:text-accent-cyan"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              {/* Suggestions Dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute mt-1 w-full bg-background-dark border-2 border-accent-cyan rounded-md shadow-glow-cyan max-h-48 overflow-y-auto z-50">
                  {suggestions.map((feature, index) => (
                    <div
                      key={index}
                      onClick={() => handleSuggestionClick(feature)}
                      className="px-3 py-2 text-white hover:bg-accent-cyan/20 cursor-pointer border-b border-accent-cyan/10 last:border-b-0"
                    >
                      <div className="font-semibold text-sm">{feature.properties.city}</div>
                      {feature.properties.postcode && (
                        <div className="text-xs text-accent-cyan/70">
                          {feature.properties.postcode}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-text-primary/80 mb-2 font-semibold text-sm">SORT BY</label>
            <div className="flex gap-2">
              <select
                value={localFilters.sortBy || 'created_at'}
                onChange={(e) => setLocalFilters({ ...localFilters, sortBy: e.target.value as typeof localFilters.sortBy })}
                className="flex-1 px-3 py-2 bg-background-dark border border-accent-cyan text-white rounded-md text-sm focus:outline-none focus:border-accent-magenta"
              >
                <option value="price">Price</option>
                <option value="town">Town</option>
                <option value="last_contact_date">Last Contact</option>
                <option value="created_at">Created</option>
              </select>
              <select
                value={localFilters.sortOrder || 'desc'}
                onChange={(e) => setLocalFilters({ ...localFilters, sortOrder: e.target.value as 'asc' | 'desc' })}
                className="px-3 py-2 bg-background-dark border border-accent-cyan text-white rounded-md text-sm focus:outline-none focus:border-accent-magenta"
              >
                <option value="asc">↑ ASC</option>
                <option value="desc">↓ DESC</option>
              </select>
            </div>
          </div>

          {/* Distance */}
          <div>
            <label className="block text-text-primary/80 mb-2 font-semibold text-sm">DISTANCE (KM)</label>
            <input
              type="number"
              placeholder="Max distance..."
              value={localFilters.maxDistance || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, maxDistance: parseFloat(e.target.value) || undefined })}
              className="w-full px-3 py-2 bg-background-dark border border-accent-cyan text-white rounded-md text-sm focus:outline-none focus:border-accent-magenta"
            />
            {localFilters.maxDistance && !localFilters.searchCenter && (
              <p className="text-xs text-accent-yellow mt-1">Search a town above to set center</p>
            )}
            {localFilters.searchCenter && (
              <p className="text-xs text-green-400 mt-1">✓ Center set to {localFilters.town || 'selected location'}</p>
            )}
          </div>
        </div>

        {/* Status Filters */}
        <div className="mt-4">
          <label className="block text-text-primary/80 mb-2 font-semibold text-sm">STATUS</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const isSelected = localFilters.status?.includes(key as ProspectionStatus);
              return (
                <button
                  key={key}
                  onClick={() => toggleStatus(key as ProspectionStatus)}
                  className={`px-4 py-2 rounded-md border-2 font-semibold text-sm transition-all ${
                    isSelected
                      ? 'border-white text-white'
                      : 'border-transparent text-text-primary/60 hover:border-white/30'
                  }`}
                  style={{
                    backgroundColor: isSelected ? config.dotColor : 'transparent',
                    boxShadow: isSelected ? `0 0 12px ${config.dotColor}` : 'none'
                  }}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-accent-magenta text-background-dark rounded-md font-bold hover:bg-accent-magenta/80 shadow-glow-magenta"
          >
            APPLY FILTERS
          </button>
        </div>
      </div>
    </div>
  );
}
