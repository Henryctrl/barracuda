'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Popup from '../Popup';
import ClientFormFields, { ClientFormData } from './ClientFormFields';
import MapCriteriaSelector from '../inputs/MapCriteriaSelector';
import { ArrowRight, ArrowLeft, Loader2, Save, AlertCircle, Plus, Trash2, Calendar, CheckSquare, Edit2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
interface Place {
  type: 'commune' | 'department' | 'region';
  code: string;
  name: string;
  center: [number, number];
}

interface RadiusSearch {
  place_code: string;
  place_name: string;
  center: [number, number];
  radius_km: number;
}

interface SearchCriteriaData {
  id?: number;
  minBudget: string; maxBudget: string; 
  selectedPlaces: Place[];
  radiusSearches: RadiusSearch[];
  customSectors: GeoJSON.FeatureCollection | null;
  propertyTypes: string[];
  minSurface: string; maxSurface: string; minRooms: string; minBedrooms: string;
  desiredDPE: string; features: string[]; notes: string;
}

interface Visit {
  id: string;
  visit_start_date: string;
  visit_end_date: string;
  notes: string | null;
  color: string | null;
}

interface Task {
  id: string;
  task_type: string;
  due_date: string;
  status: string;
  notes: string | null;
}

const inputClass = "w-full bg-[#0d0d21] border border-[#00ffff] rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-[#ff00ff] placeholder-white/30";
const labelClass = "text-xs font-bold text-[#00ffff] mb-1 uppercase tracking-wider";
const sectionHeaderClass = "text-[#ff00ff] text-lg font-bold border-b border-dashed border-[#ff00ff] pb-1 mb-4 uppercase";

const VISIT_COLORS = ['#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff8800'];

export default function EditClientPopup({ isOpen, onClose, clientId }: { isOpen: boolean, onClose: () => void, clientId: string }) {
  const [stage, setStage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Data states
  const [clientData, setClientData] = useState<ClientFormData>({ firstName: '', lastName: '', address: '', email: '', mobile: '', landline: '', dob: '', pob: '' });
  const [criteriaData, setCriteriaData] = useState<SearchCriteriaData>({
    minBudget: '', maxBudget: '', 
    selectedPlaces: [],
    radiusSearches: [],
    customSectors: null,
    propertyTypes: [],
    minSurface: '', maxSurface: '', minRooms: '', minBedrooms: '',
    desiredDPE: '', features: [], notes: ''
  });

  const [visits, setVisits] = useState<Visit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // New visit/task forms
  const [newVisit, setNewVisit] = useState({ start: '', end: '', notes: '', color: '#ff00ff' });
  const [newTask, setNewTask] = useState({ type: 'follow_up', due: '', notes: '' });

  const fetchClientData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch client + criteria
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*, client_search_criteria(*)')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      setClientData({
        firstName: client.first_name || '',
        lastName: client.last_name || '',
        address: client.address || '',
        email: client.email || '',
        mobile: client.mobile || '',
        landline: client.landline || '',
        dob: client.dob || '',
        pob: client.pob || ''
      });

      if (client.client_search_criteria && client.client_search_criteria.length > 0) {
        const c = client.client_search_criteria[0];
        setCriteriaData({
          id: c.id,
          minBudget: c.min_budget?.toString() || '',
          maxBudget: c.max_budget?.toString() || '',
          selectedPlaces: c.selected_places || [],
          radiusSearches: c.radius_searches || [],
          customSectors: c.custom_sectors || null,
          propertyTypes: c.property_types || [],
          minSurface: c.min_surface?.toString() || '',
          maxSurface: c.max_surface?.toString() || '',
          minRooms: c.min_rooms?.toString() || '',
          minBedrooms: c.min_bedrooms?.toString() || '',
          desiredDPE: c.desired_dpe || '',
          features: c.features || [],
          notes: c.notes || ''
        });
      }

      // Fetch visits
      const { data: visitsData } = await supabase
        .from('client_visits')
        .select('*')
        .eq('client_id', clientId)
        .order('visit_start_date', { ascending: true });
      
      setVisits(visitsData || []);

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('client_tasks')
        .select('*')
        .eq('client_id', clientId)
        .order('due_date', { ascending: true });
      
      setTasks(tasksData || []);

    } catch (err) {
      console.error(err);
      setError('Failed to load client data.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (isOpen && clientId) fetchClientData();
  }, [isOpen, clientId, fetchClientData]);

  const handleSave = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // Update Client Identity
      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({
          first_name: clientData.firstName,
          last_name: clientData.lastName,
          address: clientData.address,
          email: clientData.email,
          mobile: clientData.mobile,
          landline: clientData.landline,
          dob: clientData.dob || null,
          pob: clientData.pob
        })
        .eq('id', clientId);

      if (clientUpdateError) throw clientUpdateError;

      // Update Criteria
      const toNumber = (val: string) => (val === '' ? null : parseFloat(val));
      
      let locationMode = 'places';
      if (criteriaData.customSectors && criteriaData.customSectors.features.length > 0) {
        locationMode = 'sectors';
      } else if (criteriaData.radiusSearches.length > 0) {
        locationMode = 'radius';
      }
 
      const criteriaPayload = {
        client_id: clientId,
        min_budget: toNumber(criteriaData.minBudget),
        max_budget: toNumber(criteriaData.maxBudget),
        location_mode: locationMode,
        selected_places: criteriaData.selectedPlaces.length > 0 ? criteriaData.selectedPlaces : null,
        radius_searches: criteriaData.radiusSearches.length > 0 ? criteriaData.radiusSearches : null,
        custom_sectors: criteriaData.customSectors,
        locations: criteriaData.selectedPlaces.map(p => p.name).join(', ') || null,
        property_types: criteriaData.propertyTypes,
        min_surface: toNumber(criteriaData.minSurface),
        max_surface: toNumber(criteriaData.maxSurface),
        min_rooms: toNumber(criteriaData.minRooms),
        min_bedrooms: toNumber(criteriaData.minBedrooms),
        desired_dpe: criteriaData.desiredDPE || null,
        features: criteriaData.features,
        notes: criteriaData.notes
      };

      if (criteriaData.id) {
        const { error: critError } = await supabase
          .from('client_search_criteria')
          .update(criteriaPayload)
          .eq('id', criteriaData.id);
        if (critError) throw critError;
      } else {
        const { error: critError } = await supabase
          .from('client_search_criteria')
          .insert([criteriaPayload]);
        if (critError) throw critError;
      }

      alert('✅ Client updated successfully!');
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCriteria = (field: keyof SearchCriteriaData, value: unknown) => {
    setCriteriaData(prev => ({ ...prev, [field]: value }));
  };
  
  const toggleCheckbox = (field: 'propertyTypes' | 'features', value: string) => {
    setCriteriaData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(i => i !== value) 
        : [...prev[field], value]
    }));
  };

  // Visit handlers
  const addVisit = async () => {
    if (!newVisit.start) return;
    const { error } = await supabase.from('client_visits').insert([{
      client_id: clientId,
      visit_start_date: newVisit.start,
      visit_end_date: newVisit.end || newVisit.start,
      notes: newVisit.notes,
      color: newVisit.color
    }]);
    if (!error) {
      setNewVisit({ start: '', end: '', notes: '', color: '#ff00ff' });
      fetchClientData();
    }
  };

  const deleteVisit = async (visitId: string) => {
    await supabase.from('client_visits').delete().eq('id', visitId);
    fetchClientData();
  };

  // Task handlers
  const addTask = async () => {
    if (!newTask.due) return;
    const { error } = await supabase.from('client_tasks').insert([{
      client_id: clientId,
      task_type: newTask.type,
      due_date: newTask.due,
      status: 'pending',
      notes: newTask.notes
    }]);
    if (!error) {
      setNewTask({ type: 'follow_up', due: '', notes: '' });
      fetchClientData();
    }
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from('client_tasks').delete().eq('id', taskId);
    fetchClientData();
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    await supabase.from('client_tasks').update({ status: newStatus }).eq('id', taskId);
    fetchClientData();
  };

  const propertyTypes = ['Apartment', 'House/Villa', 'Mansion (Hôtel Particulier)', 'Castle (Château)', 'Loft/Atelier', 'Building (Immeuble)', 'Land (Terrain)'];
  const featuresList = ['Elevator (Ascenseur)', 'Balcony', 'Terrace', 'Garden (Jardin)', 'Parking', 'Garage', 'Cellar (Cave)', 'Haussmannian (Parquet/Moulures)', 'Fireplace', 'Top Floor', 'Ground Floor Garden', 'Sea View', 'Renovated (Refait à neuf)', 'Works Needed (Travaux)', 'Quiet (Calme)'];

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Edit Client File">
      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#00ffff]" size={40} /></div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* STAGE TABS */}
          <div className="flex border-b border-[#00ffff]/30 pb-2 gap-4 justify-center flex-wrap">
            <button onClick={() => setStage(1)} className={`uppercase font-bold text-xs ${stage === 1 ? 'text-[#ff00ff] border-b-2 border-[#ff00ff]' : 'text-[#00ffff] opacity-50'}`}>1. Identity</button>
            <button onClick={() => setStage(2)} className={`uppercase font-bold text-xs ${stage === 2 ? 'text-[#ff00ff] border-b-2 border-[#ff00ff]' : 'text-[#00ffff] opacity-50'}`}>2. Criteria</button>
            <button onClick={() => setStage(3)} className={`uppercase font-bold text-xs ${stage === 3 ? 'text-[#ff00ff] border-b-2 border-[#ff00ff]' : 'text-[#00ffff] opacity-50'}`}>3. Visits</button>
            <button onClick={() => setStage(4)} className={`uppercase font-bold text-xs ${stage === 4 ? 'text-[#ff00ff] border-b-2 border-[#ff00ff]' : 'text-[#00ffff] opacity-50'}`}>4. Tasks</button>
          </div>

          {/* STAGE 1: IDENTITY */}
          {stage === 1 && (
            <div className="animate-in fade-in">
              <ClientFormFields 
                data={clientData} 
                onChange={(field, val) => setClientData(prev => ({ ...prev, [field]: val }))} 
              />
            </div>
          )}

          {/* STAGE 2: CRITERIA */}
          {stage === 2 && (
            <div className="flex flex-col gap-6 animate-in fade-in">
              <div>
                <div className={sectionHeaderClass}>Budget</div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Min (€)</label><input type="number" className={inputClass} value={criteriaData.minBudget} onChange={e => updateCriteria('minBudget', e.target.value)} /></div>
                  <div><label className={labelClass}>Max (€)</label><input type="number" className={inputClass} value={criteriaData.maxBudget} onChange={e => updateCriteria('maxBudget', e.target.value)} /></div>
                </div>
              </div>

              <div>
                <div className={sectionHeaderClass}>Location Criteria</div>
                <MapCriteriaSelector
                  selectedPlaces={criteriaData.selectedPlaces}
                  radiusSearches={criteriaData.radiusSearches}
                  customSectors={criteriaData.customSectors}
                  onPlacesChange={(places) => updateCriteria('selectedPlaces', places)}
                  onRadiusChange={(radius) => updateCriteria('radiusSearches', radius)}
                  onSectorsChange={(sectors) => updateCriteria('customSectors', sectors)}
                />
              </div>

              <div>
                <div className={sectionHeaderClass}>Specs</div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Min Surface</label><input type="number" className={inputClass} value={criteriaData.minSurface} onChange={e => updateCriteria('minSurface', e.target.value)} /></div>
                  <div><label className={labelClass}>Max Surface</label><input type="number" className={inputClass} value={criteriaData.maxSurface} onChange={e => updateCriteria('maxSurface', e.target.value)} /></div>
                  <div><label className={labelClass}>Min Rooms</label><input type="number" className={inputClass} value={criteriaData.minRooms} onChange={e => updateCriteria('minRooms', e.target.value)} /></div>
                  <div><label className={labelClass}>Min Bedrooms</label><input type="number" className={inputClass} value={criteriaData.minBedrooms} onChange={e => updateCriteria('minBedrooms', e.target.value)} /></div>
                </div>
              </div>

              <div>
                <div className={sectionHeaderClass}>Features</div>
                <div className="flex flex-wrap gap-2 mb-4">{propertyTypes.map(type => <label key={type} className={`flex items-center px-3 py-1 border rounded cursor-pointer text-xs ${criteriaData.propertyTypes.includes(type) ? 'bg-[#ff00ff]/20 border-[#ff00ff]' : 'border-gray-600 hover:border-[#ff00ff]'}`}><input type="checkbox" className="hidden" checked={criteriaData.propertyTypes.includes(type)} onChange={() => toggleCheckbox('propertyTypes', type)} /> {type}</label>)}</div>
                <div className="grid grid-cols-2 gap-2">{featuresList.map(feature => <label key={feature} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="accent-[#ff00ff]" checked={criteriaData.features.includes(feature)} onChange={() => toggleCheckbox('features', feature)} /> {feature}</label>)}</div>
              </div>
            </div>
          )}

          {/* STAGE 3: VISITS */}
          {stage === 3 && (
            <div className="flex flex-col gap-4">
              <div className={sectionHeaderClass}><Calendar size={18} className="inline mr-2"/>Manage Visits</div>
              
              {/* Add New Visit */}
              <div className="bg-[#00ffff]/5 border border-[#00ffff] rounded p-4">
                <div className="text-sm font-bold text-[#00ffff] mb-3 uppercase">Add New Visit</div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div><label className={labelClass}>Start Date</label><input type="date" className={inputClass} value={newVisit.start} onChange={e => setNewVisit({...newVisit, start: e.target.value})} /></div>
                  <div><label className={labelClass}>End Date</label><input type="date" className={inputClass} value={newVisit.end} onChange={e => setNewVisit({...newVisit, end: e.target.value})} /></div>
                </div>
                <div className="mb-3"><label className={labelClass}>Notes</label><textarea className={inputClass} rows={2} value={newVisit.notes} onChange={e => setNewVisit({...newVisit, notes: e.target.value})} /></div>
                <div className="mb-3">
                  <label className={labelClass}>Color</label>
                  <div className="flex gap-2">
                    {VISIT_COLORS.map(c => (
                      <button key={c} onClick={() => setNewVisit({...newVisit, color: c})} className={`w-8 h-8 rounded-full border-2 ${newVisit.color === c ? 'border-white ring-2 ring-white/50' : 'border-transparent'}`} style={{backgroundColor: c}} />
                    ))}
                  </div>
                </div>
                <button onClick={addVisit} className="w-full py-2 bg-[#00ffff] text-black font-bold rounded uppercase text-sm hover:bg-[#00ffff]/80"><Plus size={14} className="inline mr-1"/>Add Visit</button>
              </div>

              {/* Existing Visits */}
              <div className="space-y-2">
                {visits.map(v => (
                  <div key={v.id} className="bg-[#020222] border border-[#00ffff]/30 rounded p-3 flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white mb-1">{new Date(v.visit_start_date).toLocaleDateString()} → {new Date(v.visit_end_date).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">{v.notes || 'No notes'}</div>
                      <div className="w-4 h-4 rounded-full mt-2" style={{backgroundColor: v.color || '#ff00ff'}}></div>
                    </div>
                    <button onClick={() => deleteVisit(v.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button>
                  </div>
                ))}
                {visits.length === 0 && <div className="text-gray-500 text-sm italic">No visits scheduled</div>}
              </div>
            </div>
          )}

          {/* STAGE 4: TASKS */}
          {stage === 4 && (
            <div className="flex flex-col gap-4">
              <div className={sectionHeaderClass}><CheckSquare size={18} className="inline mr-2"/>Manage Tasks</div>
              
              {/* Add New Task */}
              <div className="bg-[#ff00ff]/5 border border-[#ff00ff] rounded p-4">
                <div className="text-sm font-bold text-[#ff00ff] mb-3 uppercase">Add New Task</div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>Type</label>
                    <select className={inputClass} value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value})}>
                      <option value="follow_up">Follow Up Call</option>
                      <option value="email">Send Email</option>
                      <option value="meeting">Schedule Meeting</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Due Date</label><input type="date" className={inputClass} value={newTask.due} onChange={e => setNewTask({...newTask, due: e.target.value})} /></div>
                </div>
                <div className="mb-3"><label className={labelClass}>Notes</label><textarea className={inputClass} rows={2} value={newTask.notes} onChange={e => setNewTask({...newTask, notes: e.target.value})} /></div>
                <button onClick={addTask} className="w-full py-2 bg-[#ff00ff] text-white font-bold rounded uppercase text-sm hover:bg-[#ff00ff]/80"><Plus size={14} className="inline mr-1"/>Add Task</button>
              </div>

              {/* Existing Tasks */}
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className={`bg-[#020222] border rounded p-3 flex justify-between items-start ${t.status === 'done' ? 'border-green-500/30 opacity-60' : 'border-[#ff00ff]/30'}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <input type="checkbox" checked={t.status === 'done'} onChange={() => toggleTaskStatus(t.id, t.status)} className="accent-[#00ff00]" />
                        <div className="text-sm font-bold text-white">{t.task_type === 'follow_up' ? 'Follow Up Call' : t.task_type}</div>
                        <span className="text-xs text-gray-400">Due: {new Date(t.due_date).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-gray-400 ml-6">{t.notes || 'No notes'}</div>
                    </div>
                    <button onClick={() => deleteTask(t.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button>
                  </div>
                ))}
                {tasks.length === 0 && <div className="text-gray-500 text-sm italic">No tasks created</div>}
              </div>
            </div>
          )}

          {error && <div className="text-red-500 font-bold text-center flex items-center justify-center gap-2"><AlertCircle size={16}/> {error}</div>}

          {/* NAVIGATION */}
          <div className="flex justify-between mt-4">
            {stage > 1 ? (
              <button onClick={() => setStage(stage - 1)} className="flex items-center gap-2 text-[#00ffff] border border-[#00ffff] px-4 py-2 rounded uppercase hover:bg-[#00ffff]/10"><ArrowLeft size={16} /> Back</button>
            ) : <div></div>}
            
            {stage < 4 ? (
              <button onClick={() => setStage(stage + 1)} className="flex items-center gap-2 bg-[#00ffff] text-black px-6 py-2 rounded uppercase font-bold hover:bg-[#00ffff]/80">Next <ArrowRight size={16} /></button>
            ) : (
              <button onClick={handleSave} disabled={isSubmitting} className="flex items-center gap-2 bg-[#ff00ff] text-white px-6 py-2 rounded uppercase font-bold hover:bg-[#ff00ff]/80 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={18} />} Save All Changes
              </button>
            )}
          </div>
        </div>
      )}
    </Popup>
  );
}
