'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, AlertTriangle, FileText, Trash2 } from 'lucide-react';
import { PropertyProspect } from '../types';
import ReviewEntryModal from '../components/ReviewEntryModal';

export default function ReviewQueuePage() {
  const router = useRouter();
  const [reviewQueue, setReviewQueue] = useState<Partial<PropertyProspect>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [validatedEntries, setValidatedEntries] = useState<Partial<PropertyProspect>[]>([]);
  const [skippedIndices, setSkippedIndices] = useState<number[]>([]);
  const [filename, setFilename] = useState('');
  const [uploadedAt, setUploadedAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load review queue from localStorage
    const stored = localStorage.getItem('csv_review_queue');
    if (stored) {
      const data = JSON.parse(stored);
      setReviewQueue(data.data || []);
      setFilename(data.filename || 'Unknown file');
      setUploadedAt(data.uploadedAt || '');
    } else {
      // No queue found, redirect back
      router.push('/gatherer/prospection');
    }
  }, [router]);

  const handleSaveEntry = (data: Partial<PropertyProspect>) => {
    setValidatedEntries([...validatedEntries, data]);
    setShowReviewModal(false);

    // Move to next entry
    if (currentIndex < reviewQueue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimeout(() => setShowReviewModal(true), 100);
    }
  };

  const handleSkipEntry = () => {
    setSkippedIndices([...skippedIndices, currentIndex]);
    setShowReviewModal(false);

    // Move to next entry
    if (currentIndex < reviewQueue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimeout(() => setShowReviewModal(true), 100);
    }
  };

  const handleReviewEntry = (index: number) => {
    setCurrentIndex(index);
    setShowReviewModal(true);
  };

  const handleSaveAll = async () => {
    if (validatedEntries.length === 0) {
      alert('No entries validated yet. Review and save at least one entry.');
      return;
    }

    if (!confirm(`Save ${validatedEntries.length} validated entries to your prospection database?`)) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/prospection/upload-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: validatedEntries }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save entries');
      }

      // Success!
      alert(`✅ Successfully saved ${result.success} prospects!`);

      // Clear review queue
      localStorage.removeItem('csv_review_queue');

      // Redirect back to main prospection page
      router.push('/gatherer/prospection');
    } catch (error) {
      console.error('Error saving entries:', error);
      alert('Failed to save entries: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearQueue = () => {
    if (!confirm('Clear the entire review queue? All unsaved changes will be lost.')) {
      return;
    }

    localStorage.removeItem('csv_review_queue');
    router.push('/gatherer/prospection');
  };

  const remainingEntries = reviewQueue.filter((_, idx) => 
    !validatedEntries.some((v, i) => i === idx) && !skippedIndices.includes(idx)
  );

  return (
    <div className="min-h-screen bg-background-dark text-text-primary">
      {/* Header */}
      <div className="border-b-2 border-accent-yellow bg-background-light/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/gatherer/prospection')}
                className="px-4 py-2 bg-transparent border-2 border-text-primary/50 text-text-primary rounded-md font-bold hover:bg-text-primary/10 transition-all"
              >
                <ArrowLeft className="inline mr-2" size={20} />
                BACK
              </button>
              <div>
                <h1 className="text-3xl font-bold text-accent-yellow [filter:drop-shadow(0_0_8px_#ffff00)]">
                  CSV REVIEW QUEUE
                </h1>
                <p className="text-text-primary/70 text-sm mt-1">
                  <FileText className="inline mr-1" size={14} />
                  {filename} • Uploaded {uploadedAt ? new Date(uploadedAt).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClearQueue}
                className="px-4 py-2 bg-transparent border-2 border-red-500 text-red-400 rounded-md font-bold hover:bg-red-900/30 transition-all"
              >
                <Trash2 className="inline mr-2" size={18} />
                CLEAR QUEUE
              </button>
              <button
                onClick={handleSaveAll}
                disabled={validatedEntries.length === 0 || isSaving}
                className="px-6 py-3 bg-accent-cyan border-2 border-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80 transition-all shadow-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="inline mr-2" size={20} />
                {isSaving ? 'SAVING...' : `SAVE ${validatedEntries.length} VALIDATED`}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-text-primary/80">
                Progress: {validatedEntries.length + skippedIndices.length}/{reviewQueue.length}
              </span>
              <div className="flex gap-6">
                <span className="text-green-400">✓ Validated: {validatedEntries.length}</span>
                <span className="text-red-400">⊗ Skipped: {skippedIndices.length}</span>
                <span className="text-yellow-400">⧗ Remaining: {remainingEntries.length}</span>
              </div>
            </div>
            <div className="w-full h-3 bg-background-light border-2 border-accent-cyan rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-cyan to-accent-magenta transition-all duration-500"
                style={{
                  width: `${((validatedEntries.length + skippedIndices.length) / reviewQueue.length) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {reviewQueue.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle size={48} className="text-accent-yellow mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-accent-yellow mb-2">NO REVIEW QUEUE</h2>
            <p className="text-text-primary/70">Upload a CSV file to start reviewing entries.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-w-5xl mx-auto">
            {reviewQueue.map((entry, index) => {
              const isValidated = validatedEntries.some((_, i) => i === index);
              const isSkipped = skippedIndices.includes(index);
              const isPending = !isValidated && !isSkipped;

              return (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    isValidated
                      ? 'border-green-500 bg-green-900/20'
                      : isSkipped
                      ? 'border-red-500 bg-red-900/20'
                      : 'border-accent-cyan bg-background-light'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-text-primary/60 font-mono text-sm">#{index + 1}</span>
                        {isValidated && (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-bold">
                            ✓ VALIDATED
                          </span>
                        )}
                        {isSkipped && (
                          <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full font-bold">
                            ⊗ SKIPPED
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2 py-1 bg-yellow-600 text-black text-xs rounded-full font-bold">
                            ⧗ PENDING
                          </span>
                        )}
                      </div>

                      <h3 className="text-white font-bold text-lg mb-2">
                        {entry.address || entry.reference || 'No address'}
                      </h3>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-text-primary/80">
                        {entry.town && (
                          <div>
                            <span className="text-text-primary/60">Town:</span> {entry.town}
                          </div>
                        )}
                        {entry.postcode && (
                          <div>
                            <span className="text-text-primary/60">Postcode:</span> {entry.postcode}
                          </div>
                        )}
                        {entry.price && (
                          <div>
                            <span className="text-text-primary/60">Price:</span> €{entry.price.toLocaleString()}
                          </div>
                        )}
                        {entry.property_type && (
                          <div>
                            <span className="text-text-primary/60">Type:</span> {entry.property_type}
                          </div>
                        )}
                        {entry.owner_name && (
                          <div>
                            <span className="text-text-primary/60">Owner:</span> {entry.owner_name}
                          </div>
                        )}
                        {entry.current_agent && (
                          <div>
                            <span className="text-text-primary/60">Agent:</span> {entry.current_agent}
                          </div>
                        )}
                      </div>

                      {/* Validation Warnings */}
                      {isPending && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!entry.address && (
                            <span className="px-2 py-1 bg-red-900/50 border border-red-500 text-red-300 text-xs rounded">
                              ⚠ Missing address
                            </span>
                          )}
                          {!entry.latitude && !entry.longitude && (
                            <span className="px-2 py-1 bg-yellow-900/50 border border-yellow-500 text-yellow-300 text-xs rounded">
                              ⚠ Not geocoded
                            </span>
                          )}
                          {entry.owner_email && !entry.owner_email.includes('@') && (
                            <span className="px-2 py-1 bg-yellow-900/50 border border-yellow-500 text-yellow-300 text-xs rounded">
                              ⚠ Invalid email
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {!isValidated && !isSkipped && (
                        <button
                          onClick={() => handleReviewEntry(index)}
                          className="px-4 py-2 bg-accent-cyan border-2 border-accent-cyan text-background-dark rounded-md font-bold hover:bg-accent-cyan/80 transition-all whitespace-nowrap"
                        >
                          REVIEW
                        </button>
                      )}
                      {isValidated && (
                        <button
                          onClick={() => handleReviewEntry(index)}
                          className="px-4 py-2 bg-transparent border-2 border-green-500 text-green-400 rounded-md font-bold hover:bg-green-900/30 transition-all whitespace-nowrap"
                        >
                          EDIT
                        </button>
                      )}
                      {isSkipped && (
                        <button
                          onClick={() => {
                            setSkippedIndices(skippedIndices.filter(i => i !== index));
                            handleReviewEntry(index);
                          }}
                          className="px-4 py-2 bg-transparent border-2 border-accent-yellow text-accent-yellow rounded-md font-bold hover:bg-accent-yellow/20 transition-all whitespace-nowrap"
                        >
                          RESTORE
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && reviewQueue[currentIndex] && (
        <ReviewEntryModal
          entry={reviewQueue[currentIndex]}
          entryNumber={currentIndex + 1}
          totalEntries={reviewQueue.length}
          onSave={handleSaveEntry}
          onSkip={handleSkipEntry}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
}
