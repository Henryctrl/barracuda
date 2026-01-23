'use client';

import { useState } from 'react';
import { X, ExternalLink, Save, User } from 'lucide-react';
import { PropertyProspect, ProspectionStatus, STATUS_CONFIG } from '../types';

interface ProspectDetailModalProps {
  prospect: PropertyProspect;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<PropertyProspect>) => void;
}

export default function ProspectDetailModal({ prospect, onClose, onUpdate }: ProspectDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<PropertyProspect>(prospect);

  const handleSave = () => {
    onUpdate(prospect.id, formData);
    setIsEditing(false);
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background-dark border-2 border-accent-cyan rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-glow-cyan">
        <div className="sticky top-0 bg-background-dark border-b-2 border-accent-cyan p-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-accent-cyan">PROSPECT DETAILS</h2>
          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-accent-magenta text-background-dark rounded-md font-bold hover:bg-accent-magenta/80"
              >
                EDIT
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80"
              >
                <Save className="inline mr-2" size={18} />
                SAVE
              </button>
            )}
            <button onClick={onClose} className="text-accent-cyan hover:text-accent-magenta">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Photo */}
          {formData.photo_url && (
            <div className="border-2 border-accent-cyan rounded-md overflow-hidden">
              <img
                src={formData.photo_url}
                alt="Property"
                className="w-full h-64 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Status Badge and Added By */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full border-2 border-white"
                style={{
                  backgroundColor: STATUS_CONFIG[formData.status].dotColor,
                  boxShadow: `0 0 12px ${STATUS_CONFIG[formData.status].dotColor}`
                }}
              />
              {isEditing ? (
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProspectionStatus })}
                  className="px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xl font-bold text-accent-cyan">
                  {STATUS_CONFIG[formData.status].label}
                </span>
              )}
            </div>

            {/* Added By */}
            <div className="flex items-center gap-2">
              <User size={18} className="text-accent-magenta" />
              <label className="text-text-primary/60 text-sm font-semibold">ADDED BY:</label>
              {isEditing ? (
                <select
                  value={formData.added_by || 'Henry'}
                  onChange={(e) => setFormData({ ...formData, added_by: e.target.value })}
                  className="px-3 py-2 bg-background-light border-2 border-accent-magenta text-white rounded-md font-bold"
                >
                  <option value="Henry" className="bg-background-light">Henry</option>
                  <option value="Millé" className="bg-background-light">Millé</option>
                </select>
              ) : (
                <span className="text-accent-magenta font-bold">{formData.added_by || 'N/A'}</span>
              )}
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-primary/60 mb-1 text-sm font-semibold">ADDRESS</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md"
                />
              ) : (
                <p className="text-white font-semibold">{formData.address}</p>
              )}
            </div>
            <div>
              <label className="block text-text-primary/60 mb-1 text-sm font-semibold">TOWN</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.town || ''}
                  onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                  className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md"
                />
              ) : (
                <p className="text-white">{formData.town || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-text-primary/60 mb-1 text-sm font-semibold">POSTCODE</label>
              <p className="text-white">{formData.postcode || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-text-primary/60 mb-1 text-sm font-semibold">PRICE</label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md"
                />
              ) : (
                <p className="text-accent-cyan font-bold text-lg">{formatPrice(formData.price)}</p>
              )}
            </div>
            <div>
              <label className="block text-text-primary/60 mb-1 text-sm font-semibold">PROPERTY TYPE</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.property_type || ''}
                  onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                  className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md"
                />
              ) : (
                <p className="text-white">{formData.property_type || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-text-primary/60 mb-1 text-sm font-semibold">CURRENT AGENT</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.current_agent || ''}
                  onChange={(e) => setFormData({ ...formData, current_agent: e.target.value })}
                  className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md"
                />
              ) : (
                <p className="text-white">{formData.current_agent || 'N/A'}</p>
              )}
            </div>
          </div>

          {/* Owner Info */}
          <div className="border-t-2 border-accent-cyan/30 pt-4">
            <h3 className="text-accent-yellow font-bold mb-3">OWNER INFORMATION</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-text-primary/60 mb-1 text-sm font-semibold">OWNER NAME</label>
                <p className="text-white">{formData.owner_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-text-primary/60 mb-1 text-sm font-semibold">PHONE</label>
                <p className="text-white">{formData.owner_phone || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-text-primary/60 mb-1 text-sm font-semibold">EMAIL</label>
                <p className="text-white">{formData.owner_email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-text-primary/60 mb-1 text-sm font-semibold">ADDRESS</label>
                <p className="text-white">{formData.owner_address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t-2 border-accent-cyan/30 pt-4">
            <h3 className="text-accent-magenta font-bold mb-3">CONTACT TRACKING</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-text-primary/60 mb-1 text-sm font-semibold">LAST CONTACT</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.last_contact_date || ''}
                    onChange={(e) => setFormData({ ...formData, last_contact_date: e.target.value })}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md"
                  />
                ) : (
                  <p className="text-white">{formData.last_contact_date || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="block text-text-primary/60 mb-1 text-sm font-semibold">RETURN DATE</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.return_date || ''}
                    onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md"
                  />
                ) : (
                  <p className="text-white">{formData.return_date || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t-2 border-accent-cyan/30 pt-4">
            <label className="block text-text-primary/60 mb-2 text-sm font-semibold">NOTES</label>
            {isEditing ? (
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md"
              />
            ) : (
              <p className="text-white whitespace-pre-wrap">{formData.notes || 'No notes'}</p>
            )}
          </div>

          {/* Link */}
          {formData.link && (
            <div>
              <a
                href={formData.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80"
              >
                VIEW PROPERTY LISTING <ExternalLink size={18} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
