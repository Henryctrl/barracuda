'use client';

import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { ProspectionFilters, ProspectionStatus, STATUS_CONFIG } from '../types';

interface FilterPanelProps {
  filters: ProspectionFilters;
  onFiltersChange: (filters: ProspectionFilters) => void;
  onClose: () => void;
}

export default function FilterPanel({ filters, onFiltersChange, onClose }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<ProspectionFilters>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    const emptyFilters: ProspectionFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const toggleStatus = (status: ProspectionStatus) => {
    const currentStatuses = localFilters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s: ProspectionStatus) => s !== status)
      : [...currentStatuses, status];
    setLocalFilters({ ...localFilters, status: newStatuses.length > 0 ? newStatuses : undefined });
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

          {/* Town */}
          <div>
            <label className="block text-text-primary/80 mb-2 font-semibold text-sm">TOWN</label>
            <input
              type="text"
              placeholder="Search by town..."
              value={localFilters.town || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, town: e.target.value || undefined })}
              className="w-full px-3 py-2 bg-background-dark border border-accent-cyan text-white rounded-md text-sm focus:outline-none focus:border-accent-magenta"
            />
          </div>

          {/* Sort */}
          <div>
            <label className="block text-text-primary/80 mb-2 font-semibold text-sm">SORT BY</label>
            <div className="flex gap-2">
              <select
                value={localFilters.sortBy || 'created_at'}
                onChange={(e) => setLocalFilters({ ...localFilters, sortBy: e.target.value as any })}
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
              <p className="text-xs text-accent-yellow mt-1">Click "SET DISTANCE CENTER" on map</p>
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
