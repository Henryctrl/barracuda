'use client';

import React, { useState, useEffect } from 'react';
import Popup from '../Popup';
import { Calendar, User, Loader2, CheckCircle, FileText } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CreateVisitPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onVisitCreated?: () => void;
}

interface ClientOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

const inputClass = "w-full bg-[#0d0d21] border border-[#00ffff] rounded p-3 text-white focus:outline-none focus:ring-1 focus:ring-[#ff00ff] placeholder-white/30";
const labelClass = "text-xs font-bold text-[#00ffff] mb-1 uppercase tracking-wider block";

export default function CreateVisitPopup({ isOpen, onClose, onVisitCreated }: CreateVisitPopupProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      setClientId('');
      setStartDate('');
      setEndDate('');
      setNotes('');
      setError('');
    }
  }, [isOpen]);

  const fetchClients = async () => {
    setLoadingClients(true);
    const { data, error } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .order('created_at', { ascending: false });
    
    if (error) console.error("Error fetching clients:", error);
    else setClients(data || []);
    setLoadingClients(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !startDate) {
      setError('Please select a client and a start date.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('client_visits')
        .insert([{
          client_id: clientId,
          visit_start_date: startDate,
          visit_end_date: endDate || startDate,
          notes: notes,
          color: '#ff00ff' // Default color
        }]);

      if (insertError) throw insertError;

      if (onVisitCreated) onVisitCreated();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create visit';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Log New Visit">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        
        {/* Client Selector */}
        <div>
          <label className={labelClass}><User size={14} className="inline mr-1"/> Select Client</label>
          <select 
            className={inputClass} 
            value={clientId} 
            onChange={(e) => setClientId(e.target.value)}
            disabled={loadingClients}
          >
            <option value="" className="bg-[#0d0d21]">Select a client...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id} className="bg-[#0d0d21]">
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}><Calendar size={14} className="inline mr-1"/> Arrival</label>
            <input 
              type="date" 
              className={inputClass} 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>
          <div>
            <label className={labelClass}><Calendar size={14} className="inline mr-1"/> Departure</label>
            <input 
              type="date" 
              className={inputClass} 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelClass}><FileText size={14} className="inline mr-1"/> Notes</label>
          <textarea 
            className={inputClass} 
            rows={3} 
            placeholder="Purpose of visit, accommodation details..." 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
          />
        </div>

        {error && <div className="text-red-500 text-sm font-bold text-center">{error}</div>}

        <button type="submit" className="w-full py-3 bg-[#ff00ff] text-white font-bold rounded uppercase flex items-center justify-center gap-2 hover:bg-[#ff00ff]/80 transition-all" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
          Log Visit
        </button>

      </form>
    </Popup>
  );
}
