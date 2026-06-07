'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Map,
  List,
  Plus,
  Upload,
  Filter,
  AlertTriangle,
  Home,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import ProspectionMap from './components/ProspectionMap'
import ProspectionTable from './components/ProspectionTable'
import AddProspectModal from './components/AddProspectModal'
import UploadCSVModal from './components/UploadCSVModal'
import FailedEntriesModal from './components/FailedEntriesModal'
import FilterPanel from './components/FilterPanel'
import DuplicateDetector from './components/DuplicateDetector'
import { PropertyProspect, ProspectionFilters } from './types'

export default function ProspectionPage() {
  const [viewMode, setViewMode] = useState<'map' | 'data'>('map')
  const [prospects, setProspects] = useState<PropertyProspect[]>([])
  const [filteredProspects, setFilteredProspects] = useState<PropertyProspect[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showFailedEntries, setShowFailedEntries] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<ProspectionFilters>({})
  const [, setSelectedProspect] = useState<PropertyProspect | null>(null)
  const [failedEntriesCount, setFailedEntriesCount] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const updateFailedCount = () => {
      const stored = localStorage.getItem('failed_csv_entries')
      if (stored) {
        setFailedEntriesCount(JSON.parse(stored).length)
      } else {
        setFailedEntriesCount(0)
      }
    }

    updateFailedCount()
    window.addEventListener('storage', updateFailedCount)
    return () => window.removeEventListener('storage', updateFailedCount)
  }, [])

  const calculateDistance = (lon1: number, lat1: number, lon2: number, lat2: number): number => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const fetchProspects = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString())
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString())
      if (filters.town) params.append('town', filters.town)
      if (filters.status) params.append('status', filters.status.join(','))
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

      const response = await fetch(`/api/prospection?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch prospects')

      const data = await response.json()
      setProspects(data)

      if (filters.searchCenter && filters.maxDistance) {
        const filtered = data.filter((p: PropertyProspect) => {
          if (p.latitude == null || p.longitude == null) return false

          const distance = calculateDistance(
            filters.searchCenter![0],
            filters.searchCenter![1],
            p.longitude,
            p.latitude
          )

          return distance <= filters.maxDistance!
        })

        setFilteredProspects(filtered)
      } else {
        setFilteredProspects(data)
      }
    } catch (error) {
      console.error('Error fetching prospects:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchProspects()
  }, [fetchProspects])

  const handleAddProspect = async (prospect: Partial<PropertyProspect>) => {
    try {
      const response = await fetch('/api/prospection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prospect),
      })

      if (!response.ok) throw new Error('Failed to add prospect')

      await fetchProspects()
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding prospect:', error)
      alert('Failed to add prospect')
    }
  }

  const handleUpdateProspect = async (id: string, updates: Partial<PropertyProspect>) => {
    try {
      const response = await fetch(`/api/prospection?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update prospect')

      await fetchProspects()
    } catch (error) {
      console.error('Error updating prospect:', error)
      alert('Failed to update prospect')
    }
  }

  const handleDeleteProspect = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prospect?')) return

    try {
      const response = await fetch(`/api/prospection?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete prospect')

      await fetchProspects()
    } catch (error) {
      console.error('Error deleting prospect:', error)
      alert('Failed to delete prospect')
    }
  }

  const handleRetryFailedEntry = (_entryData: unknown) => {
    setShowFailedEntries(false)
    alert('To fix this entry, please add it manually with the correct data.')
    setShowAddModal(true)
  }

  const totalCount = filteredProspects.length
  const notContactedCount = filteredProspects.filter((p) => p.status === 'not_contacted').length
  const contactedCount = filteredProspects.filter((p) => p.status === 'contacted').length
  const positiveCount = filteredProspects.filter((p) => p.status === 'positive_response').length

  return (
    <div className="min-h-screen bg-[#12110F] text-[#F4EEE7]">
      <div className="border-b border-white/10 bg-[#171512]/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1800px] px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2">
              <Link href="/gatherer" className="shrink-0">
                <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-[#DDD2C8] transition hover:border-[#FF6A1A]/22 hover:bg-[#FF6A1A]/8 hover:text-[#F4EEE7]">
                  <Home size={16} />
                  <span className="hidden sm:inline">Home</span>
                </button>
              </Link>

              <div className="shrink-0 pr-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF9A5C] sm:text-[11px]">
                  Prospection
                </div>
                <h1 className="text-sm font-semibold tracking-tight text-[#F8F3EE] sm:text-xl">
                  Map workspace
                </h1>
              </div>

              <div className="h-8 w-px shrink-0 bg-white/10 sm:h-9" />

              <div className="flex shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                <button
                  onClick={() => setViewMode('map')}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition ${
                    viewMode === 'map'
                      ? 'bg-[#FF6A1A]/12 text-[#FFB58D]'
                      : 'text-[#B9AEA2] hover:bg-white/[0.03] hover:text-[#F4EEE7]'
                  }`}
                >
                  <Map size={16} />
                  Map
                </button>

                <button
                  onClick={() => setViewMode('data')}
                  className={`inline-flex items-center gap-2 border-l border-white/10 px-3 py-2 text-sm font-medium transition ${
                    viewMode === 'data'
                      ? 'bg-[#FF6A1A]/12 text-[#FFB58D]'
                      : 'text-[#B9AEA2] hover:bg-white/[0.03] hover:text-[#F4EEE7]'
                  }`}
                >
                  <List size={16} />
                  Data
                </button>
              </div>

              {failedEntriesCount > 0 && (
                <button
                  onClick={() => setShowFailedEntries(true)}
                  className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/14"
                >
                  <AlertTriangle size={16} />
                  {failedEntriesCount}
                </button>
              )}

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-[#DDD2C8] transition hover:border-[#FF6A1A]/25 hover:bg-[#FF6A1A]/08 hover:text-[#F4EEE7]"
                title="Filter"
              >
                <Filter size={16} />
                <span className="hidden sm:inline">Filters</span>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-[#DDD2C8] transition hover:border-[#FF6A1A]/25 hover:bg-[#FF6A1A]/08 hover:text-[#F4EEE7]"
                title="Upload CSV"
              >
                <Upload size={16} />
                <span className="hidden sm:inline">Upload CSV</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-[#FF6A1A]/32 bg-[#FF6A1A]/12 px-3 py-2 text-sm font-semibold text-[#FFB58D] shadow-[0_10px_24px_rgba(255,106,26,0.18)] transition hover:border-[#FF6A1A]/40 hover:bg-[#FF6A1A]/18 hover:text-[#FFD0B4]"
                title="Add Prospect"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add prospect</span>
              </button>
            </div>
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 text-xs [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span className="text-[#867A70]">Total:</span>{' '}
              <span className="font-semibold text-[#F4EEE7]">{totalCount}</span>
            </div>

            <div className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span className="text-[#867A70]">Not contacted:</span>{' '}
              <span className="font-semibold text-[#DDD2C8]">{notContactedCount}</span>
            </div>

            <div className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span className="text-[#867A70]">Contacted:</span>{' '}
              <span className="font-semibold text-[#FF9A5C]">{contactedCount}</span>
            </div>

            <div className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span className="text-[#867A70]">Positive:</span>{' '}
              <span className="font-semibold text-[#79C08F]">{positiveCount}</span>
            </div>

            {selectedIds.size > 0 && (
              <div className="whitespace-nowrap rounded-full border border-[#FF6A1A]/32 bg-[#FF6A1A]/12 px-3 py-1.5">
                <span className="font-semibold text-[#FFB58D]">{selectedIds.size} selected</span>
              </div>
            )}
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

      <div className="h-[calc(100vh-112px)] sm:h-[calc(100vh-140px)]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-[#171512]/88 px-5 py-4 text-sm font-medium text-[#DDD2C8] shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:text-base">
              <RefreshCw size={16} className="animate-spin" />
              Loading prospection data...
            </div>
          </div>
        ) : viewMode === 'map' ? (
          <ProspectionMap
            prospects={filteredProspects}
            onProspectClick={setSelectedProspect}
            onProspectUpdate={handleUpdateProspect}
            onProspectDelete={handleDeleteProspect}
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
        <AddProspectModal onClose={() => setShowAddModal(false)} onAdd={handleAddProspect} />
      )}

      {showUploadModal && (
        <UploadCSVModal onClose={() => setShowUploadModal(false)} onRefresh={fetchProspects} />
      )}

      {showFailedEntries && (
        <FailedEntriesModal
          onClose={() => {
            setShowFailedEntries(false)
            const stored = localStorage.getItem('failed_csv_entries')
            setFailedEntriesCount(stored ? JSON.parse(stored).length : 0)
          }}
          onRetry={handleRetryFailedEntry}
        />
      )}

      <DuplicateDetector
        prospects={prospects}
        onMerge={(keepId, deleteIds) => {
          deleteIds.forEach((id) => handleDeleteProspect(id))
        }}
        onDelete={handleDeleteProspect}
      />
    </div>
  )
}