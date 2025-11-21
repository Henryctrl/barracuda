'use client';

import React, { useState, useEffect, CSSProperties } from 'react';
import Popup from '../Popup';
import ClientFormFields, { ClientFormData } from './ClientFormFields';
import { User, ArrowRight, ArrowLeft, CheckCircle, Loader2, Save } from 'lucide-react';
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

export default function EditClientPopup({ isOpen, onClose, clientId }: EditClientPopupProps) {
  const [stage, setStage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data States
  const [clientData, setClientData] = useState<ClientFormData>({
    firstName: '', lastName: '', address: '', email: '', mobile: '', landline: '', dob: '', pob: ''
  });
  
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteriaData>({
    minBudget: '', maxBudget: '', locations: '', propertyTypes: [], minSurface: '', maxSurface: '', minBedrooms: '', maxBedrooms: '', features: [], notes: ''
  });

  // Fetch Data on Load
  useEffect(() => {
    if (isOpen && clientId) {
      fetchClientData();
    }
  }, [isOpen, clientId]);

  const fetchClientData = async () => {
    setLoading(true);
    
    // 1. Fetch Client Info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error("Error fetching client:", clientError);
      setLoading(false);
      return;
    }

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

    // 2. Fetch Search Criteria
    const { data: criteria, error: criteriaError } = await supabase
      .from('client_search_criteria')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (!criteriaError && criteria) {
      setSearchCriteria({
        minBudget: criteria.min_budget || '',
        maxBudget: criteria.max_budget || '',
        locations: criteria.locations || '',
        propertyTypes: criteria.property_types || [],
        minSurface: criteria.min_surface || '',
        maxSurface: criteria.max_surface || '',
        minBedrooms: criteria.min_bedrooms || '',
        maxBedrooms: criteria.max_bedrooms || '',
        features: criteria.features || [],
        notes: criteria.notes || ''
      });
    }
    setLoading(false);
  };

  // Update Handlers
  const updateClientData = (field: keyof ClientFormData, value: string) => {
    setClientData(prev => ({ ...prev, [field]: value }));
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

  const handleSave = async () => {
    setSaving(true);
    
    // 1. Update Client Table
    const { error: clientError } = await supabase
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

    if (clientError) console.error("Update client error:", clientError);

    // 2. Update/Upsert Search Criteria
    // We use upsert in case criteria didn't exist before
    const { error: searchError } = await supabase
      .from('client_search_criteria')
      .upsert({
        client_id: clientId, // Required for match
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
      }, { onConflict: 'client_id' });

    if (searchError) console.error("Update criteria error:", searchError);

    setSaving(false);
    onClose();
  };

  // --- STYLES ---
  const styles: { [key: string]: CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '20px' },
    stepsBar: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px', gap: '18px' },
    navButtons: { display: 'flex', justifyContent: 'space-between', marginTop: '20px' },
    submitButton: { padding: '12px 20px', backgroundColor: '#ff00ff', border: 'none', borderRadius: '5px', color: '#ffffff', fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' },
    // Input styling matching your request
    input: { backgroundColor: 'rgba(0, 255, 255, 0.1)', border: '1px solid #00ffff', borderRadius: '4px', padding: '10px', color: '#ffffff', fontSize: '1rem', outline: 'none' },
    label: { fontSize: '0.9rem', color: '#00ffff', marginBottom: '5px', textTransform: 'uppercase' },
    formGroup: { display: 'flex', flexDirection: 'column' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    fullWidth: { gridColumn: '1 / -1' },
    subHeader: { color: '#ff00ff', fontSize: '1.1rem', borderBottom: '1px dashed #ff00ff', paddingBottom: '5px', marginBottom: '10px' },
    checkboxGroup: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' },
    checkbox: { accentColor: '#ff00ff' },
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

  if (loading) {
    return (
      <Popup isOpen={isOpen} onClose={onClose} title="Loading...">
        <div style={{display: 'flex', justifyContent: 'center', padding: '40px', color: '#00ffff'}}>
          <Loader2 className="animate-spin" size={48} />
        </div>
      </Popup>
    );
  }

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Edit Client">
      <div style={styles.container}>
        {/* Step Indicator */}
        <div style={styles.stepsBar}>
          <div style={dynamicStyles.stepCircle(stage === 1)}>{stage > 1 ? <CheckCircle size={24} /> : 1}</div>
          <span style={dynamicStyles.stepLabel(stage === 1)}>Info</span>
          <div style={{width: '32px', textAlign: 'center', color: '#ff00ff'}}>→</div>
          <div style={dynamicStyles.stepCircle(stage === 2)}>{stage > 2 ? <CheckCircle size={24} /> : 2}</div>
          <span style={dynamicStyles.stepLabel(stage === 2)}>Search</span>
        </div>

        {stage === 1 && (
          <>
            <div style={styles.subHeader}>Personal Information</div>
            <ClientFormFields data={clientData} onChange={updateClientData} />
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

        <div style={styles.navButtons}>
          {stage === 2 ? (
            <button type="button" onClick={() => setStage(1)} style={{...styles.submitButton, backgroundColor: 'transparent', border: '1px solid #00ffff', color: '#00ffff'}}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : <div />}
          
          {stage === 1 ? (
            <button type="button" onClick={() => setStage(2)} style={{...styles.submitButton, backgroundColor: '#00ffff', color: '#0d0d21'}}>
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={handleSave} disabled={saving} style={{...styles.submitButton, opacity: saving ? 0.7 : 1}}>
              {saving ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : <><Save size={16} /> Save Changes</>}
            </button>
          )}
        </div>
      </div>
    </Popup>
  );
}
