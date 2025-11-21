'use client';

import React, { useState, useEffect, CSSProperties } from 'react';
import Popup from '../Popup';
import ClientFormFields, { ClientFormData } from './ClientFormFields';
import { ArrowRight, ArrowLeft, CheckCircle, Loader2, Save } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface EditClientPopupProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
}

interface SearchCriteriaData {
  minBudget: string; maxBudget: string; locations: string; propertyTypes: string[];
  minSurface: string; maxSurface: string; minRooms: string; minBedrooms: string;
  desiredDPE: string; features: string[]; notes: string;
}

// Tailwind Classes
const inputClass = "w-full bg-[#0d0d21] border border-[#00ffff] rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-[#ff00ff] placeholder-white/30";
const labelClass = "text-xs font-bold text-[#00ffff] mb-1 uppercase tracking-wider";
const sectionHeaderClass = "text-[#ff00ff] text-lg font-bold border-b border-dashed border-[#ff00ff] pb-1 mb-4 uppercase";

export default function EditClientPopup({ isOpen, onClose, clientId }: EditClientPopupProps) {
  const [stage, setStage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [clientData, setClientData] = useState<ClientFormData>({ firstName: '', lastName: '', address: '', email: '', mobile: '', landline: '', dob: '', pob: '' });
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteriaData>({ minBudget: '', maxBudget: '', locations: '', propertyTypes: [], minSurface: '', maxSurface: '', minRooms: '', minBedrooms: '', desiredDPE: '', features: [], notes: '' });

  useEffect(() => {
    if (isOpen && clientId) fetchClientData();
  }, [isOpen, clientId]);

  const fetchClientData = async () => {
    setLoading(true);
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    if (client) {
      setClientData({
        firstName: client.first_name || '', lastName: client.last_name || '', address: client.address || '',
        email: client.email || '', mobile: client.mobile || '', landline: client.landline || '', dob: client.dob || '', pob: client.pob || ''
      });
    }
    const { data: criteria } = await supabase.from('client_search_criteria').select('*').eq('client_id', clientId).single();
    if (criteria) {
      setSearchCriteria({
        minBudget: criteria.min_budget || '', maxBudget: criteria.max_budget || '', locations: criteria.locations || '',
        propertyTypes: criteria.property_types || [], minSurface: criteria.min_surface || '', maxSurface: criteria.max_surface || '',
        minRooms: criteria.min_rooms || '', minBedrooms: criteria.min_bedrooms || '', desiredDPE: criteria.desired_dpe || '',
        features: criteria.features || [], notes: criteria.notes || ''
      });
    }
    setLoading(false);
  };

  const updateClientData = (field: keyof ClientFormData, value: string) => setClientData(prev => ({ ...prev, [field]: value }));
  const updateSearchCriteria = (field: keyof SearchCriteriaData, value: any) => setSearchCriteria(prev => ({ ...prev, [field]: value }));
  const toggleCheckbox = (field: 'propertyTypes' | 'features', value: string) => {
    setSearchCriteria(prev => {
      const list = prev[field];
      return { ...prev, [field]: list.includes(value) ? list.filter(i => i !== value) : [...list, value] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('clients').update({
      first_name: clientData.firstName, last_name: clientData.lastName, address: clientData.address,
      email: clientData.email, mobile: clientData.mobile, landline: clientData.landline,
      dob: clientData.dob || null, pob: clientData.pob
    }).eq('id', clientId);

    await supabase.from('client_search_criteria').upsert({
      client_id: clientId, min_budget: searchCriteria.minBudget || null, max_budget: searchCriteria.maxBudget || null,
      locations: searchCriteria.locations, property_types: searchCriteria.propertyTypes,
      min_surface: searchCriteria.minSurface || null, max_surface: searchCriteria.maxSurface || null,
      min_rooms: searchCriteria.minRooms || null, min_bedrooms: searchCriteria.minBedrooms || null,
      desired_dpe: searchCriteria.desiredDPE || null, features: searchCriteria.features, notes: searchCriteria.notes
    }, { onConflict: 'client_id' });

    setSaving(false);
    onClose();
  };

  const styles: { [key: string]: CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '20px' },
    stepsBar: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px', gap: '18px' },
    navButtons: { display: 'flex', justifyContent: 'space-between', marginTop: '20px' },
    submitButton: { padding: '12px 20px', backgroundColor: '#ff00ff', border: 'none', borderRadius: '5px', color: '#ffffff', fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' },
  };

  const dynamicStyles = {
    stepCircle: (active: boolean): CSSProperties => ({
      width: '36px', height: '36px', borderRadius: '50%', background: active ? '#ff00ff' : '#222249', color: active ? '#fff' : '#00ffff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: active ? '0 0 8px #ff00ff' : 'none', border: `3px solid ${active ? '#ff00ff' : '#00ffff'}`
    }),
    stepLabel: (active: boolean): CSSProperties => ({ color: active ? '#ff00ff' : '#00ffff', fontWeight: active ? 600 : 400, fontSize: '0.98rem' }),
  };

  // French Real Estate Data
  const propertyTypes = ['Apartment', 'House/Villa', 'Mansion (Hôtel Particulier)', 'Castle (Château)', 'Loft/Atelier', 'Building (Immeuble)', 'Land (Terrain)'];
  const featuresList = ['Elevator (Ascenseur)', 'Balcony', 'Terrace', 'Garden (Jardin)', 'Parking', 'Garage', 'Cellar (Cave)', 'Haussmannian (Parquet/Moulures)', 'Fireplace', 'Top Floor', 'Ground Floor Garden', 'Sea View', 'Renovated (Refait à neuf)', 'Works Needed (Travaux)', 'Quiet (Calme)'];
  const dpeRatings = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  if (loading) return <Popup isOpen={isOpen} onClose={onClose} title="Loading..."><div className="flex justify-center p-10 text-[#00ffff]"><Loader2 className="animate-spin" size={48} /></div></Popup>;

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Edit Client">
      <div style={styles.container}>
        <div style={styles.stepsBar}>
          <div style={dynamicStyles.stepCircle(stage === 1)}>{stage > 1 ? <CheckCircle size={24} /> : 1}</div>
          <span style={dynamicStyles.stepLabel(stage === 1)}>Info</span>
          <div style={{width: '32px', textAlign: 'center', color: '#ff00ff'}}>→</div>
          <div style={dynamicStyles.stepCircle(stage === 2)}>{stage > 2 ? <CheckCircle size={24} /> : 2}</div>
          <span style={dynamicStyles.stepLabel(stage === 2)}>Criteria</span>
        </div>

        {stage === 1 && <><div className={sectionHeaderClass}>Personal Information</div><ClientFormFields data={clientData} onChange={updateClientData} /></>}

        {stage === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 className={sectionHeaderClass}">Budget & Location</div>
            <div><label className={labelClass}>Min Budget (€)</label><input type="number" className={inputClass} value={searchCriteria.minBudget} onChange={e => updateSearchCriteria('minBudget', e.target.value)} /></div>
            <div><label className={labelClass}>Max Budget (€)</label><input type="number" className={inputClass} value={searchCriteria.maxBudget} onChange={e => updateSearchCriteria('maxBudget', e.target.value)} /></div>
            <div className="md:col-span-2"><label className={labelClass}>Locations</label><textarea className={inputClass} rows={2} value={searchCriteria.locations} onChange={e => updateSearchCriteria('locations', e.target.value)}></textarea></div>
            
            <div className="md:col-span-2 className={sectionHeaderClass} mt-4">Property Specs</div>
            <div><label className={labelClass}>Min Surface (m²)</label><input type="number" className={inputClass} value={searchCriteria.minSurface} onChange={e => updateSearchCriteria('minSurface', e.target.value)} /></div>
            <div><label className={labelClass}>Max Surface (m²)</label><input type="number" className={inputClass} value={searchCriteria.maxSurface} onChange={e => updateSearchCriteria('maxSurface', e.target.value)} /></div>
            <div><label className={labelClass}>Min Rooms (Pièces)</label><input type="number" className={inputClass} value={searchCriteria.minRooms} onChange={e => updateSearchCriteria('minRooms', e.target.value)} /></div>
            <div><label className={labelClass}>Min Bedrooms (Chambres)</label><input type="number" className={inputClass} value={searchCriteria.minBedrooms} onChange={e => updateSearchCriteria('minBedrooms', e.target.value)} /></div>
            <div className="md:col-span-2"><label className={labelClass}>Min DPE Rating</label><select className={inputClass} value={searchCriteria.desiredDPE} onChange={e => updateSearchCriteria('desiredDPE', e.target.value)}><option value="" className="bg-[#0d0d21]">Any</option>{dpeRatings.map(r => <option key={r} value={r} className="bg-[#0d0d21]">Class {r} or better</option>)}</select></div>

            <div className="md:col-span-2 className={sectionHeaderClass} mt-4">Type & Features</div>
            <div className="md:col-span-2 mb-2 flex flex-wrap gap-2">{propertyTypes.map(type => <label key={type} className={`flex items-center gap-2 px-3 py-1 border rounded cursor-pointer transition-all text-xs ${searchCriteria.propertyTypes.includes(type) ? 'bg-[#ff00ff]/20 border-[#ff00ff] text-white' : 'border-gray-600 text-gray-400 hover:border-[#ff00ff]'}`}><input type="checkbox" className="hidden" checked={searchCriteria.propertyTypes.includes(type)} onChange={() => toggleCheckbox('propertyTypes', type)} /> {type}</label>)}</div>
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2">{featuresList.map(feature => <label key={feature} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white"><input type="checkbox" className="accent-[#ff00ff] bg-[#0d0d21] border-gray-500" checked={searchCriteria.features.includes(feature)} onChange={() => toggleCheckbox('features', feature)} /> {feature}</label>)}</div>
            <div className="md:col-span-2 mt-4"><label className={labelClass}>Notes</label><textarea className={inputClass} rows={3} value={searchCriteria.notes} onChange={e => updateSearchCriteria('notes', e.target.value)}></textarea></div>
          </div>
        )}

        <div style={styles.navButtons}>
          {stage === 2 ? <button type="button" onClick={() => setStage(1)} disabled={saving} style={{...styles.submitButton, backgroundColor: 'transparent', border: '1px solid #00ffff', color: '#00ffff', opacity: saving ? 0.5 : 1}}><ArrowLeft size={16} /> Back</button> : <div />}
          {stage === 1 ? <button type="button" onClick={() => setStage(2)} style={{...styles.submitButton, backgroundColor: '#00ffff', color: '#0d0d21'}}>Next <ArrowRight size={16} /></button> : <button type="button" onClick={handleSave} disabled={saving} style={{...styles.submitButton, opacity: saving ? 0.7 : 1}}>{saving ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : <><Save size={16} /> Save Changes</>}</button>}
        </div>
      </div>
    </Popup>
  );
}
