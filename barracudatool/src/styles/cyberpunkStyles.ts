// src/styles/cyberpunkStyles.ts

// --- FIX: Add 'export' before the constants ---
export const cyberpunkStyles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0d0d21',
      padding: '40px',
      fontFamily: "'Orbitron', sans-serif",
      color: '#00ffff',
    },
    main: {
      maxWidth: '900px',
      margin: 'auto',
      border: '2px solid #ff00ff',
      borderRadius: '10px',
      padding: '30px',
      backgroundColor: 'rgba(10, 10, 30, 0.8)',
      boxShadow: '0 0 25px rgba(255, 0, 255, 0.6)',
    },
    header: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      color: '#ff00ff',
      textShadow: '0 0 10px #ff00ff',
      textAlign: 'center' as const,
      marginBottom: '10px',
    },
    subHeader: {
      textAlign: 'center' as const,
      color: '#00ffff',
      textShadow: '0 0 8px #00ffff',
      marginBottom: '30px',
    },
    inputGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
    },
    label: {
      fontSize: '0.9rem',
      color: '#ff00ff',
      marginBottom: '8px',
      textTransform: 'uppercase' as const,
    },
    input: {
      backgroundColor: '#000',
      border: '2px solid #00ffff',
      borderRadius: '5px',
      color: '#00ffff',
      fontFamily: "'Orbitron', sans-serif",
      padding: '10px',
      fontSize: '1rem',
      boxShadow: 'inset 0 0 10px rgba(0, 255, 255, 0.5)',
    },
    button: {
      width: '100%',
      padding: '15px',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      color: '#fff',
      backgroundColor: '#ff00ff',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      textShadow: '0 0 5px #fff',
      boxShadow: '0 0 20px #ff00ff',
      transition: 'all 0.3s ease',
    },
    buttonDisabled: {
      backgroundColor: '#555',
      boxShadow: 'none',
      cursor: 'not-allowed',
      color: '#999',
    },
    messageBox: {
      marginTop: '20px',
      padding: '15px',
      borderRadius: '5px',
      textAlign: 'center' as const,
      fontWeight: 'bold',
    },
    errorBox: {
      backgroundColor: 'rgba(255, 0, 100, 0.2)',
      border: '1px solid #ff0064',
      color: '#ff0064',
    },
    infoBox: {
      backgroundColor: 'rgba(0, 255, 255, 0.2)',
      border: '1px solid #00ffff',
      color: '#00ffff',
    },
    resultsHeader: {
      marginTop: '40px',
      borderTop: '2px dashed #ff00ff',
      paddingTop: '30px',
      textAlign: 'center' as const,
    },
    resultCard: {
      border: '1px solid #00ffff',
      borderRadius: '8px',
      marginBottom: '15px',
      padding: '20px',
      backgroundColor: '#0a0a25',
      boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
      transition: 'all 0.3s ease',
    },
    resultCardHighlight: {
      border: '1px solid #ff00ff',
      boxShadow: '0 0 25px rgba(255, 0, 255, 0.7)',
    },
    cardHeader: {
      fontSize: '1.2rem',
      color: '#ff00ff',
      fontWeight: 'bold',
      marginBottom: '15px',
    },
    cardGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
    },
    dataPoint: {
      fontSize: '0.9rem',
    },
    dataLabel: {
      color: '#00ffff',
      opacity: 0.7,
      display: 'block',
    },
    dataValue: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
    dpeNumber: {
      marginTop: '15px',
      fontSize: '0.8rem',
      textAlign: 'right' as const,
      color: '#aaa',
      fontStyle: 'italic',
    },
  };
  
  // --- FIX: Also export the color helper function ---
  export const getDpeColor = (rating: string) => {
      switch (rating) {
        case 'A': return '#00ff00';
        case 'B': return '#adff2f';
        case 'C': return '#ffff00';
        case 'D': return '#ffd700';
        case 'E': return '#ffa500';
        case 'F': return '#ff4500';
        case 'G': return '#ff0000';
        default: return '#808080';
      }
  };
  