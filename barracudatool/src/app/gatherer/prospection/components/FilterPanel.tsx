'use client';

import { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, Search, SlidersHorizontal, MapPinned } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState(filters.town || '');
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalFilters(filters);
    setSearchQuery(filters.town || '');
  }, [filters]);

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
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];

    setLocalFilters({
      ...localFilters,
      status: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

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

    if (!query.trim()) {
      setLocalFilters((prev) => ({ ...prev, town: undefined, searchCenter: undefined }));
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 250);
  };

  const handleSuggestionClick = (feature: BanFeature) => {
    const { city } = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;

    setSearchQuery(city || feature.properties.label);
    setSuggestions([]);

    setLocalFilters({
      ...localFilters,
      town: city || feature.properties.label,
      searchCenter: [lon, lat],
    });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setLocalFilters({
      ...localFilters,
      town: undefined,
      searchCenter: undefined,
    });
  };

  return (
    <div className="border-b border-white/10 bg-[#151311]/95 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c89b6d]">
              <SlidersHorizontal size={14} />
              Filter controls
            </div>
            <h3 className="text-lg font-semibold text-[#f4ede7]">Refine your search set</h3>
            <p className="text-sm text-[#b7aca2]">
              Tune price, location, distance, and status without leaving the prospection workflow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-[#d7ccc2] transition hover:border-[#c89b6d]/35 hover:bg-[#c89b6d]/10 hover:text-[#f6ede4]"
            >
              <RotateCcw size={16} />
              Reset
            </button>

            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-2 text-[#cdbfb3] transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              aria-label="Close filters"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#1b1815] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#b9ada2]">
              Price range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={localFilters.minPrice || ''}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    minPrice: parseFloat(e.target.value) || undefined,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-[#12100e] px-3 py-2.5 text-sm text-[#f3ece6] outline-none transition placeholder:text-[#796f67] focus:border-[#c89b6d]/60 focus:ring-2 focus:ring-[#c89b6d]/20"
              />
              <input
                type="number"
                placeholder="Max"
                value={localFilters.maxPrice || ''}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    maxPrice: parseFloat(e.target.value) || undefined,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-[#12100e] px-3 py-2.5 text-sm text-[#f3ece6] outline-none transition placeholder:text-[#796f67] focus:border-[#c89b6d]/60 focus:ring-2 focus:ring-[#c89b6d]/20"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1b1815] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#b9ada2]">
              Town / location
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9d8f82]" size={16} />
              <input
                type="text"
                placeholder="Search town or city"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-xl border border-white/10 bg-[#12100e] py-2.5 pl-9 pr-10 text-sm text-[#f3ece6] outline-none transition placeholder:text-[#796f67] focus:border-[#c89b6d]/60 focus:ring-2 focus:ring-[#c89b6d]/20"
              />
              {searchQuery.length > 0 && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#988b7f] transition hover:text-[#f4ede7]"
                  aria-label="Clear location search"
                >
                  <X size={16} />
                </button>
              )}

              {suggestions.length > 0 && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[#c89b6d]/25 bg-[#171411] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                  {suggestions.map((feature, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(feature)}
                      className="block w-full border-b border-white/5 px-3 py-3 text-left transition last:border-b-0 hover:bg-white/[0.04]"
                    >
                      <div className="text-sm font-medium text-[#f5eee8]">
                        {feature.properties.city || feature.properties.label}
                      </div>
                      {feature.properties.postcode && (
                        <div className="mt-0.5 text-xs text-[#aa9c90]">{feature.properties.postcode}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1b1815] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#b9ada2]">
              Sort
            </label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select
                value={localFilters.sortBy || 'created_at'}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    sortBy: e.target.value as typeof localFilters.sortBy,
                  })
                }
                className="rounded-xl border border-white/10 bg-[#12100e] px-3 py-2.5 text-sm text-[#f3ece6] outline-none transition focus:border-[#c89b6d]/60 focus:ring-2 focus:ring-[#c89b6d]/20"
              >
                <option value="price">Price</option>
                <option value="town">Town</option>
                <option value="last_contact_date">Last Contact</option>
                <option value="created_at">Created</option>
              </select>

              <select
                value={localFilters.sortOrder || 'desc'}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    sortOrder: e.target.value as 'asc' | 'desc',
                  })
                }
                className="rounded-xl border border-white/10 bg-[#12100e] px-3 py-2.5 text-sm text-[#f3ece6] outline-none transition focus:border-[#c89b6d]/60 focus:ring-2 focus:ring-[#c89b6d]/20"
              >
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1b1815] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#b9ada2]">
              Distance radius
            </label>
            <input
              type="number"
              placeholder="Max distance in km"
              value={localFilters.maxDistance || ''}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  maxDistance: parseFloat(e.target.value) || undefined,
                })
              }
              className="w-full rounded-xl border border-white/10 bg-[#12100e] px-3 py-2.5 text-sm text-[#f3ece6] outline-none transition placeholder:text-[#796f67] focus:border-[#c89b6d]/60 focus:ring-2 focus:ring-[#c89b6d]/20"
            />

            <div className="mt-2 min-h-[20px] text-xs">
              {localFilters.maxDistance && !localFilters.searchCenter && (
                <p className="text-[#d0ab7e]">Search a town above to set the search center.</p>
              )}
              {localFilters.searchCenter && (
                <p className="inline-flex items-center gap-1 text-[#cbb39a]">
                  <MapPinned size={12} />
                  Center set to {localFilters.town || 'selected location'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-[#1b1815] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-[#b9ada2]">
            Status
          </label>

          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const isSelected = localFilters.status?.includes(key as ProspectionStatus);

              return (
                <button
                  key={key}
                  onClick={() => toggleStatus(key as ProspectionStatus)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isSelected
                      ? 'border-[#c89b6d]/60 bg-[#c89b6d]/14 text-[#f8eee5] shadow-[0_0_0_1px_rgba(200,155,109,0.16),0_12px_24px_rgba(0,0,0,0.16)]'
                      : 'border-white/10 bg-white/[0.02] text-[#cdbfb3] hover:border-white/20 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: config.dotColor }}
                  />
                  {config.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleApply}
              className="rounded-xl border border-[#c89b6d]/50 bg-[#c89b6d] px-5 py-2.5 text-sm font-semibold text-[#1a1510] shadow-[0_8px_24px_rgba(200,155,109,0.24)] transition hover:bg-[#d3a778]"
            >
              Apply filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}