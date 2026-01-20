'use client';

import { useState, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { PropertyProspect, ProspectionStatus, STATUS_CONFIG } from '../types';

interface BanFeature {
  geometry: { coordinates: [number, number] };
  properties: { label: string; housenumber?: string; postcode?: string; city?: string };
}

interface AddProspectModalProps {
  onClose: () => void;
  onAdd: (prospect: Partial<PropertyProspect>) => void;
}

export default function AddProspectModal({ onClose, onAdd }: AddProspectModalProps) {
  const [formData, setFormData] = useState<Partial<PropertyProspect>>({
    status: 'not_contacted'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (field: keyof PropertyProspect, value: string | number | undefined) => {

    setFormData({ ...formData, [field]: value });
  };

  // Fetch autocomplete suggestions
  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setSuggestions(data.features || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
  };

  const handleSuggestionClick = (feature: BanFeature) => {
    const [lon, lat] = feature.geometry.coordinates;
    const { label, postcode, city } = feature.properties;
    
    setSearchQuery(label);
    setSuggestions([]);
    
    setFormData({
      ...formData,
      address: label,
      latitude: lat,
      longitude: lon,
      town: city || formData.town,
      postcode: postcode || formData.postcode
    });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.address) {
      alert('Address is required');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      alert('Please select an address from the suggestions to geocode the location');
      return;
    }

    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background-dark border-2 border-accent-cyan rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-glow-cyan">
        <div className="sticky top-0 bg-background-dark border-b-2 border-accent-cyan p-4 flex items-center justify-between z-10">
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
              {/* Address Search with Autocomplete */}
              <div>
                <label className="block text-text-primary/80 mb-1 font-semibold">
                  Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 text-accent-cyan/70" size={20} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Search for address..."
                      className="w-full pl-10 pr-10 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                      required
                    />
                    {searchQuery.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-3 text-accent-cyan/70 hover:text-accent-cyan"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                  
                  {/* Suggestions Dropdown */}
                  {suggestions.length > 0 && (
                    <div className="absolute mt-2 w-full bg-background-dark border-2 border-accent-cyan rounded-md shadow-glow-cyan max-h-60 overflow-y-auto z-20">
                      {suggestions.map((feature, index) => (
                        <div
                          key={index}
                          onClick={() => handleSuggestionClick(feature)}
                          className="px-4 py-2 text-white hover:bg-accent-cyan/20 cursor-pointer border-b border-accent-cyan/10 last:border-b-0"
                        >
                          <div className="font-semibold">{feature.properties.label}</div>
                          {feature.properties.postcode && (
                            <div className="text-xs text-accent-cyan/70">
                              {feature.properties.postcode} {feature.properties.city}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {formData.latitude && formData.longitude && (
                  <p className="text-green-400 text-xs mt-1">✓ Location geocoded successfully</p>
                )}
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
                  <label className="block text-text-primary/80 mb-1 font-semibold">Reference</label>
                  <input
                    type="text"
                    value={formData.reference || ''}
                    onChange={(e) => handleChange('reference', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan text-white rounded-md focus:outline-none focus:border-accent-magenta"
                    placeholder="Internal reference"
                  />
                </div>
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
