'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react';

// New component for the animated ticker
const SystemTicker = () => {
    const messages = [
        "// INITIATING DEEP DATA DIVE...",
        "// MARKET VOLATILITY: +3.14%...",
        "// NEW ASSET DETECTED: SECTOR 7G...",
        "// AGENT ONLINE: CODENAME 'VIPER'...",
        "// SYNCHRONIZING WITH GLOBAL MATRIX...",
        "// AUTHENTICATION SECURE...",
    ];

    const styles = {
        tickerContainer: {
            backgroundColor: '#000',
            color: '#00ff00',
            fontFamily: "'Courier New', Courier, monospace",
            padding: '5px 0',
            overflow: 'hidden',
            whiteSpace: 'nowrap' as const,
            borderBottom: '1px solid #00ff00',
            boxShadow: '0 0 10px #00ff00',
            position: 'fixed' as const,
            top: 0,
            width: '100%',
            zIndex: 10,
        },
        tickerText: {
            display: 'inline-block',
            animation: 'scroll-left 25s linear infinite',
            paddingLeft: '100%',
        }
    };

    return (
        <div style={styles.tickerContainer}>
            <div style={styles.tickerText}>
                {messages.join(' ')}&nbsp;&nbsp;&nbsp;{messages.join(' ')}&nbsp;&nbsp;&nbsp;
            </div>
            <style jsx global>{`
                @keyframes scroll-left {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
};

export default function HomePage() {
  
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0d0d21',
      backgroundImage: `
        linear-gradient(rgba(13, 13, 33, 0.95), rgba(13, 13, 33, 0.95)),
        repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0, 255, 255, 0.1) 1px, rgba(0, 255, 255, 0.1) 2px),
        repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0, 255, 255, 0.1) 1px, rgba(0, 255, 255, 0.1) 2px)
      `,
      backgroundSize: '100%, 50px 50px, 50px 50px',
      padding: '80px 15px 40px 15px',
      fontFamily: "'Orbitron', sans-serif",
      color: '#00ffff',
    },
    authContainer: {
        position: 'fixed' as const,
        top: '20px',
        right: '30px',
        zIndex: 100,
        display: 'flex',
        gap: '15px',
    },
    authButton: {
        padding: '10px 25px',
        fontSize: '1rem',
        fontWeight: 'bold',
        color: '#0d0d21',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        textShadow: '0 0 5px #0d0d21',
        transition: 'all 0.3s ease',
        textDecoration: 'none',
    },
    loginButton: {
        backgroundColor: '#ff00ff',
        boxShadow: '0 0 20px #ff00ff',
        ':hover': {
            boxShadow: '0 0 40px #ff00ff, 0 0 15px #ffffff',
            transform: 'scale(1.05)'
        }
    },
    signupButton: {
        backgroundColor: '#00ff99', // A new color for distinction
        boxShadow: '0 0 20px #00ff99',
         ':hover': {
            boxShadow: '0 0 40px #00ff99, 0 0 15px #ffffff',
            transform: 'scale(1.05)'
        }
    },
    main: {
      maxWidth: '1200px',
      width: '100%',
      margin: 'auto',
      border: '2px solid #ff00ff',
      borderRadius: '10px',
      padding: '40px',
      backgroundColor: 'rgba(10, 10, 30, 0.85)',
      boxShadow: '0 0 45px rgba(255, 0, 255, 0.6)',
      textAlign: 'center' as const,
    },
    header: {
      fontSize: '4.5rem',
      fontWeight: 'bold',
      color: '#ff00ff',
      textShadow: '0 0 15px #ff00ff, 0 0 5px #ffffff',
      marginBottom: '10px',
      letterSpacing: '4px',
      position: 'relative' as const,
    },
    glitchLayer: {
        position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', color: '#00ffff', textShadow: '-2px 0 #00ff00', clipPath: 'inset(20% 0 60% 0)', animation: glitch ? 'glitch-anim-1 0.5s infinite linear alternate-reverse' : 'none',
    },
    glitchLayer2: {
        position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', color: '#ff00ff', textShadow: '2px 0 #ff00ff', clipPath: 'inset(60% 0 20% 0)', animation: glitch ? 'glitch-anim-2 0.5s infinite linear alternate-reverse' : 'none',
    },
    subHeader: {
      fontSize: '1.2rem',
      color: '#00ffff',
      textShadow: '0 0 8px #00ffff',
      marginBottom: '40px',
      fontStyle: 'italic',
    },
    contentSection: {
      borderTop: '1px dashed #00ffff',
      paddingTop: '30px',
      marginTop: '30px',
    },
    sectionHeader: {
      fontSize: '1.75rem',
      color: '#ff00ff',
      textTransform: 'uppercase' as const,
      marginBottom: '30px',
    },
    buttonContainer: {
        display: 'flex', flexDirection: 'row' as const, justifyContent: 'center', gap: '30px', margin: '80px 0 40px 0', // Increased top margin
    },
    button: {
      padding: '18px 40px', fontSize: '1.5rem', fontWeight: 'bold', color: '#0d0d21', border: 'none', borderRadius: '5px', cursor: 'pointer', textShadow: '0 0 5px #0d0d21', transition: 'all 0.3s ease', textDecoration: 'none',
    },
    hunterButton: {
        backgroundColor: '#00ffff', boxShadow: '0 0 25px #00ffff', ':hover': { boxShadow: '0 0 45px #00ffff, 0 0 15px #ffffff', }
    },
    gathererButton: {
        backgroundColor: '#ff00ff', boxShadow: '0 0 25px #ff00ff', ':hover': { boxShadow: '0 0 45px #ff00ff, 0 0 15px #ffffff', }
    },
    targetGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', textAlign: 'left' as const,
    },
    targetCard: {
        border: '1px solid #00ffff', borderRadius: '8px', backgroundColor: 'rgba(0, 255, 255, 0.05)', overflow: 'hidden', boxShadow: 'inset 0 0 10px rgba(0, 255, 255, 0.2)', transition: 'transform 0.3s ease, box-shadow 0.3s ease', ':hover': { transform: 'scale(1.03)', boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)' }
    },
    targetImage: {
        width: '100%', height: '180px', objectFit: 'cover' as const, borderBottom: '1px solid #00ffff',
    },
    targetInfo: {
        padding: '20px',
    },
    targetCodename: {
        fontSize: '1.2rem', fontWeight: 'bold', color: '#ff00ff', marginBottom: '15px',
    },
    targetData: {
        fontSize: '0.9rem', color: '#c0c0ff', lineHeight: '1.6',
    },
  };

  return (
    <div style={styles.container}>
      <SystemTicker />
      
      <div style={styles.authContainer}>
        <Link href="/signup" style={{...styles.authButton, ...styles.signupButton}}>
            [ SIGN UP ]
        </Link>
        <Link href="/login" style={{...styles.authButton, ...styles.loginButton}}>
            [ AGENT LOGIN ]
        </Link>
      </div>

      <main style={styles.main}>
        <h1 style={styles.header}>
            BARRACUDA
            <span style={styles.glitchLayer}>BARRACUDA</span>
            <span style={styles.glitchLayer2}>BARRACUDA</span>
        </h1>
        <p style={styles.subHeader}>{'// THE DEEP DATA DIVE PROTOCOL'}</p>

        <div style={styles.buttonContainer}>
            <Link href="/hunter" style={{...styles.button, ...styles.hunterButton}}>[ INITIATE HUNTER ]</Link>
            <Link href="/gatherer" style={{...styles.button, ...styles.gathererButton}}>[ ACCESS GATHERER ]</Link>
        </div>

        <div style={styles.contentSection}>
            <h2 style={styles.sectionHeader}>{'// PRIORITY TARGETS'}</h2>
            <div style={styles.targetGrid}>
                <div style={styles.targetCard}>
                    <img src="https://via.placeholder.com/400x250/0d0d21/ff00ff?text=TARGET+IMAGE" alt="Skybreaker Loft" style={styles.targetImage} />
                    <div style={styles.targetInfo}>
                        <h3 style={styles.targetCodename}>TARGET: SKYBREAKER LOFT</h3>
                        <p style={styles.targetData}>
                            PRICE: €1,200,000<br/>
                            LOCATION: NEO-PARIS SECTOR 7<br/>
                            CLASS: PENTHOUSE
                        </p>
                    </div>
                </div>
                <div style={styles.targetCard}>
                    <img src="https://via.placeholder.com/400x250/0d0d21/00ffff?text=TARGET+IMAGE" alt="Aetherium Villa" style={styles.targetImage} />
                    <div style={styles.targetInfo}>
                        <h3 style={styles.targetCodename}>TARGET: AETHERIUM VILLA</h3>
                        <p style={styles.targetData}>
                            PRICE: €3,500,000<br/>
                            LOCATION: CYBER-MONACO<br/>
                            CLASS: ROOFTOP ESTATE
                        </p>
                    </div>
                </div>
                <div style={styles.targetCard}>
                    <img src="https://via.placeholder.com/400x250/1a1a3a/ff00ff?text=TARGET+IMAGE" alt="Data Haven" style={styles.targetImage} />
                    <div style={styles.targetInfo}>
                        <h3 style={styles.targetCodename}>TARGET: DATA HAVEN 42</h3>
                        <p style={styles.targetData}>
                            PRICE: €450,000<br/>
                            LOCATION: GRID-CITY CENTRAL<br/>
                            CLASS: SMART APARTMENT
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes glitch-anim-1 {
            0% { clip-path: inset(20% 0 60% 0); }
            100% { clip-path: inset(60% 0 20% 0); }
        }
        @keyframes glitch-anim-2 {
            0% { clip-path: inset(60% 0 20% 0); }
            100% { clip-path: inset(20% 0 60% 0); }
        }
      `}</style>
    </div>
  )
}
