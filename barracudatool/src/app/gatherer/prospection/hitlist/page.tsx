'use client';

import { useState, useEffect } from 'react';
import { Home, Trash2, ExternalLink, MapPin, Navigation as WazeIcon } from 'lucide-react';
import Link from 'next/link';
import { PropertyProspect } from '../types';

interface HitList {
  id: string;
  name: string;
  date: string;
  prospects: PropertyProspect[];
}

export default function HitListPage() {
  const [hitLists, setHitLists] = useState<HitList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('hit_lists');
    if (stored) {
      const lists = JSON.parse(stored);
      setHitLists(lists);
      if (lists.length > 0) {
        setActiveListId(lists[0].id);
      }
    }
  }, []);

  const saveHitLists = (lists: HitList[]) => {
    localStorage.setItem('hit_lists', JSON.stringify(lists));
    setHitLists(lists);
  };

  const removeProspect = (listId: string, prospectId: string) => {
    const updated = hitLists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          prospects: list.prospects.filter(p => p.id !== prospectId)
        };
      }
      return list;
    }).filter(list => list.prospects.length > 0);
    
    saveHitLists(updated);
    if (updated.length === 0) {
      setActiveListId(null);
    }
  };

  const deleteList = (listId: string) => {
    if (!confirm('Delete this entire hit list?')) return;
    const updated = hitLists.filter(list => list.id !== listId);
    saveHitLists(updated);
    setActiveListId(updated.length > 0 ? updated[0].id : null);
  };

  const activeList = hitLists.find(list => list.id === activeListId);

  const getGoogleMapsUrl = (prospect: PropertyProspect) => {
    if (prospect.latitude && prospect.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${prospect.latitude},${prospect.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prospect.address)}`;
  };

  const getWazeUrl = (prospect: PropertyProspect) => {
    if (prospect.latitude && prospect.longitude) {
      return `https://waze.com/ul?ll=${prospect.latitude},${prospect.longitude}&navigate=yes`;
    }
    return `https://waze.com/ul?q=${encodeURIComponent(prospect.address)}&navigate=yes`;
  };

  const isSameAddress = (prospect: PropertyProspect) => {
    if (!prospect.owner_address) return null;
    const propAddr = prospect.address.toLowerCase().trim();
    const ownerAddr = prospect.owner_address.toLowerCase().trim();
    return propAddr === ownerAddr || ownerAddr.includes(propAddr) || propAddr.includes(ownerAddr);
  };

  return (
    <div className="min-h-screen bg-background-dark text-text-primary">
      <div className="border-b-2 border-accent-cyan bg-background-light/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/gatherer/prospection">
                <button className="px-2 sm:px-4 py-1 sm:py-2 bg-transparent border-2 border-accent-cyan text-accent-cyan rounded-md font-bold hover:bg-accent-cyan hover:text-background-dark transition-all">
                  <Home className="inline sm:mr-2" size={18} />
                  <span className="hidden sm:inline">BACK</span>
                </button>
              </Link>
              <h1 className="text-xl sm:text-3xl font-bold text-accent-cyan [filter:drop-shadow(0_0_8px_#00ffff)]">
                PROSPECTION HIT LIST
              </h1>
            </div>
          </div>

          {hitLists.length > 0 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {hitLists.map(list => (
                <button
                  key={list.id}
                  onClick={() => setActiveListId(list.id)}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-base rounded-md font-bold whitespace-nowrap transition-all ${
                    activeListId === list.id
                      ? 'bg-accent-cyan text-background-dark'
                      : 'bg-background-light border-2 border-accent-cyan text-accent-cyan hover:bg-accent-cyan/20'
                  }`}
                >
                  {list.name} ({list.prospects.length})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4">
        {!activeList ? (
          <div className="text-center py-12">
            <p className="text-text-primary/70 text-base sm:text-lg mb-4">
              No hit lists created yet. Go to the prospection page to create one!
            </p>
            <Link href="/gatherer/prospection">
              <button className="px-6 py-3 bg-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80">
                GO TO PROSPECTION
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-background-light border-2 border-accent-magenta rounded-md p-4 gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-accent-magenta">{activeList.name}</h2>
                <p className="text-text-primary/70 text-sm sm:text-base">Created: {new Date(activeList.date).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => deleteList(activeList.id)}
                className="w-full sm:w-auto px-4 py-2 bg-red-900/50 border-2 border-red-500 text-red-400 rounded-md font-bold hover:bg-red-900/70 text-sm sm:text-base"
              >
                <Trash2 className="inline mr-2" size={18} />
                DELETE LIST
              </button>
            </div>

            <div className="space-y-4">
              {activeList.prospects.map(prospect => {
                const sameAddr = isSameAddress(prospect);
                
                return (
                  <div
                    key={prospect.id}
                    className="bg-background-light border-2 border-accent-cyan rounded-md p-3 sm:p-4 hover:border-accent-magenta transition-all"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        {prospect.photo_url && (
                          <img
                            src={prospect.photo_url}
                            alt="Property"
                            className="w-full h-40 sm:h-48 object-cover rounded border-2 border-accent-cyan"
                          />
                        )}
                        
                        <div>
                          <h3 className="text-accent-cyan font-bold text-base sm:text-lg mb-2">PROPERTY</h3>
                          <p className="text-white font-semibold mb-1 text-sm sm:text-base">{prospect.address}</p>
                          <p className="text-text-primary/70 text-xs sm:text-sm">{prospect.town} {prospect.postcode}</p>
                          {prospect.price && (
                            <p className="text-accent-yellow font-bold text-base sm:text-lg mt-2">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(prospect.price)}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <a
                            href={getGoogleMapsUrl(prospect)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md font-bold text-center hover:bg-blue-700 text-xs sm:text-sm"
                          >
                            <MapPin className="inline mr-1" size={16} />
                            Google Maps
                          </a>
                          <a
                            href={getWazeUrl(prospect)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-3 py-2 bg-cyan-500 text-white rounded-md font-bold text-center hover:bg-cyan-600 text-xs sm:text-sm"
                          >
                            <WazeIcon className="inline mr-1" size={16} />
                            Waze
                          </a>
                        </div>

                        {prospect.link && (
                          <a
                            href={prospect.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-3 py-2 bg-accent-cyan text-background-dark rounded-md font-bold text-center hover:bg-accent-cyan/80 text-xs sm:text-sm"
                          >
                            <ExternalLink className="inline mr-1" size={16} />
                            View Listing
                          </a>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-accent-yellow font-bold text-base sm:text-lg">OWNER DETAILS</h3>
                        
                        {sameAddr !== null && (
                          <div className={`px-3 py-2 rounded-md font-bold text-center text-xs sm:text-sm ${
                            sameAddr
                              ? 'bg-green-900/50 border-2 border-green-500 text-green-400'
                              : 'bg-orange-900/50 border-2 border-orange-500 text-orange-400'
                          }`}>
                            {sameAddr ? '✓ SAME ADDRESS' : '⚠ DIFFERENT ADDRESS'}
                          </div>
                        )}

                        <div className="space-y-2">
                          {prospect.owner_name && (
                            <div>
                              <span className="text-text-primary/60 text-xs sm:text-sm">Name:</span>
                              <p className="text-white font-semibold text-sm sm:text-base">{prospect.owner_name}</p>
                            </div>
                          )}
                          
                          {prospect.owner_phone && (
                            <div>
                              <span className="text-text-primary/60 text-xs sm:text-sm">Phone:</span>
                              <p className="text-white font-semibold text-sm sm:text-base">
                                <a href={`tel:${prospect.owner_phone}`} className="hover:text-accent-cyan">
                                  {prospect.owner_phone}
                                </a>
                              </p>
                            </div>
                          )}
                          
                          {prospect.owner_email && (
                            <div>
                              <span className="text-text-primary/60 text-xs sm:text-sm">Email:</span>
                              <p className="text-white font-semibold text-xs sm:text-sm break-all">
                                <a href={`mailto:${prospect.owner_email}`} className="hover:text-accent-cyan">
                                  {prospect.owner_email}
                                </a>
                              </p>
                            </div>
                          )}
                          
                          {prospect.owner_address && (
                            <div>
                              <span className="text-text-primary/60 text-xs sm:text-sm">Address:</span>
                              <p className="text-white text-xs sm:text-sm">{prospect.owner_address}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-accent-magenta font-bold text-base sm:text-lg">NOTES & INFO</h3>
                        
                        {prospect.notes && (
                          <div className="bg-background-dark rounded-md p-3 border border-accent-cyan/30">
                            <p className="text-white text-xs sm:text-sm whitespace-pre-wrap">{prospect.notes}</p>
                          </div>
                        )}

                        {prospect.property_type && (
                          <div>
                            <span className="text-text-primary/60 text-xs sm:text-sm">Type:</span>
                            <p className="text-white text-sm sm:text-base">{prospect.property_type}</p>
                          </div>
                        )}

                        {prospect.current_agent && (
                          <div>
                            <span className="text-text-primary/60 text-xs sm:text-sm">Current Agent:</span>
                            <p className="text-white text-sm sm:text-base">{prospect.current_agent}</p>
                          </div>
                        )}

                        <button
                          onClick={() => removeProspect(activeList.id, prospect.id)}
                          className="w-full px-4 py-2 bg-red-900/50 border-2 border-red-500 text-red-400 rounded-md font-bold hover:bg-red-900/70 transition-all mt-auto text-xs sm:text-sm"
                        >
                          <Trash2 className="inline mr-2" size={18} />
                          REMOVE FROM LIST
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
