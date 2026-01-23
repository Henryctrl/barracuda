'use client';

import { useState, useEffect, useCallback } from 'react';
import { Map, List, Plus, Upload, Filter, AlertTriangle, Home } from 'lucide-react';
import Link from 'next/link';
import ProspectionMap from './components/ProspectionMap';
import ProspectionTable from './components/ProspectionTable';
import AddProspectModal from './components/AddProspectModal';
import UploadCSVModal from './components/UploadCSVModal';
import FailedEntriesModal from './components/FailedEntriesModal';
import FilterPanel from './components/FilterPanel';
import DuplicateDetector from './components/DuplicateDetector';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // NEW

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
    window.addEventListener('storage', updateFailedCount);
    return () => window.removeEventListener('storage', updateFailedCount);
  }, []);

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

  const calculateDistance = (lon1: number, lat1: number, lon2: number, lat2: number): number => {
    const R = 6371;
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
      <div className="border-b-2 border-accent-cyan bg-background-light/50 backdrop-blur-sm">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/gatherer">
                <button className="px-2 sm:px-4 py-1 sm:py-2 bg-transparent border-2 border-accent-cyan text-accent-cyan rounded-md font-bold hover:bg-accent-cyan hover:text-background-dark transition-all">
                  <Home className="inline sm:mr-2" size={18} />
                  <span className="hidden sm:inline">HOME</span>
                </button>
              </Link>
              <h1 className="text-xl sm:text-3xl font-bold text-accent-cyan [filter:drop-shadow(0_0_8px_#00ffff)]">
                PROSPECTION GRID
              </h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex border-2 border-accent-cyan rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-base font-bold transition-all ${
                    viewMode === 'map'
                      ? 'bg-accent-cyan text-background-dark'
                      : 'bg-transparent text-accent-cyan hover:bg-accent-cyan/20'
                  }`}
                >
                  <Map className="inline mr-1 sm:mr-2" size={16} />
                  MAP
                </button>
                <button
                  onClick={() => setViewMode('data')}
                  className={`px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-base font-bold transition-all ${
                    viewMode === 'data'
                      ? 'bg-accent-cyan text-background-dark'
                      : 'bg-transparent text-accent-cyan hover:bg-accent-cyan/20'
                  }`}
                >
                  <List className="inline mr-1 sm:mr-2" size={16} />
                  DATA
                </button>
              </div>

              {failedEntriesCount > 0 && (
                <button
                  onClick={() => setShowFailedEntries(true)}
                  className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-base bg-red-900/50 border-2 border-red-500 text-red-400 rounded-md font-bold hover:bg-red-900/70 transition-all shadow-glow-red animate-pulse"
                >
                  <AlertTriangle className="inline mr-1 sm:mr-2" size={16} />
                  {failedEntriesCount}
                </button>
              )}

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-base bg-transparent border-2 border-accent-magenta text-accent-magenta rounded-md font-bold hover:bg-accent-magenta hover:text-background-dark transition-all"
                title="Filter"
              >
                <Filter className="inline sm:mr-2" size={16} />
                <span className="hidden sm:inline">FILTER</span>
              </button>
              
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-base bg-transparent border-2 border-accent-yellow text-accent-yellow rounded-md font-bold hover:bg-accent-yellow hover:text-background-dark transition-all"
                title="Upload CSV"
              >
                <Upload className="inline sm:mr-2" size={16} />
                <span className="hidden sm:inline">CSV</span>
              </button>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-base bg-accent-cyan border-2 border-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80 transition-all"
                title="Add Prospect"
              >
                <Plus className="inline sm:mr-2" size={16} />
                <span className="hidden sm:inline">ADD</span>
              </button>
            </div>
          </div>

          <div className="mt-2 sm:mt-4 flex gap-3 sm:gap-6 text-xs sm:text-sm overflow-x-auto pb-2">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-text-primary/70">TOTAL:</span>
              <span className="font-bold text-accent-cyan">{filteredProspects.length}</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-text-primary/70">NOT CONTACTED:</span>
              <span className="font-bold text-gray-400">
                {filteredProspects.filter(p => p.status === 'not_contacted').length}
              </span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-text-primary/70">CONTACTED:</span>
              <span className="font-bold text-cyan-400">
                {filteredProspects.filter(p => p.status === 'contacted').length}
              </span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-text-primary/70">POSITIVE:</span>
              <span className="font-bold text-green-400">
                {filteredProspects.filter(p => p.status === 'positive_response').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      <div className="h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-accent-cyan text-base sm:text-xl font-bold animate-pulse">
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
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
          />
        ) : (
          <ProspectionTable
            prospects={filteredProspects}
            onProspectClick={setSelectedProspect}
            onProspectUpdate={handleUpdateProspect}
            onProspectDelete={handleDeleteProspect}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
          />
        )}
      </div>

      {showAddModal && (
        <AddProspectModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddProspect}
        />
      )}

      {showUploadModal && (
        <UploadCSVModal
          onClose={() => setShowUploadModal(false)}
          onRefresh={fetchProspects}
        />
      )}

      {showFailedEntries && (
        <FailedEntriesModal
          onClose={() => {
            setShowFailedEntries(false);
            const stored = localStorage.getItem('failed_csv_entries');
            setFailedEntriesCount(stored ? JSON.parse(stored).length : 0);
          }}
          onRetry={handleRetryFailedEntry}
        />
      )}

      <DuplicateDetector
        prospects={prospects}
        onMerge={(keepId, deleteIds) => {
          deleteIds.forEach(id => handleDeleteProspect(id));
        }}
        onDelete={handleDeleteProspect}
      />
    </div>
  );
}
