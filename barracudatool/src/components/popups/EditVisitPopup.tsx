'use client';

import React, { useState, useEffect } from 'react';
import Popup from '../Popup';
import { createClient } from '@supabase/supabase-js';
import { Calendar, User, Loader2, CheckCircle, FileText } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface EditVisitPopupProps {
  isOpen: boolean;
  visitId: string | null;
  onClose: () => void;
  onVisitUpdated?: () => void;
}

interface VisitRecord {
  id: string;
  client_id: string;
  visit_start_date: string;
  visit_end_date: string;
  notes: string | null;
  color: string | null;
  clients: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const inputClass =
  'w-full bg-[#0d0d21] border border-[#00ffff] rounded p-3 text-white focus:outline-none focus:ring-1 focus:ring-[#ff00ff] placeholder-white/30';
const labelClass = 'text-xs font-bold text-[#00ffff] mb-1 uppercase tracking-wider block';

const VISIT_COLORS = ['#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff8800'];

export default function EditVisitPopup({
  isOpen,
  visitId,
  onClose,
  onVisitUpdated,
}: EditVisitPopupProps) {
  const [visit, setVisit] = useState<VisitRecord | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load visit when opened
  useEffect(() => {
    const fetchVisit = async () => {
      if (!isOpen || !visitId) return;
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('client_visits')
        .select(
          `
          id,
          client_id,
          visit_start_date,
          visit_end_date,
          notes,
          color,
          clients (
            first_name,
            last_name
          )
        `
        )
        .eq('id', visitId)
        .single();

      if (error) {
        console.error('Error loading visit', error);
        setError('Unable to load visit details.');
      } else if (data) {
        // Cast through unknown to satisfy TS about nested clients typing
        const v = data as unknown as VisitRecord;
        setVisit(v);
        setStartDate(v.visit_start_date);
        setEndDate(v.visit_end_date || v.visit_start_date);
        setNotes(v.notes || '');
        setColor(v.color || '#ff00ff');
      }

      setLoading(false);
    };

    fetchVisit();
  }, [isOpen, visitId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitId || !startDate) {
      setError('Please set at least a start date.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('client_visits')
        .update({
          visit_start_date: startDate,
          visit_end_date: endDate || startDate,
          notes,
          color,
        })
        .eq('id', visitId);

      if (error) throw error;

      if (onVisitUpdated) onVisitUpdated();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save changes.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popup
      isOpen={isOpen}
      onClose={onClose}
      title={
        visit
          ? `Edit Visit: ${visit.clients?.first_name || ''} ${visit.clients?.last_name || ''}`
          : 'Edit Visit'
      }
    >
      {loading ? (
        <div className="flex justify-center py-10 text-[#00ffff]">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSave}>
          {/* Client (read-only) */}
          <div>
            <label className={labelClass}>
              <User size={14} className="inline mr-1" />
              Client
            </label>
            <div className="w-full bg-[#0d0d21] border border-[#00ffff]/40 rounded p-3 text-white text-sm">
              {visit?.clients
                ? `${visit.clients.first_name || ''} ${visit.clients.last_name || ''}`.trim()
                : 'Unknown client'}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <Calendar size={14} className="inline mr-1" />
                Arrival
              </label>
              <input
                type="date"
                className={inputClass}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>
                <Calendar size={14} className="inline mr-1" />
                Departure
              </label>
              <input
                type="date"
                className={inputClass}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>
              <FileText size={14} className="inline mr-1" />
              Notes
            </label>
            <textarea
              className={inputClass}
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Purpose, specific requests, logistics..."
            />
          </div>

          {/* Color selector */}
          <div>
            <span className={labelClass}>Color Tag</span>
            <div className="flex gap-2 mt-1">
              {VISIT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border ${
                    color === c ? 'border-white ring-2 ring-white/50' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <div className="text-red-500 text-sm font-bold text-center">{error}</div>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#00ffff] text-black font-bold rounded uppercase hover:bg-[#00ffff]/80 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
            Save Changes
          </button>
        </form>
      )}
    </Popup>
  );
}
