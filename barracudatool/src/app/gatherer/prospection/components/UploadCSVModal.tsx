'use client';

import { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { PropertyProspect } from '../types';

interface UploadCSVModalProps {
  onClose: () => void;
  onUpload: (data: Partial<PropertyProspect>[]) => void;
}

export default function UploadCSVModal({ onClose, onUpload }: UploadCSVModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Partial<PropertyProspect>[]>([]);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError('');
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setError('CSV file is empty or invalid');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const data: Partial<PropertyProspect>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};

        headers.forEach((header, index) => {
          const value = values[index];
          
          // Map CSV headers to PropertyProspect fields
          switch (header) {
            case 'link':
              row.link = value;
              break;
            case 'property address':
            case 'address':
            case 'exact location':
              row.address = value;
              break;
            case 'photo':
            case 'photo_url':
              row.photo_url = value;
              break;
            case 'town':
              row.town = value;
              break;
            case 'postcode':
              row.postcode = value;
              break;
            case 'price':
              const cleanPrice = value.replace(/[€,]/g, '').trim();
              row.price = cleanPrice ? parseFloat(cleanPrice) : undefined;
              break;
            case 'type':
            case 'property_type':
              row.property_type = value;
              break;
            case 'agency':
            case 'current agent':
            case 'current_agent':
              row.current_agent = value;
              break;
            case 'owners names':
            case 'owner name':
            case 'owner_name':
              row.owner_name = value;
              break;
            case 'phone (not to be used)':
            case 'phone':
            case 'owner_phone':
              row.owner_phone = value;
              break;
            case 'email (not to be used)':
            case 'email':
            case 'owner_email':
              row.owner_email = value;
              break;
            case 'owners actual address':
            case 'owner address':
            case 'owner_address':
              row.owner_address = value;
              break;
            case 'last contact date':
            case 'last_contact_date':
              row.last_contact_date = value;
              break;
            case 'notes':
            case 'response':
            case 'contacted?':
              row.notes = value;
              break;
          }
        });

        if (row.address || row.link) {
          row.status = 'not_contacted';
          data.push(row);
        }
      }

      setPreview(data);
    };

    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (preview.length === 0) {
      setError('No valid data to upload');
      return;
    }

    setIsUploading(true);

    // Geocode addresses before uploading
    const geocodedData = await Promise.all(
      preview.map(async (prospect) => {
        if (prospect.address && !prospect.latitude && !prospect.longitude) {
          try {
            const response = await fetch(
              `/api/prospection/geocode?address=${encodeURIComponent(prospect.address)}`
            );
            if (response.ok) {
              const geoData = await response.json();
              return {
                ...prospect,
                latitude: geoData.latitude,
                longitude: geoData.longitude,
                town: prospect.town || geoData.town,
                postcode: prospect.postcode || geoData.postcode
              };
            }
          } catch (error) {
            console.error('Geocoding failed for:', prospect.address);
          }
        }
        return prospect;
      })
    );

    setIsUploading(false);
    onUpload(geocodedData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background-dark border-2 border-accent-yellow rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-glow-yellow">
        <div className="sticky top-0 bg-background-dark border-b-2 border-accent-yellow p-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-accent-yellow">UPLOAD CSV DATA</h2>
          <button onClick={onClose} className="text-accent-yellow hover:text-accent-magenta">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Upload */}
          <div className="border-2 border-dashed border-accent-yellow rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <Upload size={48} className="text-accent-yellow" />
              <div>
                <p className="text-accent-yellow font-bold text-lg mb-2">
                  {file ? file.name : 'Click to upload CSV file'}
                </p>
                <p className="text-text-primary/60 text-sm">
                  Supported columns: address, town, postcode, price, type, agency, owner info, etc.
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="bg-red-900/50 border-2 border-red-500 text-red-400 p-4 rounded-md font-bold">
              {error}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="border-2 border-accent-cyan rounded-md">
              <div className="bg-background-light p-3 border-b-2 border-accent-cyan">
                <h3 className="text-accent-cyan font-bold flex items-center gap-2">
                  <FileText size={20} />
                  PREVIEW ({preview.length} prospects found)
                </h3>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {preview.slice(0, 5).map((prospect, index) => (
                    <div key={index} className="bg-background-light p-3 rounded border border-accent-cyan/30">
                      <p className="text-white font-semibold">{prospect.address || 'No address'}</p>
                      <div className="text-sm text-text-primary/70 mt-1 flex gap-4">
                        {prospect.town && <span>Town: {prospect.town}</span>}
                        {prospect.price && <span>Price: €{prospect.price.toLocaleString()}</span>}
                        {prospect.property_type && <span>Type: {prospect.property_type}</span>}
                      </div>
                    </div>
                  ))}
                  {preview.length > 5 && (
                    <p className="text-text-primary/60 text-center py-2">
                      ... and {preview.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-transparent border-2 border-text-primary/50 text-text-primary rounded-md font-bold hover:bg-text-primary/10"
            >
              CANCEL
            </button>
            <button
              onClick={handleUpload}
              disabled={preview.length === 0 || isUploading}
              className="px-6 py-2 bg-accent-yellow border-2 border-accent-yellow text-background-dark rounded-md font-bold hover:bg-accent-yellow/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="inline mr-2" size={18} />
              {isUploading ? 'GEOCODING...' : `UPLOAD ${preview.length} PROSPECTS`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
