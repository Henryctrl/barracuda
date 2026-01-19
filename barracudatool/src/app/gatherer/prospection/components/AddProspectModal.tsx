'use client';

import { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { PropertyProspect, ProspectionStatus, STATUS_CONFIG } from '../types';

interface AddProspectModalProps {
  onClose: () => void;
  onAdd: (prospect: Partial<PropertyProspect>) => void;
}

export default function AddProspectModal({ onClose, onAdd }: AddProspectModalProps) {
  const [formData, setFormData] = useState<Partial<PropertyProspect>>({
    status: 'not_contacted'
  });
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleChange = (field: keyof PropertyProspect, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleGeocode = async () => {
    if (!formData.address) {
      alert('Please enter an address first');
      return;
    }

    setIsGeocoding(true);
    try {
      const response = await fetch(
        `/api/prospection/geocode?address=${encodeURIComponent(formData.address)}`
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      setFormData({
        ...formData,
        latitude: data.latitude,
        longitude: data.longitude,
        town: data.town || formData.town,
        postcode: data.postcode || formData.postcode
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to geocode address');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.address) {
      alert('Address is required');
      return;
    }

    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background-dark border-2 border-accent-cyan rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-glow-cyan">
        <div className="sticky top-0 bg-background-dark border-b-2 border-accent-cyan p-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-accent-cyan">ADD NEW PROSPECT</h2>
          <button
            onClick={onClose}
            className="text-accent-cyan hover:text-accent-magenta transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Property Details */}
          <div className="border-2 border-accent-magenta rounded-md p-4">
            <h3 className="text-accent-magenta font-bold mb-3">PROPERTY DETAILS</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-text-primary/80 mb-1 font-semibold">
                  Address <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="flex-1 px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                    placeholder="Full property address"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGeocode}
                    disabled={isGeocoding}
                    className="px-4 py-2 bg-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80 disabled:opacity-50"
                  >
                    <MapPin size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold">Town</label>
                  <input
                    type="text"
                    value={formData.town || ''}
                    onChange={(e) => handleChange('town', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                  />
                </div>
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold">Postcode</label>
                  <input
                    type="text"
                    value={formData.postcode || ''}
                    onChange={(e) => handleChange('postcode', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold">Price (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price || ''}
                    onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                  />
                </div>
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold">Property Type</label>
                  <input
                    type="text"
                    value={formData.property_type || ''}
                    onChange={(e) => handleChange('property_type', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                    placeholder="House, Apartment, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold">Link</label>
                  <input
                    type="url"
                    value={formData.link || ''}
                    onChange={(e) => handleChange('link', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold">Photo URL</label>
                  <input
                    type="url"
                    value={formData.photo_url || ''}
                    onChange={(e) => handleChange('photo_url', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Owner/Agent Info */}
          <div className="border-2 border-accent-yellow rounded-md p-4">
            <h3 className="text-accent-yellow font-bold mb-3">OWNER & AGENT INFO</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold">Owner Name</label>
                  <input
                    type="text"
                    value={formData.owner_name || ''}
                    onChange={(e) => handleChange('owner_name', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                  />
                </div>
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold">Current Agent</label>
                  <input
                    type="text"
                    value={formData.current_agent || ''}
                    onChange={(e) => handleChange('current_agent', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold">Owner Phone</label>
                  <input
                    type="tel"
                    value={formData.owner_phone || ''}
                    onChange={(e) => handleChange('owner_phone', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                  />
                </div>
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold">Owner Email</label>
                  <input
                    type="email"
                    value={formData.owner_email || ''}
                    onChange={(e) => handleChange('owner_email', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-primary/80 mb-1 font-semibold">Owner Address</label>
                <input
                  type="text"
                  value={formData.owner_address || ''}
                  onChange={(e) => handleChange('owner_address', e.target.value)}
                  className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                />
              </div>
            </div>
          </div>

          {/* Prospection Status */}
          <div className="border-2 border-accent-cyan rounded-md p-4">
            <h3 className="text-accent-cyan font-bold mb-3">PROSPECTION STATUS</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-text-primary/80 mb-1 font-semibold">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value as ProspectionStatus)}
                  className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold">Last Contact Date</label>
                  <input
                    type="date"
                    value={formData.last_contact_date || ''}
                    onChange={(e) => handleChange('last_contact_date', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                  />
                </div>
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold">Return Date</label>
                  <input
                    type="date"
                    value={formData.return_date || ''}
                    onChange={(e) => handleChange('return_date', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-primary/80 mb-1 font-semibold">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                  placeholder="Add notes about this prospect..."
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-transparent border-2 border-text-primary/50 text-text-primary rounded-md font-bold hover:bg-text-primary/10 transition-all"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-accent-cyan border-2 border-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80 transition-all shadow-glow-cyan"
            >
              ADD PROSPECT
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
