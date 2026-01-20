'use client';

import { useState, useEffect, useCallback } from 'react';
import { Map, List, Plus, Upload, Filter, AlertTriangle } from 'lucide-react';
import ProspectionMap from './components/ProspectionMap';
import ProspectionTable from './components/ProspectionTable';
import AddProspectModal from './components/AddProspectModal';
import UploadCSVModal from './components/UploadCSVModal';
import FailedEntriesModal from './components/FailedEntriesModal';
import FilterPanel from './components/FilterPanel';
import { PropertyProspect, ProspectionFilters } from './types';

export default function ProspectionPage() {
  const [viewMode, setViewMode] = useState<'map' | 'data'>('map');
  const [prospects, setProspects] = useState<PropertyProspect[]>([]);
  const [filteredProspects, setFilteredProspects] = useState<PropertyProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFailedEntries, setShowFailedEntries] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ProspectionFilters>({});
  const [selectedProspect, setSelectedProspect] = useState<PropertyProspect | null>(null);
  const [failedEntriesCount, setFailedEntriesCount] = useState(0);

  // Check for failed entries count
  useEffect(() => {
    const updateFailedCount = () => {
      const stored = localStorage.getItem('failed_csv_entries');
      if (stored) {
        setFailedEntriesCount(JSON.parse(stored).length);
      } else {
        setFailedEntriesCount(0);
      }
    };

    updateFailedCount();
    
    // Listen for storage changes (in case user opens multiple tabs)
    window.addEventListener('storage', updateFailedCount);
    
    return () => window.removeEventListener('storage', updateFailedCount);
  }, []);

  // Fetch prospects
  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.town) params.append('town', filters.town);
      if (filters.status) params.append('status', filters.status.join(','));
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/prospection?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch prospects');
      
      const data = await response.json();
      setProspects(data);
      
      // Apply distance filter if needed
      if (filters.searchCenter && filters.maxDistance) {
        const filtered = data.filter((p: PropertyProspect) => {
          if (!p.latitude || !p.longitude) return false;
          const distance = calculateDistance(
            filters.searchCenter![0],
            filters.searchCenter![1],
            p.longitude,
            p.latitude
          );
          return distance <= filters.maxDistance!;
        });
        setFilteredProspects(filtered);
      } else {
        setFilteredProspects(data);
      }
    } catch (error) {
      console.error('Error fetching prospects:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lon1: number, lat1: number, lon2: number, lat2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleAddProspect = async (prospect: Partial<PropertyProspect>) => {
    try {
      const response = await fetch('/api/prospection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prospect)
      });
      
      if (!response.ok) throw new Error('Failed to add prospect');
      
      await fetchProspects();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding prospect:', error);
      alert('Failed to add prospect');
    }
  };

  const handleUpdateProspect = async (id: string, updates: Partial<PropertyProspect>) => {
    try {
      const response = await fetch(`/api/prospection?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update prospect');
      
      await fetchProspects();
    } catch (error) {
      console.error('Error updating prospect:', error);
      alert('Failed to update prospect');
    }
  };

  const handleDeleteProspect = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prospect?')) return;
    
    try {
      const response = await fetch(`/api/prospection?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete prospect');
      
      await fetchProspects();
    } catch (error) {
      console.error('Error deleting prospect:', error);
      alert('Failed to delete prospect');
    }
  };

  const handleRetryFailedEntry = (entryData: unknown) => {
    setShowFailedEntries(false);
    alert('To fix this entry, please add it manually with the correct data.');
    setShowAddModal(true);
  };

  return (
    <div className="min-h-screen bg-background-dark text-text-primary">
      {/* Header */}
      <div className="border-b-2 border-accent-cyan bg-background-light/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-accent-cyan [filter:drop-shadow(0_0_8px_#00ffff)]">
              PROSPECTION GRID
            </h1>
            
            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex border-2 border-accent-cyan rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 font-bold transition-all ${
                    viewMode === 'map'
                      ? 'bg-accent-cyan text-background-dark'
                      : 'bg-transparent text-accent-cyan hover:bg-accent-cyan/20'
                  }`}
                >
                  <Map className="inline mr-2" size={20} />
                  MAP
                </button>
                <button
                  onClick={() => setViewMode('data')}
                  className={`px-4 py-2 font-bold transition-all ${
                    viewMode === 'data'
                      ? 'bg-accent-cyan text-background-dark'
                      : 'bg-transparent text-accent-cyan hover:bg-accent-cyan/20'
                  }`}
                >
                  <List className="inline mr-2" size={20} />
                  DATA
                </button>
              </div>

              {/* Failed Entries Button (only show if there are failures) */}
              {failedEntriesCount > 0 && (
                <button
                  onClick={() => setShowFailedEntries(true)}
                  className="px-4 py-2 bg-red-900/50 border-2 border-red-500 text-red-400 rounded-md font-bold hover:bg-red-900/70 transition-all shadow-glow-red animate-pulse"
                >
                  <AlertTriangle className="inline mr-2" size={20} />
                  {failedEntriesCount} FAILED {failedEntriesCount === 1 ? 'ENTRY' : 'ENTRIES'}
                </button>
              )}

              {/* Action Buttons */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-transparent border-2 border-accent-magenta text-accent-magenta rounded-md font-bold hover:bg-accent-magenta hover:text-background-dark transition-all shadow-glow-magenta"
              >
                <Filter className="inline mr-2" size={20} />
                FILTER
              </button>
              
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-transparent border-2 border-accent-yellow text-accent-yellow rounded-md font-bold hover:bg-accent-yellow hover:text-background-dark transition-all shadow-glow-yellow"
              >
                <Upload className="inline mr-2" size={20} />
                UPLOAD CSV
              </button>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-accent-cyan border-2 border-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80 transition-all shadow-glow-cyan"
              >
                <Plus className="inline mr-2" size={20} />
                ADD PROSPECT
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-4 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-primary/70">TOTAL:</span>
              <span className="font-bold text-accent-cyan">{filteredProspects.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-primary/70">NOT CONTACTED:</span>
              <span className="font-bold text-gray-400">
                {filteredProspects.filter(p => p.status === 'not_contacted').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-primary/70">CONTACTED:</span>
              <span className="font-bold text-cyan-400">
                {filteredProspects.filter(p => p.status === 'contacted').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-primary/70">POSITIVE:</span>
              <span className="font-bold text-green-400">
                {filteredProspects.filter(p => p.status === 'positive_response').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Main Content */}
      <div className="h-[calc(100vh-200px)]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-accent-cyan text-xl font-bold animate-pulse">
              LOADING PROSPECTION DATA...
            </div>
          </div>
        ) : viewMode === 'map' ? (
          <ProspectionMap
            prospects={filteredProspects}
            onProspectClick={setSelectedProspect}
            onProspectUpdate={handleUpdateProspect}
            filters={filters}
            onFiltersChange={setFilters}
          />
        ) : (
          <ProspectionTable
            prospects={filteredProspects}
            onProspectClick={setSelectedProspect}
            onProspectUpdate={handleUpdateProspect}
            onProspectDelete={handleDeleteProspect}
          />
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddProspectModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddProspect}
        />
      )}

      {showUploadModal && (
        <UploadCSVModal
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {showFailedEntries && (
        <FailedEntriesModal
          onClose={() => {
            setShowFailedEntries(false);
            // Update count when closing modal
            const stored = localStorage.getItem('failed_csv_entries');
            setFailedEntriesCount(stored ? JSON.parse(stored).length : 0);
          }}
          onRetry={handleRetryFailedEntry}
        />
      )}
    </div>
  );
}
