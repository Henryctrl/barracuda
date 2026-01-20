'use client';

import { useState } from 'react';
import { X, Upload, FileText, AlertTriangle, ArrowRight } from 'lucide-react';
import { PropertyProspect } from '../types';
import { useRouter } from 'next/navigation';

interface UploadCSVModalProps {
  onClose: () => void;
}

export default function UploadCSVModal({ onClose }: UploadCSVModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Partial<PropertyProspect>[]>([]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const normalizeHeader = (header: string): string => {
    return header.toLowerCase()
      .replace(/[()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const extractPostcodeFromAddress = (address: string): { 
    cleanAddress: string; 
    postcode?: string; 
    town?: string 
  } => {
    if (!address) return { cleanAddress: '' };
    
    const postcodeMatch = address.match(/\b(\d{5})\b/);
    
    if (postcodeMatch) {
      const postcode = postcodeMatch[1];
      const parts = address.split(postcode);
      const town = parts[1]?.trim().split(/[,\n]/)[0]?.trim();
      const cleanAddress = parts[0].trim();
      
      return { cleanAddress, postcode, town };
    }
    
    return { cleanAddress: address };
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => {
        const trimmed = line.trim();
        return trimmed && trimmed.replace(/,/g, '').length > 0;
      });
  
      if (lines.length < 2) {
        setError('CSV file is empty or invalid');
        return;
      }
  
      const headers = parseCSVLine(lines[0]).map(h => normalizeHeader(h));
      const data: Partial<PropertyProspect>[] = [];
  
      console.log('Detected headers:', headers);
  
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: any = {};
  
        headers.forEach((header, index) => {
          const value = values[index] || '';
  
          if (header.includes('link') || header === 'photo') {
            row.link = value;
          } else if (header.includes('property address') || header === 'exact location' || header === 'address') {
            const extracted = extractPostcodeFromAddress(value);
            row.address = extracted.cleanAddress || value;
            if (extracted.postcode && !row.postcode) row.postcode = extracted.postcode;
            if (extracted.town && !row.town) row.town = extracted.town;
          } else if (header.includes('photo_url') || header === 'photo') {
            row.photo_url = value;
          } else if (header === 'town') {
            row.town = value;
          } else if (header === 'postcode') {
            row.postcode = value;
          } else if (header === 'price') {
            const cleanPrice = value.replace(/[€,]/g, '').trim();
            row.price = cleanPrice ? parseFloat(cleanPrice) : undefined;
          } else if (header.includes('type') || header === 'property_type') {
            row.property_type = value;
          } else if (header === 'agency' || header === 'current agent' || header === 'current_agent') {
            row.current_agent = value;
          } else if (header.includes('owners names') || header.includes('owner name') || header === 'owner_name') {
            row.owner_name = value;
          } else if (header.includes('phone') || header === 'owner_phone') {
            row.owner_phone = value;
          } else if (header.includes('email') || header === 'owner_email') {
            row.owner_email = value;
          } else if (header.includes('owners actual address') || header.includes('owner address') || header === 'owner_address') {
            row.owner_address = value;
          } else if (header.includes('last contact') || header.includes('date first came') || header === 'last_contact_date') {
            row.last_contact_date = value;
          } else if (header === 'notes' || header === 'response' || header.includes('contacted')) {
            row.notes = value;
          } else if (header.includes('reference') || header === 'internal reference') {
            row.reference = value;
          }
        });
  
        if (row.address || row.link || row.owner_name || row.reference) {
          row.status = 'not_contacted';
          data.push(row);
        }
      }
  
      if (data.length === 0) {
        setError('No valid data found in CSV. Detected columns: ' + headers.join(', '));
      } else {
        console.log('Successfully parsed', data.length, 'rows');
        setPreview(data);
      }
    };
  
    reader.onerror = () => {
      setError('Failed to read file');
    };
  
    reader.readAsText(file);
  };

  const handleSendToReview = () => {
    setIsProcessing(true);
    
    // Store in localStorage with timestamp
    const reviewData = {
      data: preview,
      uploadedAt: new Date().toISOString(),
      filename: file?.name
    };
    
    localStorage.setItem('csv_review_queue', JSON.stringify(reviewData));
    
    // Close modal and redirect to review page
    onClose();
    router.push('/gatherer/prospection/review');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background-dark border-2 border-accent-yellow rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-glow-yellow">
        <div className="sticky top-0 bg-background-dark border-b-2 border-accent-yellow p-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-accent-yellow">UPLOAD CSV DATA</h2>
            <p className="text-text-primary/70 text-sm mt-1">Upload and send to review queue for validation</p>
          </div>
          <button onClick={onClose} className="text-accent-yellow hover:text-accent-magenta">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
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
            <>
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
                        <p className="text-white font-semibold">{prospect.address || prospect.reference || 'No address'}</p>
                        <div className="text-sm text-text-primary/70 mt-1 flex gap-4 flex-wrap">
                          {prospect.town && <span>Town: {prospect.town}</span>}
                          {prospect.postcode && <span>Postcode: {prospect.postcode}</span>}
                          {prospect.price && <span>Price: €{prospect.price.toLocaleString()}</span>}
                          {prospect.property_type && <span>Type: {prospect.property_type}</span>}
                          {prospect.owner_name && <span>Owner: {prospect.owner_name}</span>}
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

              <div className="bg-accent-cyan/20 border-2 border-accent-cyan rounded-md p-4">
                <div className="flex items-center gap-2 text-accent-cyan font-bold mb-2">
                  <AlertTriangle size={20} />
                  <span>MANUAL REVIEW REQUIRED</span>
                </div>
                <p className="text-text-primary/80 text-sm">
                  All {preview.length} entries will be sent to the Review Queue where you can validate addresses, 
                  edit data, and approve entries before they're added to your prospection database.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t-2 border-accent-cyan/30">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-transparent border-2 border-text-primary/50 text-text-primary rounded-md font-bold hover:bg-text-primary/10"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSendToReview}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-accent-yellow border-2 border-accent-yellow text-background-dark rounded-md font-bold hover:bg-accent-yellow/80 disabled:opacity-50 shadow-glow-yellow"
                >
                  <ArrowRight className="inline mr-2" size={18} />
                  SEND TO REVIEW QUEUE
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
