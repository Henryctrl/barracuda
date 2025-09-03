'use client'

import Link from 'next/link'

export default function HomePage() {
  
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0d0d21',
      padding: '15px', // Reduced from 40px for mobile
      fontFamily: "'Orbitron', sans-serif",
      color: '#00ffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // Mobile-first responsive padding
      '@media (min-width: 576px)': {
        padding: '40px', // Original padding for SM and up
      },
    },
    main: {
      maxWidth: '900px',
      width: '100%',
      margin: 'auto',
      border: '2px solid #ff00ff',
      borderRadius: '10px',
      padding: '20px', // Reduced from 40px for mobile
      backgroundColor: 'rgba(10, 10, 30, 0.85)',
      boxShadow: '0 0 35px rgba(255, 0, 255, 0.6)',
      textAlign: 'center' as const,
      // Mobile-first responsive padding
      '@media (min-width: 576px)': {
        padding: '40px', // Original padding for SM and up
      },
    },
    header: {
      fontSize: '2.5rem', // Reduced from 4.5rem for mobile
      fontWeight: 'bold',
      color: '#ff00ff',
      textShadow: '0 0 15px #ff00ff, 0 0 5px #ffffff',
      marginBottom: '10px',
      letterSpacing: '2px', // Reduced from 4px for mobile
      // Mobile-first responsive sizing
      '@media (min-width: 576px)': {
        fontSize: '4.5rem', // Original size for SM and up
        letterSpacing: '4px', // Original letter spacing for SM and up
      },
    },
    subHeader: {
      fontSize: '1rem', // Reduced from 1.2rem for mobile
      color: '#00ffff',
      textShadow: '0 0 8px #00ffff',
      marginBottom: '30px', // Reduced from 40px for mobile
      fontStyle: 'italic',
      // Mobile-first responsive sizing
      '@media (min-width: 576px)': {
        fontSize: '1.2rem', // Original size for SM and up
        marginBottom: '40px', // Original margin for SM and up
      },
    },
    contentSection: {
      borderTop: '1px dashed #00ffff',
      paddingTop: '20px', // Reduced from 30px for mobile
      marginTop: '20px', // Reduced from 30px for mobile
      // Mobile-first responsive spacing
      '@media (min-width: 576px)': {
        paddingTop: '30px', // Original padding for SM and up
        marginTop: '30px', // Original margin for SM and up
      },
    },
    sectionHeader: {
      fontSize: '1.25rem', // Reduced from 1.5rem for mobile
      color: '#ff00ff',
      textTransform: 'uppercase' as const,
      marginBottom: '15px',
      // Mobile-first responsive sizing
      '@media (min-width: 576px)': {
        fontSize: '1.5rem', // Original size for SM and up
      },
    },
    bodyText: {
      color: '#c0c0ff',
      fontSize: '0.9rem', // Reduced from 1rem for mobile
      lineHeight: '1.6',
      maxWidth: '700px',
      margin: '0 auto 20px auto', // Reduced bottom margin from 30px for mobile
      // Mobile-first responsive sizing
      '@media (min-width: 576px)': {
        fontSize: '1rem', // Original size for SM and up
        margin: '0 auto 30px auto', // Original margin for SM and up
      },
    },
    directiveGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr', // Single column for mobile
      gap: '15px', // Reduced from 20px for mobile
      textAlign: 'left' as const,
      marginTop: '15px', // Reduced from 20px for mobile
      // Mobile-first responsive grid
      '@media (min-width: 576px)': {
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', // Original grid for SM and up
        gap: '20px', // Original gap for SM and up
        marginTop: '20px', // Original margin for SM and up
      },
    },
    directiveItem: {
      border: '1px solid #00ffff',
      backgroundColor: 'rgba(0, 255, 255, 0.05)',
      padding: '12px', // Reduced from 15px for mobile
      borderRadius: '5px',
      color: '#00ffff',
      fontWeight: 'bold',
      boxShadow: 'inset 0 0 8px rgba(0, 255, 255, 0.3)',
      // Mobile-first responsive padding
      '@media (minWidth: 576px)': {
        padding: '15px', // Original padding for SM and up
      },
    },
    button: {
      width: '90%', // Increased from 60% for mobile
      margin: '30px auto 0 auto', // Reduced top margin from 40px for mobile
      padding: '15px', // Reduced from 18px for mobile
      fontSize: '1.25rem', // Reduced from 1.5rem for mobile
      fontWeight: 'bold',
      color: '#0d0d21',
      backgroundColor: '#00ffff',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      textShadow: '0 0 5px #0d0d21',
      boxShadow: '0 0 25px #00ffff',
      transition: 'all 0.3s ease',
      display: 'block',
      textDecoration: 'none',
      // Mobile-first responsive sizing
      '@media (min-width: 576px)': {
        width: '60%', // Original width for SM and up
        margin: '40px auto 0 auto', // Original margin for SM and up
        padding: '18px', // Original padding for SM and up
        fontSize: '1.5rem', // Original font size for SM and up
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

        <Link href="/hunter" style={styles.button}>
            [ INITIATE DIVE ]
        </Link>
      </main>
    </div>
  )
}
