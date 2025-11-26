'use client';

import React, { useState, CSSProperties } from 'react';
import Popup from '../Popup';
import ClientFormFields, { ClientFormData } from './ClientFormFields';
import LocationSelector from '../inputs/LocationSelector';
import { User, Plus, Trash2, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- TYPES ---
interface RelationData { id: number; type: string; data: ClientFormData; }
interface SearchCriteriaData {
  minBudget: string; maxBudget: string; locations: string; propertyTypes: string[];
  minSurface: string; maxSurface: string; minRooms: string; minBedrooms: string;
  desiredDPE: string; features: string[]; notes: string;
  visitStartDate: string; visitEndDate: string; visitNotes: string;
}

const initialFormData: ClientFormData = { firstName: '', lastName: '', address: '', email: '', mobile: '', landline: '', dob: '', pob: '' };
const initialSearchData: SearchCriteriaData = { 
  minBudget: '', maxBudget: '', locations: '', propertyTypes: [], minSurface: '', maxSurface: '', minRooms: '', minBedrooms: '', 
  desiredDPE: '', features: [], notes: '', 
  visitStartDate: '', visitEndDate: '', visitNotes: '' 
};

// --- STYLES ---
const styles: { [key: string]: CSSProperties } = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  stepsBar: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px', gap: '18px' },
  subHeader: { color: '#ff00ff', fontSize: '1.1rem', borderBottom: '1px dashed #ff00ff', paddingBottom: '5px', marginBottom: '10px' },
  navButtons: { display: 'flex', justifyContent: 'space-between', marginTop: '20px' },
  submitButton: { padding: '12px 20px', backgroundColor: '#ff00ff', border: 'none', borderRadius: '5px', color: '#ffffff', fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' },
  relationContainer: { border: '1px solid #00ffff', borderRadius: '5px', marginBottom: '15px' },
  relationHeader: { backgroundColor: 'rgba(0, 255, 255, 0.1)', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  relationBody: { padding: '15px' },
  iconButton: { background: 'none', border: 'none', cursor: 'pointer' },
  formGroup: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '0.9rem', color: '#00ffff', marginBottom: '5px', textTransform: 'uppercase' },
  input: { backgroundColor: 'rgba(0, 255, 255, 0.1)', border: '1px solid #00ffff', borderRadius: '4px', padding: '10px', color: '#ffffff', fontSize: '1rem', outline: 'none' },
  errorMsg: { color: '#ff4545', marginTop: '10px', textAlign: 'center', fontWeight: 'bold' }
};

const inputClass = "w-full bg-[#0d0d21] border border-[#00ffff] rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-[#ff00ff] placeholder-white/30";
const labelClass = "text-xs font-bold text-[#00ffff] mb-1 uppercase tracking-wider";
const sectionHeaderClass = "text-[#ff00ff] text-lg font-bold border-b border-dashed border-[#ff00ff] pb-1 mb-4 uppercase";

const dynamicStyles = {
  stepCircle: (active: boolean): CSSProperties => ({ width: '36px', height: '36px', borderRadius: '50%', background: active ? '#ff00ff' : '#222249', color: active ? '#fff' : '#00ffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: active ? '0 0 8px #ff00ff' : 'none', border: `3px solid ${active ? '#ff00ff' : '#00ffff'}` }),
  stepLabel: (active: boolean): CSSProperties => ({ color: active ? '#ff00ff' : '#00ffff', fontWeight: active ? 600 : 400, fontSize: '0.98rem' }),
};

export default function CreateClientPopup({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [stage, setStage] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [primaryClientData, setPrimaryClientData] = useState<ClientFormData>(initialFormData);
  const [relations, setRelations] = useState<RelationData[]>([]);
  const [expandedRelation, setExpandedRelation] = useState<number | null>(null);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteriaData>(initialSearchData);

  React.useEffect(() => {
    if (isOpen) {
      setStage(1); setRelations([]); setExpandedRelation(null); setPrimaryClientData(initialFormData);
      setSearchCriteria(initialSearchData); setErrorMessage(''); setIsSubmitting(false);
    }
  }, [isOpen]);

  // --- Handlers ---
  const updatePrimaryClient = (field: keyof ClientFormData, value: string) => setPrimaryClientData(prev => ({ ...prev, [field]: value }));
  const addRelation = () => { if (relations.length < 20) { const id = Date.now(); setRelations([...relations, { id, type: '', data: { ...initialFormData } }]); setExpandedRelation(id); } };
  const removeRelation = (id: number) => { setRelations(relations.filter(r => r.id !== id)); if (expandedRelation === id) setExpandedRelation(null); };
  const updateRelationData = (id: number, field: keyof ClientFormData, value: string) => setRelations(prev => prev.map(r => r.id === id ? { ...r, data: { ...r.data, [field]: value } } : r));
  const updateRelationType = (id: number, type: string) => setRelations(prev => prev.map(r => r.id === id ? { ...r, type } : r));
  const updateSearchCriteria = (field: keyof SearchCriteriaData, value: string | number | boolean | string[] | null) => setSearchCriteria(prev => ({ ...prev, [field]: value }));
  const toggleCheckbox = (field: 'propertyTypes' | 'features', value: string) => setSearchCriteria(prev => ({ ...prev, [field]: prev[field].includes(value) ? prev[field].filter(i => i !== value) : [...prev[field], value] }));

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      // 1. Create Primary Client
      const { data: primaryData, error: primaryError } = await supabase.from('clients').insert([{
          first_name: primaryClientData.firstName,
          last_name: primaryClientData.lastName,
          address: primaryClientData.address,
          email: primaryClientData.email,
          mobile: primaryClientData.mobile,
          landline: primaryClientData.landline,
          dob: primaryClientData.dob || null,
          pob: primaryClientData.pob
      }]).select().single();

      if (primaryError) throw primaryError;
      if (!primaryData) throw new Error("Failed to create client record");
      
      console.log("✅ Client created:", primaryData.id);
      
      // 2. Create Relations
      for (const rel of relations) {
        const { data: relData, error: relError } = await supabase.from('clients').insert([{
            first_name: rel.data.firstName,
            last_name: rel.data.lastName,
            address: rel.data.address,
            email: rel.data.email,
            mobile: rel.data.mobile,
            landline: rel.data.landline,
            dob: rel.data.dob || null,
            pob: rel.data.pob
        }]).select().single();

        if (relError) throw relError;
        await supabase.from('client_relationships').insert([{ primary_client_id: primaryData.id, related_client_id: relData.id, relationship_type: rel.type }]);
      }
      
      // 3. Create Criteria - CLEAN VERSION
      const toNumber = (val: string): number | null => {
        if (val === '') return null;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      };

      const criteriaPayload = { 
        client_id: primaryData.id,
        min_budget: toNumber(searchCriteria.minBudget), 
        max_budget: toNumber(searchCriteria.maxBudget), 
        locations: searchCriteria.locations || null,
        property_types: searchCriteria.propertyTypes.length > 0 ? searchCriteria.propertyTypes : null, 
        min_surface: toNumber(searchCriteria.minSurface), 
        max_surface: toNumber(searchCriteria.maxSurface),
        min_rooms: toNumber(searchCriteria.minRooms), 
        min_bedrooms: toNumber(searchCriteria.minBedrooms), 
        desired_dpe: searchCriteria.desiredDPE || null,
        features: searchCriteria.features.length > 0 ? searchCriteria.features : null, 
        notes: searchCriteria.notes || null,
      };

      console.log("📤 Sending Criteria:", criteriaPayload);

      const { data: criteriaData, error: criteriaError } = await supabase
        .from('client_search_criteria')
        .insert([criteriaPayload])
        .select();

      if (criteriaError) {
        console.error("❌ Criteria Error:", criteriaError);
        throw new Error(`Criteria save failed: ${criteriaError.message}`);
      }

      console.log("✅ Criteria saved:", criteriaData);
      
      // 4. Insert Visit
      if (searchCriteria.visitStartDate) {
        await supabase.from('client_visits').insert([{
          client_id: primaryData.id,
          visit_start_date: searchCriteria.visitStartDate,
          visit_end_date: searchCriteria.visitEndDate || searchCriteria.visitStartDate,
          notes: searchCriteria.visitNotes || null,
          color: '#ff00ff'
        }]);
      }

      alert("✅ Client created successfully!");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error("💥 Submission error:", error);
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const propertyTypes = ['Apartment', 'House/Villa', 'Mansion (Hôtel Particulier)', 'Castle (Château)', 'Loft/Atelier', 'Building (Immeuble)', 'Land (Terrain)'];
  const featuresList = ['Elevator (Ascenseur)', 'Balcony', 'Terrace', 'Garden (Jardin)', 'Parking', 'Garage', 'Cellar (Cave)', 'Haussmannian (Parquet/Moulures)', 'Fireplace', 'Top Floor', 'Ground Floor Garden', 'Sea View', 'Renovated (Refait à neuf)', 'Works Needed (Travaux)', 'Quiet (Calme)'];
  const dpeRatings = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  
  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Create New Client">
      <div style={styles.container}>
        <div style={styles.stepsBar}>
          <div style={dynamicStyles.stepCircle(stage === 1)}>{stage > 1 ? <CheckCircle size={24} /> : 1}</div>
          <span style={dynamicStyles.stepLabel(stage === 1)}>Identity</span>
          <div style={{width: '32px', textAlign: 'center', color: '#ff00ff'}}>→</div>
          <div style={dynamicStyles.stepCircle(stage === 2)}>{stage > 2 ? <CheckCircle size={24} /> : 2}</div>
          <span style={dynamicStyles.stepLabel(stage === 2)}>Criteria</span>
        </div>
        
        {stage === 1 && <>
          <div style={styles.subHeader}>Primary Client Details</div>
          <ClientFormFields data={primaryClientData} onChange={updatePrimaryClient} />
          
          <div style={{ ...styles.subHeader, marginTop: '20px' }}>Relations ({relations.length}/20)</div>
          {relations.map((rel, index) => (
            <div key={rel.id} style={styles.relationContainer}>
              <div style={styles.relationHeader} onClick={() => setExpandedRelation(expandedRelation === rel.id ? null : rel.id)}>
                <span>Relation #{index + 1} {rel.data.firstName ? `- ${rel.data.firstName}` : ''}</span>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <button type="button" style={{...styles.iconButton, color: '#ff00ff'}} onClick={(e) => { e.stopPropagation(); removeRelation(rel.id); }}><Trash2 size={20} /></button>
                  {expandedRelation === rel.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
              {expandedRelation === rel.id && (
                <div style={styles.relationBody}>
                  <div style={{...styles.formGroup, marginBottom: '15px'}}>
                    <label style={styles.label}>Relationship to Primary Client</label>
                    <select 
                      style={styles.input} 
                      value={rel.type}
                      onChange={(e) => updateRelationType(rel.id, e.target.value)}
                    >
                      <option value="" className="bg-[#0d0d21]">Select a relationship...</option>
                      {['Partner', 'Spouse', 'Child', 'Parent', 'Sibling', 'Roommate', 'Friend', 'Business Partner', 'Colleague', 'Other'].map(t => <option key={t} value={t} className="bg-[#0d0d21]">{t}</option>)}
                    </select>
                  </div>
                  <ClientFormFields data={rel.data} onChange={(field, val) => updateRelationData(rel.id, field, val)} />
                </div>
              )}
            </div>
          ))}
          {relations.length < 20 && (
            <button type="button" onClick={addRelation} style={{...styles.submitButton, backgroundColor: 'rgba(0, 255, 255, 0.2)', border: '1px solid #00ffff', color: '#00ffff'}}>
              <Plus size={16} /> Add Relation
            </button>
          )}
        </>}

        {stage === 2 && <div className="space-y-6">
          <div>
            <div className={sectionHeaderClass}>Budget & Locations</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Min Budget (€)</label><input type="number" className={inputClass} value={searchCriteria.minBudget} onChange={e => updateSearchCriteria('minBudget', e.target.value)} placeholder="e.g., 400000" /></div>
              <div><label className={labelClass}>Max Budget (€)</label><input type="number" className={inputClass} value={searchCriteria.maxBudget} onChange={e => updateSearchCriteria('maxBudget', e.target.value)} placeholder="e.g., 600000" /></div>
              <div className="md:col-span-2"><label className={labelClass}>Named Locations (Cities, Depts, Regions)</label><LocationSelector value={searchCriteria.locations} onChange={val => updateSearchCriteria('locations', val)} /></div>
            </div>
          </div>
          
          <div>
            <div className={sectionHeaderClass}>Visit Planning</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-[#ff00ff]/30 rounded bg-[#ff00ff]/5">
              <div><label className={labelClass}>Arrival Date</label><input type="date" className={inputClass} value={searchCriteria.visitStartDate} onChange={e => updateSearchCriteria('visitStartDate', e.target.value)} /></div>
              <div><label className={labelClass}>Departure Date</label><input type="date" className={inputClass} value={searchCriteria.visitEndDate} onChange={e => updateSearchCriteria('visitEndDate', e.target.value)} /></div>
              <div className="md:col-span-2"><label className={labelClass}>Visit Notes / Goals</label><textarea className={inputClass} rows={2} placeholder="e.g., First scouting trip, wants to see sea view properties only." value={searchCriteria.visitNotes} onChange={e => updateSearchCriteria('visitNotes', e.target.value)} /></div>
            </div>
          </div>

          <div>
            <div className={sectionHeaderClass}>Property Specs</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Min Surface (m²)</label><input type="number" className={inputClass} value={searchCriteria.minSurface} onChange={e => updateSearchCriteria('minSurface', e.target.value)} /></div>
              <div><label className={labelClass}>Max Surface (m²)</label><input type="number" className={inputClass} value={searchCriteria.maxSurface} onChange={e => updateSearchCriteria('maxSurface', e.target.value)} /></div>
              <div><label className={labelClass}>Min Rooms (Pièces)</label><input type="number" className={inputClass} value={searchCriteria.minRooms} onChange={e => updateSearchCriteria('minRooms', e.target.value)} /></div>
              <div><label className={labelClass}>Min Bedrooms (Chambres)</label><input type="number" className={inputClass} value={searchCriteria.minBedrooms} onChange={e => updateSearchCriteria('minBedrooms', e.target.value)} /></div>
              <div className="md:col-span-2"><label className={labelClass}>Min DPE Rating</label><select className={inputClass} value={searchCriteria.desiredDPE} onChange={e => updateSearchCriteria('desiredDPE', e.target.value)}><option value="" className="bg-[#0d0d21]">Any</option>{dpeRatings.map(r => <option key={r} value={r} className="bg-[#0d0d21]">Class {r}</option>)}</select></div>
            </div>
          </div>
          
          <div>
            <div className={sectionHeaderClass}>Type & Features</div>
            <div className="flex flex-wrap gap-2 mb-4">{propertyTypes.map(type => <label key={type} className={`flex items-center px-3 py-1 border rounded cursor-pointer text-xs ${searchCriteria.propertyTypes.includes(type) ? 'bg-[#ff00ff]/20 border-[#ff00ff]' : 'border-gray-600 hover:border-[#ff00ff]'}`}><input type="checkbox" className="hidden" checked={searchCriteria.propertyTypes.includes(type)} onChange={() => toggleCheckbox('propertyTypes', type)} /> {type}</label>)}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{featuresList.map(feature => <label key={feature} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="accent-[#ff00ff]" checked={searchCriteria.features.includes(feature)} onChange={() => toggleCheckbox('features', feature)} /> {feature}</label>)}</div>
          </div>
          <div><label className={labelClass}>General Notes</label><textarea className={inputClass} rows={2} value={searchCriteria.notes} onChange={e => updateSearchCriteria('notes', e.target.value)}></textarea></div>
        </div>}

        {errorMessage && <div style={styles.errorMsg}>{errorMessage}</div>}
        <div style={styles.navButtons}>
          {stage === 2 ? <button type="button" onClick={() => setStage(1)} disabled={isSubmitting} style={{...styles.submitButton, backgroundColor: 'transparent', border: '1px solid #00ffff', color: '#00ffff'}}><ArrowLeft size={16} /> Back</button> : <div />}
          {stage === 1 ? <button type="button" onClick={() => setStage(2)} style={{...styles.submitButton, backgroundColor: '#00ffff', color: '#0d0d21'}}>Next <ArrowRight size={16} /></button> : <button type="button" onClick={handleFinalSubmit} disabled={isSubmitting} style={{...styles.submitButton}}>{isSubmitting ? <Loader2 className="animate-spin" /> : <User />} Create Client</button>}
        </div>
      </div>
    </Popup>
  );
}
