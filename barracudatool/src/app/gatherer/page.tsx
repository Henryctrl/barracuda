'use client'

import React, { useState, CSSProperties } from 'react';
import Link from 'next/link'
import { UserPlus, FilePlus, Bell, Home } from 'lucide-react'
import MainHeader from '../../components/MainHeader';
import CreateClientPopup from '../../components/popups/CreateClientPopup';
import CreateMandatePopup from '../../components/popups/CreateMandatePopup';
import CreatePropertyPopup from '../../components/popups/CreatePropertyPopup';

type StyleObject = { [key: string]: CSSProperties };

export default function GathererPage() {
  const [activePopup, setActivePopup] = useState<'client' | 'mandate' | 'property' | null>(null);

  const styles: StyleObject = {
    pageContainer: { minHeight: '100vh', backgroundColor: '#0d0d21', fontFamily: "'Orbitron', sans-serif", color: '#00ffff', backgroundImage: `linear-gradient(rgba(13, 13, 33, 0.97), rgba(13, 13, 33, 0.97)), repeating-linear-gradient(45deg, rgba(255, 0, 255, 0.05), rgba(255, 0, 255, 0.05) 1px, transparent 1px, transparent 10px)`},
    mainContent: { padding: '30px 20px', transition: 'filter 0.3s ease-out', filter: activePopup ? 'blur(5px)' : 'none' },
    sectionHeader: { fontSize: '1.75rem', color: '#ff00ff', textTransform: 'uppercase', borderBottom: '2px solid #ff00ff', paddingBottom: '10px', marginBottom: '15px', textShadow: '0 0 8px rgba(255, 0, 255, 0.7)' },
    statusBar: { display: 'flex', flexWrap: 'wrap', gap: '20px', backgroundColor: 'rgba(10, 10, 30, 0.7)', padding: '10px 15px', borderRadius: '5px', border: '1px solid #00ffff', marginBottom: '30px' },
    statusItem: { color: '#ffffff', fontSize: '0.9rem' },
    quickActions: { display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' },
    actionButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', backgroundColor: 'transparent', border: '1px solid #00ffff', color: '#00ffff', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.3s ease', fontSize: '0.9rem', textTransform: 'uppercase' },
    contentLayout: { display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }, // Base style
    contentLayoutLarge: { gridTemplateColumns: '2fr 1fr' }, // Responsive style for larger screens
    activityGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' },
    activityPanel: { backgroundColor: 'rgba(0, 255, 255, 0.05)', border: '1px solid #00ffff', borderRadius: '8px', padding: '20px', boxShadow: 'inset 0 0 15px rgba(0, 255, 255, 0.2)', display: 'flex', flexDirection: 'column' },
    panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #00ffff', paddingBottom: '10px', marginBottom: '15px' },
    panelTitle: { fontSize: '1.1rem', fontWeight: 'bold' },
    panelAction: { fontSize: '0.8rem', color: '#ff00ff', textDecoration: 'none' },
    activityList: { listStyle: 'none', padding: 0, flexGrow: 1 },
    activityItem: { backgroundColor: 'rgba(0, 255, 255, 0.1)', padding: '10px', borderRadius: '4px', marginBottom: '8px', fontSize: '0.9rem', cursor: 'pointer', transition: 'background-color 0.2s' },
    priorityPanel: { backgroundColor: 'rgba(255, 0, 255, 0.05)', border: '1px solid #ff00ff', borderRadius: '8px', padding: '20px', boxShadow: 'inset 0 0 15px rgba(255, 0, 255, 0.3)' },
  };

  const latestMandates = ["#M-7891: Villa, Cyber-Monaco", "#M-7890: Apt, Neo-Paris 7", "#M-7889: Penthouse, Sector 3"];
  const latestClients = ["#C-101: Jax Teller", "#C-102: Trinity Mason", "#C-103: Kaelen Voss"];
  const priorityMatches = ["MATCH: Client #C-101 <> Mandate #M-7890", "MATCH: Client #C-098 <> Scraped Asset #S-451", "ALERT: New High-Budget Client Added"];

  // A simple way to handle responsive styles without a full library
  const [isLargeScreen, setIsLargeScreen] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1200);
    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial state
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={styles.pageContainer}>
      <MainHeader />
      <main style={styles.mainContent}>
        <h2 style={styles.sectionHeader}>{'// GATHERER - DATA MATRIX'}</h2>
        <div style={styles.statusBar}>
          <span style={styles.statusItem}>ACTIVE MANDATES: <strong>42</strong></span>
          <span style={styles.statusItem}>CLIENT DATABASE: <strong>138</strong></span>
          <span style={styles.statusItem}>NEW MATCHES (24H): <strong>3</strong></span>
          <span style={styles.statusItem}>SYSTEM STATUS: <strong style={{color: '#00ff00'}}>NOMINAL</strong></span>
        </div>

        <div style={styles.quickActions}>
          <button style={styles.actionButton} onClick={() => setActivePopup('client')}><UserPlus size={16} /><span>Add New Client</span></button>
          <button style={styles.actionButton} onClick={() => setActivePopup('mandate')}><FilePlus size={16} /><span>Create New Mandate</span></button>
          <button style={styles.actionButton} onClick={() => setActivePopup('property')}><Home size={16} /><span>Add New Property</span></button>
        </div>
        
        <div style={{...styles.contentLayout, ...(isLargeScreen ? styles.contentLayoutLarge : {})}}>
            <div style={styles.activityGrid}>
                <div style={styles.activityPanel}><div style={styles.panelHeader}><h3 style={styles.panelTitle}>Latest Mandates</h3><Link href="/gatherer/mandates" style={styles.panelAction}>View All / Filter</Link></div><ul style={styles.activityList}>{latestMandates.map(item => <li key={item} style={styles.activityItem}>{item}</li>)}</ul></div>
                <div style={styles.activityPanel}><div style={styles.panelHeader}><h3 style={styles.panelTitle}>Latest Clients</h3><Link href="/gatherer/clients" style={styles.panelAction}>View All / Filter</Link></div><ul style={styles.activityList}>{latestClients.map(item => <li key={item} style={styles.activityItem}>{item}</li>)}</ul></div>
            </div>
            <div style={styles.priorityPanel}><div style={styles.panelHeader}><h3 style={{...styles.panelTitle, color: '#ff00ff' }}><Bell size={18} /> Priority Match Alerts</h3></div><ul style={styles.activityList}>{priorityMatches.map(item => <li key={item} style={{...styles.activityItem, backgroundColor: 'rgba(255, 0, 255, 0.1)'}}>{item}</li>)}</ul></div>
        </div>
      </main>

      <CreateClientPopup isOpen={activePopup === 'client'} onClose={() => setActivePopup(null)} />
      <CreateMandatePopup isOpen={activePopup === 'mandate'} onClose={() => setActivePopup(null)} />
      <CreatePropertyPopup isOpen={activePopup === 'property'} onClose={() => setActivePopup(null)} />
    </div>
  )
}
