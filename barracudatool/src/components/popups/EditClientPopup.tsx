'use client';

import React, { useState, useEffect, CSSProperties } from 'react';
import Popup from '../Popup';
import ClientFormFields, { ClientFormData } from './ClientFormFields';
import LocationSelector from '../inputs/LocationSelector';
import { User, Save, Loader2, Calendar, CheckCircle, Plus, Trash2, Clock, Mail, CheckSquare } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface EditClientPopupProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
}

// --- Data Interfaces ---
interface SearchCriteriaData {
  minBudget: string; maxBudget: string; locations: string; propertyTypes: string[];
  minSurface: string; maxSurface: string; minRooms: string; minBedrooms: string;
  desiredDPE: string; features: string[]; notes: string;
  circleCenterLabel: string; circleCenterLat: number | null; circleCenterLon: number | null; circleRadiusKm: number;
}

interface VisitData {
  id: string;
  visit_start_date: string;
  visit_end_date: string;
  notes: string;
}

interface TaskData {
  id: string;
  task_type: string;
  status: string;
  due_date: string;
  notes: string;
}

// --- Styles ---
const inputClass = "w-full bg-[#0d0d21] border border-[#00ffff] rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-[#ff00ff] placeholder-white/30";
const labelClass = "text-xs font-bold text-[#00ffff] mb-1 uppercase tracking-wider";
const sectionHeaderClass = "text-[#ff00ff] text-lg font-bold border-b border-dashed border-[#ff00ff] pb-1 mb-4 uppercase";
const tabClass = (active: boolean) => `px-4 py-2 font-bold uppercase text-sm transition-all border-b-2 ${active ? 'text-[#ff00ff] border-[#ff00ff]' : 'text-gray-500 border-transparent hover:text-[#00ffff]'}`;

export default function EditClientPopup({ isOpen, onClose, clientId }: EditClientPopupProps) {
  const [activeTab, setActiveTab] = useState<'identity' | 'criteria' | 'visits' | 'tasks'>('identity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Data State ---
  const [clientData, setClientData] = useState<ClientFormData>({ firstName: '', lastName: '', address: '', email: '', mobile: '', landline: '', dob: '', pob: '' });
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteriaData>({ 
    minBudget: '', maxBudget: '', locations: '', propertyTypes: [], minSurface: '', maxSurface: '', minRooms: '', minBedrooms: '', 
    desiredDPE: '', features: [], notes: '', circleCenterLabel: '', circleCenterLat: null, circleCenterLon: null, circleRadiusKm: 25 
  });
  const [visits, setVisits] = useState<VisitData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);

  // --- New Item State (for adding inside tabs) ---
  const [newVisit, setNewVisit] = useState({ start: '', end: '', notes: '' });
  const [newTask, setNewTask] = useState({ type: 'follow_up', due: '', notes: '' });

  useEffect(() => {
    if (isOpen && clientId) fetchAllData();
  }, [isOpen, clientId]);

  const fetchAllData = async () => {
    setLoading(true);
    
    // 1. Client Info
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    if (client) {
      setClientData({
        firstName: client.first_name || '', lastName: client.last_name || '', address: client.address || '',
        email: client.email || '', mobile: client.mobile || '', landline: client.landline || '', dob: client.dob || '', pob: client.pob || ''
      });
    }

    // 2. Criteria
    const { data: criteria } = await supabase.from('client_search_criteria').select('*').eq('client_id', clientId).single();
    if (criteria) {
      setSearchCriteria({
        minBudget: criteria.min_budget || '', maxBudget: criteria.max_budget || '', locations: criteria.locations || '',
        propertyTypes: criteria.property_types || [], minSurface: criteria.min_surface || '', maxSurface: criteria.max_surface || '',
        minRooms: criteria.min_rooms || '', minBedrooms: criteria.min_bedrooms || '', desiredDPE: criteria.desired_dpe || '',
        features: criteria.features || [], notes: criteria.notes || '',
        circleCenterLabel: criteria.circle_center_label || '', circleCenterLat: criteria.circle_center_lat, 
        circleCenterLon: criteria.circle_center_lon, circleRadiusKm: criteria.circle_radius_km || 25
      });
    }

    // 3. Visits
    const { data: visitData } = await supabase.from('client_visits').select('*').eq('client_id', clientId).order('visit_start_date', { ascending: false });
    setVisits(visitData || []);

    // 4. Tasks
    const { data: taskData } = await supabase.from('client_tasks').select('*').eq('client_id', clientId).order('due_date', { ascending: true });
    setTasks(taskData || []);

    setLoading(false);
  };

  // --- Update Handlers ---
  const updateClient = (f: keyof ClientFormData, v: string) => setClientData(p => ({ ...p, [f]: v }));
  const updateCriteria = (f: keyof SearchCriteriaData, v: any) => setSearchCriteria(p => ({ ...p, [f]: v }));
  const toggleCheckbox = (f: 'propertyTypes' | 'features', v: string) => setSearchCriteria(p => ({ ...p, [f]: p[f].includes(v) ? p[f].filter(i => i !== v) : [...p[f], v] }));

  // --- Save Main Data ---
  const handleSaveMain = async () => {
    setSaving(true);
    await supabase.from('clients').update({
      first_name: clientData.firstName, last_name: clientData.lastName, address: clientData.address,
      email: clientData.email, mobile: clientData.mobile, landline: clientData.landline, dob: clientData.dob || null, pob: clientData.pob
    }).eq('id', clientId);

    await supabase.from('client_search_criteria').upsert({
      client_id: clientId, min_budget: searchCriteria.minBudget || null, max_budget: searchCriteria.maxBudget || null,
      locations: searchCriteria.locations, property_types: searchCriteria.propertyTypes,
      min_surface: searchCriteria.minSurface || null, max_surface: searchCriteria.maxSurface || null,
      min_rooms: searchCriteria.minRooms || null, min_bedrooms: searchCriteria.minBedrooms || null, desired_dpe: searchCriteria.desiredDPE || null,
      features: searchCriteria.features, notes: searchCriteria.notes,
      circle_center_label: searchCriteria.circleCenterLabel, circle_center_lat: searchCriteria.circleCenterLat,
      circle_center_lon: searchCriteria.circleCenterLon, circle_radius_km: searchCriteria.circleRadiusKm
    }, { onConflict: 'client_id' });

    setSaving(false);
    onClose();
  };

  // --- Sub-Item Handlers (Visits/Tasks) ---
  const addVisit = async () => {
    if (!newVisit.start) return;
    const { data, error } = await supabase.from('client_visits').insert([{
      client_id: clientId, visit_start_date: newVisit.start, visit_end_date: newVisit.end || newVisit.start, notes: newVisit.notes
    }]).select().single();
    if (data) { setVisits([data, ...visits]); setNewVisit({ start: '', end: '', notes: '' }); }
  };

  const deleteVisit = async (id: string) => {
    await supabase.from('client_visits').delete().eq('id', id);
    setVisits(visits.filter(v => v.id !== id));
  };

  const addTask = async () => {
    if (!newTask.due) return;
    const { data } = await supabase.from('client_tasks').insert([{
      client_id: clientId, task_type: newTask.type, due_date: newTask.due, notes: newTask.notes, status: 'pending'
    }]).select().single();
    if (data) { setTasks([...tasks, data].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())); setNewTask({ type: 'follow_up', due: '', notes: '' }); }
  };

  const toggleTaskStatus = async (task: TaskData) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    await supabase.from('client_tasks').update({ status: newStatus }).eq('id', task.id);
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  // --- Constants ---
  const propertyTypes = ['Apartment', 'House/Villa', 'Mansion', 'Castle', 'Loft', 'Building', 'Land'];
  const featuresList = ['Elevator', 'Balcony', 'Terrace', 'Garden', 'Parking', 'Garage', 'Sea View', 'Renovated', 'Quiet'];
  const dpeRatings = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  if (loading) return <Popup isOpen={isOpen} onClose={onClose} title="Loading..."><div className="flex justify-center p-10 text-[#00ffff]"><Loader2 className="animate-spin" size={48} /></div></Popup>;

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Edit Client">
      <div className="flex flex-col gap-4 min-h-[60vh]">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#00ffff]/30">
          <button onClick={() => setActiveTab('identity')} className={tabClass(activeTab === 'identity')}>Identity</button>
          <button onClick={() => setActiveTab('criteria')} className={tabClass(activeTab === 'criteria')}>Criteria</button>
          <button onClick={() => setActiveTab('visits')} className={tabClass(activeTab === 'visits')}>Visits ({visits.length})</button>
          <button onClick={() => setActiveTab('tasks')} className={tabClass(activeTab === 'tasks')}>Tasks ({tasks.filter(t => t.status !== 'done').length})</button>
        </div>

        {/* CONTENT: IDENTITY */}
        {activeTab === 'identity' && (
          <div className="animate-in fade-in">
            <div className={sectionHeaderClass}>Personal Details</div>
            <ClientFormFields data={clientData} onChange={updateClient} />
          </div>
        )}

        {/* CONTENT: CRITERIA */}
        {activeTab === 'criteria' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
            <div className="md:col-span-2"><label className={labelClass}>Locations</label><LocationSelector value={searchCriteria.locations} onChange={v => updateCriteria('locations', v)} /></div>
            <div><label className={labelClass}>Min Budget</label><input type="number" className={inputClass} value={searchCriteria.minBudget} onChange={e => updateCriteria('minBudget', e.target.value)} /></div>
            <div><label className={labelClass}>Max Budget</label><input type="number" className={inputClass} value={searchCriteria.maxBudget} onChange={e => updateCriteria('maxBudget', e.target.value)} /></div>
            
            <div className="md:col-span-2 className={sectionHeaderClass} mt-4">Specs</div>
            <div><label className={labelClass}>Min Surface</label><input type="number" className={inputClass} value={searchCriteria.minSurface} onChange={e => updateCriteria('minSurface', e.target.value)} /></div>
            <div><label className={labelClass}>Min Rooms</label><input type="number" className={inputClass} value={searchCriteria.minRooms} onChange={e => updateCriteria('minRooms', e.target.value)} /></div>
            <div><label className={labelClass}>Min Bedrooms</label><input type="number" className={inputClass} value={searchCriteria.minBedrooms} onChange={e => updateCriteria('minBedrooms', e.target.value)} /></div>
            <div><label className={labelClass}>DPE Rating</label><select className={inputClass} value={searchCriteria.desiredDPE} onChange={e => updateCriteria('desiredDPE', e.target.value)}><option value="" className="bg-[#0d0d21]">Any</option>{dpeRatings.map(r => <option key={r} value={r} className="bg-[#0d0d21]">{r}+</option>)}</select></div>
            
            <div className="md:col-span-2 className={sectionHeaderClass} mt-4">Types & Features</div>
            <div className="md:col-span-2 flex flex-wrap gap-2">{propertyTypes.map(t => <label key={t} className={`px-2 py-1 border text-xs cursor-pointer rounded ${searchCriteria.propertyTypes.includes(t) ? 'bg-[#ff00ff]/20 border-[#ff00ff]' : 'border-gray-600'}`}><input type="checkbox" className="hidden" checked={searchCriteria.propertyTypes.includes(t)} onChange={() => toggleCheckbox('propertyTypes', t)} /> {t}</label>)}</div>
            <div className="md:col-span-2 flex flex-wrap gap-4 mt-2">{featuresList.map(f => <label key={f} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#ff00ff]" checked={searchCriteria.features.includes(f)} onChange={() => toggleCheckbox('features', f)} /> {f}</label>)}</div>
          </div>
        )}

        {/* CONTENT: VISITS */}
        {activeTab === 'visits' && (
          <div className="animate-in fade-in">
            {/* Add New Visit */}
            <div className="p-4 border border-[#00ffff]/30 rounded bg-[#00ffff]/5 mb-4 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div><label className={labelClass}>Start Date</label><input type="date" className={inputClass} value={newVisit.start} onChange={e => setNewVisit({...newVisit, start: e.target.value})} /></div>
              <div><label className={labelClass}>End Date</label><input type="date" className={inputClass} value={newVisit.end} onChange={e => setNewVisit({...newVisit, end: e.target.value})} /></div>
              <button onClick={addVisit} className="h-[42px] bg-[#00ffff]/20 border border-[#00ffff] text-[#00ffff] font-bold rounded hover:bg-[#00ffff]/40 flex items-center justify-center gap-2"><Plus size={16}/> Add Visit</button>
              <div className="md:col-span-3"><input type="text" placeholder="Notes..." className={inputClass} value={newVisit.notes} onChange={e => setNewVisit({...newVisit, notes: e.target.value})} /></div>
            </div>
            {/* List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {visits.map(v => (
                <div key={v.id} className="flex justify-between items-center p-3 bg-[#0d0d21] border border-[#00ffff]/20 rounded">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2"><Calendar size={14} className="text-[#ff00ff]" /> {new Date(v.visit_start_date).toLocaleDateString()} - {new Date(v.visit_end_date).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-400">{v.notes || 'No notes'}</div>
                  </div>
                  <button onClick={() => deleteVisit(v.id)} className="text-red-400 hover:text-red-200"><Trash2 size={16} /></button>
                </div>
              ))}
              {visits.length === 0 && <div className="text-center text-gray-500 italic p-4">No visits recorded.</div>}
            </div>
          </div>
        )}

        {/* CONTENT: TASKS */}
        {activeTab === 'tasks' && (
          <div className="animate-in fade-in">
            {/* Add New Task */}
            <div className="p-4 border border-[#ff00ff]/30 rounded bg-[#ff00ff]/5 mb-4 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div><label className={labelClass}>Task Type</label><select className={inputClass} value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value})}><option value="follow_up">Follow Up</option><option value="admin">Admin</option><option value="prep">Visit Prep</option></select></div>
              <div><label className={labelClass}>Due Date</label><input type="date" className={inputClass} value={newTask.due} onChange={e => setNewTask({...newTask, due: e.target.value})} /></div>
              <button onClick={addTask} className="h-[42px] bg-[#ff00ff]/20 border border-[#ff00ff] text-[#ff00ff] font-bold rounded hover:bg-[#ff00ff]/40 flex items-center justify-center gap-2"><Plus size={16}/> Add Task</button>
              <div className="md:col-span-3"><input type="text" placeholder="Task details..." className={inputClass} value={newTask.notes} onChange={e => setNewTask({...newTask, notes: e.target.value})} /></div>
            </div>
            {/* List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {tasks.map(t => (
                <div key={t.id} className={`flex justify-between items-center p-3 border rounded ${t.status === 'done' ? 'bg-[#00ff00]/10 border-[#00ff00]/30 opacity-60' : 'bg-[#0d0d21] border-[#ff00ff]/20'}`}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleTaskStatus(t)} className={t.status === 'done' ? 'text-[#00ff00]' : 'text-gray-500 hover:text-white'}><CheckSquare size={20} /></button>
                    <div>
                      <div className={`font-bold flex items-center gap-2 ${t.status === 'done' ? 'text-[#00ff00] line-through' : 'text-white'}`}>
                        {t.task_type === 'follow_up' && <Mail size={14} />}
                        {t.task_type === 'admin' && <CheckCircle size={14} />}
                        {t.task_type === 'prep' && <Clock size={14} />}
                        {new Date(t.due_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400">{t.notes}</div>
                    </div>
                  </div>
                  <div className="text-xs uppercase font-bold tracking-wider text-gray-600">{t.status}</div>
                </div>
              ))}
              {tasks.length === 0 && <div className="text-center text-gray-500 italic p-4">No tasks pending.</div>}
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end border-t border-[#00ffff]/30 pt-4 mt-2">
          <button onClick={handleSaveMain} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-[#ff00ff] text-white font-bold rounded hover:bg-[#ff00ff]/80 transition-all">
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Save All Changes
          </button>
        </div>
      </div>
    </Popup>
  );
}
