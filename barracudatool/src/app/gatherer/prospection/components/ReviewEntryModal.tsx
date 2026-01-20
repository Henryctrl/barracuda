'use client';

import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Check, Loader, AlertTriangle } from 'lucide-react';
import { PropertyProspect, ProspectionStatus, STATUS_CONFIG } from '../types';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

interface ReviewEntryModalProps {
  entry: Partial<PropertyProspect>;
  entryNumber: number;
  totalEntries: number;
  onSave: (data: Partial<PropertyProspect>) => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function ReviewEntryModal({
  entry,
  entryNumber,
  totalEntries,
  onSave,
  onSkip,
  onClose
}: ReviewEntryModalProps) {
  const [formData, setFormData] = useState<Partial<PropertyProspect>>(entry);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const marker = useRef<maptilersdk.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;
    const newMap = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.BASIC,
      center: [2.3522, 48.8566], // Paris default
      zoom: 6
    });

    map.current = newMap;

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update marker when coordinates change
  useEffect(() => {
    if (!map.current || !formData.latitude || !formData.longitude) return;

    // Remove old marker
    if (marker.current) {
      marker.current.remove();
    }

    // Add new marker
    const el = document.createElement('div');
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.border = '3px solid #00ffff';
    el.style.backgroundColor = '#ff00ff';
    el.style.boxShadow = '0 0 15px #00ffff';

    marker.current = new maptilersdk.Marker({ element: el })
      .setLngLat([formData.longitude, formData.latitude])
      .addTo(map.current);

    // Fly to location
    map.current.flyTo({
      center: [formData.longitude, formData.latitude],
      zoom: 14,
      duration: 1000
    });

    setGeocodeStatus('success');
  }, [formData.latitude, formData.longitude]);

  const handleChange = (field: keyof PropertyProspect, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleGeocode = async () => {
    if (!formData.address) {
      alert('Please enter an address first');
      return;
    }

    setIsGeocoding(true);
    setGeocodeStatus('pending');

    try {
      const searchQuery = [
        formData.address,
        formData.postcode,
        formData.town
      ].filter(Boolean).join(' ').trim();

      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=1`
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lon, lat] = feature.geometry.coordinates;

        setFormData({
          ...formData,
          latitude: lat,
          longitude: lon,
          town: formData.town || feature.properties.city,
          postcode: formData.postcode || feature.properties.postcode
        });

        setGeocodeStatus('success');
      } else {
        setGeocodeStatus('failed');
        alert('Address not found. Please check and try again.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodeStatus('failed');
      alert('Failed to geocode address');
    } finally {
      setIsGeocoding(false);
    }
  };

  const validateData = (): boolean => {
    const errors: string[] = [];

    if (!formData.address) errors.push('Address is required');
    if (!formData.latitude || !formData.longitude) errors.push('Address must be geocoded (click the pin icon)');
    if (formData.price && formData.price < 0) errors.push('Price cannot be negative');
    if (formData.owner_email && !formData.owner_email.includes('@')) errors.push('Invalid email format');

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (validateData()) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-background-dark border-2 border-accent-cyan rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden shadow-glow-cyan flex flex-col">
        {/* Header */}
        <div className="bg-background-light border-b-2 border-accent-cyan p-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-accent-cyan">
              REVIEW ENTRY {entryNumber}/{totalEntries}
            </h2>
            <p className="text-text-primary/70 text-sm">Validate and edit data before saving</p>
          </div>
          <button onClick={onClose} className="text-accent-cyan hover:text-accent-magenta">
            <X size={24} />
          </button>
        </div>

        {/* Main Content - Split View */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Side - Form */}
          <div className="w-1/2 overflow-y-auto p-6 space-y-4 border-r-2 border-accent-cyan/30">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-900/30 border-2 border-red-500 rounded-md p-4">
                <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                  <AlertTriangle size={20} />
                  <span>VALIDATION ERRORS</span>
                </div>
                <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Property Details */}
            <div className="border-2 border-accent-magenta rounded-md p-4">
              <h3 className="text-accent-magenta font-bold mb-3">PROPERTY DETAILS</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold text-sm">
                    Address <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className="flex-1 px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                      placeholder="Full property address"
                    />
                    <button
                      type="button"
                      onClick={handleGeocode}
                      disabled={isGeocoding}
                      className={`px-4 py-2 rounded-md font-bold transition-all ${
                        geocodeStatus === 'success'
                          ? 'bg-green-600 text-white'
                          : geocodeStatus === 'failed'
                          ? 'bg-red-600 text-white'
                          : 'bg-accent-cyan text-background-dark hover:bg-accent-cyan/80'
                      } disabled:opacity-50`}
                    >
                      {isGeocoding ? <Loader size={20} className="animate-spin" /> : <MapPin size={20} />}
                    </button>
                  </div>
                  {geocodeStatus === 'success' && (
                    <p className="text-green-400 text-xs mt-1">✓ Geocoded successfully</p>
                  )}
                  {geocodeStatus === 'failed' && (
                    <p className="text-red-400 text-xs mt-1">✗ Geocoding failed - try again</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Town</label>
                    <input
                      type="text"
                      value={formData.town || ''}
                      onChange={(e) => handleChange('town', e.target.value)}
                      className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                  <div>
                    <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Postcode</label>
                    <input
                      type="text"
                      value={formData.postcode || ''}
                      onChange={(e) => handleChange('postcode', e.target.value)}
                      className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Price (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price || ''}
                      onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                  <div>
                    <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Property Type</label>
                    <input
                      type="text"
                      value={formData.property_type || ''}
                      onChange={(e) => handleChange('property_type', e.target.value)}
                      className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                      placeholder="House, Apartment, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Link</label>
                    <input
                      type="url"
                      value={formData.link || ''}
                      onChange={(e) => handleChange('link', e.target.value)}
                      className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Photo URL</label>
                    <input
                      type="url"
                      value={formData.photo_url || ''}
                      onChange={(e) => handleChange('photo_url', e.target.value)}
                      className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Owner/Agent Info */}
            <div className="border-2 border-accent-yellow rounded-md p-4">
              <h3 className="text-accent-yellow font-bold mb-3">OWNER & AGENT INFO</h3>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Owner Name</label>
                    <input
                      type="text"
                      value={formData.owner_name || ''}
                      onChange={(e) => handleChange('owner_name', e.target.value)}
                      className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                  <div>
                    <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Current Agent</label>
                    <input
                      type="text"
                      value={formData.current_agent || ''}
                      onChange={(e) => handleChange('current_agent', e.target.value)}
                      className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Owner Phone</label>
                    <input
                      type="tel"
                      value={formData.owner_phone || ''}
                      onChange={(e) => handleChange('owner_phone', e.target.value)}
                      className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                  <div>
                    <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Owner Email</label>
                    <input
                      type="email"
                      value={formData.owner_email || ''}
                      onChange={(e) => handleChange('owner_email', e.target.value)}
                      className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Owner Address</label>
                  <input
                    type="text"
                    value={formData.owner_address || ''}
                    onChange={(e) => handleChange('owner_address', e.target.value)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                  />
                </div>
              </div>
            </div>

            {/* Prospection Status */}
            <div className="border-2 border-accent-cyan rounded-md p-4">
              <h3 className="text-accent-cyan font-bold mb-3">PROSPECTION STATUS</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Status</label>
                  <select
                    value={formData.status || 'not_contacted'}
                    onChange={(e) => handleChange('status', e.target.value as ProspectionStatus)}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key} className="bg-background-light">
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Last Contact Date</label>
                    <input
                      type="date"
                      value={formData.last_contact_date || ''}
                      onChange={(e) => handleChange('last_contact_date', e.target.value)}
                      className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                  <div>
                    <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Return Date</label>
                    <input
                      type="date"
                      value={formData.return_date || ''}
                      onChange={(e) => handleChange('return_date', e.target.value)}
                      className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-text-primary/80 mb-1 font-semibold text-sm">Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-background-light border-2 border-accent-cyan/50 text-white rounded-md focus:outline-none focus:border-accent-cyan"
                    placeholder="Add notes about this prospect..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Map Preview */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-background-light p-3 border-b-2 border-accent-cyan/30">
              <h3 className="text-accent-cyan font-bold">MAP PREVIEW</h3>
              <p className="text-text-primary/60 text-sm">
                {formData.latitude && formData.longitude
                  ? `Coordinates: ${formData.latitude.toFixed(4)}, ${formData.longitude.toFixed(4)}`
                  : 'Click the pin icon to geocode the address'}
              </p>
            </div>
            <div ref={mapContainer} className="flex-1" />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-background-light border-t-2 border-accent-cyan p-4 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="px-6 py-2 bg-transparent border-2 border-red-500 text-red-400 rounded-md font-bold hover:bg-red-900/30 transition-all"
          >
            SKIP THIS ENTRY
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-transparent border-2 border-text-primary/50 text-text-primary rounded-md font-bold hover:bg-text-primary/10"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-accent-cyan border-2 border-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80 transition-all shadow-glow-cyan"
            >
              <Check className="inline mr-2" size={18} />
              SAVE & CONTINUE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
