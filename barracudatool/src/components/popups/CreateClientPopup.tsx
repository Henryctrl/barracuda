'use client';

import React, { useState, CSSProperties } from 'react';
import Popup from '../Popup';
import ClientFormFields, { ClientFormData } from './ClientFormFields';
import { User, Plus, Trash2, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- STYLES (Layout only, visual styles moved to Tailwind classes) ---
const styles: { [key: string]: CSSProperties } = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  stepsBar: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px', gap: '18px' },
  navButtons: { display: 'flex', justifyContent: 'space-between', marginTop: '20px' },
  submitButton: { padding: '12px 20px', backgroundColor: '#ff00ff', border: 'none', borderRadius: '5px', color: '#ffffff', fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' },
  errorMsg: { color: '#ff4545', marginTop: '10px', textAlign: 'center', fontWeight: 'bold' }
};

const dynamicStyles = {
  stepCircle: (active: boolean): CSSProperties => ({
    width: '36px', height: '36px', borderRadius: '50%',
    background: active ? '#ff00ff' : '#222249',
    color: active ? '#fff' : '#00ffff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 'bold', fontSize: '1.2rem', boxShadow: active ? '0 0 8px #ff00ff' : 'none',
    border: `3px solid ${active ? '#ff00ff' : '#00ffff'}`
  }),
  stepLabel: (active: boolean): CSSProperties => ({
    color: active ? '#ff00ff' : '#00ffff',
    fontWeight: active ? 600 : 400, fontSize: '0.98rem'
  }),
};

interface CreateClientPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RelationData {
  id: number;
  type: string;
  data: ClientFormData;
}

interface SearchCriteriaData {
  minBudget: string;
  maxBudget: string;
  locations: string;
  propertyTypes: string[];
  minSurface: string;
  maxSurface: string;
  minRooms: string;    // Pièces
  minBedrooms: string; // Chambres
  desiredDPE: string;  // Energy Rating
  features: string[];
  notes: string;
}

const initialFormData: ClientFormData = { firstName: '', lastName: '', address: '', email: '', mobile: '', landline: '', dob: '', pob: '' };
const initialSearchData: SearchCriteriaData = { minBudget: '', maxBudget: '', locations: '', propertyTypes: [], minSurface: '', maxSurface: '', minRooms: '', minBedrooms: '', desiredDPE: '', features: [], notes: '' };

// Tailwind Classes
const inputClass = "w-full bg-[#0d0d21] border border-[#00ffff] rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-[#ff00ff] placeholder-white/30";
const labelClass = "text-xs font-bold text-[#00ffff] mb-1 uppercase tracking-wider";
const sectionHeaderClass = "text-[#ff00ff] text-lg font-bold border-b border-dashed border-[#ff00ff] pb-1 mb-4 uppercase";

export default function CreateClientPopup({ isOpen, onClose }: CreateClientPopupProps) {
  const [stage, setStage] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [primaryClientData, setPrimaryClientData] = useState<ClientFormData>(initialFormData);
  const [relations, setRelations] = useState<RelationData[]>([]);
  const [expandedRelation, setExpandedRelation] = useState<number | null>(null);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteriaData>(initialSearchData);

  React.useEffect(() => {
    if (isOpen) {
      setStage(1);
      setRelations([]);
      setExpandedRelation(null);
      setPrimaryClientData(initialFormData);
      setSearchCriteria(initialSearchData);
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const updatePrimaryClient = (field: keyof ClientFormData, value: string) => setPrimaryClientData(prev => ({ ...prev, [field]: value }));
  const addRelation = () => {
    if (relations.length < 20) {
      const newId = Date.now();
      setRelations([...relations, { id: newId, type: '', data: { ...initialFormData } }]);
      setExpandedRelation(newId);
    }
  };
  const removeRelation = (id: number) => {
    setRelations(relations.filter(r => r.id !== id));
    if (expandedRelation === id) setExpandedRelation(null);
  };
  const updateRelationData = (id: number, field: keyof ClientFormData, value: string) => setRelations(prev => prev.map(r => r.id === id ? { ...r, data: { ...r.data, [field]: value } } : r));
  const updateRelationType = (id: number, type: string) => setRelations(prev => prev.map(r => r.id === id ? { ...r, type } : r));
  const updateSearchCriteria = (field: keyof SearchCriteriaData, value: any) => setSearchCriteria(prev => ({ ...prev, [field]: value }));
  const toggleCheckbox = (field: 'propertyTypes' | 'features', value: string) => {
    setSearchCriteria(prev => {
      const list = prev[field];
      return { ...prev, [field]: list.includes(value) ? list.filter(i => i !== value) : [...list, value] };
    });
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      // 1. Insert Primary Client
      const { data: primaryData, error: primaryError } = await supabase.from('clients').insert([{
          first_name: primaryClientData.firstName, last_name: primaryClientData.lastName, address: primaryClientData.address,
          email: primaryClientData.email, mobile: primaryClientData.mobile, landline: primaryClientData.landline,
          dob: primaryClientData.dob || null, pob: primaryClientData.pob
        }]).select().single();
      if (primaryError) throw primaryError;
      
      // 2. Insert Relations
      for (const rel of relations) {
        const { data: relData, error: relError } = await supabase.from('clients').insert([{
            first_name: rel.data.firstName, last_name: rel.data.lastName, address: rel.data.address,
            email: rel.data.email, mobile: rel.data.mobile, landline: rel.data.landline,
            dob: rel.data.dob || null, pob: rel.data.pob
          }]).select().single();
        if (relError) throw relError;
        await supabase.from('client_relationships').insert([{ primary_client_id: primaryData.id, related_client_id: relData.id, relationship_type: rel.type }]);
      }

      // 3. Insert Search Criteria (Updated with French fields)
      await supabase.from('client_search_criteria').insert([{
          client_id: primaryData.id,
          min_budget: searchCriteria.minBudget || null, max_budget: searchCriteria.maxBudget || null, locations: searchCriteria.locations,
          property_types: searchCriteria.propertyTypes,
          min_surface: searchCriteria.minSurface || null, max_surface: searchCriteria.maxSurface || null,
          min_rooms: searchCriteria.minRooms || null, // New
          min_bedrooms: searchCriteria.minBedrooms || null,
          desired_dpe: searchCriteria.desiredDPE || null, // New
          features: searchCriteria.features, notes: searchCriteria.notes
        }]);

      console.log('SUCCESS');
      onClose();
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || 'Failed to create client.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // French Real Estate Data
  const propertyTypes = ['Apartment', 'House/Villa', 'Mansion (Hôtel Particulier)', 'Castle (Château)', 'Loft/Atelier', 'Building (Immeuble)', 'Land (Terrain)'];
  const featuresList = [
    'Elevator (Ascenseur)', 'Balcony', 'Terrace', 'Garden (Jardin)', 'Parking', 'Garage', 'Cellar (Cave)', 
    'Haussmannian (Parquet/Moulures)', 'Fireplace', 'Top Floor', 'Ground Floor Garden', 'Sea View', 
    'Renovated (Refait à neuf)', 'Works Needed (Travaux)', 'Quiet (Calme)'
  ];
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
        
        {stage === 1 && (
          <>
            <div className={sectionHeaderClass}>Primary Client Details</div>
            <ClientFormFields data={primaryClientData} onChange={updatePrimaryClient} />
            
            <div className={`${sectionHeaderClass} mt-6 flex justify-between items-center`}>
              <span>Relations ({relations.length}/20)</span>
            </div>
            {relations.map((rel, index) => (
              <div key={rel.id} className="border border-[#00ffff] rounded mb-4 overflow-hidden">
                <div className="bg-[#00ffff]/10 p-3 flex justify-between items-center cursor-pointer" onClick={() => setExpandedRelation(expandedRelation === rel.id ? null : rel.id)}>
                  <span className="font-bold text-white">Relation #{index + 1} {rel.data.firstName ? `- ${rel.data.firstName}` : ''}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" className="text-[#ff00ff] hover:text-white" onClick={(e) => { e.stopPropagation(); removeRelation(rel.id); }}><Trash2 size={18} /></button>
                    {expandedRelation === rel.id ? <ChevronUp size={20} className="text-[#00ffff]" /> : <ChevronDown size={20} className="text-[#00ffff]" />}
                  </div>
                </div>
                {expandedRelation === rel.id && (
                  <div className="p-4 bg-[#0d0d21]">
                    <div className="mb-4">
                      <label className={labelClass}>Relationship to Primary</label>
                      <select className={inputClass} value={rel.type} onChange={(e) => updateRelationType(rel.id, e.target.value)}>
                        <option value="">Select type...</option>
                        {['Partner', 'Spouse', 'Child', 'Parent', 'Sibling', 'Business Partner', 'Other'].map(t => <option key={t} value={t} className="bg-[#0d0d21]">{t}</option>)}
                      </select>
                    </div>
                    <ClientFormFields data={rel.data} onChange={(field, val) => updateRelationData(rel.id, field, val)} />
                  </div>
                )}
              </div>
            ))}
            {relations.length < 20 && (
              <button type="button" onClick={addRelation} className="flex items-center gap-2 px-4 py-2 border border-[#00ffff] text-[#00ffff] rounded hover:bg-[#00ffff]/20 transition-all w-full justify-center font-bold uppercase text-sm">
                <Plus size={16} /> Add Relation
              </button>
            )}
          </>
        )}

        {stage === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 className={sectionHeaderClass}">Budget & Location</div>
            <div><label className={labelClass}>Min Budget (€)</label><input type="number" className={inputClass} value={searchCriteria.minBudget} onChange={e => updateSearchCriteria('minBudget', e.target.value)} /></div>
            <div><label className={labelClass}>Max Budget (€)</label><input type="number" className={inputClass} value={searchCriteria.maxBudget} onChange={e => updateSearchCriteria('maxBudget', e.target.value)} /></div>
            <div className="md:col-span-2"><label className={labelClass}>Locations (Cities, Postcodes, Depts)</label><textarea className={inputClass} rows={2} value={searchCriteria.locations} onChange={e => updateSearchCriteria('locations', e.target.value)}></textarea></div>
            
            <div className="md:col-span-2 className={sectionHeaderClass} mt-4">Property Specs</div>
            <div><label className={labelClass}>Min Surface (m²)</label><input type="number" className={inputClass} value={searchCriteria.minSurface} onChange={e => updateSearchCriteria('minSurface', e.target.value)} /></div>
            <div><label className={labelClass}>Max Surface (m²)</label><input type="number" className={inputClass} value={searchCriteria.maxSurface} onChange={e => updateSearchCriteria('maxSurface', e.target.value)} /></div>
            
            {/* French Specifics */}
            <div><label className={labelClass}>Min Rooms (Pièces)</label><input type="number" className={inputClass} placeholder="e.g. T3" value={searchCriteria.minRooms} onChange={e => updateSearchCriteria('minRooms', e.target.value)} /></div>
            <div><label className={labelClass}>Min Bedrooms (Chambres)</label><input type="number" className={inputClass} value={searchCriteria.minBedrooms} onChange={e => updateSearchCriteria('minBedrooms', e.target.value)} /></div>
            <div className="md:col-span-2">
              <label className={labelClass}>Min DPE Rating (Diagnostic)</label>
              <select className={inputClass} value={searchCriteria.desiredDPE} onChange={e => updateSearchCriteria('desiredDPE', e.target.value)}>
                <option value="" className="bg-[#0d0d21]">Any</option>
                {dpeRatings.map(r => <option key={r} value={r} className="bg-[#0d0d21]">Class {r} or better</option>)}
              </select>
            </div>

            <div className="md:col-span-2 className={sectionHeaderClass} mt-4">Type & Features</div>
            <div className="md:col-span-2 mb-2">
              <div className="flex flex-wrap gap-2">
                {propertyTypes.map(type => (
                  <label key={type} className={`flex items-center gap-2 px-3 py-1 border rounded cursor-pointer transition-all text-xs ${searchCriteria.propertyTypes.includes(type) ? 'bg-[#ff00ff]/20 border-[#ff00ff] text-white' : 'border-gray-600 text-gray-400 hover:border-[#ff00ff]'}`}>
                    <input type="checkbox" className="hidden" checked={searchCriteria.propertyTypes.includes(type)} onChange={() => toggleCheckbox('propertyTypes', type)} /> {type}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="md:col-span-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {featuresList.map(feature => (
                  <label key={feature} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="checkbox" className="accent-[#ff00ff] bg-[#0d0d21] border-gray-500" checked={searchCriteria.features.includes(feature)} onChange={() => toggleCheckbox('features', feature)} /> {feature}
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 mt-4"><label className={labelClass}>Notes / Keywords</label><textarea className={inputClass} rows={3} value={searchCriteria.notes} onChange={e => updateSearchCriteria('notes', e.target.value)}></textarea></div>
          </div>
        )}

        {errorMessage && <div style={styles.errorMsg}>{errorMessage}</div>}

        <div style={styles.navButtons}>
          {stage === 2 ? (
            <button type="button" onClick={() => setStage(1)} disabled={isSubmitting} style={{...styles.submitButton, backgroundColor: 'transparent', border: '1px solid #00ffff', color: '#00ffff', opacity: isSubmitting ? 0.5 : 1}}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : <div />}
          
          {stage === 1 ? (
            <button type="button" onClick={() => setStage(2)} style={{...styles.submitButton, backgroundColor: '#00ffff', color: '#0d0d21'}}>
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={handleFinalSubmit} disabled={isSubmitting} style={{...styles.submitButton, opacity: isSubmitting ? 0.7 : 1}}>
              {isSubmitting ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : <><User size={16} /> Create Client</>}
            </button>
          )}
        </div>
      </div>
    </Popup>
  );
}
