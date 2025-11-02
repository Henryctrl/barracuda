'use client';

import React, { CSSProperties } from 'react';
import Popup from '../Popup';

type StyleObject = { [key: string]: CSSProperties };

interface CreateMandatePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateMandatePopup({ isOpen, onClose }: CreateMandatePopupProps) {
  const styles: StyleObject = {
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    formGroup: { display: 'flex', flexDirection: 'column' },
    label: { fontSize: '0.9rem', color: '#00ffff', marginBottom: '5px', textTransform: 'uppercase' },
    input: { backgroundColor: 'rgba(0, 255, 255, 0.1)', border: '1px solid #00ffff', borderRadius: '4px', padding: '10px', color: '#ffffff', fontSize: '1rem', outline: 'none' },
    submitButton: { marginTop: '10px', padding: '12px 20px', backgroundColor: '#ff00ff', border: 'none', borderRadius: '5px', color: '#ffffff', fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer' },
  };

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Create New Mandate">
      <form style={styles.form}>
        <div style={styles.formGroup}><label htmlFor="mandate-property" style={styles.label}>Property ID</label><input type="text" id="mandate-property" style={styles.input} /></div>
        <div style={styles.formGroup}><label htmlFor="mandate-client" style={styles.label}>Client Name</label><input type="text" id="mandate-client" style={styles.input} /></div>
        <div style={styles.formGroup}><label htmlFor="mandate-price" style={styles.label}>Asking Price (€)</label><input type="number" id="mandate-price" style={styles.input} /></div>
        <button type="submit" style={styles.submitButton}>Create Mandate</button>
      </form>
    </Popup>
  );
}
