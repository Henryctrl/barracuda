// src/components/dpe/DpeResults.tsx
import React from 'react';
import { DPERecord } from '../../types/dpe';
import { DpeResultCard } from './DpeResultCard';
import { cyberpunkStyles as styles } from '../../styles/cyberpunkStyles';


interface Props {
  results: DPERecord[];
}

export const DpeResults: React.FC<Props> = ({ results }) => {
  if (results.length === 0) return null;

  return (
    <div style={styles.resultsHeader}>
       <h2 style={styles.header}>SCAN RESULTS</h2>
       <p style={styles.subHeader}>ASSETS SORTED BY PROXIMITY</p>
      {results.map((dpe, index) => (
        <DpeResultCard key={dpe.numero_dpe} dpe={dpe} index={index} />
      ))}
    </div>
  );
};
