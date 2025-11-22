'use client';

import React, { useState, useEffect, CSSProperties } from 'react';
import Popup from '../Popup';
import { CheckCircle, Loader2, Calendar, User, FileText } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CreateTaskPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void; // Callback to refresh the dashboard
}

interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
}

const styles: { [key: string]: CSSProperties } = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '0.8rem', color: '#00ffff', textTransform: 'uppercase', letterSpacing: '0.05em' },
  submitButton: { padding: '12px', backgroundColor: '#ff00ff', border: 'none', borderRadius: '5px', color: '#ffffff', fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '10px' },
  errorMsg: { color: '#ff4545', marginTop: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }
};

const inputClass = "w-full bg-[#0d0d21] border border-[#00ffff] rounded p-3 text-white focus:outline-none focus:ring-1 focus:ring-[#ff00ff] placeholder-white/30";

export default function CreateTaskPopup({ isOpen, onClose, onTaskCreated }: CreateTaskPopupProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [clientId, setClientId] = useState('');
  const [taskType, setTaskType] = useState('follow_up');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch clients when popup opens
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      setClientId('');
      setTaskType('follow_up');
      setDueDate('');
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
    if (!clientId || !dueDate) {
      setError('Please select a client and a due date.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('client_tasks')
        .insert([{
          client_id: clientId,
          task_type: taskType,
          status: 'pending',
          due_date: dueDate,
          notes: notes
        }]);

      if (insertError) throw insertError;

      if (onTaskCreated) onTaskCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Create New Task">
      <form style={styles.container} onSubmit={handleSubmit}>
        
        {/* Client Selector */}
        <div style={styles.formGroup}>
          <label style={styles.label}><User size={14} style={{display: 'inline', marginRight: '5px'}}/> Select Client</label>
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

        {/* Task Type */}
        <div style={styles.formGroup}>
          <label style={styles.label}><FileText size={14} style={{display: 'inline', marginRight: '5px'}}/> Task Type</label>
          <select className={inputClass} value={taskType} onChange={(e) => setTaskType(e.target.value)}>
            <option value="follow_up" className="bg-[#0d0d21]">General Follow-up</option>
            <option value="visit_prep" className="bg-[#0d0d21]">Visit Preparation</option>
            <option value="criteria_update" className="bg-[#0d0d21]">Update Criteria</option>
            <option value="admin" className="bg-[#0d0d21]">Admin / Paperwork</option>
          </select>
        </div>

        {/* Due Date */}
        <div style={styles.formGroup}>
          <label style={styles.label}><Calendar size={14} style={{display: 'inline', marginRight: '5px'}}/> Due Date</label>
          <input 
            type="date" 
            className={inputClass} 
            value={dueDate} 
            onChange={(e) => setDueDate(e.target.value)} 
          />
        </div>

        {/* Notes */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Notes / Instructions</label>
          <textarea 
            className={inputClass} 
            rows={3} 
            placeholder="e.g., Call to confirm arrival time..." 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
          />
        </div>

        {error && <div style={styles.errorMsg}>{error}</div>}

        <button type="submit" style={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
          Create Task
        </button>

      </form>
    </Popup>
  );
}
