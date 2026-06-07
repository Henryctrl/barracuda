'use client'

import { useMemo, useState } from 'react'
import { PropertyProspect, STATUS_CONFIG, ProspectionStatus } from '../types'
import {
  Trash2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ListPlus,
  User,
  CheckSquare,
  Square,
  MapPin,
  CalendarDays,
  Building2,
  Euro,
} from 'lucide-react'
import ProspectDetailModal from './ProspectDetailModal'

interface ProspectionTableProps {
  prospects: PropertyProspect[]
  onProspectClick: (prospect: PropertyProspect) => void
  onProspectUpdate: (id: string, updates: Partial<PropertyProspect>) => void
  onProspectDelete: (id: string) => void
  selectedIds: Set<string>
  onSelectedIdsChange: (ids: Set<string>) => void
}

export default function ProspectionTable({
  prospects,
  onProspectClick,
  onProspectUpdate,
  onProspectDelete,
  selectedIds,
  onSelectedIdsChange,
}: ProspectionTableProps) {
  const [selectedProspect, setSelectedProspect] = useState<PropertyProspect | null>(null)
  const [sortBy, setSortBy] = useState<'price' | 'town' | 'last_contact_date'>('price')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showBatchActions, setShowBatchActions] = useState(false)
  const [showBatchAddedBy, setShowBatchAddedBy] = useState(false)
  const [showHitListModal, setShowHitListModal] = useState(false)

  const handleSort = (field: 'price' | 'town' | 'last_contact_date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder(field === 'town' ? 'asc' : 'desc')
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectedIdsChange(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === prospects.length) {
      onSelectedIdsChange(new Set())
    } else {
      onSelectedIdsChange(new Set(prospects.map((p) => p.id)))
    }
  }

  const batchUpdateStatus = (status: ProspectionStatus) => {
    selectedIds.forEach((id) => {
      onProspectUpdate(id, { status })
    })
    onSelectedIdsChange(new Set())
    setShowBatchActions(false)
  }

  const batchUpdateAddedBy = (addedBy: string) => {
    selectedIds.forEach((id) => {
      onProspectUpdate(id, { added_by: addedBy })
    })
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
          if (!existingIds.has(p.id)) {
            existingList.prospects.push(p)
          }
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

  const sortedProspects = useMemo(() => {
    return [...prospects].sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortBy) {
        case 'price':
          aVal = a.price || 0
          bVal = b.price || 0
          break
        case 'town':
          aVal = a.town || ''
          bVal = b.town || ''
          break
        case 'last_contact_date':
          aVal = a.last_contact_date || ''
          bVal = b.last_contact_date || ''
          break
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [prospects, sortBy, sortOrder])

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (date?: string) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('fr-FR')
  }

  const openProspect = (prospect: PropertyProspect) => {
    setSelectedProspect(prospect)
    onProspectClick(prospect)
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <span className="opacity-30">—</span>
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  return (
    <div className="flex h-full flex-col bg-[#12110F]">
      {selectedIds.size > 0 && (
        <div className="border-b border-white/10 bg-[#171512]/96 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-[#FF6A1A]/28 bg-[#FF6A1A]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFD0B4]">
                {selectedIds.size} selected
              </div>
              <p className="hidden text-sm text-[#B9AEA2] sm:block">
                Apply batch actions to the current selection.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setShowBatchActions(!showBatchActions)
                  setShowBatchAddedBy(false)
                }}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-[#F4EEE7] transition hover:border-[#FF6A1A]/25 hover:bg-[#FF6A1A]/10 hover:text-[#FFD0B4]"
              >
                Update status
              </button>

              <button
                onClick={() => {
                  setShowBatchAddedBy(!showBatchAddedBy)
                  setShowBatchActions(false)
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-[#F4EEE7] transition hover:border-[#FF6A1A]/25 hover:bg-[#FF6A1A]/10 hover:text-[#FFD0B4]"
              >
                <User size={15} />
                Added by
              </button>

              <button
                onClick={() => setShowHitListModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#FF6A1A]/30 bg-[#FF6A1A]/12 px-3 py-2 text-sm font-semibold text-[#FFD0B4] shadow-[0_8px_20px_rgba(255,106,26,0.10)] transition hover:border-[#FF6A1A]/38 hover:bg-[#FF6A1A]/18"
              >
                <ListPlus size={15} />
                Hit list
              </button>

              <button
                onClick={() => onSelectedIdsChange(new Set())}
                className="rounded-xl border border-red-400/18 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/16"
              >
                Clear
              </button>
            </div>
          </div>

          {showBatchActions && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#1D1A17] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#B9AEA2]">
                Update status
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => batchUpdateStatus(key as ProspectionStatus)}
                    className="rounded-full border px-3 py-2 text-sm font-medium transition hover:translate-y-[-1px]"
                    style={{
                      borderColor: `${config.dotColor}50`,
                      color: '#F4EEE7',
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
          )}

          {showBatchAddedBy && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#1D1A17] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#B9AEA2]">
                <User size={14} />
                Update added by
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Henry', 'Millé'].map((name) => (
                  <button
                    key={name}
                    onClick={() => batchUpdateAddedBy(name)}
                    className="rounded-xl border border-[#FF6A1A]/24 bg-[#FF6A1A]/10 px-4 py-2 text-sm font-medium text-[#FFD0B4] transition hover:bg-[#FF6A1A]/16"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showHitListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#171512] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            <h2 className="mb-1 text-xl font-semibold text-[#F4EEE7]">Add to hit list</h2>
            <p className="mb-4 text-sm text-[#B9AEA2]">
              Save the current selection to a new or existing hit list.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => addToHitList()}
                className="w-full rounded-xl border border-[#FF6A1A]/30 bg-[#FF6A1A]/14 px-4 py-3 text-sm font-semibold text-[#FFD0B4] transition hover:bg-[#FF6A1A]/20"
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
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#DDD2C8] transition hover:bg-[#FF6A1A]/08 hover:text-[#F4EEE7]"
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

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="px-3 py-3 sm:px-4">
          {prospects.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#171512] px-6 py-16 text-center shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
              <p className="text-base font-medium text-[#F4EEE7]">No prospects found</p>
              <p className="mt-1 text-sm text-[#867A70]">
                Add your first prospect or broaden your filters to see results here.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-[#171512] px-3 py-3 shadow-[0_16px_36px_rgba(0,0,0,0.14)]">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-[#DDD2C8] transition hover:bg-white/[0.05] hover:text-[#F4EEE7]"
                >
                  {selectedIds.size === prospects.length && prospects.length > 0 ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                  {selectedIds.size === prospects.length && prospects.length > 0
                    ? 'Clear all'
                    : 'Select all'}
                </button>

                <div className="flex items-center gap-2 overflow-x-auto">
                  <button
                    onClick={() => handleSort('price')}
                    className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      sortBy === 'price'
                        ? 'border-[#FF6A1A]/28 bg-[#FF6A1A]/12 text-[#FFB58D]'
                        : 'border-white/10 bg-white/[0.03] text-[#DDD2C8] hover:text-[#F4EEE7]'
                    }`}
                  >
                    <Euro size={14} />
                    Price
                    <SortIcon field="price" />
                  </button>

                  <button
                    onClick={() => handleSort('town')}
                    className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      sortBy === 'town'
                        ? 'border-[#FF6A1A]/28 bg-[#FF6A1A]/12 text-[#FFB58D]'
                        : 'border-white/10 bg-white/[0.03] text-[#DDD2C8] hover:text-[#F4EEE7]'
                    }`}
                  >
                    <MapPin size={14} />
                    Town
                    <SortIcon field="town" />
                  </button>

                  <button
                    onClick={() => handleSort('last_contact_date')}
                    className={`hidden items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium transition sm:inline-flex ${
                      sortBy === 'last_contact_date'
                        ? 'border-[#FF6A1A]/28 bg-[#FF6A1A]/12 text-[#FFB58D]'
                        : 'border-white/10 bg-white/[0.03] text-[#DDD2C8] hover:text-[#F4EEE7]'
                    }`}
                  >
                    <CalendarDays size={14} />
                    Contact
                    <SortIcon field="last_contact_date" />
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.35rem] bg-[#171512] shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
  <div className="hidden bg-[#1A1714]/96 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7E746B] md:grid md:grid-cols-[40px_minmax(260px,2.35fr)_0.95fr_0.95fr_1fr_0.95fr_96px] md:items-center md:gap-3">
    <div>Select</div>
    <div>Property</div>
    <div>Status</div>
    <div>Type</div>
    <div>Agent</div>
    <div>Contact</div>
    <div>Actions</div>
  </div>

  <div className="space-y-2 p-2 md:space-y-0 md:p-0">
    {sortedProspects.map((prospect, index) => {
      const isSelected = selectedIds.has(prospect.id)
      const statusConfig = STATUS_CONFIG[prospect.status]

      return (
        <div
          key={prospect.id}
          className={`transition ${
            isSelected
              ? 'bg-[#1E1813]'
              : index % 2 === 0
              ? 'bg-[#161411]'
              : 'bg-[#181613]'
          } md:rounded-none md:bg-transparent`}
        >
          <div className="md:hidden">
            <div
              className={`rounded-[1.15rem] px-3 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition ${
                isSelected
                  ? 'bg-[#1E1813] ring-1 ring-[#FF6A1A]/22'
                  : 'bg-[#191613]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => toggleSelect(prospect.id)}
                  className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.03] text-[#CFC4B8] transition hover:text-[#F4EEE7]"
                  aria-label={`Select ${prospect.address}`}
                >
                  {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => openProspect(prospect)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold leading-5 text-[#F6F0E8]">
                        {formatPrice(prospect.price)}
                      </div>
                      <div className="mt-0.5 truncate text-sm leading-5 text-[#E6DDD4]">
                        {prospect.address}
                      </div>
                      <div className="mt-0.5 truncate text-[12px] text-[#8B7F74]">
                        {[prospect.postcode, prospect.town].filter(Boolean).join(' • ') || 'N/A'}
                      </div>
                    </div>

                    <div className="shrink-0 rounded-full bg-[#221C17] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#DDD2C8]">
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: statusConfig.dotColor }}
                      />
                      {statusConfig.label}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-[12px] text-[#A79B8F]">
                    <span className="truncate">{prospect.property_type || 'N/A'}</span>
                    <span className="h-1 w-1 rounded-full bg-[#5B5148]" />
                    <span className="truncate">{prospect.current_agent || 'N/A'}</span>
                    <span className="h-1 w-1 rounded-full bg-[#5B5148]" />
                    <span className="truncate">{formatDate(prospect.last_contact_date)}</span>
                  </div>
                </button>
              </div>

              <div className="mt-2.5 flex gap-2 pl-10.5">
                <button
                  onClick={() => openProspect(prospect)}
                  className="flex-1 rounded-xl bg-[#FF6A1A]/10 px-3 py-2 text-sm font-semibold text-[#FFCCAE] transition hover:bg-[#FF6A1A]/16"
                >
                  Open
                </button>

                {prospect.link && (
                  <a
                    href={prospect.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center rounded-xl bg-white/[0.03] px-3 py-2 text-[#CFC4B8] transition hover:bg-[#FF6A1A]/08 hover:text-[#F4EEE7]"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}

                <button
                  onClick={() => onProspectDelete(prospect.id)}
                  className="inline-flex items-center justify-center rounded-xl bg-red-500/10 px-3 py-2 text-red-200 transition hover:bg-red-500/16"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>

          <div
            className={`hidden md:grid md:grid-cols-[40px_minmax(260px,2.35fr)_0.95fr_0.95fr_1fr_0.95fr_96px] md:items-center md:gap-3 md:px-4 md:py-3 ${
              isSelected
                ? 'bg-[#1E1813]'
                : index % 2 === 0
                ? 'bg-[#161411]'
                : 'bg-[#181613]'
            }`}
          >
            <div>
              <button
                type="button"
                onClick={() => toggleSelect(prospect.id)}
                className="inline-flex items-center justify-center text-[#CFC4B8] transition hover:text-[#F4EEE7]"
                aria-label={`Select ${prospect.address}`}
              >
                {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => openProspect(prospect)}
              className="min-w-0 text-left"
            >
              <div className="truncate text-sm font-semibold text-[#F6F0E8]">
                {formatPrice(prospect.price)}
              </div>
              <div className="truncate text-sm text-[#E6DDD4]">{prospect.address}</div>
              <div className="mt-0.5 truncate text-xs text-[#8B7F74]">
                {[prospect.postcode, prospect.town].filter(Boolean).join(' • ') || 'N/A'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => openProspect(prospect)}
              className="text-left"
            >
              <div className="inline-flex items-center rounded-full bg-[#211C17] px-2.5 py-1 text-[11px] font-semibold text-[#E6DDD4]">
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: statusConfig.dotColor }}
                />
                {statusConfig.label}
              </div>
            </button>

            <button
              type="button"
              onClick={() => openProspect(prospect)}
              className="truncate text-left text-sm text-[#B9AEA2]"
            >
              {prospect.property_type || 'N/A'}
            </button>

            <button
              type="button"
              onClick={() => openProspect(prospect)}
              className="truncate text-left text-sm text-[#B9AEA2]"
            >
              {prospect.current_agent || 'N/A'}
            </button>

            <button
              type="button"
              onClick={() => openProspect(prospect)}
              className="truncate text-left text-sm text-[#9E9286]"
            >
              {formatDate(prospect.last_contact_date)}
            </button>

            <div className="flex items-center justify-end gap-2">
              {prospect.link && (
                <a
                  href={prospect.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg bg-white/[0.03] p-2 text-[#CFC4B8] transition hover:bg-[#FF6A1A]/08 hover:text-[#F4EEE7]"
                >
                  <ExternalLink size={15} />
                </a>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onProspectDelete(prospect.id)
                }}
                className="rounded-lg bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/16"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      )
    })}
  </div>
</div>
            </>
          )}
        </div>
      </div>

      {selectedProspect && (
        <ProspectDetailModal
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onUpdate={onProspectUpdate}
          onDelete={onProspectDelete}
        />
      )}
    </div>
  )
}