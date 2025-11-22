'use client'

import React, { useState, CSSProperties } from 'react';
import Link from 'next/link';
import { UserPlus, FilePlus, Bell, Home, CalendarDays, Clock, Mail, Hourglass, CheckCircle2 } from 'lucide-react'; // <-- Snooze replaced with Hourglass
import MainHeader from '../../components/MainHeader';
import CreateClientPopup from '../../components/popups/CreateClientPopup';
import CreateMandatePopup from '../../components/popups/CreateMandatePopup';
import CreatePropertyPopup from '../../components/popups/CreatePropertyPopup';

type StyleObject = { [key: string]: CSSProperties };

// ---- Mock Data ----
const mockRecentlyAdded = [
  { id: 'C-201', name: 'Alice Dupont', budget: '€800k–1.1M', areas: 'Nice / Villefranche', createdAt: '2h ago' },
  { id: 'C-202', name: 'Marc Lambert', budget: '€500k–700k', areas: 'Antibes / Biot', createdAt: 'Yesterday' },
  { id: 'C-203', name: 'Sofia Rossi', budget: '€2M+', areas: 'Cap d’Antibes', createdAt: '2 days ago' },
];
const mockVisitingSoon = [
  { id: 'C-150', name: 'James Carter', from: '2025-12-10', to: '2025-12-13', areas: 'Cannes / Mougins', status: 'First scouting trip' },
  { id: 'C-151', name: 'Léa Martin', from: '2025-12-15', to: '2025-12-20', areas: 'Nice / Villefranche', status: 'Second visit, short-list' },
  { id: 'C-152', name: 'Omar El-Sayed', from: '2025-12-22', to: '2025-12-24', areas: 'Menton / Roquebrune', status: 'Focused on sea view' },
];
type FollowUpStatus = 'pending' | 'snoozed' | 'done';
interface FollowUpItem { id: string; clientId: string; name: string; reason: string; dueLabel: string; status: FollowUpStatus; }
const initialFollowUps: FollowUpItem[] = [
  { id: 'F-1', clientId: 'C-120', name: 'Claire Dubois', reason: 'Update search criteria after last visit', dueLabel: 'Today', status: 'pending' },
  { id: 'F-2', clientId: 'C-098', name: 'Tom Evans', reason: 'Confirm new visit dates', dueLabel: 'Tomorrow', status: 'pending' },
  { id: 'F-3', clientId: 'C-077', name: 'Yuki Tanaka', reason: 'Send new listings in Cap Ferrat', dueLabel: 'In 3 days', status: 'snoozed' },
];

function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  let current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) { dates.push(current.toISOString().split('T')[0]); current.setDate(current.getDate() + 1); }
  return dates;
}

export default function GathererPage() {
  const [activePopup, setActivePopup] = useState<'client' | 'mandate' | 'property' | null>(null);
  const [isLargeScreen, setIsLargeScreen] = React.useState(false);
  const [followUps, setFollowUps] = useState<FollowUpStatus[]>(initialFollowUps.map(i => i.status));

  const styles: StyleObject = {
    pageContainer: { minHeight: '100vh', backgroundColor: '#0d0d21', fontFamily: "'Orbitron', sans-serif", color: '#00ffff', backgroundImage: `linear-gradient(rgba(13, 13, 33, 0.97), rgba(13, 13, 33, 0.97)), repeating-linear-gradient(45deg, rgba(255, 0, 255, 0.05), rgba(255, 0, 255, 0.05) 1px, transparent 1px, transparent 10px)` },
    mainContent: { padding: '30px 20px', transition: 'filter 0.3s ease-out', filter: activePopup ? 'blur(5px)' : 'none' },
    sectionHeader: { fontSize: '1.75rem', color: '#ff00ff', textTransform: 'uppercase', borderBottom: '2px solid #ff00ff', paddingBottom: '10px', marginBottom: '15px', textShadow: '0 0 8px rgba(255, 0, 255, 0.7)' },
    statusBar: { display: 'flex', flexWrap: 'wrap', gap: '20px', backgroundColor: 'rgba(10, 10, 30, 0.7)', padding: '10px 15px', borderRadius: '5px', border: '1px solid #00ffff', marginBottom: '30px' },
    statusItem: { color: '#ffffff', fontSize: '0.9rem' },
    quickActions: { display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' },
    actionButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', backgroundColor: 'transparent', border: '1px solid #00ffff', color: '#00ffff', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.3s ease', fontSize: '0.9rem', textTransform: 'uppercase' },
    contentLayout: { display: 'grid', gridTemplateColumns: '1fr', gap: '25px' },
    contentLayoutLarge: { gridTemplateColumns: '2.2fr 1.3fr' },
    columnStack: { display: 'flex', flexDirection: 'column', gap: '20px' },
    panel: { backgroundColor: 'rgba(0, 255, 255, 0.05)', border: '1px solid #00ffff', borderRadius: '8px', padding: '20px', boxShadow: 'inset 0 0 15px rgba(0, 255, 255, 0.2)', display: 'flex', flexDirection: 'column', minHeight: '0' },
    panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #00ffff', paddingBottom: '10px', marginBottom: '15px' },
    panelTitle: { fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' },
    panelAction: { fontSize: '0.8rem', color: '#ff00ff', textDecoration: 'none', cursor: 'pointer' },
    list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' },
    cardItem: { backgroundColor: 'rgba(0, 255, 255, 0.08)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' },
    badgeRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.7rem' },
    badge: { padding: '2px 6px', borderRadius: '999px', border: '1px solid #00ffff', color: '#00ffff' },
    badgePink: { padding: '2px 6px', borderRadius: '999px', border: '1px solid #ff00ff', color: '#ff00ff' },
    smallLabel: { fontSize: '0.7rem', color: '#a0a0ff' },
    followUpActions: { display: 'flex', gap: '8px', marginTop: '6px' },
    followUpBtn: { flex: 1, fontSize: '0.7rem', textTransform: 'uppercase', padding: '4px 6px', borderRadius: '4px', border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' },
    calendarPanel: { backgroundColor: 'rgba(255, 0, 255, 0.05)', border: '1px solid #ff00ff', borderRadius: '8px', padding: '20px', boxShadow: 'inset 0 0 15px rgba(255, 0, 255, 0.3)', display: 'flex', flexDirection: 'column' },
    calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px', marginTop: '10px', fontSize: '0.7rem' },
    calendarCell: { minHeight: '40px', borderRadius: '4px', border: '1px solid rgba(0, 255, 255, 0.2)', padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  };

  React.useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1200);
    window.addEventListener('resize', handleResize); handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const today = new Date();
  const [calendarMonth] = useState(today.getMonth());
  const [calendarYear] = useState(today.getFullYear());
  const firstOfMonth = new Date(calendarYear, calendarMonth, 1);
  const firstDayIndex = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const visitDates = new Set<string>();
  mockVisitingSoon.forEach(v => { getDatesBetween(v.from, v.to).forEach(d => visitDates.add(d)); });
  const calendarCells: Array<{ day: number | null; hasVisit: boolean }> = [];
  for (let i = 0; i < firstDayIndex; i++) calendarCells.push({ day: null, hasVisit: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(calendarYear, calendarMonth, d);
    calendarCells.push({ day: d, hasVisit: visitDates.has(dateObj.toISOString().split('T')[0]) });
  }

  const handleSnooze = (index: number) => setFollowUps(prev => prev.map((st, i) => (i === index ? 'snoozed' : st)));
  const handleDone = (index: number) => setFollowUps(prev => prev.map((st, i) => (i === index ? 'done' : st)));

  return (
    <div style={styles.pageContainer}>
      <MainHeader />
      <main style={styles.mainContent}>
        <h2 style={styles.sectionHeader}>{'// BUYER CONTROL HUB'}</h2>
        <div style={styles.statusBar}>
          <span style={styles.statusItem}>ACTIVE BUYERS: <strong>138</strong></span>
          <span style={styles.statusItem}>VISITS NEXT 30 DAYS: <strong>7</strong></span>
          <span style={styles.statusItem}>FOLLOW-UPS DUE TODAY: <strong>4</strong></span>
          <span style={styles.statusItem}>SYSTEM STATUS: <strong style={{color: '#00ff00'}}>NOMINAL</strong></span>
        </div>

        <div style={styles.quickActions}>
          <button style={styles.actionButton} onClick={() => setActivePopup('client')}><UserPlus size={16} /><span>Add New Client</span></button>
          <button style={styles.actionButton} onClick={() => setActivePopup('mandate')}><FilePlus size={16} /><span>Create New Mandate</span></button>
          <button style={styles.actionButton} onClick={() => setActivePopup('property')}><Home size={16} /><span>Add New Property</span></button>
        </div>

        <div style={{ ...styles.contentLayout, ...(isLargeScreen ? styles.contentLayoutLarge : {}) }}>
          <div style={styles.columnStack}>
            <section style={styles.panel}>
              <div style={styles.panelHeader}><h3 style={styles.panelTitle}><UserPlus size={18} /> Recently Added Clients</h3><Link href="/gatherer/clients" style={styles.panelAction}>View All</Link></div>
              <ul style={styles.list}>
                {mockRecentlyAdded.map(client => (
                  <li key={client.id} style={styles.cardItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><strong>{client.name}</strong> <span style={styles.smallLabel}>({client.id})</span></span><span style={styles.smallLabel}>{client.createdAt}</span></div>
                    <div style={styles.badgeRow}><span style={styles.badge}>Budget: {client.budget}</span><span style={styles.badgePink}>Areas: {client.areas}</span></div>
                  </li>
                ))}
              </ul>
            </section>
            
            <section style={styles.panel}>
              <div style={styles.panelHeader}><h3 style={styles.panelTitle}><CalendarDays size={18} /> People Visiting Soon</h3></div>
              <ul style={styles.list}>
                {mockVisitingSoon.map(v => (
                  <li key={v.id} style={styles.cardItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><strong>{v.name}</strong> <span style={styles.smallLabel}>({v.id})</span></span><span style={styles.smallLabel}>{new Date(v.from).toLocaleDateString()} – {new Date(v.to).toLocaleDateString()}</span></div>
                    <div style={styles.badgeRow}><span style={styles.badgePink}>{v.areas}</span><span style={styles.badge}><Clock size={10} /> {v.status}</span></div>
                  </li>
                ))}
              </ul>
            </section>

            <section style={styles.panel}>
              <div style={styles.panelHeader}><h3 style={styles.panelTitle}><Bell size={18} /> Follow-ups & Chasing</h3><span style={styles.panelAction}>Manage Tasks</span></div>
              <ul style={styles.list}>
                {initialFollowUps.map((task, index) => {
                  const status = followUps[index];
                  const isDone = status === 'done';
                  const isSnoozed = status === 'snoozed';
                  return (
                    <li key={task.id} style={{...styles.cardItem, opacity: isDone ? 0.5 : 1, backgroundColor: isSnoozed ? 'rgba(255, 255, 0, 0.08)' : 'rgba(0, 255, 255, 0.08)'}}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><strong>{task.name}</strong> <span style={styles.smallLabel}>({task.clientId})</span></span><span style={styles.smallLabel}>{task.dueLabel}</span></div>
                      <div style={{ fontSize: '0.8rem', color: '#e0e0ff' }}>{task.reason}</div>
                      <div style={styles.badgeRow}>
                        <span style={styles.badgePink}><Mail size={10} /> Email reminder</span>
                        {isSnoozed && <span style={styles.badge}>Snoozed</span>}
                        {isDone && <span style={{ ...styles.badge, borderColor: '#00ff00', color: '#00ff00' }}>Completed</span>}
                      </div>
                      {!isDone && (
                        <div style={styles.followUpActions}>
                          <button type="button" style={{ ...styles.followUpBtn, borderColor: '#ff00ff', backgroundColor: 'rgba(255, 0, 255, 0.1)', color: '#ff00ff' }} onClick={() => handleSnooze(index)}>
                            <Hourglass size={12} /> Snooze 
                          </button>
                          <button type="button" style={{ ...styles.followUpBtn, borderColor: '#00ff00', backgroundColor: 'rgba(0, 255, 0, 0.1)', color: '#00ff00' }} onClick={() => handleDone(index)}>
                            <CheckCircle2 size={12} /> Done
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <div style={styles.columnStack}>
            <section style={styles.calendarPanel}>
              <div style={styles.panelHeader}><h3 style={{ ...styles.panelTitle, color: '#ff00ff' }}><CalendarDays size={18} /> Visit Calendar</h3></div>
              <div style={{ fontSize: '0.8rem', color: '#e0e0ff' }}>{today.toLocaleString('default', { month: 'long' }).toUpperCase()} {calendarYear}</div>
              <div style={styles.calendarGrid}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: '#a0a0ff' }}>{d}</div>)}
                {calendarCells.map((cell, idx) => (
                  <div key={idx} style={{...styles.calendarCell, backgroundColor: cell.hasVisit ? 'rgba(255, 0, 255, 0.18)' : 'transparent', borderColor: cell.hasVisit ? '#ff00ff' : 'rgba(0, 255, 255, 0.2)'}}>
                    <span style={{ fontSize: '0.7rem', color: '#ffffff' }}>{cell.day ?? ''}</span>
                    {cell.hasVisit && <span style={{ alignSelf: 'flex-end', width: '6px', height: '6px', borderRadius: '999px', backgroundColor: '#ff00ff', boxShadow: '0 0 6px #ff00ff' }} />}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#a0a0ff' }}>Pink-highlighted days indicate at least one buyer present in the area.</div>
            </section>

            <section style={styles.panel}>
              <div style={styles.panelHeader}><h3 style={{ ...styles.panelTitle, color: '#ff00ff' }}><Bell size={18} /> Priority Alerts</h3></div>
              <ul style={styles.list}>
                <li style={styles.cardItem}><div style={{ fontSize: '0.85rem' }}>High-budget client [<strong>C-203</strong>] lands next week – ensure fresh stock in Cap d’Antibes.</div></li>
                <li style={styles.cardItem}><div style={{ fontSize: '0.85rem' }}>3 buyers have no updated criteria in the last 90 days – schedule strategy calls.</div></li>
                <li style={styles.cardItem}><div style={{ fontSize: '0.85rem' }}>Email reminder engine is ready to connect to Supabase Edge Functions (cron-based).</div></li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <CreateClientPopup isOpen={activePopup === 'client'} onClose={() => setActivePopup(null)} />
      <CreateMandatePopup isOpen={activePopup === 'mandate'} onClose={() => setActivePopup(null)} />
      <CreatePropertyPopup isOpen={activePopup === 'property'} onClose={() => setActivePopup(null)} />
    </div>
  );
}
