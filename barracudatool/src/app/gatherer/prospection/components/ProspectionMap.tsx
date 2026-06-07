'use client'

import { useEffect, useRef, useState } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { PropertyProspect, STATUS_CONFIG, ProspectionFilters, ProspectionStatus } from '../types'
import {
  MapPin,
  X,
  Search,
  ListPlus,
  User,
  Layers3,
  ExternalLink,
} from 'lucide-react'
import ProspectDetailModal from './ProspectDetailModal'

interface BanFeature {
  geometry: { coordinates: [number, number] }
  properties: { label: string; housenumber?: string; postcode?: string; city?: string }
}

interface ProspectionMapProps {
  prospects: PropertyProspect[]
  onProspectClick: (prospect: PropertyProspect) => void
  onProspectUpdate: (id: string, updates: Partial<PropertyProspect>) => void
  onProspectDelete: (id: string) => void
  filters: ProspectionFilters
  onFiltersChange: (filters: ProspectionFilters) => void
  selectedIds: Set<string>
  onSelectedIdsChange: (ids: Set<string>) => void
}

export default function ProspectionMap({
  prospects,
  onProspectClick,
  onProspectUpdate,
  onProspectDelete,
  filters,
  onFiltersChange,
  selectedIds,
  onSelectedIdsChange,
}: ProspectionMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maptilersdk.Map | null>(null)
  const markers = useRef<maptilersdk.Marker[]>([])
  const centerMarker = useRef<maptilersdk.Marker | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const hasInitialFit = useRef(false)

  const [mapStyle, setMapStyle] = useState<'basic-v2' | 'hybrid'>('basic-v2')
  const [selectedProspect, setSelectedProspect] = useState<PropertyProspect | null>(null)
  const [mobilePreviewProspect, setMobilePreviewProspect] = useState<PropertyProspect | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<BanFeature[]>([])
  const [showBatchActions, setShowBatchActions] = useState(false)
  const [showBatchAddedBy, setShowBatchAddedBy] = useState(false)
  const [showHitListModal, setShowHitListModal] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setIsTouchDevice(coarsePointer || touchCapable)
  }, [])

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!

    const newMap = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.BASIC,
      center: [1.1915, 46.4064],
      zoom: 8,
      attributionControl: false,
    })

    map.current = newMap

    newMap.on('click', () => {
      if (isTouchDevice) {
        setMobilePreviewProspect(null)
      }
    })

    return () => {
      markers.current.forEach((marker) => marker.remove())
      markers.current = []
      centerMarker.current?.remove()
      centerMarker.current = null

      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [isTouchDevice])

  useEffect(() => {
    if (!map.current) return
    const styleUrl =
      mapStyle === 'basic-v2' ? maptilersdk.MapStyle.BASIC : maptilersdk.MapStyle.HYBRID
    map.current.setStyle(styleUrl)
  }, [mapStyle])

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectedIdsChange(newSelected)
  }

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price)
  }

  useEffect(() => {
    if (!map.current) return

    markers.current.forEach((marker) => marker.remove())
    markers.current = []

    prospects.forEach((prospect) => {
      if (prospect.latitude == null || prospect.longitude == null) return

      const isSelected = selectedIds.has(prospect.id)
      const el = document.createElement('div')
      el.className = 'prospect-marker'
      el.style.width = '18px'
      el.style.height = '18px'
      el.style.borderRadius = '9999px'
      el.style.backgroundColor = STATUS_CONFIG[prospect.status].dotColor
      el.style.border = isSelected
        ? '3px solid #FFB58D'
        : '2px solid rgba(255,255,255,0.92)'
      el.style.cursor = 'pointer'
      el.style.boxShadow = isSelected
        ? '0 0 0 6px rgba(255,106,26,0.20), 0 8px 22px rgba(0,0,0,0.26)'
        : `0 0 10px ${STATUS_CONFIG[prospect.status].dotColor}`

      const marker = new maptilersdk.Marker({ element: el })
        .setLngLat([prospect.longitude, prospect.latitude])
        .addTo(map.current!)

      marker.getElement().addEventListener('click', (e) => {
        e.stopPropagation()

        if (isTouchDevice) {
          setMobilePreviewProspect(prospect)
          return
        }

        toggleSelect(prospect.id)
      })

      marker.getElement().addEventListener('contextmenu', (e) => {
        e.preventDefault()

        if (isTouchDevice) return

        setSelectedProspect(prospect)
        onProspectClick(prospect)
      })

      marker.getElement().addEventListener('dblclick', (e) => {
        e.stopPropagation()

        if (isTouchDevice) return

        setSelectedProspect(prospect)
        onProspectClick(prospect)
      })

      markers.current.push(marker)
    })

    if (prospects.length > 0 && !hasInitialFit.current) {
      const bounds = new maptilersdk.LngLatBounds()
      prospects.forEach((p) => {
        if (p.latitude != null && p.longitude != null) {
          bounds.extend([p.longitude, p.latitude])
        }
      })

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 })
        hasInitialFit.current = true
      }
    }
  }, [prospects, selectedIds, onProspectClick, onSelectedIdsChange, isTouchDevice])

  useEffect(() => {
    if (!map.current) return

    centerMarker.current?.remove()
    centerMarker.current = null

    if (!filters.searchCenter) return

    const [lng, lat] = filters.searchCenter

    const el = document.createElement('div')
    el.className = 'center-marker'
    el.style.width = '24px'
    el.style.height = '24px'
    el.style.borderRadius = '9999px'
    el.style.border = '3px solid #FFB58D'
    el.style.backgroundColor = 'rgba(255, 106, 26, 0.24)'
    el.style.boxShadow = '0 0 0 8px rgba(255,106,26,0.16)'

    centerMarker.current = new maptilersdk.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map.current)
  }, [filters.searchCenter])

  const batchUpdateStatus = (status: ProspectionStatus) => {
    selectedIds.forEach((id) => onProspectUpdate(id, { status }))
    onSelectedIdsChange(new Set())
    setShowBatchActions(false)
  }

  const batchUpdateAddedBy = (addedBy: string) => {
    selectedIds.forEach((id) => onProspectUpdate(id, { added_by: addedBy }))
    onSelectedIdsChange(new Set())
    setShowBatchAddedBy(false)
  }

  const addToHitList = (listName?: string) => {
    const selectedProspects = prospects.filter((p) => selectedIds.has(p.id))
    const stored = localStorage.getItem('hit_lists')
    const hitLists = stored ? JSON.parse(stored) : []

    if (listName) {
      const existingList = hitLists.find(
        (list: { name: string; prospects: PropertyProspect[] }) => list.name === listName
      )

      if (existingList) {
        const existingIds = new Set(existingList.prospects.map((p: PropertyProspect) => p.id))
        selectedProspects.forEach((p) => {
          if (!existingIds.has(p.id)) existingList.prospects.push(p)
        })
      } else {
        hitLists.push({
          id: Date.now().toString(),
          name: listName,
          date: new Date().toISOString(),
          prospects: selectedProspects,
        })
      }
    } else {
      const newName = prompt('Enter hit list name:', `Hit List ${new Date().toLocaleDateString()}`)
      if (!newName) return

      hitLists.push({
        id: Date.now().toString(),
        name: newName,
        date: new Date().toISOString(),
        prospects: selectedProspects,
      })
    }

    localStorage.setItem('hit_lists', JSON.stringify(hitLists))
    onSelectedIdsChange(new Set())
    setShowHitListModal(false)
    alert(`Added ${selectedProspects.length} prospects to hit list!`)
  }

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      )
      const data = await response.json()
      setSuggestions(data.features || [])
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
      setSuggestions([])
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchSuggestions(query)
    }, 300)
  }

  const handleSuggestionClick = (feature: BanFeature) => {
    const [lon, lat] = feature.geometry.coordinates
    setSearchQuery(feature.properties.label)
    setSuggestions([])

    if (map.current) {
      map.current.flyTo({ center: [lon, lat], zoom: 14 })
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSuggestions([])
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=1`
      )
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const [lon, lat] = data.features[0].geometry.coordinates
        map.current?.flyTo({ center: [lon, lat], zoom: 14 })
        setSuggestions([])
      }
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute h-full w-full" />

      {selectedIds.size > 0 && !isTouchDevice && (
        <div className="absolute left-1/2 top-3 z-[60] w-[calc(100%-1rem)] max-w-xl -translate-x-1/2">
          <div className="rounded-2xl bg-[rgba(18,17,15,0.84)] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[#FF6A1A]/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFD0B4]">
                  {selectedIds.size} selected
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setShowBatchActions(!showBatchActions)
                    setShowBatchAddedBy(false)
                  }}
                  className="rounded-xl bg-white/[0.06] px-3 py-2 text-sm font-medium text-[#F4EEE7] transition hover:bg-[#FF6A1A]/10 hover:text-[#FFD0B4]"
                >
                  Status
                </button>

                <button
                  onClick={() => {
                    setShowBatchAddedBy(!showBatchAddedBy)
                    setShowBatchActions(false)
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-sm font-medium text-[#F4EEE7] transition hover:bg-[#FF6A1A]/10 hover:text-[#FFD0B4]"
                >
                  <User className="size-[15px]" />
                  Added by
                </button>

                <button
                  onClick={() => setShowHitListModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#FF6A1A]/14 px-3 py-2 text-sm font-semibold text-[#FFD0B4] transition hover:bg-[#FF6A1A]/20"
                >
                  <ListPlus className="size-[15px]" />
                  Hit list
                </button>

                <button
                  onClick={() => onSelectedIdsChange(new Set())}
                  className="rounded-xl bg-red-500/12 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/18"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBatchActions && selectedIds.size > 0 && !isTouchDevice && (
        <div className="absolute left-1/2 top-24 z-[60] w-[calc(100%-1rem)] max-w-3xl -translate-x-1/2">
          <div className="rounded-2xl bg-[rgba(18,17,15,0.84)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#B9AEA2]">
              Update status
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => batchUpdateStatus(key as ProspectionStatus)}
                  className="rounded-full border px-3 py-2 text-sm font-medium text-[#F4EEE7] transition hover:translate-y-[-1px]"
                  style={{
                    borderColor: `${config.dotColor}50`,
                    backgroundColor: `${config.dotColor}18`,
                  }}
                >
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: config.dotColor }}
                  />
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showBatchAddedBy && selectedIds.size > 0 && !isTouchDevice && (
        <div className="absolute left-1/2 top-24 z-[60] w-[calc(100%-1rem)] max-w-xl -translate-x-1/2">
          <div className="rounded-2xl bg-[rgba(18,17,15,0.84)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#B9AEA2]">
              <User size={14} />
              Update added by
            </h3>
            <div className="flex gap-2">
              {['Henry', 'Millé'].map((name) => (
                <button
                  key={name}
                  onClick={() => batchUpdateAddedBy(name)}
                  className="rounded-xl bg-[#FF6A1A]/10 px-4 py-2 text-sm font-medium text-[#FFD0B4] transition hover:bg-[#FF6A1A]/16"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showHitListModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171512] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            <h2 className="mb-1 text-xl font-semibold text-[#F4EEE7]">Add to hit list</h2>
            <p className="mb-4 text-sm text-[#B9AEA2]">
              Save the selected prospects to a reusable hit list.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => addToHitList()}
                className="w-full rounded-xl bg-[#FF6A1A]/14 px-4 py-3 text-sm font-semibold text-[#FFD0B4] transition hover:bg-[#FF6A1A]/20"
              >
                Create new hit list
              </button>

              {(() => {
                const stored = localStorage.getItem('hit_lists')
                const existing = stored ? JSON.parse(stored) : []
                return existing.map((list: { id: string; name: string }) => (
                  <button
                    key={list.id}
                    onClick={() => addToHitList(list.name)}
                    className="w-full rounded-xl bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#DDD2C8] transition hover:bg-[#FF6A1A]/08 hover:text-[#F4EEE7]"
                  >
                    Add to “{list.name}”
                  </button>
                ))
              })()}

              <button
                onClick={() => setShowHitListModal(false)}
                className="w-full rounded-xl bg-transparent px-4 py-3 text-sm font-medium text-[#B9AEA2] transition hover:bg-white/[0.04] hover:text-[#F4EEE7]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute left-3 top-3 z-50 w-[calc(100%-6.5rem)] max-w-80 sm:left-4 sm:top-4 sm:w-80">
        <div className="rounded-2xl bg-[rgba(18,17,15,0.84)] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="relative flex items-center">
                <Search className="absolute left-3 text-[#867A70]" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search location..."
                  className="w-full rounded-xl bg-[#12110F] py-2.5 pl-10 pr-10 text-sm text-[#F4EEE7] outline-none transition placeholder:text-[#867A70] focus:bg-[#171512]"
                />
                {searchQuery.length > 0 && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 text-[#867A70] transition hover:text-[#F4EEE7]"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {suggestions.length > 0 && (
                <div className="absolute z-[9999] mt-2 w-full overflow-hidden rounded-2xl bg-[#171512] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                  {suggestions.map((feature, index) => (
                    <div
                      key={index}
                      onClick={() => handleSuggestionClick(feature)}
                      className="cursor-pointer border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-[#FF6A1A]/08"
                    >
                      <div className="text-sm font-medium text-[#F4EEE7]">
                        {feature.properties.label}
                      </div>
                      {feature.properties.postcode && (
                        <div className="mt-0.5 text-xs text-[#B9AEA2]">
                          {feature.properties.postcode} {feature.properties.city}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSearch}
              className="hidden items-center justify-center rounded-xl bg-[#FF6A1A]/14 px-4 py-2 text-[#FFD0B4] transition hover:bg-[#FF6A1A]/20 sm:flex"
            >
              <MapPin size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
        <button
          onClick={() => setMapStyle(mapStyle === 'basic-v2' ? 'hybrid' : 'basic-v2')}
          className="inline-flex items-center gap-2 rounded-2xl bg-[rgba(18,17,15,0.84)] px-3 py-2 text-sm font-medium text-[#F4EEE7] shadow-[0_20px_60px_rgba(0,0,0,0.30)] backdrop-blur-2xl transition hover:bg-[rgba(29,26,23,0.92)]"
        >
          <Layers3 size={16} />
          {mapStyle === 'basic-v2' ? 'Sat map' : 'Map'}
        </button>
      </div>

      {filters.maxDistance && (
        <div className="absolute bottom-16 left-3 z-10 sm:bottom-4 sm:left-4">
          <div className="rounded-2xl bg-[rgba(18,17,15,0.84)] p-3 text-xs shadow-[0_20px_60px_rgba(0,0,0,0.30)] backdrop-blur-2xl sm:text-sm">
            <div className="mb-1 font-semibold uppercase tracking-[0.14em] text-[#FF9A5C]">
              Filter
            </div>
            <div className="text-[#F4EEE7]">{filters.maxDistance}km radius</div>
            {filters.searchCenter && (
              <div className="mt-1 text-[#B9AEA2]">
                Center: {filters.searchCenter[1].toFixed(4)}, {filters.searchCenter[0].toFixed(4)}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-1/2 z-10 w-[calc(100%-1rem)] max-w-4xl -translate-x-1/2">
        <div className="overflow-x-auto rounded-2xl bg-[rgba(18,17,15,0.84)] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
          <div className="flex gap-4 text-xs">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2 whitespace-nowrap">
                <div
                  className="h-3 w-3 rounded-full border border-white/70"
                  style={{
                    backgroundColor: config.dotColor,
                    boxShadow: `0 0 6px ${config.dotColor}`,
                  }}
                />
                <span className="text-[#DDD2C8]">{config.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {mobilePreviewProspect && (
        <div className="absolute inset-x-3 bottom-3 z-[70] sm:hidden">
          <div className="rounded-[28px] border border-white/10 bg-[rgba(23,21,18,0.95)] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF9A5C]">
                  Prospect
                </div>
                <h3 className="mt-1 line-clamp-2 text-base font-semibold text-[#F4EEE7]">
                  {mobilePreviewProspect.address}
                </h3>
                <p className="mt-1 text-sm text-[#B9AEA2]">
                  {mobilePreviewProspect.town || 'Unknown town'} ·{' '}
                  {STATUS_CONFIG[mobilePreviewProspect.status].label}
                </p>
                <p className="mt-2 text-sm font-medium text-[#FFD0B4]">
                  {formatPrice(mobilePreviewProspect.price)}
                </p>
              </div>

              <button
                onClick={() => setMobilePreviewProspect(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-[#B9AEA2] transition hover:bg-white/[0.08] hover:text-[#F4EEE7]"
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => toggleSelect(mobilePreviewProspect.id)}
                className="rounded-xl bg-white/[0.05] px-4 py-3 text-sm font-medium text-[#F4EEE7] transition hover:bg-white/[0.08]"
              >
                {selectedIds.has(mobilePreviewProspect.id) ? 'Unselect' : 'Select'}
              </button>

              <button
                onClick={() => {
                  setSelectedProspect(mobilePreviewProspect)
                  onProspectClick(mobilePreviewProspect)
                  setMobilePreviewProspect(null)
                }}
                className="flex-1 rounded-xl bg-[#FF6A1A]/14 px-4 py-3 text-sm font-semibold text-[#FFD0B4] transition hover:bg-[#FF6A1A]/20"
              >
                View details
              </button>

              {mobilePreviewProspect.link && (
                <a
                  href={mobilePreviewProspect.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-white/[0.05] px-4 py-3 text-[#F4EEE7] transition hover:bg-white/[0.08]"
                  aria-label="Open listing"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedProspect && (
        <ProspectDetailModal
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onUpdate={onProspectUpdate}
          onDelete={onProspectDelete}
        />
      )}

      <style jsx global>{`
        .maplibregl-map {
          width: 100%;
          height: 100%;
        }

        .maplibregl-control-container {
          display: none !important;
        }

        .maplibregl-canvas-container {
          height: 100% !important;
        }

        .maplibregl-canvas {
          filter: saturate(0.88) contrast(1.03);
        }
      `}</style>
    </div>
  )
}