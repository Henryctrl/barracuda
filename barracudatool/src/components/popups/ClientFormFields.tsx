'use client';

import React, { CSSProperties } from 'react';

type StyleObject = { [key: string]: CSSProperties };

// Define the data shape so the parent can use it too
export interface ClientFormData {
  firstName: string;
  lastName: string;
  address: string;
  email: string;
  mobile: string;
  landline: string;
  dob: string;
  pob: string;
}

interface ClientFormFieldsProps {
  data?: ClientFormData;
  onChange?: (field: keyof ClientFormData, value: string) => void;
}

export default function ClientFormFields({ data, onChange }: ClientFormFieldsProps) {
  const styles: StyleObject = {
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    formGroup: { display: 'flex', flexDirection: 'column' },
    label: { fontSize: '0.9rem', color: '#00ffff', marginBottom: '5px', textTransform: 'uppercase' },
    input: { backgroundColor: 'rgba(0, 255, 255, 0.1)', border: '1px solid #00ffff', borderRadius: '4px', padding: '10px', color: '#ffffff', fontSize: '1rem', outline: 'none' },
    fullWidth: { gridColumn: '1 / -1' },
  };

  // Helper to safely handle changes even if no handler is passed
  const handleChange = (field: keyof ClientFormData, value: string) => {
    if (onChange) {
      onChange(field, value);
    }
  };

  // Default empty values if data prop is missing
  const values = data || {
    firstName: '',
    lastName: '',
    address: '',
    email: '',
    mobile: '',
    landline: '',
    dob: '',
    pob: ''
  };

  return (
    <div style={styles.grid}>
      <div style={styles.formGroup}>
        <label style={styles.label}>First Name</label>
        <input 
          style={styles.input} 
          value={values.firstName} 
          onChange={(e) => handleChange('firstName', e.target.value)} 
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Last Name</label>
        <input 
          style={styles.input} 
          value={values.lastName} 
          onChange={(e) => handleChange('lastName', e.target.value)} 
        />
      </div>
      <div style={{...styles.formGroup, ...styles.fullWidth}}>
        <label style={styles.label}>Address</label>
        <input 
          style={styles.input} 
          value={values.address} 
          onChange={(e) => handleChange('address', e.target.value)} 
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Email</label>
        <input 
          type="email" 
          style={styles.input} 
          value={values.email} 
          onChange={(e) => handleChange('email', e.target.value)} 
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Mobile</label>
        <input 
          type="tel" 
          style={styles.input} 
          value={values.mobile} 
          onChange={(e) => handleChange('mobile', e.target.value)} 
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Landline (Optional)</label>
        <input 
          type="tel" 
          style={styles.input} 
          value={values.landline} 
          onChange={(e) => handleChange('landline', e.target.value)} 
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Date of Birth</label>
        <input 
          type="date" 
          style={styles.input} 
          value={values.dob} 
          onChange={(e) => handleChange('dob', e.target.value)} 
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Place of Birth</label>
        <input 
          style={styles.input} 
          value={values.pob} 
          onChange={(e) => handleChange('pob', e.target.value)} 
        />
      </div>
    </div>
  );
};
