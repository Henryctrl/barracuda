'use client';

import { useState } from 'react';
import { X, Upload, FileText, AlertTriangle, ArrowRight, User } from 'lucide-react';
import { PropertyProspect } from '../types';
import { useRouter } from 'next/navigation';

interface UploadCSVModalProps {
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export default function UploadCSVModal({ onClose, onRefresh }: UploadCSVModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Partial<PropertyProspect>[]>([]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [addedBy, setAddedBy] = useState<string>('Henry');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isCSV = selectedFile.name.endsWith('.csv');
    const isTSV = selectedFile.name.endsWith('.tsv') || selectedFile.name.endsWith('.txt');

    if (!isCSV && !isTSV) {
      setError('Please select a CSV or TSV file');
      return;
    }

    setFile(selectedFile);
    setError('');
    parseFile(selectedFile, isTSV ? '\t' : ',');
  };

  const parseFileLine = (line: string, delimiter: string): string[] => {
    if (delimiter === '\t') {
      // TSV is simple - just split by tabs
      return line.split('\t').map(field => field.trim());
    }

    // CSV parsing with quote handling
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
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

  const cleanPhoneNumber = (phone: string): string => {
    // Remove prefixes like "Mobile : " or "Mobile: "
    return phone.replace(/^(Mobile\s*:\s*|Phone\s*:\s*)/i, '').trim();
  };

  const extractPostcodeFromAddress = (address: string): { 
    cleanAddress: string; 
    postcode?: string; 
    town?: string;
    latitude?: number;
    longitude?: number;
  } => {
    if (!address) return { cleanAddress: '' };
    
    // Extract coordinates if present (format: "44.536065, 0.823411")
    const coordMatch = address.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    let latitude: number | undefined;
    let longitude: number | undefined;
    
    if (coordMatch) {
      latitude = parseFloat(coordMatch[1]);
      longitude = parseFloat(coordMatch[2]);
      // Remove coordinates from address
      address = address.replace(coordMatch[0], '').trim();
    }
    
    // Extract postcode (5 digits for French postcodes)
    const postcodeMatch = address.match(/\b(\d{5})\b/);
    
    if (postcodeMatch) {
      const postcode = postcodeMatch[1];
      const parts = address.split(postcode);
      
      // Town is after the postcode
      const townPart = parts[1]?.trim().replace(/[\r\n]+/g, ' ').trim();
      const town = townPart?.split(/[,]/)[0]?.trim();
      
      // Clean address is before the postcode
      const cleanAddress = parts[0].trim().replace(/[\n\r]+/g, ' ').trim();
      
      return { cleanAddress, postcode, town, latitude, longitude };
    }
    
    return { 
      cleanAddress: address.replace(/[\n\r]+/g, ' ').trim(), 
      latitude, 
      longitude 
    };
  };

  const parseFile = (file: File, delimiter: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => {
        const trimmed = line.trim();
        return trimmed && trimmed.replace(/[,\t]/g, '').length > 0;
      });
  
      if (lines.length < 2) {
        setError('File is empty or invalid');
        return;
      }
  
      const headers = parseFileLine(lines[0], delimiter).map(h => normalizeHeader(h));
      const data: Partial<PropertyProspect>[] = [];
  
      console.log('Detected headers:', headers);
      console.log('Using delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
  
      for (let i = 1; i < lines.length; i++) {
        const values = parseFileLine(lines[i], delimiter);
        const row: Record<string, string | number | undefined> = {};
  
        headers.forEach((header, index) => {
          const value = values[index]?.trim() || '';

          // Skip empty values
          if (!value) return;

          // Link/Photo URL
          if (header.includes('link')) {
            row.link = value;
          } 
          // Photo URL
          else if (header.includes('photo_url') || header === 'photo') {
            row.photo_url = value;
          }
          // Property Address (with embedded coords and postcode)
          else if (header.includes('property address') || header === 'exact location' || header === 'address') {
            const extracted = extractPostcodeFromAddress(value);
            row.address = extracted.cleanAddress || value;
            if (extracted.postcode) row.postcode = extracted.postcode;
            if (extracted.town) row.town = extracted.town;
            if (extracted.latitude) row.latitude = extracted.latitude;
            if (extracted.longitude) row.longitude = extracted.longitude;
          }
          // Town
          else if (header === 'town') {
            row.town = value;
          } 
          // Postcode
          else if (header === 'postcode') {
            row.postcode = value;
          } 
          // Price
          else if (header === 'price') {
            const cleanPrice = value.replace(/[€,$,\s]/g, '').trim();
            row.price = cleanPrice ? parseFloat(cleanPrice) : undefined;
          } 
          // Property Type
          else if (header.includes('type') || header === 'property_type') {
            row.property_type = value;
          } 
          // Agency
          else if (header === 'agency' || header === 'current agent' || header === 'current_agent') {
            row.current_agent = value;
          }
          // Owner Names
          else if (header.includes('owners names') || header.includes('owner name') || header === 'owner_name') {
            row.owner_name = value.replace(/[\n\r]+/g, ' ').trim();
          } 
          // Owner Phone
          else if (header.includes('phone') || header === 'owner_phone') {
            row.owner_phone = cleanPhoneNumber(value);
          } 
          // Owner Email
          else if (header.includes('email') || header === 'owner_email') {
            row.owner_email = value;
          } 
          // Owner Address (actual address)
          else if (header.includes('owners actual address') || header.includes('owner address') || header === 'owner_address') {
            row.owner_address = value.replace(/[\n\r]+/g, ' ').trim();
          } 
          // Last Contact Date only
else if (header.includes('last contact') || header === 'last_contact_date') {
  // Try to parse date formats like "02/08/2024" or "24/02/2025"
  if (value) {
    const dateMatch = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const [, day, month, year] = dateMatch;
      row.last_contact_date = `${year}-${month}-${day}`;
    } else {
      row.last_contact_date = value;
    }
  }
}
// Ignore "Date first came on market" - not in DB
else if (header.includes('date first came')) {
  // Skip this field - not in database
  return;
}

          // Notes
          else if (header === 'notes' || header === 'response' || header.includes('contacted')) {
            row.notes = value;
          } 
          // Internal Reference
          else if (header.includes('reference') || header === 'internal reference') {
            row.reference = value;
          }
        });
  
        // Only add row if it has meaningful data
        if (row.address || row.link || row.owner_name || row.reference) {
          row.status = 'not_contacted';
          data.push(row);
        }
      }
  
      if (data.length === 0) {
        setError('No valid data found. Detected columns: ' + headers.join(', '));
      } else {
        console.log('Successfully parsed', data.length, 'rows');
        console.log('Sample row:', data[0]);
        setPreview(data);
      }
    };
  
    reader.onerror = () => {
      setError('Failed to read file');
    };
  
    reader.readAsText(file);
  };

  const handleSendToReview = () => {
    if (!addedBy) {
      setError('Please select who is adding this data');
      return;
    }

    setIsProcessing(true);
    
    // Add 'added_by' to each entry
    const dataWithAddedBy = preview.map(entry => ({
      ...entry,
      added_by: addedBy
    }));
    
    // Store in localStorage with timestamp
    const reviewData = {
      data: dataWithAddedBy,
      uploadedAt: new Date().toISOString(),
      filename: file?.name,
      addedBy: addedBy
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
            <h2 className="text-2xl font-bold text-accent-yellow">UPLOAD CSV/TSV DATA</h2>
            <p className="text-text-primary/70 text-sm mt-1">Upload and send to review queue for validation</p>
          </div>
          <button onClick={onClose} className="text-accent-yellow hover:text-accent-magenta">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Added By Selector */}
          <div className="border-2 border-accent-magenta rounded-lg p-4 bg-accent-magenta/10">
            <label className="text-accent-magenta font-bold mb-2 flex items-center gap-2">
              <User size={20} />
              WHO IS ADDING THIS DATA? <span className="text-red-400">*</span>
            </label>
            <select
              value={addedBy}
              onChange={(e) => setAddedBy(e.target.value)}
              className="w-full px-4 py-3 bg-background-light border-2 border-accent-magenta text-white rounded-md focus:outline-none focus:border-accent-magenta font-bold text-lg"
            >
              <option value="Henry" className="bg-background-light">Henry</option>
              <option value="Millé" className="bg-background-light">Millé</option>
            </select>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-accent-yellow rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.tsv,.txt"
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
                  {file ? file.name : 'Click to upload CSV or TSV file'}
                </p>
                <p className="text-text-primary/60 text-sm">
                  Supported: CSV, TSV (recommended), TXT • Columns: address, town, postcode, price, type, agency, owner info
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
                          {prospect.reference && <span className="text-accent-yellow">Ref: {prospect.reference}</span>}
                          {prospect.town && <span>Town: {prospect.town}</span>}
                          {prospect.postcode && <span>PC: {prospect.postcode}</span>}
                          {prospect.price && <span>€{prospect.price.toLocaleString()}</span>}
                          {prospect.current_agent && <span>Agency: {prospect.current_agent}</span>}
                          {prospect.owner_name && <span>Owner: {prospect.owner_name}</span>}
                          {prospect.owner_phone && <span>📞 {prospect.owner_phone}</span>}
                          {prospect.latitude && prospect.longitude && (
                            <span className="text-accent-cyan font-bold">✓ Geocoded</span>
                          )}
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
                  disabled={isProcessing || !addedBy}
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
