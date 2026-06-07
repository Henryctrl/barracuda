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

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <span className="opacity-30">—</span>
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  return (
    <div className="flex h-full flex-col bg-[#12110F]">
      {selectedIds.size > 0 && (
        <div className="border-b border-white/10 bg-[#171512] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#FF6A1A]/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFD0B4]">
                {selectedIds.size} selected
              </div>
              <p className="text-sm text-[#B9AEA2]">Apply batch actions to the current selection.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setShowBatchActions(!showBatchActions)
                  setShowBatchAddedBy(false)
                }}
                className="rounded-xl bg-white/[0.05] px-3 py-2 text-sm font-medium text-[#F4EEE7] transition hover:bg-[#FF6A1A]/10 hover:text-[#FFD0B4]"
              >
                Update status
              </button>

              <button
                onClick={() => {
                  setShowBatchAddedBy(!showBatchAddedBy)
                  setShowBatchActions(false)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-sm font-medium text-[#F4EEE7] transition hover:bg-[#FF6A1A]/10 hover:text-[#FFD0B4]"
              >
                <User size={15} />
                Added by
              </button>

              <button
                onClick={() => setShowHitListModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF6A1A]/14 px-3 py-2 text-sm font-semibold text-[#FFD0B4] transition hover:bg-[#FF6A1A]/20"
              >
                <ListPlus size={15} />
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

          {showBatchActions && (
            <div className="mt-4 rounded-2xl bg-[#1D1A17] p-4">
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
            <div className="mt-4 rounded-2xl bg-[#1D1A17] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#B9AEA2]">
                <User size={14} />
                Update added by
              </h3>
              <div className="flex flex-wrap gap-2">
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
          )}
        </div>
      )}

      {showHitListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171512] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            <h2 className="mb-1 text-xl font-semibold text-[#F4EEE7]">Add to hit list</h2>
            <p className="mb-4 text-sm text-[#B9AEA2]">
              Save the current selection to a new or existing hit list.
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

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-full px-3 py-3 sm:px-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#171512] shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
            <table className="w-full min-w-[980px] border-collapse">
              <thead className="sticky top-0 z-10 bg-[#1D1A17]/95 backdrop-blur-xl">
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="inline-flex items-center justify-center text-[#DDD2C8] transition hover:text-[#F4EEE7]"
                      aria-label="Select all prospects"
                    >
                      {selectedIds.size === prospects.length && prospects.length > 0 ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#867A70]">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#867A70] sm:table-cell">
                    Photo
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#867A70]">
                    Address
                  </th>

                  <th
                    className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#867A70] transition hover:text-[#F4EEE7]"
                    onClick={() => handleSort('town')}
                  >
                    <div className="flex items-center gap-1">
                      Town <SortIcon field="town" />
                    </div>
                  </th>

                  <th
                    className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#867A70] transition hover:text-[#F4EEE7]"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center gap-1">
                      Price <SortIcon field="price" />
                    </div>
                  </th>

                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#867A70] lg:table-cell">
                    Type
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#867A70] lg:table-cell">
                    Agent
                  </th>

                  <th
                    className="hidden cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#867A70] transition hover:text-[#F4EEE7] md:table-cell"
                    onClick={() => handleSort('last_contact_date')}
                  >
                    <div className="flex items-center gap-1">
                      Contact <SortIcon field="last_contact_date" />
                    </div>
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#867A70]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedProspects.map((prospect, index) => {
                  const isSelected = selectedIds.has(prospect.id)
                  const statusConfig = STATUS_CONFIG[prospect.status]

                  return (
                    <tr
                      key={prospect.id}
                      className={`border-b border-white/6 transition ${
                        isSelected
                          ? 'bg-[#FF6A1A]/10'
                          : index % 2 === 0
                          ? 'bg-white/[0.015]'
                          : 'bg-transparent'
                      } hover:bg-white/[0.035]`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleSelect(prospect.id)
                          }}
                          className="h-4 w-4 cursor-pointer accent-[#FF6A1A]"
                        />
                      </td>

                      <td
                        className="cursor-pointer px-4 py-3"
                        onClick={() => {
                          setSelectedProspect(prospect)
                          onProspectClick(prospect)
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: statusConfig.dotColor }}
                          />
                          <span className="text-sm text-[#F4EEE7]">{statusConfig.label}</span>
                        </div>
                      </td>

                      <td
                        className="hidden cursor-pointer px-4 py-3 sm:table-cell"
                        onClick={() => {
                          setSelectedProspect(prospect)
                          onProspectClick(prospect)
                        }}
                      >
                        {prospect.photo_url ? (
                          <img
                            src={prospect.photo_url}
                            alt="Property"
                            className="h-12 w-16 rounded-lg border border-white/10 object-cover"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="70"%3E%3Crect fill="%231D1A17" width="100" height="70"/%3E%3Ctext fill="%23B9AEA2" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo image%3C/text%3E%3C/svg%3E'
                            }}
                          />
                        ) : (
                          <div className="flex h-12 w-16 items-center justify-center rounded-lg border border-white/10 bg-[#1D1A17] text-[11px] text-[#867A70]">
                            N/A
                          </div>
                        )}
                      </td>

                      <td
                        className="cursor-pointer px-4 py-3"
                        onClick={() => {
                          setSelectedProspect(prospect)
                          onProspectClick(prospect)
                        }}
                      >
                        <div className="max-w-[280px] truncate text-sm font-medium text-[#F4EEE7]">
                          {prospect.address}
                        </div>
                        {prospect.postcode && (
                          <div className="mt-0.5 text-xs text-[#867A70]">{prospect.postcode}</div>
                        )}
                      </td>

                      <td
                        className="cursor-pointer px-4 py-3 text-sm text-[#DDD2C8]"
                        onClick={() => {
                          setSelectedProspect(prospect)
                          onProspectClick(prospect)
                        }}
                      >
                        {prospect.town || 'N/A'}
                      </td>

                      <td
                        className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#F8F3EE]"
                        onClick={() => {
                          setSelectedProspect(prospect)
                          onProspectClick(prospect)
                        }}
                      >
                        {formatPrice(prospect.price)}
                      </td>

                      <td
                        className="hidden cursor-pointer px-4 py-3 text-sm text-[#B9AEA2] lg:table-cell"
                        onClick={() => {
                          setSelectedProspect(prospect)
                          onProspectClick(prospect)
                        }}
                      >
                        {prospect.property_type || 'N/A'}
                      </td>

                      <td
                        className="hidden cursor-pointer px-4 py-3 text-sm text-[#B9AEA2] lg:table-cell"
                        onClick={() => {
                          setSelectedProspect(prospect)
                          onProspectClick(prospect)
                        }}
                      >
                        {prospect.current_agent || 'N/A'}
                      </td>

                      <td
                        className="hidden cursor-pointer px-4 py-3 text-sm text-[#B9AEA2] md:table-cell"
                        onClick={() => {
                          setSelectedProspect(prospect)
                          onProspectClick(prospect)
                        }}
                      >
                        {formatDate(prospect.last_contact_date)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {prospect.link && (
                            <a
                              href={prospect.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg bg-white/[0.03] p-2 text-[#DDD2C8] transition hover:bg-[#FF6A1A]/10 hover:text-[#F4EEE7]"
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
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {prospects.length === 0 && (
              <div className="px-6 py-16 text-center">
                <p className="text-base font-medium text-[#F4EEE7]">No prospects found</p>
                <p className="mt-1 text-sm text-[#867A70]">
                  Add your first prospect or broaden your filters to see results here.
                </p>
              </div>
            )}
          </div>
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