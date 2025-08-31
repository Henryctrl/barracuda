//src/components/dpe/DpeResultCard.tsx
import React from 'react';
import { DPERecord } from '../../types/dpe';
import { cyberpunkStyles as styles, getDpeColor } from '../../styles/cyberpunkStyles';

interface Props {
  dpe: DPERecord;
  index: number;
}

export const DpeResultCard: React.FC<Props> = ({ dpe, index }) => {
  return (
    <div style={{...styles.resultCard, ...(index === 0 && styles.resultCardHighlight)}}>
      <div style={styles.cardHeader}>TARGET #{index + 1} - {dpe.adresse_brut}</div>
      <div style={styles.cardGrid}>
        <div style={styles.dataPoint}>
          <span style={styles.dataLabel}>PROXIMITY</span>
          <span style={styles.dataValue}>{Math.round(dpe._distance ?? 0)} meters</span>
        </div>
        <div style={styles.dataPoint}>
          <span style={styles.dataLabel}>LOCATION</span>
          <span style={styles.dataValue}>{dpe.nom_commune_ban} ({dpe.code_postal_ban})</span>
        </div>
        <div style={styles.dataPoint}>
          <span style={styles.dataLabel}>ENERGY CLASS</span>
          <span style={{...styles.dataValue, color: getDpeColor(dpe.etiquette_dpe)}}>
            {dpe.etiquette_dpe}
          </span>
        </div>
        <div style={styles.dataPoint}>
          <span style={styles.dataLabel}>GHG EMISSIONS</span>
          <span style={{...styles.dataValue, color: getDpeColor(dpe.etiquette_ges)}}>
            {dpe.etiquette_ges}
          </span>
        </div>
      </div>
      <div style={styles.dpeNumber}>ID: {dpe.numero_dpe}</div>
    </div>
  );
};
