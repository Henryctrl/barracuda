'use client';

import React, { CSSProperties } from 'react';

type StyleObject = { [key: string]: CSSProperties };

export default function ClientFormFields() {
  const styles: StyleObject = {
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    formGroup: { display: 'flex', flexDirection: 'column' },
    label: { fontSize: '0.9rem', color: '#00ffff', marginBottom: '5px', textTransform: 'uppercase' },
    input: { backgroundColor: 'rgba(0, 255, 255, 0.1)', border: '1px solid #00ffff', borderRadius: '4px', padding: '10px', color: '#ffffff', fontSize: '1rem', outline: 'none' },
    fullWidth: { gridColumn: '1 / -1' },
  };

  return (
    <div style={styles.grid}>
      <div style={styles.formGroup}><label style={styles.label}>First Name</label><input style={styles.input} /></div>
      <div style={styles.formGroup}><label style={styles.label}>Last Name</label><input style={styles.input} /></div>
      <div style={{...styles.formGroup, ...styles.fullWidth}}><label style={styles.label}>Address</label><input style={styles.input} /></div>
      <div style={styles.formGroup}><label style={styles.label}>Email</label><input type="email" style={styles.input} /></div>
      <div style={styles.formGroup}><label style={styles.label}>Mobile</label><input type="tel" style={styles.input} /></div>
      <div style={styles.formGroup}><label style={styles.label}>Landline (Optional)</label><input type="tel" style={styles.input} /></div>
      <div style={styles.formGroup}><label style={styles.label}>Date of Birth</label><input type="date" style={styles.input} /></div>
      <div style={styles.formGroup}><label style={styles.label}>Place of Birth</label><input style={styles.input} /></div>
    </div>
  );
};
