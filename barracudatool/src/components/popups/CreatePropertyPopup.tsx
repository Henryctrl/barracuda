'use client';

import React, { CSSProperties } from 'react';
import Popup from '../Popup';

type StyleObject = { [key: string]: CSSProperties };

interface CreatePropertyPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePropertyPopup({ isOpen, onClose }: CreatePropertyPopupProps) {
    const styles: StyleObject = {
        form: { display: 'flex', flexDirection: 'column', gap: '15px' },
        formGroup: { display: 'flex', flexDirection: 'column' },
        label: { fontSize: '0.9rem', color: '#00ffff', marginBottom: '5px', textTransform: 'uppercase' },
        input: { backgroundColor: 'rgba(0, 255, 255, 0.1)', border: '1px solid #00ffff', borderRadius: '4px', padding: '10px', color: '#ffffff', fontSize: '1rem', outline: 'none' },
        submitButton: { marginTop: '10px', padding: '12px 20px', backgroundColor: '#ff00ff', border: 'none', borderRadius: '5px', color: '#ffffff', fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer' },
    };

  return (
    <Popup isOpen={isOpen} onClose={onClose} title="Create New Property">
      <form style={styles.form}>
        <div style={styles.formGroup}><label htmlFor="property-address" style={styles.label}>Address</label><input type="text" id="property-address" style={styles.input} /></div>
        <div style={styles.formGroup}><label htmlFor="property-type" style={styles.label}>Property Type</label><input type="text" id="property-type" style={styles.input} /></div>
        <div style={styles.formGroup}><label htmlFor="property-surface" style={styles.label}>Surface Area (m²)</label><input type="number" id="property-surface" style={styles.input} /></div>
        <button type="submit" style={styles.submitButton}>Create Property</button>
      </form>
    </Popup>
  );
}
