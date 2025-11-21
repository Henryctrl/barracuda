'use client';

import React, { useState, CSSProperties } from 'react';
import Popup from '../Popup';
import ClientFormFields, { ClientFormData } from './ClientFormFields';
import { User, Plus, Trash2, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- STYLES ---
const styles: { [key: string]: CSSProperties } = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  stepsBar: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px', gap: '18px' },
  subHeader: { color: '#ff00ff', fontSize: '1.1rem', borderBottom: '1px dashed #ff00ff', paddingBottom: '5px', marginBottom: '10px' },
  navButtons: { display: 'flex', justifyContent: 'space-between', marginTop: '20px' },
  submitButton: { padding: '12px 20px', backgroundColor: '#ff00ff', border: 'none', borderRadius: '5px', color: '#ffffff', fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' },
  checkboxGroup: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' },
  checkbox: { accentColor: '#ff00ff' },
  relationContainer: { border: '1px solid #00ffff', borderRadius: '5px', marginBottom: '15px' },
  relationHeader: { backgroundColor: 'rgba(0, 255, 255, 0.1)', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
  relationBody: { padding: '15px' },
  iconButton: { background: 'none', border: 'none', cursor: 'pointer' },
  formGroup: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '0.9rem', color: '#00ffff', marginBottom: '5px', textTransform: 'uppercase' },
  input: { backgroundColor: 'rgba(0, 255, 255, 0.1)', border: '1px solid #00ffff', borderRadius: '4px', padding: '10px', color: '#ffffff', fontSize: '1rem', outline: 'none' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  fullWidth: { gridColumn: '1 / -1' },
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

// --- TYPES ---
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
  minBedrooms: string;
  maxBedrooms: string;
  features: string[];
  notes: string;
}

const initialFormData: ClientFormData = { firstName: '', lastName: '', address: '', email: '', mobile: '', landline: '', dob: '', pob: '' };
const initialSearchData: SearchCriteriaData = { minBudget: '', maxBudget: '', locations: '', propertyTypes: [], minSurface: '', maxSurface: '', minBedrooms: '', maxBedrooms: '', features: [], notes: '' };

export default function CreateClientPopup({ isOpen, onClose }: CreateClientPopupProps) {
  const [stage, setStage] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // State for Form Data
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

  // --- HANDLERS ---

  const updatePrimaryClient = (field: keyof ClientFormData, value: string) => {
    setPrimaryClientData(prev => ({ ...prev, [field]: value }));
  };

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

  const updateRelationData = (id: number, field: keyof ClientFormData, value: string) => {
    setRelations(prev => prev.map(r => r.id === id ? { ...r, data: { ...r.data, [field]: value } } : r));
  };

  const updateRelationType = (id: number, type: string) => {
    setRelations(prev => prev.map(r => r.id === id ? { ...r, type } : r));
  };

  const updateSearchCriteria = (field: keyof SearchCriteriaData, value: any) => {
    setSearchCriteria(prev => ({ ...prev, [field]: value }));
  };

  const toggleCheckbox = (field: 'propertyTypes' | 'features', value: string) => {
    setSearchCriteria(prev => {
      const list = prev[field];
      return {
        ...prev,
        [field]: list.includes(value) ? list.filter(i => i !== value) : [...list, value]
      };
    });
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Insert Primary Client
      const { data: primaryData, error: primaryError } = await supabase
        .from('clients')
        .insert([{
          first_name: primaryClientData.firstName,
          last_name: primaryClientData.lastName,
          address: primaryClientData.address,
          email: primaryClientData.email,
          mobile: primaryClientData.mobile,
          landline: primaryClientData.landline,
          dob: primaryClientData.dob || null,
          pob: primaryClientData.pob
        }])
        .select()
        .single();

      if (primaryError) throw primaryError;
      const primaryId = primaryData.id;

      // 2. Insert Relations and Links
      if (relations.length > 0) {
        for (const rel of relations) {
          const { data: relData, error: relError } = await supabase
            .from('clients')
            .insert([{
              first_name: rel.data.firstName,
              last_name: rel.data.lastName,
              address: rel.data.address,
              email: rel.data.email,
              mobile: rel.data.mobile,
              landline: rel.data.landline,
              dob: rel.data.dob || null,
              pob: rel.data.pob
            }])
            .select()
            .single();

          if (relError) throw relError;

          const { error: linkError } = await supabase
            .from('client_relationships')
            .insert([{
              primary_client_id: primaryId,
              related_client_id: relData.id,
              relationship_type: rel.type
            }]);
            
          if (linkError) throw linkError;
        }
      }

      // 3. Insert Search Criteria
      const { error: searchError } = await supabase
        .from('client_search_criteria')
        .insert([{
          client_id: primaryId,
          min_budget: searchCriteria.minBudget || null,
          max_budget: searchCriteria.maxBudget || null,
          locations: searchCriteria.locations,
          property_types: searchCriteria.propertyTypes,
          min_surface: searchCriteria.minSurface || null,
          max_surface: searchCriteria.maxSurface || null,
          min_bedrooms: searchCriteria.minBedrooms || null,
          max_bedrooms: searchCriteria.maxBedrooms || null,
          features: searchCriteria.features,
          notes: searchCriteria.notes
        }]);

      if (searchError) throw searchError;

      console.log('SUCCESS: Client created with ID:', primaryId);
      onClose();

    } catch (error: any) {
      console.error('Error creating client:', error);
      setErrorMessage(error.message || 'Failed to create client. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Create New Client">
      <div style={styles.container}>
        <div style={styles.stepsBar}>
          <div style={dynamicStyles.stepCircle(stage === 1)}>{stage > 1 ? <CheckCircle size={24} /> : 1}</div>
          <span style={dynamicStyles.stepLabel(stage === 1)}>Details</span>
          <div style={{width: '32px', textAlign: 'center', color: '#ff00ff'}}>→</div>
          <div style={dynamicStyles.stepCircle(stage === 2)}>{stage > 2 ? <CheckCircle size={24} /> : 2}</div>
          <span style={dynamicStyles.stepLabel(stage === 2)}>Search</span>
        </div>
        
        {stage === 1 && (
          <>
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
                        <option value="">Select a relationship...</option>
                        {['Partner', 'Spouse', 'Child', 'Parent', 'Sibling', 'Roommate', 'Friend', 'Business Partner', 'Colleague', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
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
          </>
        )}

        {stage === 2 && (
          <>
            <div style={styles.grid}>
              <div style={{...styles.formGroup, ...styles.fullWidth}}><div style={styles.subHeader}>Search Criteria</div></div>
              <div style={styles.formGroup}><label style={styles.label}>Min Budget (€)</label><input type="number" style={styles.input} value={searchCriteria.minBudget} onChange={e => updateSearchCriteria('minBudget', e.target.value)} /></div>
              <div style={styles.formGroup}><label style={styles.label}>Max Budget (€)</label><input type="number" style={styles.input} value={searchCriteria.maxBudget} onChange={e => updateSearchCriteria('maxBudget', e.target.value)} /></div>
              <div style={{...styles.formGroup, ...styles.fullWidth}}><label style={styles.label}>Locations</label><textarea style={styles.input} rows={3} value={searchCriteria.locations} onChange={e => updateSearchCriteria('locations', e.target.value)}></textarea></div>
              
              <div style={{...styles.formGroup, ...styles.fullWidth}}>
                <div style={styles.subHeader}>Property Type</div>
                <div style={styles.checkboxGroup}>
                  {['Apartment', 'Villa', 'Penthouse', 'Land', 'Commercial'].map(type => (
                    <label key={type} style={styles.checkboxLabel}>
                      <input type="checkbox" style={styles.checkbox} checked={searchCriteria.propertyTypes.includes(type)} onChange={() => toggleCheckbox('propertyTypes', type)} /> {type}
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}><label style={styles.label}>Min Surface (m²)</label><input type="number" style={styles.input} value={searchCriteria.minSurface} onChange={e => updateSearchCriteria('minSurface', e.target.value)} /></div>
              <div style={styles.formGroup}><label style={styles.label}>Max Surface (m²)</label><input type="number" style={styles.input} value={searchCriteria.maxSurface} onChange={e => updateSearchCriteria('maxSurface', e.target.value)} /></div>
              <div style={styles.formGroup}><label style={styles.label}>Min Bedrooms</label><input type="number" style={styles.input} value={searchCriteria.minBedrooms} onChange={e => updateSearchCriteria('minBedrooms', e.target.value)} /></div>
              <div style={styles.formGroup}><label style={styles.label}>Max Bedrooms</label><input type="number" style={styles.input} value={searchCriteria.maxBedrooms} onChange={e => updateSearchCriteria('maxBedrooms', e.target.value)} /></div>
              
              <div style={{...styles.formGroup, ...styles.fullWidth}}>
                <div style={styles.subHeader}>Required Features</div>
                <div style={styles.checkboxGroup}>
                  {['Pool', 'Garden', 'Terrace/Balcony', 'Garage', 'Sea View', 'Elevator', 'New Build', 'Needs Renovation'].map(feature => (
                    <label key={feature} style={styles.checkboxLabel}>
                      <input type="checkbox" style={styles.checkbox} checked={searchCriteria.features.includes(feature)} onChange={() => toggleCheckbox('features', feature)} /> {feature}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{...styles.formGroup, ...styles.fullWidth}}><label style={styles.label}>Notes</label><textarea style={styles.input} rows={3} value={searchCriteria.notes} onChange={e => updateSearchCriteria('notes', e.target.value)}></textarea></div>
            </div>
          </>
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
