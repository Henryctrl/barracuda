'use client';

import React, { useState, useEffect, CSSProperties } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  FilePlus,
  Bell,
  Home,
  CalendarDays,
  Clock,
  Mail,
  Hourglass,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import MainHeader from '../../components/MainHeader';
import CreateClientPopup from '../../components/popups/CreateClientPopup';
import CreateMandatePopup from '../../components/popups/CreateMandatePopup';
import CreatePropertyPopup from '../../components/popups/CreatePropertyPopup';

// ---------- Supabase client ----------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------- Types ----------
interface RecentlyAddedClient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  client_search_criteria?: {
    min_budget: number | null;
    max_budget: number | null;
    locations: string | null;
  }[];
}

// Supabase returns joined data as an object (if 1:1) or array (if 1:many).
// Assuming standard foreign keys, 'clients' is singular here.
interface VisitingSoon {
  id: string;
  visit_start_date: string;
  visit_end_date: string | null;
  notes: string | null;
  clients: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null; 
}

type FollowUpStatus = 'pending' | 'snoozed' | 'done';

interface FollowUpTask {
  id: string;
  client_id: string;
  created_at: string;
  task_type: string | null;
  status: FollowUpStatus;
  due_date: string;
  snoozed_until: string | null;
  notes: string | null;
  clients: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

// Utility: get all dates in a visit range
function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  let current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ---------- Styles ----------
type StyleObject = { [key: string]: CSSProperties };

const styles: StyleObject = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#0d0d21',
    fontFamily: "'Orbitron', sans-serif",
    color: '#00ffff',
    backgroundImage:
      `linear-gradient(rgba(13, 13, 33, 0.97), rgba(13, 13, 33, 0.97)),` +
      `repeating-linear-gradient(45deg, rgba(255, 0, 255, 0.05), rgba(255, 0, 255, 0.05) 1px, transparent 1px, transparent 10px)`,
  },
  mainContent: {
    padding: '30px 20px',
    transition: 'filter 0.3s ease-out',
  },
  sectionHeader: {
    fontSize: '1.75rem',
    color: '#ff00ff',
    textTransform: 'uppercase',
    borderBottom: '2px solid #ff00ff',
    paddingBottom: '10px',
    marginBottom: '15px',
    textShadow: '0 0 8px rgba(255, 0, 255, 0.7)',
  },
  statusBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    backgroundColor: 'rgba(10, 10, 30, 0.7)',
    padding: '10px 15px',
    borderRadius: '5px',
    border: '1px solid #00ffff',
    marginBottom: '30px',
  },
  statusItem: { color: '#ffffff', fontSize: '0.9rem' },
  quickActions: { display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' },
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
    textTransform: 'uppercase',
  },
  contentLayout: { display: 'grid', gridTemplateColumns: '1fr', gap: '25px' },
  contentLayoutLarge: { gridTemplateColumns: '2.2fr 1.3fr' },
  columnStack: { display: 'flex', flexDirection: 'column', gap: '20px' },
  panel: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    border: '1px solid #00ffff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: 'inset 0 0 15px rgba(0, 255, 255, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '0',
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
    fontSize: '1.05rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  panelAction: { fontSize: '0.8rem', color: '#ff00ff', textDecoration: 'none', cursor: 'pointer' },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' },
  cardItem: {
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  badgeRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.7rem' },
  badge: { padding: '2px 6px', borderRadius: '999px', border: '1px solid #00ffff', color: '#00ffff' },
  badgePink: { padding: '2px 6px', borderRadius: '999px', border: '1px solid #ff00ff', color: '#ff00ff' },
  smallLabel: { fontSize: '0.7rem', color: '#a0a0ff' },
  followUpActions: { display: 'flex', gap: '8px', marginTop: '6px' },
  followUpBtn: {
    flex: 1,
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  calendarPanel: {
    backgroundColor: 'rgba(255, 0, 255, 0.05)',
    border: '1px solid #ff00ff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: 'inset 0 0 15px rgba(255, 0, 255, 0.3)',
    display: 'flex',
    flexDirection: 'column',
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    gap: '4px',
    marginTop: '10px',
    fontSize: '0.7rem',
  },
  calendarCell: {
    minHeight: '40px',
    borderRadius: '4px',
    border: '1px solid rgba(0, 255, 255, 0.2)',
    padding: '4px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
};

export default function GathererPage() {
  const [activePopup, setActivePopup] = useState<'client' | 'mandate' | 'property' | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  const [recentClients, setRecentClients] = useState<RecentlyAddedClient[]>([]);
  const [visitingSoon, setVisitingSoon] = useState<VisitingSoon[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);

  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1200);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---------- Fetchers ----------
  const fetchRecentClients = async () => {
    setLoadingRecent(true);
    const { data, error } = await supabase
      .from('clients')
      .select(`
        id,
        first_name,
        last_name,
        created_at,
        client_search_criteria (
          min_budget,
          max_budget,
          locations
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) setRecentClients(data as RecentlyAddedClient[]);
    setLoadingRecent(false);
  };

  const fetchVisitingSoon = async () => {
    setLoadingVisits(true);
    const today = new Date();
    const plus30 = new Date();
    plus30.setDate(today.getDate() + 30);

    const { data, error } = await supabase
      .from('client_visits')
      .select(
        `
        id,
        visit_start_date,
        visit_end_date,
        notes,
        clients (
          id,
          first_name,
          last_name
        )
      `
      )
      .gte('visit_start_date', today.toISOString().split('T')[0])
      .lte('visit_start_date', plus30.toISOString().split('T')[0])
      .order('visit_start_date', { ascending: true });

    // Type assertion is safe here assuming clients returns a single object 
    if (!error && data) setVisitingSoon(data as unknown as VisitingSoon[]);
    setLoadingVisits(false);
  };

  const fetchFollowUps = async () => {
    setLoadingTasks(true);
    const todayStr = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('client_tasks')
      .select(
        `
        id,
        client_id,
        created_at,
        task_type,
        status,
        due_date,
        snoozed_until,
        notes,
        clients (
          first_name,
          last_name
        )
      `
      )
      .in('status', ['pending', 'snoozed'])
      .lte('due_date', todayStr)
      .order('due_date', { ascending: true });

    // Type assertion safe assuming clients returns a single object
    if (!error && data) setFollowUps(data as unknown as FollowUpTask[]);
    setLoadingTasks(false);
  };

  useEffect(() => {
    fetchRecentClients();
    fetchVisitingSoon();
    fetchFollowUps();
  }, []);

  // ---------- Actions ----------
  const handleSnooze = async (taskId: string) => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + 7);
    const snoozeStr = snoozeDate.toISOString().split('T')[0];

    await supabase
      .from('client_tasks')
      .update({
        status: 'snoozed',
        snoozed_until: snoozeStr,
      })
      .eq('id', taskId);

    fetchFollowUps();
  };

  const handleDone = async (taskId: string) => {
    await supabase
      .from('client_tasks')
      .update({
        status: 'done',
      })
      .eq('id', taskId);

    fetchFollowUps();
  };

  // ---------- Calendar logic ----------
  const today = new Date();
  const [calendarMonth] = useState(today.getMonth());
  const [calendarYear] = useState(today.getFullYear());
  const firstOfMonth = new Date(calendarYear, calendarMonth, 1);
  const firstDayIndex = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  const visitDates = new Set<string>();
  visitingSoon.forEach(v => {
    const start = v.visit_start_date;
    const end = v.visit_end_date || v.visit_start_date;
    getDatesBetween(start, end).forEach(d => visitDates.add(d));
  });

  const calendarCells: Array<{ day: number | null; hasVisit: boolean }> = [];
  for (let i = 0; i < firstDayIndex; i++) calendarCells.push({ day: null, hasVisit: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = new Date(calendarYear, calendarMonth, d).toISOString().split('T')[0];
    calendarCells.push({ day: d, hasVisit: visitDates.has(key) });
  }

  const activeFollowUps = followUps.filter(t => t.status !== 'done');

  return (
    <div style={styles.pageContainer}>
      <MainHeader />
      <main
        style={{
          ...styles.mainContent,
          filter: activePopup ? 'blur(5px)' : 'none',
        }}
      >
        <h2 style={styles.sectionHeader}>{'// BUYER CONTROL HUB'}</h2>

        {/* Status bar */}
        <div style={styles.statusBar}>
          <span style={styles.statusItem}>
            ACTIVE BUYERS:{' '}
            <strong>{/* Replace later with count from Supabase if needed */}138</strong>
          </span>
          <span style={styles.statusItem}>
            VISITS NEXT 30 DAYS: <strong>{visitingSoon.length}</strong>
          </span>
          <span style={styles.statusItem}>
            FOLLOW-UPS DUE TODAY: <strong>{activeFollowUps.length}</strong>
          </span>
          <span style={styles.statusItem}>
            SYSTEM STATUS: <strong style={{ color: '#00ff00' }}>NOMINAL</strong>
          </span>
        </div>

        {/* Quick actions */}
        <div style={styles.quickActions}>
          <button style={styles.actionButton} onClick={() => setActivePopup('client')}>
            <UserPlus size={16} />
            <span>Add New Client</span>
          </button>
          <button style={styles.actionButton} onClick={() => setActivePopup('mandate')}>
            <FilePlus size={16} />
            <span>Create New Mandate</span>
          </button>
          <button style={styles.actionButton} onClick={() => setActivePopup('property')}>
            <Home size={16} />
            <span>Add New Property</span>
          </button>
        </div>

        {/* Main layout */}
        <div style={{ ...styles.contentLayout, ...(isLargeScreen ? styles.contentLayoutLarge : {}) }}>
          {/* LEFT COLUMN */}
          <div style={styles.columnStack}>
            {/* Recently added clients */}
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h3 style={styles.panelTitle}>
                  <UserPlus size={18} /> Recently Added Clients
                </h3>
                <Link href="/gatherer/clients" style={styles.panelAction}>
                  View All
                </Link>
              </div>
              {loadingRecent ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : (
                <ul style={styles.list}>
                  {recentClients.map(client => {
                    const crit = client.client_search_criteria?.[0];
                    const name = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed Client';
                    const budget =
                      crit && crit.min_budget != null && crit.max_budget != null
                        ? `€${crit.min_budget.toLocaleString()}–€${crit.max_budget.toLocaleString()}`
                        : 'N/A';
                    const areas = crit?.locations || 'No areas set';
                    const created = new Date(client.created_at).toLocaleString();
                    return (
                      <li key={client.id} style={styles.cardItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>
                            <strong>{name}</strong>{' '}
                            <span style={styles.smallLabel}>({client.id.slice(0, 8)})</span>
                          </span>
                          <span style={styles.smallLabel}>{created}</span>
                        </div>
                        <div style={styles.badgeRow}>
                          <span style={styles.badge}>Budget: {budget}</span>
                          <span style={styles.badgePink}>Areas: {areas}</span>
                        </div>
                      </li>
                    );
                  })}
                  {recentClients.length === 0 && (
                    <li style={{ ...styles.cardItem, opacity: 0.6 }}>No clients yet.</li>
                  )}
                </ul>
              )}
            </section>

            {/* People visiting soon */}
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h3 style={styles.panelTitle}>
                  <CalendarDays size={18} /> People Visiting Soon
                </h3>
              </div>
              {loadingVisits ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : (
                <ul style={styles.list}>
                  {visitingSoon.map(v => {
                    const name = v.clients
                      ? `${v.clients.first_name || ''} ${v.clients.last_name || ''}`.trim()
                      : 'Unknown client';
                    const fromLabel = new Date(v.visit_start_date).toLocaleDateString();
                    const toLabel = new Date(v.visit_end_date || v.visit_start_date).toLocaleDateString();
                    return (
                      <li key={v.id} style={styles.cardItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>
                            <strong>{name}</strong>{' '}
                            <span style={styles.smallLabel}>({v.id.slice(0, 8)})</span>
                          </span>
                          <span style={styles.smallLabel}>
                            {fromLabel} – {toLabel}
                          </span>
                        </div>
                        <div style={styles.badgeRow}>
                          <span style={styles.badgePink}>{v.notes || 'No notes yet'}</span>
                        </div>
                      </li>
                    );
                  })}
                  {visitingSoon.length === 0 && (
                    <li style={{ ...styles.cardItem, opacity: 0.6 }}>No visits planned.</li>
                  )}
                </ul>
              )}
            </section>

            {/* Follow-ups */}
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h3 style={styles.panelTitle}>
                  <Bell size={18} /> Follow-ups & Chasing
                </h3>
                <span style={styles.panelAction}>Manage Tasks</span>
              </div>
              {loadingTasks ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : (
                <ul style={styles.list}>
                  {activeFollowUps.map(task => {
                    const isDone = task.status === 'done';
                    const isSnoozed = task.status === 'snoozed';
                    const name = task.clients
                      ? `${task.clients.first_name || ''} ${task.clients.last_name || ''}`.trim()
                      : 'Unknown client';
                    const dueLabel = new Date(task.due_date).toLocaleDateString();
                    return (
                      <li
                        key={task.id}
                        style={{
                          ...styles.cardItem,
                          opacity: isDone ? 0.5 : 1,
                          backgroundColor: isSnoozed ? 'rgba(255, 255, 0, 0.08)' : 'rgba(0, 255, 255, 0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>
                            <strong>{name}</strong>{' '}
                            <span style={styles.smallLabel}>({task.client_id.slice(0, 8)})</span>
                          </span>
                          <span style={styles.smallLabel}>{dueLabel}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#e0e0ff' }}>
                          {task.notes || 'Follow up with this client.'}
                        </div>
                        <div style={styles.badgeRow}>
                          <span style={styles.badgePink}>
                            <Mail size={10} /> Email reminder
                          </span>
                          {isSnoozed && <span style={styles.badge}>Snoozed</span>}
                          {isDone && (
                            <span
                              style={{
                                ...styles.badge,
                                borderColor: '#00ff00',
                                color: '#00ff00',
                              }}
                            >
                              Completed
                            </span>
                          )}
                        </div>
                        {!isDone && (
                          <div style={styles.followUpActions}>
                            <button
                              type="button"
                              style={{
                                ...styles.followUpBtn,
                                borderColor: '#ff00ff',
                                backgroundColor: 'rgba(255, 0, 255, 0.1)',
                                color: '#ff00ff',
                              }}
                              onClick={() => handleSnooze(task.id)}
                            >
                              <Hourglass size={12} /> Snooze
                            </button>
                            <button
                              type="button"
                              style={{
                                ...styles.followUpBtn,
                                borderColor: '#00ff00',
                                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                                color: '#00ff00',
                              }}
                              onClick={() => handleDone(task.id)}
                            >
                              <CheckCircle2 size={12} /> Done
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                  {activeFollowUps.length === 0 && (
                    <li style={{ ...styles.cardItem, opacity: 0.6 }}>No follow-ups due.</li>
                  )}
                </ul>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div style={styles.columnStack}>
            {/* Calendar */}
            <section style={styles.calendarPanel}>
              <div style={styles.panelHeader}>
                <h3 style={{ ...styles.panelTitle, color: '#ff00ff' }}>
                  <CalendarDays size={18} /> Visit Calendar
                </h3>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#e0e0ff' }}>
                {today.toLocaleString('default', { month: 'long' }).toUpperCase()} {calendarYear}
              </div>
              <div style={styles.calendarGrid}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div
                    key={d}
                    style={{ textAlign: 'center', fontSize: '0.7rem', color: '#a0a0ff' }}
                  >
                    {d}
                  </div>
                ))}
                {calendarCells.map((cell, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.calendarCell,
                      backgroundColor: cell.hasVisit ? 'rgba(255, 0, 255, 0.18)' : 'transparent',
                      borderColor: cell.hasVisit ? '#ff00ff' : 'rgba(0, 255, 255, 0.2)',
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', color: '#ffffff' }}>
                      {cell.day ?? ''}
                    </span>
                    {cell.hasVisit && (
                      <span
                        style={{
                          alignSelf: 'flex-end',
                          width: '6px',
                          height: '6px',
                          borderRadius: '999px',
                          backgroundColor: '#ff00ff',
                          boxShadow: '0 0 6px #ff00ff',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#a0a0ff' }}>
                Pink-highlighted days indicate at least one buyer present in the area.
              </div>
            </section>

            {/* Priority Alerts (static copy for now) */}
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h3 style={{ ...styles.panelTitle, color: '#ff00ff' }}>
                  <Bell size={18} /> Priority Alerts
                </h3>
              </div>
              <ul style={styles.list}>
                <li style={styles.cardItem}>
                  <div style={{ fontSize: '0.85rem' }}>
                    High-budget client arriving next week – ensure fresh stock in key areas.
                  </div>
                </li>
                <li style={styles.cardItem}>
                  <div style={{ fontSize: '0.85rem' }}>
                    Several buyers have no updated criteria in the last 90 days – schedule strategy calls.
                  </div>
                </li>
                <li style={styles.cardItem}>
                  <div style={{ fontSize: '0.85rem' }}>
                    Email reminder engine can be wired via Supabase Edge Functions + Cron for automatic follow-ups.
                  </div>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      {/* Popups */}
      <CreateClientPopup isOpen={activePopup === 'client'} onClose={() => setActivePopup(null)} />
      <CreateMandatePopup isOpen={activePopup === 'mandate'} onClose={() => setActivePopup(null)} />
      <CreatePropertyPopup isOpen={activePopup === 'property'} onClose={() => setActivePopup(null)} />
    </div>
  );
}
