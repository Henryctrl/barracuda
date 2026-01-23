'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Merge, Trash2, X } from 'lucide-react';
import { PropertyProspect } from '../types';

interface DuplicateGroup {
  key: string;
  prospects: PropertyProspect[];
  type: 'address' | 'owner';
}

interface DuplicateDetectorProps {
  prospects: PropertyProspect[];
  onMerge: (keepId: string, deleteIds: string[]) => void;
  onDelete: (id: string) => void;
}

export default function DuplicateDetector({ prospects, onMerge, onDelete }: DuplicateDetectorProps) {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const addressMap = new Map<string, PropertyProspect[]>();
    const ownerMap = new Map<string, PropertyProspect[]>();

    prospects.forEach(prospect => {
      const normalizedAddr = prospect.address.toLowerCase().trim().replace(/\s+/g, ' ');
      if (!addressMap.has(normalizedAddr)) {
        addressMap.set(normalizedAddr, []);
      }
      addressMap.get(normalizedAddr)!.push(prospect);

      if (prospect.owner_name && prospect.owner_phone) {
        const ownerKey = `${prospect.owner_name.toLowerCase()}-${prospect.owner_phone}`;
        if (!ownerMap.has(ownerKey)) {
          ownerMap.set(ownerKey, []);
        }
        ownerMap.get(ownerKey)!.push(prospect);
      }
    });

    const dupes: DuplicateGroup[] = [];
    
    addressMap.forEach((props, key) => {
      if (props.length > 1) {
        dupes.push({ key, prospects: props, type: 'address' });
      }
    });

    ownerMap.forEach((props, key) => {
      if (props.length > 1) {
        const propIds = new Set(props.map(p => p.id));
        const alreadyInAddressDupe = dupes.some(d => 
          d.type === 'address' && d.prospects.some(p => propIds.has(p.id))
        );
        
        if (!alreadyInAddressDupe) {
          dupes.push({ key, prospects: props, type: 'owner' });
        }
      }
    });

    setDuplicates(dupes);
    if (dupes.length > 0) {
      setShowModal(true);
    }
  }, [prospects]);

  const handleMerge = (group: DuplicateGroup, keepId: string) => {
    const deleteIds = group.prospects.filter(p => p.id !== keepId).map(p => p.id);
    onMerge(keepId, deleteIds);
    setDuplicates(duplicates.filter(d => d.key !== group.key));
  };

  const handleDeleteOne = (group: DuplicateGroup, deleteId: string) => {
    onDelete(deleteId);
    const updated = {
      ...group,
      prospects: group.prospects.filter(p => p.id !== deleteId)
    };
    if (updated.prospects.length <= 1) {
      setDuplicates(duplicates.filter(d => d.key !== group.key));
    } else {
      setDuplicates(duplicates.map(d => d.key === group.key ? updated : d));
    }
  };

  if (duplicates.length === 0 || !showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-background-dark border-2 border-red-500 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-glow-red">
        <div className="sticky top-0 bg-background-dark border-b-2 border-red-500 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-500" size={32} />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-red-500">DUPLICATE ENTRIES DETECTED</h2>
              <p className="text-text-primary/70 text-sm sm:text-base">{duplicates.length} duplicate groups found</p>
            </div>
          </div>
          <button onClick={() => setShowModal(false)} className="text-red-500 hover:text-red-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {duplicates.map((group) => (
            <div key={group.key} className="border-2 border-red-500/50 rounded-md p-4 bg-red-900/10">
              <h3 className="text-base sm:text-lg font-bold text-red-400 mb-3">
                {group.type === 'address' ? '📍 Same Address' : '👤 Same Owner'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.prospects.map(prospect => (
                  <div key={prospect.id} className="bg-background-light border-2 border-accent-cyan rounded-md p-3">
                    {prospect.photo_url && (
                      <img src={prospect.photo_url} alt="Property" className="w-full h-32 object-cover rounded mb-2" />
                    )}
                    
                    <p className="text-white font-semibold mb-1 text-sm sm:text-base">{prospect.address}</p>
                    <p className="text-text-primary/70 text-xs sm:text-sm mb-2">{prospect.town}</p>
                    
                    {prospect.price && (
                      <p className="text-accent-yellow font-bold mb-2 text-sm sm:text-base">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(prospect.price)}
                      </p>
                    )}

                    {prospect.owner_name && (
                      <p className="text-text-primary/80 text-xs sm:text-sm">Owner: {prospect.owner_name}</p>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleMerge(group, prospect.id)}
                        className="flex-1 px-3 py-2 bg-accent-cyan text-background-dark rounded-md font-bold text-xs sm:text-sm hover:bg-accent-cyan/80"
                      >
                        <Merge className="inline mr-1" size={14} />
                        KEEP THIS
                      </button>
                      <button
                        onClick={() => handleDeleteOne(group, prospect.id)}
                        className="px-3 py-2 bg-red-900/50 border-2 border-red-500 text-red-400 rounded-md font-bold text-xs sm:text-sm hover:bg-red-900/70"
                      >
                        <Trash2 className="inline" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
