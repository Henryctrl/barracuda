'use client';

import React, { useState, useEffect } from 'react';
import Popup from '../Popup';
import ClientFormFields, { ClientFormData } from './ClientFormFields';
import LocationSelector from '../inputs/LocationSelector';
import { User, ArrowRight, ArrowLeft, Loader2, Save, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
interface SearchCriteriaData {
  id?: number;
  minBudget: string; maxBudget: string; locations: string; propertyTypes: string[];
  minSurface: string; maxSurface: string; minRooms: string; minBedrooms: string;
  desiredDPE: string; features: string[]; notes: string;
}

const inputClass = "w-full bg-[#0d0d21] border border-[#00ffff] rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-[#ff00ff] placeholder-white/30";
const labelClass = "text-xs font-bold text-[#00ffff] mb-1 uppercase tracking-wider";
const sectionHeaderClass = "text-[#ff00ff] text-lg font-bold border-b border-dashed border-[#ff00ff] pb-1 mb-4 uppercase";

export default function EditClientPopup({ isOpen, onClose, clientId }: { isOpen: boolean, onClose: () => void, clientId: string }) {
  const [stage, setStage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Data states
  const [clientData, setClientData] = useState<ClientFormData>({ firstName: '', lastName: '', address: '', email: '', mobile: '', landline: '', dob: '', pob: '' });
  const [criteriaData, setCriteriaData] = useState<SearchCriteriaData>({
    minBudget: '', maxBudget: '', locations: '', propertyTypes: [],
    minSurface: '', maxSurface: '', minRooms: '', minBedrooms: '',
    desiredDPE: '', features: [], notes: ''
  });

  useEffect(() => {
    if (isOpen && clientId) fetchClientData();
  }, [isOpen, clientId]);

  const fetchClientData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*, client_search_criteria(*)')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // Populate Identity
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

      // Populate Criteria
      if (client.client_search_criteria && client.client_search_criteria.length > 0) {
        const c = client.client_search_criteria[0];
        setCriteriaData({
          id: c.id,
          minBudget: c.min_budget?.toString() || '',
          maxBudget: c.max_budget?.toString() || '',
          locations: c.locations || '',
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
    } catch (err) {
      console.error(err);
      setError('Failed to load client data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Update Client Identity
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

      // 2. Update Criteria
      // Parse numeric fields safely
      const toNumber = (val: string) => (val === '' ? null : parseInt(val));
      
      const criteriaPayload = {
        client_id: clientId,
        min_budget: toNumber(criteriaData.minBudget),
        max_budget: toNumber(criteriaData.maxBudget),
        locations: criteriaData.locations,
        property_types: criteriaData.propertyTypes,
        min_surface: toNumber(criteriaData.minSurface),
        max_surface: toNumber(criteriaData.maxSurface),
        min_rooms: toNumber(criteriaData.minRooms),
        min_bedrooms: toNumber(criteriaData.minBedrooms),
        desired_dpe: criteriaData.desiredDPE || null,
        features: criteriaData.features,
        notes: criteriaData.notes
      };

      // Upsert logic: if we have an ID, update it; otherwise insert new
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

      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper
  const updateCriteria = (field: keyof SearchCriteriaData, value: any) => {
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

  const propertyTypes = ['Apartment', 'House/Villa', 'Mansion (Hôtel Particulier)', 'Castle (Château)', 'Loft/Atelier', 'Building (Immeuble)', 'Land (Terrain)'];
  const featuresList = ['Elevator (Ascenseur)', 'Balcony', 'Terrace', 'Garden (Jardin)', 'Parking', 'Garage', 'Cellar (Cave)', 'Haussmannian (Parquet/Moulures)', 'Fireplace', 'Top Floor', 'Ground Floor Garden', 'Sea View', 'Renovated (Refait à neuf)', 'Works Needed (Travaux)', 'Quiet (Calme)'];
  const dpeRatings = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Edit Client">
      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#00ffff]" size={40} /></div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* STAGE TABS */}
          <div className="flex border-b border-[#00ffff]/30 pb-2 gap-6 justify-center">
            <button onClick={() => setStage(1)} className={`uppercase font-bold text-sm ${stage === 1 ? 'text-[#ff00ff] border-b-2 border-[#ff00ff]' : 'text-[#00ffff] opacity-50'}`}>1. Identity</button>
            <button onClick={() => setStage(2)} className={`uppercase font-bold text-sm ${stage === 2 ? 'text-[#ff00ff] border-b-2 border-[#ff00ff]' : 'text-[#00ffff] opacity-50'}`}>2. Criteria</button>
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
                <div className={sectionHeaderClass}>Budget & Location</div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Min (€)</label><input type="number" className={inputClass} value={criteriaData.minBudget} onChange={e => updateCriteria('minBudget', e.target.value)} /></div>
                  <div><label className={labelClass}>Max (€)</label><input type="number" className={inputClass} value={criteriaData.maxBudget} onChange={e => updateCriteria('maxBudget', e.target.value)} /></div>
                  <div className="col-span-2"><label className={labelClass}>Locations</label><LocationSelector value={criteriaData.locations} onChange={val => updateCriteria('locations', val)} /></div>
                </div>
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

          {error && <div className="text-red-500 font-bold text-center flex items-center justify-center gap-2"><AlertCircle size={16}/> {error}</div>}

          <div className="flex justify-between mt-4">
            {stage === 2 ? (
              <button onClick={() => setStage(1)} className="flex items-center gap-2 text-[#00ffff] border border-[#00ffff] px-4 py-2 rounded uppercase hover:bg-[#00ffff]/10"><ArrowLeft size={16} /> Identity</button>
            ) : <div></div>}
            
            {stage === 1 ? (
              <button onClick={() => setStage(2)} className="flex items-center gap-2 bg-[#00ffff] text-black px-6 py-2 rounded uppercase font-bold hover:bg-[#00ffff]/80">Criteria <ArrowRight size={16} /></button>
            ) : (
              <button onClick={handleSave} disabled={isSubmitting} className="flex items-center gap-2 bg-[#ff00ff] text-white px-6 py-2 rounded uppercase font-bold hover:bg-[#ff00ff]/80 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={18} />} Save Changes
              </button>
            )}
          </div>
        </div>
      )}
    </Popup>
  );
}
