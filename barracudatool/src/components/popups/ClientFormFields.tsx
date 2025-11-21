'use client';

import React from 'react';

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
  // Helper to safely handle changes
  const handleChange = (field: keyof ClientFormData, value: string) => {
    if (onChange) onChange(field, value);
  };

  const values = data || { firstName: '', lastName: '', address: '', email: '', mobile: '', landline: '', dob: '', pob: '' };

  // Common input class using Tailwind
  const inputClass = "w-full bg-[#0d0d21]/50 border border-[#00ffff] rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-[#ff00ff] placeholder-white/30";
  const labelClass = "text-xs font-bold text-[#00ffff] mb-1 uppercase tracking-wider";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex flex-col">
        <label className={labelClass}>First Name</label>
        <input className={inputClass} value={values.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
      </div>
      <div className="flex flex-col">
        <label className={labelClass}>Last Name</label>
        <input className={inputClass} value={values.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
      </div>
      <div className="flex flex-col md:col-span-2">
        <label className={labelClass}>Address</label>
        <input className={inputClass} value={values.address} onChange={(e) => handleChange('address', e.target.value)} />
      </div>
      <div className="flex flex-col">
        <label className={labelClass}>Email</label>
        <input type="email" className={inputClass} value={values.email} onChange={(e) => handleChange('email', e.target.value)} />
      </div>
      <div className="flex flex-col">
        <label className={labelClass}>Mobile</label>
        <input type="tel" className={inputClass} value={values.mobile} onChange={(e) => handleChange('mobile', e.target.value)} />
      </div>
      <div className="flex flex-col">
        <label className={labelClass}>Landline (Optional)</label>
        <input type="tel" className={inputClass} value={values.landline} onChange={(e) => handleChange('landline', e.target.value)} />
      </div>
      <div className="flex flex-col">
        <label className={labelClass}>Date of Birth</label>
        <input type="date" className={inputClass} value={values.dob} onChange={(e) => handleChange('dob', e.target.value)} />
      </div>
      <div className="flex flex-col">
        <label className={labelClass}>Place of Birth</label>
        <input className={inputClass} value={values.pob} onChange={(e) => handleChange('pob', e.target.value)} />
      </div>
    </div>
  );
};
