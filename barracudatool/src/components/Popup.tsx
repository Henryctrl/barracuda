'use client';

import React, { CSSProperties } from 'react';
import { X } from 'lucide-react';

type StyleObject = { [key: string]: CSSProperties };

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Popup({ isOpen, onClose, title, children }: PopupProps) {
  if (!isOpen) return null;

  const styles: StyleObject = {
    popupBackdrop: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(13, 13, 33, 0.5)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    popupContainer: {
      backgroundColor: '#0d0d21',
      border: '2px solid #ff00ff',
      borderRadius: '10px',
      padding: '25px',
      width: '90%',
      maxWidth: '800px', // Increased width
      maxHeight: '90vh', // Added max height
      boxShadow: '0 0 25px rgba(255, 0, 255, 0.5)',
      color: '#fff',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    },
    popupHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #ff00ff',
      paddingBottom: '10px',
      marginBottom: '20px',
      flexShrink: 0,
    },
    popupTitle: {
      fontSize: '1.5rem',
      color: '#ff00ff',
      textTransform: 'uppercase',
      textShadow: '0 0 8px rgba(255, 0, 255, 0.7)',
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#00ffff',
      cursor: 'pointer',
    },
    contentArea: {
      overflowY: 'auto', // Make content scrollable
      paddingRight: '15px', // Add some padding for the scrollbar
    },
  };

  return (
    <div style={styles.popupBackdrop} onClick={onClose}>
      <div style={styles.popupContainer} onClick={(e) => e.stopPropagation()}>
        <div style={styles.popupHeader}>
          <h3 style={styles.popupTitle}>{title}</h3>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={28} />
          </button>
        </div>
        <div style={styles.contentArea}>
          {children}
        </div>
      </div>
    </div>
  );
}
