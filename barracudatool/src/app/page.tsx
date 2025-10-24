'use client'

import Link from 'next/link'

export default function HomePage() {
  
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0d0d21',
      padding: '15px', 
      fontFamily: "'Orbitron', sans-serif",
      color: '#00ffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '@media (minWidth: 576px)': {
        padding: '40px',
      },
    },
    main: {
      maxWidth: '900px',
      width: '100%',
      margin: 'auto',
      border: '2px solid #ff00ff',
      borderRadius: '10px',
      padding: '20px',
      backgroundColor: 'rgba(10, 10, 30, 0.85)',
      boxShadow: '0 0 35px rgba(255, 0, 255, 0.6)',
      textAlign: 'center' as const,
      '@media (minWidth: 576px)': {
        padding: '40px',
      },
    },
    header: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      color: '#ff00ff',
      textShadow: '0 0 15px #ff00ff, 0 0 5px #ffffff',
      marginBottom: '10px',
      letterSpacing: '2px',
      '@media (minWidth: 576px)': {
        fontSize: '4.5rem',
        letterSpacing: '4px',
      },
    },
    subHeader: {
      fontSize: '1rem',
      color: '#00ffff',
      textShadow: '0 0 8px #00ffff',
      marginBottom: '30px',
      fontStyle: 'italic',
      '@media (minWidth: 576px)': {
        fontSize: '1.2rem',
        marginBottom: '40px',
      },
    },
    contentSection: {
      borderTop: '1px dashed #00ffff',
      paddingTop: '20px',
      marginTop: '20px',
      '@media (minWidth: 576px)': {
        paddingTop: '30px',
        marginTop: '30px',
      },
    },
    sectionHeader: {
      fontSize: '1.25rem',
      color: '#ff00ff',
      textTransform: 'uppercase' as const,
      marginBottom: '15px',
      '@media (minWidth: 576px)': {
        fontSize: '1.5rem',
      },
    },
    bodyText: {
      color: '#c0c0ff',
      fontSize: '0.9rem',
      lineHeight: '1.6',
      maxWidth: '700px',
      margin: '0 auto 20px auto',
      '@media (minWidth: 576px)': {
        fontSize: '1rem',
        margin: '0 auto 30px auto',
      },
    },
    directiveGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '15px',
      textAlign: 'left' as const,
      marginTop: '15px',
      '@media (minWidth: 576px)': {
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '20px',
      },
    },
    directiveItem: {
      border: '1px solid #00ffff',
      backgroundColor: 'rgba(0, 255, 255, 0.05)',
      padding: '12px',
      borderRadius: '5px',
      color: '#00ffff',
      fontWeight: 'bold',
      boxShadow: 'inset 0 0 8px rgba(0, 255, 255, 0.3)',
      '@media (minWidth: 576px)': {
        padding: '15px',
      },
    },
    button: {
      width: 'auto',  // Changed to auto for flex layout
      padding: '15px 25px', // Adjusted padding for better appearance
      fontSize: '1rem', // Slightly smaller font for dual buttons
      fontWeight: 'bold',
      color: '#0d0d21',
      backgroundColor: '#00ffff',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      textShadow: '0 0 5px #0d0d21',
      boxShadow: '0 0 25px #00ffff',
      transition: 'all 0.3s ease',
      textDecoration: 'none',
      '@media (minWidth: 576px)': {
        padding: '18px 30px',
        fontSize: '1.25rem',
      },
    },
    // New style for the button container
    buttonContainer: {
        display: 'flex',
        flexDirection: 'column' as const, // Stack buttons on mobile
        alignItems: 'center',
        gap: '15px',
        marginTop: '30px',
        '@media (minWidth: 576px)': {
            flexDirection: 'row' as const, // Side-by-side on larger screens
            justifyContent: 'center',
            gap: '20px',
            marginTop: '40px'
        },
    },
  };

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        <h1 style={styles.header}>BARRACUDA</h1>
        <p style={styles.subHeader}>{'// THE DEEP DATA DIVE PROTOCOL'}</p>

        <p style={styles.bodyText}>
          In the neon-drenched abyss of the data sphere, information flows in torrents. To navigate it is to survive. To command it is to prevail. Barracuda is your vessel—an apex predator in the digital ocean, engineered for speed, precision, and relentless efficiency.
        </p>

        <div style={styles.contentSection}>
          <h2 style={styles.sectionHeader}>{'// Core Directives'}</h2>
          <div style={styles.directiveGrid}>
            <div style={styles.directiveItem}>{'>'} STEALTH PENETRATION</div>
            <div style={styles.directiveItem}>{'>'} RAPID DATA EXTRACTION</div>
            <div style={styles.directiveItem}>{'>'} PREDICTIVE ANALYSIS</div>
            <div style={styles.directiveItem}>{'>'} TOTAL ANOMALY DETECTION</div>
          </div>
        </div>

        {/* --- UPDATED BUTTON CONTAINER --- */}
        <div style={styles.buttonContainer}>
            <Link href="/hunter" style={styles.button}>
                [ INITIATE HUNTER ]
            </Link>
            <Link href="/gatherer" style={styles.button}>
                [ INITIATE GATHERER ]
            </Link>
        </div>
      </main>
    </div>
  )
}
