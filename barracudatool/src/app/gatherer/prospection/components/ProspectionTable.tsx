'use client';

import { useState } from 'react';
import { PropertyProspect, STATUS_CONFIG } from '../types';
import { Edit, Trash2, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
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

  const handleSort = (field: 'price' | 'town' | 'last_contact_date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
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
    <div className="h-full overflow-auto bg-background-dark p-4">
      <div className="min-w-full">
        <table className="w-full border-2 border-accent-cyan">
          <thead className="bg-background-light border-b-2 border-accent-cyan sticky top-0">
            <tr>
              <th className="p-3 text-left text-accent-cyan font-bold">STATUS</th>
              <th className="p-3 text-left text-accent-cyan font-bold">PHOTO</th>
              <th className="p-3 text-left text-accent-cyan font-bold">ADDRESS</th>
              <th 
                className="p-3 text-left text-accent-cyan font-bold cursor-pointer hover:text-accent-magenta"
                onClick={() => handleSort('town')}
              >
                <div className="flex items-center gap-1">
                  TOWN <SortIcon field="town" />
                </div>
              </th>
              <th 
                className="p-3 text-left text-accent-cyan font-bold cursor-pointer hover:text-accent-magenta"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center gap-1">
                  PRICE <SortIcon field="price" />
                </div>
              </th>
              <th className="p-3 text-left text-accent-cyan font-bold">TYPE</th>
              <th className="p-3 text-left text-accent-cyan font-bold">AGENT</th>
              <th 
                className="p-3 text-left text-accent-cyan font-bold cursor-pointer hover:text-accent-magenta"
                onClick={() => handleSort('last_contact_date')}
              >
                <div className="flex items-center gap-1">
                  LAST CONTACT <SortIcon field="last_contact_date" />
                </div>
              </th>
              <th className="p-3 text-left text-accent-cyan font-bold">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {sortedProspects.map((prospect, index) => (
              <tr
                key={prospect.id}
                className={`border-b border-accent-cyan/30 hover:bg-accent-cyan/10 transition-colors cursor-pointer ${
                  index % 2 === 0 ? 'bg-background-light/30' : ''
                }`}
                onClick={() => {
                  setSelectedProspect(prospect);
                  onProspectClick(prospect);
                }}
              >
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white"
                      style={{
                        backgroundColor: STATUS_CONFIG[prospect.status].dotColor,
                        boxShadow: `0 0 8px ${STATUS_CONFIG[prospect.status].dotColor}`
                      }}
                    />
                    <span className="text-xs text-text-primary/80">
                      {STATUS_CONFIG[prospect.status].label}
                    </span>
                  </div>
                </td>
                <td className="p-3">
                  {prospect.photo_url ? (
                    <img
                      src={prospect.photo_url}
                      alt="Property"
                      className="w-16 h-12 object-cover rounded border-2 border-accent-cyan/50"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext fill="%2300ffff" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-12 bg-background-light border-2 border-accent-cyan/50 rounded flex items-center justify-center text-xs text-accent-cyan/50">
                      N/A
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <div className="max-w-xs truncate text-white font-semibold">
                    {prospect.address}
                  </div>
                  {prospect.postcode && (
                    <div className="text-xs text-text-primary/60">{prospect.postcode}</div>
                  )}
                </td>
                <td className="p-3 text-white">{prospect.town || 'N/A'}</td>
                <td className="p-3 text-white font-bold">{formatPrice(prospect.price)}</td>
                <td className="p-3 text-text-primary/80">{prospect.property_type || 'N/A'}</td>
                <td className="p-3 text-text-primary/80">{prospect.current_agent || 'N/A'}</td>
                <td className="p-3 text-text-primary/80">{formatDate(prospect.last_contact_date)}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {prospect.link && (
                      <a
                        href={prospect.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-accent-cyan hover:text-accent-magenta transition-colors"
                      >
                        <ExternalLink size={18} />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onProspectDelete(prospect.id);
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {prospects.length === 0 && (
          <div className="text-center py-12 text-text-primary/50">
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
