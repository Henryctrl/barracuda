'use client';

import React, { useState, CSSProperties } from 'react';
import Popup from '../Popup';
import ClientFormFields from './ClientFormFields';
import { User, Plus, Trash2, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

// --- STYLES ---
// Static styles that do not change
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
};

// Dynamic styles that are functions
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

// --- COMPONENT ---
interface CreateClientPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Relation {
  id: number;
}

export default function CreateClientPopup({ isOpen, onClose }: CreateClientPopupProps) {
  const [stage, setStage] = useState<number>(1);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [expandedRelation, setExpandedRelation] = useState<number | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setStage(1);
      setRelations([]);
      setExpandedRelation(null);
    }
  }, [isOpen]);

  const relationTypes = [
    'Partner', 'Spouse', 'Child', 'Parent', 'Sibling',
    'Roommate', 'Friend', 'Business Partner', 'Colleague', 'Other'
  ];

  const addRelation = () => {
    if (relations.length < 20) {
      const newId = Date.now();
      setRelations([...relations, { id: newId }]);
      setExpandedRelation(newId);
    }
  };

  const removeRelation = (id: number) => {
    setRelations(relations.filter(r => r.id !== id));
    if (expandedRelation === id) setExpandedRelation(null);
  };

  const toggleRelation = (id: number) => {
    setExpandedRelation(expandedRelation === id ? null : id);
  };

  const handleFinalSubmit = () => {
    console.log('Submitting all client data...');
    onClose();
  };
  
  const Stage1 = () => (
    <>
      <div style={styles.subHeader}>Primary Client Details</div>
      <ClientFormFields />
      <div style={{ ...styles.subHeader, marginTop: '20px' }}>Relations ({relations.length}/20)</div>
      {relations.map((rel, index) => (
        <div key={rel.id} style={styles.relationContainer}>
          <div style={styles.relationHeader} onClick={() => toggleRelation(rel.id)}>
            <span>Relation #{index + 1}</span>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <button type="button" style={{...styles.iconButton, color: '#ff00ff'}} onClick={(e) => { e.stopPropagation(); removeRelation(rel.id); }}><Trash2 size={20} /></button>
              {expandedRelation === rel.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
          {expandedRelation === rel.id && (
            <div style={styles.relationBody}>
              <div style={{...styles.formGroup, marginBottom: '15px'}}>
                <label style={styles.label}>Relationship to Primary Client</label>
                <select style={styles.input} defaultValue="">
                  <option value="">Select a relationship...</option>
                  {relationTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <ClientFormFields />
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
  );

  const Stage2 = () => (
     <>
      <div style={styles.grid}>
        <div style={{...styles.formGroup, ...styles.fullWidth}}><div style={styles.subHeader}>Search Criteria</div></div>
        <div style={styles.formGroup}><label style={styles.label}>Min Budget (€)</label><input type="number" style={styles.input} /></div>
        <div style={styles.formGroup}><label style={styles.label}>Max Budget (€)</label><input type="number" style={styles.input} /></div>
        <div style={{...styles.formGroup, ...styles.fullWidth}}><label style={styles.label}>Locations (Cities, Postcodes)</label><textarea style={styles.input} rows={3}></textarea></div>
        <div style={{...styles.formGroup, ...styles.fullWidth}}><div style={styles.subHeader}>Property Type</div><div style={styles.checkboxGroup}>{['Apartment', 'Villa', 'Penthouse', 'Land', 'Commercial'].map(type => (<label key={type} style={styles.checkboxLabel}><input type="checkbox" style={styles.checkbox} /> {type}</label>))}</div></div>
        <div style={styles.formGroup}><label style={styles.label}>Min Surface (m²)</label><input type="number" style={styles.input} /></div>
        <div style={styles.formGroup}><label style={styles.label}>Max Surface (m²)</label><input type="number" style={styles.input} /></div>
        <div style={styles.formGroup}><label style={styles.label}>Min Bedrooms</label><input type="number" style={styles.input} /></div>
        <div style={styles.formGroup}><label style={styles.label}>Max Bedrooms</label><input type="number" style={styles.input} /></div>
        <div style={{...styles.formGroup, ...styles.fullWidth}}><div style={styles.subHeader}>Required Features</div><div style={styles.checkboxGroup}>{['Pool', 'Garden', 'Terrace/Balcony', 'Garage', 'Sea View', 'Elevator', 'New Build', 'Needs Renovation'].map(feature => (<label key={feature} style={styles.checkboxLabel}><input type="checkbox" style={styles.checkbox} /> {feature}</label>))}</div></div>
        <div style={{...styles.formGroup, ...styles.fullWidth}}><label style={styles.label}>Notes / Keywords</label><textarea style={styles.input} rows={3}></textarea></div>
      </div>
    </>
  );

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
        
        {stage === 1 ? <Stage1 /> : <Stage2 />}

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
            <button type="button" onClick={handleFinalSubmit} style={styles.submitButton}>
              <User size={16} /> Create Client
            </button>
          )}
        </div>
      </div>
    </Popup>
  );
}
