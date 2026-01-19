'use client';

import { useState } from 'react';
import { X, Upload, FileText, AlertTriangle, Check, Edit2 } from 'lucide-react';
import { PropertyProspect } from '../types';

interface UploadCSVModalProps {
  onClose: () => void;
  onUpload: (data: Partial<PropertyProspect>[]) => void;
}

type ValidationStep = 'upload' | 'validate' | 'confirm';

interface ValidationIssue {
  index: number;
  field: string;
  value: any;
  message: string;
  severity: 'warning' | 'error';
}

export default function UploadCSVModal({ onClose, onUpload }: UploadCSVModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Partial<PropertyProspect>[]>([]);
  const [editedData, setEditedData] = useState<Partial<PropertyProspect>[]>([]);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<ValidationStep>('upload');
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError('');
    setStep('upload');
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
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Handle both \n and \r\n line endings
      const lines = text.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) {
        setError('CSV file is empty or invalid');
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => normalizeHeader(h));
      const data: Partial<PropertyProspect>[] = [];

      console.log('Detected headers:', headers); // Debug

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: any = {};

        headers.forEach((header, index) => {
          const value = values[index] || '';

          // Map CSV headers to PropertyProspect fields
          if (header.includes('link') || header === 'photo') {
            row.link = value;
          } else if (header.includes('property address') || header === 'exact location' || header === 'address') {
            row.address = value;
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

        // More lenient validation - accept row if it has any meaningful data
        if (row.address || row.link || row.owner_name || row.reference) {
          row.status = 'not_contacted';
          data.push(row);
        }
      }

      if (data.length === 0) {
        setError('No valid data found in CSV. Detected columns: ' + headers.join(', '));
        console.log('Parsed headers:', headers);
        console.log('Parsed headers:', headers);
console.log('Total lines:', lines.length);
console.log('First line raw:', lines[1]);

      } else {
        console.log('Successfully parsed', data.length, 'rows');
        setPreview(data);
        setEditedData(JSON.parse(JSON.stringify(data))); // Deep copy
        validateData(data);
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsText(file);
  };

  const validateData = (data: Partial<PropertyProspect>[]) => {
    const issues: ValidationIssue[] = [];

    data.forEach((prospect, index) => {
      // Check for missing critical fields
      if (!prospect.address && !prospect.link) {
        issues.push({
          index,
          field: 'address',
          value: prospect.address,
          message: 'Missing address and link',
          severity: 'error'
        });
      }

      // Check for invalid price
      if (prospect.price && (prospect.price < 0 || prospect.price > 100000000)) {
        issues.push({
          index,
          field: 'price',
          value: prospect.price,
          message: 'Price seems unusually high or invalid',
          severity: 'warning'
        });
      }

      // Check for missing location data
      if (prospect.address && !prospect.town && !prospect.postcode) {
        issues.push({
          index,
          field: 'location',
          value: null,
          message: 'Missing town or postcode',
          severity: 'warning'
        });
      }

      // Check for invalid email format
      if (prospect.owner_email && !prospect.owner_email.includes('@')) {
        issues.push({
          index,
          field: 'owner_email',
          value: prospect.owner_email,
          message: 'Invalid email format',
          severity: 'warning'
        });
      }
    });

    setValidationIssues(issues);

    // If there are issues, go to validation step
    if (issues.length > 0) {
      setStep('validate');
    } else {
      setStep('confirm');
    }
  };

  const handleFieldEdit = (index: number, field: string, value: any) => {
    const updated = [...editedData];
    updated[index] = { ...updated[index], [field]: value };
    setEditedData(updated);
  };

  const proceedToConfirm = () => {
    setStep('confirm');
  };

  const handleUpload = async () => {
    if (editedData.length === 0) {
      setError('No valid data to upload');
      return;
    }

    setIsUploading(true);

    // Geocode addresses before uploading
    const geocodedData = await Promise.all(
      editedData.map(async (prospect) => {
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

  const renderUploadStep = () => (
    <>
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
      {preview.length > 0 && step === 'upload' && (
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
      )}
    </>
  );

  const renderValidationStep = () => {
    const errors = validationIssues.filter(i => i.severity === 'error');
    const warnings = validationIssues.filter(i => i.severity === 'warning');

    return (
      <div className="space-y-4">
        <div className="bg-accent-yellow/20 border-2 border-accent-yellow rounded-md p-4">
          <div className="flex items-center gap-2 text-accent-yellow font-bold mb-2">
            <AlertTriangle size={24} />
            <span>DATA VALIDATION REQUIRED</span>
          </div>
          <p className="text-text-primary/80">
            Found {errors.length} error(s) and {warnings.length} warning(s) in your data.
            Please review and correct the issues below.
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-3">
          {validationIssues.map((issue, idx) => {
            const prospect = editedData[issue.index];
            const isEditing = editingIndex === issue.index;

            return (
              <div
                key={idx}
                className={`border-2 rounded-md p-4 ${
                  issue.severity === 'error'
                    ? 'border-red-500 bg-red-900/20'
                    : 'border-yellow-500 bg-yellow-900/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className={`font-bold ${issue.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                      Row {issue.index + 1}: {issue.message}
                    </p>
                    <p className="text-sm text-text-primary/60 mt-1">
                      {prospect.address || prospect.owner_name || prospect.reference || 'Unknown prospect'}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingIndex(isEditing ? null : issue.index)}
                    className="text-accent-cyan hover:text-accent-magenta"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>

                {isEditing && (
                  <div className="mt-3 space-y-2 bg-background-dark/50 p-3 rounded">
                    {issue.field === 'address' && (
                      <div>
                        <label className="text-sm text-text-primary/80 block mb-1">Address:</label>
                        <input
                          type="text"
                          value={prospect.address || ''}
                          onChange={(e) => handleFieldEdit(issue.index, 'address', e.target.value)}
                          className="w-full bg-background-light border-2 border-accent-cyan/50 rounded px-3 py-2 text-white focus:border-accent-cyan focus:outline-none"
                        />
                      </div>
                    )}
                    {issue.field === 'price' && (
                      <div>
                        <label className="text-sm text-text-primary/80 block mb-1">Price (€):</label>
                        <input
                          type="number"
                          value={prospect.price || ''}
                          onChange={(e) => handleFieldEdit(issue.index, 'price', parseFloat(e.target.value))}
                          className="w-full bg-background-light border-2 border-accent-cyan/50 rounded px-3 py-2 text-white focus:border-accent-cyan focus:outline-none"
                        />
                      </div>
                    )}
                    {issue.field === 'owner_email' && (
                      <div>
                        <label className="text-sm text-text-primary/80 block mb-1">Email:</label>
                        <input
                          type="email"
                          value={prospect.owner_email || ''}
                          onChange={(e) => handleFieldEdit(issue.index, 'owner_email', e.target.value)}
                          className="w-full bg-background-light border-2 border-accent-cyan/50 rounded px-3 py-2 text-white focus:border-accent-cyan focus:outline-none"
                        />
                      </div>
                    )}
                    {issue.field === 'location' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-sm text-text-primary/80 block mb-1">Town:</label>
                          <input
                            type="text"
                            value={prospect.town || ''}
                            onChange={(e) => handleFieldEdit(issue.index, 'town', e.target.value)}
                            className="w-full bg-background-light border-2 border-accent-cyan/50 rounded px-3 py-2 text-white focus:border-accent-cyan focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-text-primary/80 block mb-1">Postcode:</label>
                          <input
                            type="text"
                            value={prospect.postcode || ''}
                            onChange={(e) => handleFieldEdit(issue.index, 'postcode', e.target.value)}
                            className="w-full bg-background-light border-2 border-accent-cyan/50 rounded px-3 py-2 text-white focus:border-accent-cyan focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t-2 border-accent-cyan/30">
          <button
            onClick={() => setStep('upload')}
            className="px-6 py-2 bg-transparent border-2 border-text-primary/50 text-text-primary rounded-md font-bold hover:bg-text-primary/10"
          >
            BACK
          </button>
          <button
            onClick={proceedToConfirm}
            className="px-6 py-2 bg-accent-cyan border-2 border-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80"
          >
            <Check className="inline mr-2" size={18} />
            PROCEED {warnings.length > 0 && '(WITH WARNINGS)'}
          </button>
        </div>
      </div>
    );
  };

  const renderConfirmStep = () => (
    <div className="space-y-4">
      <div className="bg-accent-cyan/20 border-2 border-accent-cyan rounded-md p-4">
        <div className="flex items-center gap-2 text-accent-cyan font-bold mb-2">
          <Check size={24} />
          <span>READY TO UPLOAD</span>
        </div>
        <p className="text-text-primary/80">
          {editedData.length} prospect(s) will be uploaded and geocoded.
        </p>
      </div>

      <div className="border-2 border-accent-cyan rounded-md max-h-96 overflow-y-auto">
        <div className="bg-background-light p-3 border-b-2 border-accent-cyan sticky top-0">
          <h3 className="text-accent-cyan font-bold">FINAL DATA PREVIEW</h3>
        </div>
        <div className="p-4 space-y-2">
          {editedData.map((prospect, index) => (
            <div key={index} className="bg-background-light p-3 rounded border border-accent-cyan/30">
              <p className="text-white font-semibold">{prospect.address || prospect.reference || 'No address'}</p>
              <div className="text-sm text-text-primary/70 mt-1 grid grid-cols-2 gap-2">
                {prospect.town && <span>Town: {prospect.town}</span>}
                {prospect.postcode && <span>Postcode: {prospect.postcode}</span>}
                {prospect.price && <span>Price: €{prospect.price.toLocaleString()}</span>}
                {prospect.property_type && <span>Type: {prospect.property_type}</span>}
                {prospect.owner_name && <span>Owner: {prospect.owner_name}</span>}
                {prospect.current_agent && <span>Agent: {prospect.current_agent}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t-2 border-accent-cyan/30">
        <button
          onClick={() => setStep(validationIssues.length > 0 ? 'validate' : 'upload')}
          className="px-6 py-2 bg-transparent border-2 border-text-primary/50 text-text-primary rounded-md font-bold hover:bg-text-primary/10"
        >
          BACK
        </button>
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="px-6 py-2 bg-accent-yellow border-2 border-accent-yellow text-background-dark rounded-md font-bold hover:bg-accent-yellow/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="inline mr-2" size={18} />
          {isUploading ? 'GEOCODING...' : `UPLOAD ${editedData.length} PROSPECTS`}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background-dark border-2 border-accent-yellow rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-glow-yellow">
        <div className="sticky top-0 bg-background-dark border-b-2 border-accent-yellow p-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-accent-yellow">UPLOAD CSV DATA</h2>
            <div className="flex gap-2 mt-2">
              {['upload', 'validate', 'confirm'].map((s, idx) => (
                <div
                  key={s}
                  className={`text-xs px-3 py-1 rounded-full ${
                    step === s
                      ? 'bg-accent-yellow text-background-dark'
                      : s === 'validate' && validationIssues.length === 0
                      ? 'bg-gray-700 text-gray-500'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {idx + 1}. {s.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-accent-yellow hover:text-accent-magenta">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {step === 'upload' && renderUploadStep()}
          {step === 'validate' && renderValidationStep()}
          {step === 'confirm' && renderConfirmStep()}
        </div>
      </div>
    </div>
  );
}