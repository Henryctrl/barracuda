'use client';

import { useState } from 'react';
import { PropertyProspect, STATUS_CONFIG, ProspectionStatus } from '../types';
import { Trash2, ExternalLink, ChevronUp, ChevronDown, ListPlus, User } from 'lucide-react';
import ProspectDetailModal from './ProspectDetailModal';

interface ProspectionTableProps {
  prospects: PropertyProspect[];
  onProspectClick: (prospect: PropertyProspect) => void;
  onProspectUpdate: (id: string, updates: Partial<PropertyProspect>) => void;
  onProspectDelete: (id: string) => void;
}

export default function ProspectionTable({
  prospects,
  onProspectClick,
  onProspectUpdate,
  onProspectDelete
}: ProspectionTableProps) {
  const [selectedProspect, setSelectedProspect] = useState<PropertyProspect | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'town' | 'last_contact_date'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [showBatchAddedBy, setShowBatchAddedBy] = useState(false);
  const [showHitListModal, setShowHitListModal] = useState(false);

  const handleSort = (field: 'price' | 'town' | 'last_contact_date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map(p => p.id)));
    }
  };

  const batchUpdateStatus = (status: ProspectionStatus) => {
    selectedIds.forEach(id => {
      onProspectUpdate(id, { status });
    });
    setSelectedIds(new Set());
    setShowBatchActions(false);
  };

  const batchUpdateAddedBy = (addedBy: string) => {
    selectedIds.forEach(id => {
      onProspectUpdate(id, { added_by: addedBy });
    });
    setSelectedIds(new Set());
    setShowBatchAddedBy(false);
  };

  const addToHitList = (listName?: string) => {
    const selectedProspects = prospects.filter(p => selectedIds.has(p.id));
    const stored = localStorage.getItem('hit_lists');
    let hitLists = stored ? JSON.parse(stored) : [];

    if (listName) {
      const existingList = hitLists.find((list: any) => list.name === listName);
      if (existingList) {
        const existingIds = new Set(existingList.prospects.map((p: any) => p.id));
        selectedProspects.forEach(p => {
          if (!existingIds.has(p.id)) {
            existingList.prospects.push(p);
          }
        });
      } else {
        hitLists.push({
          id: Date.now().toString(),
          name: listName,
          date: new Date().toISOString(),
          prospects: selectedProspects
        });
      }
    } else {
      const newName = prompt('Enter hit list name:', `Hit List ${new Date().toLocaleDateString()}`);
      if (!newName) return;
      
      hitLists.push({
        id: Date.now().toString(),
        name: newName,
        date: new Date().toISOString(),
        prospects: selectedProspects
      });
    }

    localStorage.setItem('hit_lists', JSON.stringify(hitLists));
    setSelectedIds(new Set());
    setShowHitListModal(false);
    alert(`Added ${selectedProspects.length} prospects to hit list!`);
  };

  const sortedProspects = [...prospects].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'price':
        aVal = a.price || 0;
        bVal = b.price || 0;
        break;
      case 'town':
        aVal = a.town || '';
        bVal = b.town || '';
        break;
      case 'last_contact_date':
        aVal = a.last_contact_date || '';
        bVal = b.last_contact_date || '';
        break;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  return (
    <div className="h-full overflow-auto bg-background-dark p-2 sm:p-4">
      {selectedIds.size > 0 && (
        <div className="mb-4 bg-accent-magenta/20 border-2 border-accent-magenta rounded-md p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-accent-magenta font-bold text-sm sm:text-base">
            {selectedIds.size} SELECTED
          </span>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setShowBatchActions(!showBatchActions);
                setShowBatchAddedBy(false);
              }}
              className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm bg-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80"
            >
              UPDATE STATUS
            </button>

            <button
              onClick={() => {
                setShowBatchAddedBy(!showBatchAddedBy);
                setShowBatchActions(false);
              }}
              className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm bg-accent-magenta text-background-dark rounded-md font-bold hover:bg-accent-magenta/80"
            >
              <User className="inline mr-1 sm:mr-2" size={16} />
              ADDED BY
            </button>

            <button
              onClick={() => setShowHitListModal(true)}
              className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm bg-accent-yellow text-background-dark rounded-md font-bold hover:bg-accent-yellow/80"
            >
              <ListPlus className="inline mr-1 sm:mr-2" size={16} />
              HIT LIST
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm bg-red-900/50 border-2 border-red-500 text-red-400 rounded-md font-bold hover:bg-red-900/70"
            >
              CLEAR
            </button>
          </div>
        </div>
      )}

      {showBatchActions && selectedIds.size > 0 && (
        <div className="mb-4 bg-background-light border-2 border-accent-cyan rounded-md p-4">
          <h3 className="text-accent-cyan font-bold mb-3 text-sm sm:text-base">UPDATE STATUS FOR SELECTED:</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => batchUpdateStatus(key as ProspectionStatus)}
                className="px-3 py-2 text-xs sm:text-sm rounded-md font-bold border-2 hover:scale-105 transition-all"
                style={{
                  borderColor: config.dotColor,
                  color: config.dotColor,
                  backgroundColor: `${config.dotColor}20`
                }}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showBatchAddedBy && selectedIds.size > 0 && (
        <div className="mb-4 bg-background-light border-2 border-accent-magenta rounded-md p-4">
          <h3 className="text-accent-magenta font-bold mb-3 text-sm sm:text-base flex items-center gap-2">
            <User size={20} />
            UPDATE "ADDED BY" FOR SELECTED:
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => batchUpdateAddedBy('Henry')}
              className="px-6 py-3 text-sm sm:text-base rounded-md font-bold border-2 border-accent-magenta text-accent-magenta bg-accent-magenta/20 hover:bg-accent-magenta hover:text-background-dark transition-all"
            >
              Henry
            </button>
            <button
              onClick={() => batchUpdateAddedBy('Millé')}
              className="px-6 py-3 text-sm sm:text-base rounded-md font-bold border-2 border-accent-magenta text-accent-magenta bg-accent-magenta/20 hover:bg-accent-magenta hover:text-background-dark transition-all"
            >
              Millé
            </button>
          </div>
        </div>
      )}

      {showHitListModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-background-dark border-2 border-accent-yellow rounded-md p-6 max-w-md w-full">
            <h2 className="text-xl sm:text-2xl font-bold text-accent-yellow mb-4">ADD TO HIT LIST</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => addToHitList()}
                className="w-full px-4 py-3 bg-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80"
              >
                CREATE NEW HIT LIST
              </button>

              {(() => {
                const stored = localStorage.getItem('hit_lists');
                const existing = stored ? JSON.parse(stored) : [];
                return existing.map((list: any) => (
                  <button
                    key={list.id}
                    onClick={() => addToHitList(list.name)}
                    className="w-full px-4 py-3 bg-background-light border-2 border-accent-yellow text-accent-yellow rounded-md font-bold hover:bg-accent-yellow hover:text-background-dark"
                  >
                    ADD TO "{list.name}"
                  </button>
                ));
              })()}

              <button
                onClick={() => setShowHitListModal(false)}
                className="w-full px-4 py-2 bg-transparent border-2 border-red-500 text-red-400 rounded-md font-bold hover:bg-red-900/50"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-w-full overflow-x-auto">
        <table className="w-full border-2 border-accent-cyan">
          <thead className="bg-background-light border-b-2 border-accent-cyan sticky top-0">
            <tr>
              <th className="p-2 sm:p-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === prospects.length && prospects.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer"
                />
              </th>
              <th className="p-2 sm:p-3 text-left text-accent-cyan font-bold text-xs sm:text-base">STATUS</th>
              <th className="p-2 sm:p-3 text-left text-accent-cyan font-bold text-xs sm:text-base hidden sm:table-cell">PHOTO</th>
              <th className="p-2 sm:p-3 text-left text-accent-cyan font-bold text-xs sm:text-base">ADDRESS</th>
              <th 
                className="p-2 sm:p-3 text-left text-accent-cyan font-bold text-xs sm:text-base cursor-pointer hover:text-accent-magenta"
                onClick={() => handleSort('town')}
              >
                <div className="flex items-center gap-1">
                  TOWN <SortIcon field="town" />
                </div>
              </th>
              <th 
                className="p-2 sm:p-3 text-left text-accent-cyan font-bold text-xs sm:text-base cursor-pointer hover:text-accent-magenta"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center gap-1">
                  PRICE <SortIcon field="price" />
                </div>
              </th>
              <th className="p-2 sm:p-3 text-left text-accent-cyan font-bold text-xs sm:text-base hidden lg:table-cell">TYPE</th>
              <th className="p-2 sm:p-3 text-left text-accent-cyan font-bold text-xs sm:text-base hidden lg:table-cell">AGENT</th>
              <th 
                className="p-2 sm:p-3 text-left text-accent-cyan font-bold text-xs sm:text-base cursor-pointer hover:text-accent-magenta hidden md:table-cell"
                onClick={() => handleSort('last_contact_date')}
              >
                <div className="flex items-center gap-1">
                  CONTACT <SortIcon field="last_contact_date" />
                </div>
              </th>
              <th className="p-2 sm:p-3 text-left text-accent-cyan font-bold text-xs sm:text-base">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {sortedProspects.map((prospect, index) => (
              <tr
                key={prospect.id}
                className={`border-b border-accent-cyan/30 hover:bg-accent-cyan/10 transition-colors ${
                  index % 2 === 0 ? 'bg-background-light/30' : ''
                } ${selectedIds.has(prospect.id) ? 'bg-accent-magenta/20' : ''}`}
              >
                <td className="p-2 sm:p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(prospect.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(prospect.id);
                    }}
                    className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer"
                  />
                </td>
                <td 
                  className="p-2 sm:p-3 cursor-pointer"
                  onClick={() => {
                    setSelectedProspect(prospect);
                    onProspectClick(prospect);
                  }}
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white flex-shrink-0"
                      style={{
                        backgroundColor: STATUS_CONFIG[prospect.status].dotColor,
                        boxShadow: `0 0 8px ${STATUS_CONFIG[prospect.status].dotColor}`
                      }}
                    />
                    <span className="text-xs text-text-primary/80 hidden xl:inline">
                      {STATUS_CONFIG[prospect.status].label}
                    </span>
                  </div>
                </td>
                <td 
                  className="p-2 sm:p-3 cursor-pointer hidden sm:table-cell"
                  onClick={() => {
                    setSelectedProspect(prospect);
                    onProspectClick(prospect);
                  }}
                >
                  {prospect.photo_url ? (
                    <img
                      src={prospect.photo_url}
                      alt="Property"
                      className="w-12 h-9 sm:w-16 sm:h-12 object-cover rounded border-2 border-accent-cyan/50"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext fill="%2300ffff" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-9 sm:w-16 sm:h-12 bg-background-light border-2 border-accent-cyan/50 rounded flex items-center justify-center text-xs text-accent-cyan/50">
                      N/A
                    </div>
                  )}
                </td>
                <td 
                  className="p-2 sm:p-3 cursor-pointer"
                  onClick={() => {
                    setSelectedProspect(prospect);
                    onProspectClick(prospect);
                  }}
                >
                  <div className="max-w-xs truncate text-white font-semibold text-xs sm:text-base">
                    {prospect.address}
                  </div>
                  {prospect.postcode && (
                    <div className="text-xs text-text-primary/60">{prospect.postcode}</div>
                  )}
                </td>
                <td 
                  className="p-2 sm:p-3 text-white cursor-pointer text-xs sm:text-base"
                  onClick={() => {
                    setSelectedProspect(prospect);
                    onProspectClick(prospect);
                  }}
                >
                  {prospect.town || 'N/A'}
                </td>
                <td 
                  className="p-2 sm:p-3 text-white font-bold cursor-pointer text-xs sm:text-base"
                  onClick={() => {
                    setSelectedProspect(prospect);
                    onProspectClick(prospect);
                  }}
                >
                  {formatPrice(prospect.price)}
                </td>
                <td 
                  className="p-2 sm:p-3 text-text-primary/80 cursor-pointer text-xs sm:text-base hidden lg:table-cell"
                  onClick={() => {
                    setSelectedProspect(prospect);
                    onProspectClick(prospect);
                  }}
                >
                  {prospect.property_type || 'N/A'}
                </td>
                <td 
                  className="p-2 sm:p-3 text-text-primary/80 cursor-pointer text-xs sm:text-base hidden lg:table-cell"
                  onClick={() => {
                    setSelectedProspect(prospect);
                    onProspectClick(prospect);
                  }}
                >
                  {prospect.current_agent || 'N/A'}
                </td>
                <td 
                  className="p-2 sm:p-3 text-text-primary/80 cursor-pointer text-xs sm:text-base hidden md:table-cell"
                  onClick={() => {
                    setSelectedProspect(prospect);
                    onProspectClick(prospect);
                  }}
                >
                  {formatDate(prospect.last_contact_date)}
                </td>
                <td className="p-2 sm:p-3">
                  <div className="flex gap-2">
                    {prospect.link && (
                      <a
                        href={prospect.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-accent-cyan hover:text-accent-magenta transition-colors"
                      >
                        <ExternalLink size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onProspectDelete(prospect.id);
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {prospects.length === 0 && (
          <div className="text-center py-12 text-text-primary/50 text-sm sm:text-base">
            No prospects found. Add your first prospect to get started!
          </div>
        )}
      </div>

      {selectedProspect && (
        <ProspectDetailModal
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onUpdate={onProspectUpdate}
        />
      )}
    </div>
  );
}
