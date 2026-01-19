'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface FailedEntry {
  row_number: number;
  data: any;
  errors: string[];
  failed_at: string;
}

interface FailedEntriesModalProps {
  onClose: () => void;
  onRetry: (entry: any) => void;
}

export default function FailedEntriesModal({ onClose, onRetry }: FailedEntriesModalProps) {
  const [failedEntries, setFailedEntries] = useState<FailedEntry[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('failed_csv_entries');
    if (stored) {
      setFailedEntries(JSON.parse(stored));
    }
  }, []);

  const handleClearAll = () => {
    if (confirm('Clear all failed entries? This cannot be undone.')) {
      localStorage.removeItem('failed_csv_entries');
      setFailedEntries([]);
    }
  };

  const handleRemoveEntry = (index: number) => {
    const updated = failedEntries.filter((_, i) => i !== index);
    setFailedEntries(updated);
    localStorage.setItem('failed_csv_entries', JSON.stringify(updated));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background-dark border-2 border-red-500 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-glow-red">
        <div className="sticky top-0 bg-background-dark border-b-2 border-red-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-500" />
            <div>
              <h2 className="text-2xl font-bold text-red-500">FAILED CSV ENTRIES</h2>
              <p className="text-text-primary/70 text-sm">{failedEntries.length} entries need attention</p>
            </div>
          </div>
          <button onClick={onClose} className="text-red-500 hover:text-red-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {failedEntries.length === 0 ? (
            <div className="text-center text-text-primary/70 py-8">
              No failed entries. All uploads successful! 🎉
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-2 px-4 py-2 bg-red-900/50 border border-red-500 text-red-400 rounded-md hover:bg-red-900/70"
                >
                  <Trash2 size={16} />
                  Clear All
                </button>
              </div>

              <div className="space-y-4">
                {failedEntries.map((entry, index) => (
                  <div key={index} className="bg-red-900/20 border-2 border-red-500/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-red-400 font-bold">Row {entry.row_number}</p>
                        <p className="text-xs text-text-primary/60">
                          Failed: {new Date(entry.failed_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveEntry(index)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="bg-background-dark/50 rounded p-3 mb-3">
                      <p className="text-white font-semibold mb-2">Data:</p>
                      <div className="text-sm text-text-primary/80 space-y-1">
                        {entry.data.address && <p>Address: {entry.data.address}</p>}
                        {entry.data.town && <p>Town: {entry.data.town}</p>}
                        {entry.data.price && <p>Price: €{entry.data.price}</p>}
                        {entry.data.owner_name && <p>Owner: {entry.data.owner_name}</p>}
                      </div>
                    </div>

                    <div className="bg-red-900/30 rounded p-3">
                      <p className="text-red-400 font-semibold mb-2">Errors:</p>
                      <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                        {entry.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => onRetry(entry.data)}
                      className="mt-3 w-full px-4 py-2 bg-accent-yellow border-2 border-accent-yellow text-background-dark rounded-md font-bold hover:bg-accent-yellow/80"
                    >
                      FIX & RETRY
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
