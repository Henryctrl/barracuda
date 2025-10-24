'use client'

import Link from 'next/link'
import { PlusCircle, UserPlus, FilePlus, Bell } from 'lucide-react'
import MainHeader from '../../components/MainHeader'; // Ensure this path is correct

export default function GathererPage() {
  
  const styles = {
    pageContainer: {
      minHeight: '100vh',
      backgroundColor: '#0d0d21',
      fontFamily: "'Orbitron', sans-serif",
      color: '#00ffff',
      backgroundImage: `
        linear-gradient(rgba(13, 13, 33, 0.97), rgba(13, 13, 33, 0.97)),
        repeating-linear-gradient(45deg, rgba(255, 0, 255, 0.05), rgba(255, 0, 255, 0.05) 1px, transparent 1px, transparent 10px)
      `,
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
      marginBottom: '15px',
      textShadow: '0 0 8px rgba(255, 0, 255, 0.7)',
    },
    statusBar: {
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: '20px',
        backgroundColor: 'rgba(10, 10, 30, 0.7)',
        padding: '10px 15px',
        borderRadius: '5px',
        border: '1px solid #00ffff',
        marginBottom: '30px',
    },
    statusItem: {
        color: '#ffffff',
        fontSize: '0.9rem',
    },
    quickActions: {
        display: 'flex',
        gap: '15px',
        marginBottom: '30px',
    },
    actionButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 15px',
        backgroundColor: 'transparent',
        border: '1px solid #00ffff',
        color: '#00ffff',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        fontSize: '0.9rem',
        textTransform: 'uppercase' as const,
        ':hover': {
            backgroundColor: 'rgba(0, 255, 255, 0.2)',
            boxShadow: '0 0 15px #00ffff',
        }
    },
    contentLayout: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '25px',
        '@media (minWidth: 1200px)': {
            gridTemplateColumns: '2fr 1fr',
        },
    },
    activityGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '25px',
    },
    activityPanel: {
      backgroundColor: 'rgba(0, 255, 255, 0.05)',
      border: '1px solid #00ffff',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: 'inset 0 0 15px rgba(0, 255, 255, 0.2)',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    panelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #00ffff',
        paddingBottom: '10px',
        marginBottom: '15px',
    },
    panelTitle: {
      fontSize: '1.1rem',
      fontWeight: 'bold',
    },
    panelAction: {
        fontSize: '0.8rem',
        color: '#ff00ff',
        textDecoration: 'none',
        ':hover': {
            textShadow: '0 0 5px #ff00ff',
        }
    },
    activityList: {
      listStyle: 'none',
      padding: 0,
      flexGrow: 1,
    },
    activityItem: {
      backgroundColor: 'rgba(0, 255, 255, 0.1)',
      padding: '10px',
      borderRadius: '4px',
      marginBottom: '8px',
      fontSize: '0.9rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      ':hover': {
          backgroundColor: 'rgba(0, 255, 255, 0.2)',
      }
    },
    priorityPanel: {
        backgroundColor: 'rgba(255, 0, 255, 0.05)',
        border: '1px solid #ff00ff',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: 'inset 0 0 15px rgba(255, 0, 255, 0.3)',
    },
  };

  // Mock data
  const latestMandates = ["#M-7891: Villa, Cyber-Monaco", "#M-7890: Apt, Neo-Paris 7", "#M-7889: Penthouse, Sector 3"];
  const latestBuyers = ["#B-101: Jax Teller", "#B-102: Trinity Mason", "#B-103: Kaelen Voss"];
  const priorityMatches = ["MATCH: Buyer #B-101 <> Mandate #M-7890", "MATCH: Buyer #B-098 <> Scraped Asset #S-451", "ALERT: New High-Budget Buyer Added"];

  return (
    <div style={styles.pageContainer}>
      <MainHeader />

      <main style={styles.mainContent}>
        <h2 style={styles.sectionHeader}>{'// GATHERER - DATA MATRIX'}</h2>
        
        <div style={styles.statusBar}>
            <span style={styles.statusItem}>ACTIVE MANDATES: <strong>42</strong></span>
            <span style={styles.statusItem}>BUYER DATABASE: <strong>138</strong></span>
            <span style={styles.statusItem}>NEW MATCHES (24H): <strong>3</strong></span>
            <span style={styles.statusItem}>SYSTEM STATUS: <strong style={{color: '#00ff00'}}>NOMINAL</strong></span>
        </div>

        <div style={styles.quickActions}>
            <button style={styles.actionButton}><UserPlus size={16} /><span>Add New Buyer</span></button>
            <button style={styles.actionButton}><FilePlus size={16} /><span>Create New Mandate</span></button>
        </div>
        
        <div style={styles.contentLayout}>
            <div style={styles.activityGrid}>
              {/* Latest Mandates */}
              <div style={styles.activityPanel}>
                <div style={styles.panelHeader}>
                    <h3 style={styles.panelTitle}>Latest Mandates</h3>
                    <Link href="/gatherer/mandates" style={styles.panelAction}>View All / Filter</Link>
                </div>
                <ul style={styles.activityList}>
                  {latestMandates.map(item => <li key={item} style={styles.activityItem}>{item}</li>)}
                </ul>
              </div>
              
              {/* Latest Buyers */}
              <div style={styles.activityPanel}>
                 <div style={styles.panelHeader}>
                    <h3 style={styles.panelTitle}>Latest Buyers</h3>
                    <Link href="/gatherer/buyers" style={styles.panelAction}>View All / Filter</Link>
                </div>
                <ul style={styles.activityList}>
                  {latestBuyers.map(item => <li key={item} style={styles.activityItem}>{item}</li>)}
                </ul>
              </div>
            </div>
            
            {/* Priority Match Alerts */}
            <div style={styles.priorityPanel}>
                <div style={styles.panelHeader}>
                    <h3 style={{...styles.panelTitle, color: '#ff00ff' }}><Bell size={18} /> Priority Match Alerts</h3>
                </div>
                 <ul style={styles.activityList}>
                  {priorityMatches.map(item => <li key={item} style={{...styles.activityItem, backgroundColor: 'rgba(255, 0, 255, 0.1)'}}>{item}</li>)}
                </ul>
            </div>
        </div>
      </main>
    </div>
  )
}
