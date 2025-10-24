'use client'

import Link from 'next/link'
import { Home, Building2, Users, Wrench, FileText, Search } from 'lucide-react'
import MainHeader from '../../components/MainHeader';

export default function GathererPage() {
  
  const styles = {
    pageContainer: {
      minHeight: '100vh',
      backgroundColor: '#0d0d21',
      fontFamily: "'Orbitron', sans-serif",
      color: '#00ffff',
    },
    header: {
      display: 'flex',
      flexWrap: 'wrap' as const, // Allows items to wrap on smaller screens
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 20px',
      backgroundColor: 'rgba(10, 10, 30, 0.85)',
      borderBottom: '2px solid #00ffff',
      boxShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
      gap: '15px', // Adds space between items when they wrap
    },
    logo: {
      fontSize: '1.75rem',
      fontWeight: 'bold',
      color: '#ff00ff',
      textShadow: '0 0 10px #ff00ff',
    },
    nav: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      alignItems: 'center',
      gap: '20px',
      justifyContent: 'center', // Center nav items on wrap
    },
    navLink: {
      color: '#00ffff',
      textDecoration: 'none',
      fontWeight: 'bold',
      fontSize: '1rem',
      transition: 'text-shadow 0.3s ease',
      ':hover': {
        textShadow: '0 0 10px #00ffff',
      }
    },
    searchBar: {
      display: 'flex',
      alignItems: 'center',
      border: '1px solid #ff00ff',
      borderRadius: '5px',
      padding: '5px 10px',
      backgroundColor: 'rgba(10, 10, 30, 0.9)',
    },
    searchInput: {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#ff00ff',
      outline: 'none',
      fontFamily: "'Orbitron', sans-serif",
      '::placeholder': {
        color: '#ff00ff',
        opacity: 0.7,
      },
    },
    mainContent: {
      padding: '30px 20px',
    },
    sectionHeader: {
      fontSize: '1.75rem',
      color: '#ff00ff',
      textTransform: 'uppercase' as const,
      borderBottom: '2px solid #ff00ff',
      paddingBottom: '10px',
      marginBottom: '25px',
      textShadow: '0 0 8px rgba(255, 0, 255, 0.7)',
    },
    activityGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '25px',
    },
    activityPanel: {
      backgroundColor: 'rgba(0, 255, 255, 0.05)',
      border: '1px solid #00ffff',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: 'inset 0 0 15px rgba(0, 255, 255, 0.2)',
    },
    panelTitle: {
      borderBottom: '1px solid #00ffff',
      paddingBottom: '10px',
      marginBottom: '15px',
      fontSize: '1.1rem',
      fontWeight: 'bold',
    },
    activityList: {
      listStyle: 'none',
      padding: 0,
    },
    activityItem: {
      backgroundColor: 'rgba(0, 255, 255, 0.1)',
      padding: '10px',
      borderRadius: '4px',
      marginBottom: '8px',
      fontSize: '0.9rem'
    }
  };

  // Mock data - replace with actual data from your backend
  const latestMandates = ["#M-7891: Villa, Cyber-Monaco", "#M-7890: Apt, Neo-Paris 7", "#M-7889: Penthouse, Sector 3", "#M-7888: Warehouse, Industrial Zone", "#M-7887: Studio, Grid-City Central"];
  const latestBuyers = ["#B-101: Jax Teller", "#B-102: Trinity Mason", "#B-103: Kaelen Voss", "#B-104: Sona Reyes", "#B-105: Deckard Shaw"];
  const recentProperties = ["Property ID: 90210 - Ocean View", "Property ID: 1138 - Skyscraper Apt", "Property ID: 451 - Data Haven", "Property ID: 2049 - Blade Runner's Loft", "Property ID: 1982 - Tron Arcade"];
  const lastBuyersAccessed = ["Agent: Ryker, Client: #B-088", "Agent: Valerius, Client: #B-091", "Agent: Cygnus, Client: #B-075", "Agent: Jyn, Client: #B-101", "Agent: Rex, Client: #B-099"];


  return (
    <div style={styles.pageContainer}>
      {/* --- GLOBAL HEADER --- */}
        <MainHeader />

      {/* --- MAIN CONTENT --- */}
      <main style={styles.mainContent}>
        <h2 style={styles.sectionHeader}>{'// Recent Activity Stream'}</h2>
        
        <div style={styles.activityGrid}>
          {/* Latest Mandates */}
          <div style={styles.activityPanel}>
            <h3 style={styles.panelTitle}>Latest Mandates</h3>
            <ul style={styles.activityList}>
              {latestMandates.map(item => <li key={item} style={styles.activityItem}>{item}</li>)}
            </ul>
          </div>
          
          {/* Latest Buyers */}
          <div style={styles.activityPanel}>
            <h3 style={styles.panelTitle}>Latest Buyers</h3>
             <ul style={styles.activityList}>
              {latestBuyers.map(item => <li key={item} style={styles.activityItem}>{item}</li>)}
            </ul>
          </div>

          {/* Recently Viewed Properties */}
           <div style={styles.activityPanel}>
            <h3 style={styles.panelTitle}>Recently Viewed Properties</h3>
             <ul style={styles.activityList}>
              {recentProperties.map(item => <li key={item} style={styles.activityItem}>{item}</li>)}
            </ul>
          </div>
          
          {/* Last Buyers Accessed */}
           <div style={styles.activityPanel}>
            <h3 style={styles.panelTitle}>Last Buyers Accessed</h3>
             <ul style={styles.activityList}>
              {lastBuyersAccessed.map(item => <li key={item} style={styles.activityItem}>{item}</li>)}
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
