//src/app/gatherer/page.tsx

'use client';

import React, { useState, useEffect, CSSProperties } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  FilePlus,
  Bell,
  Home,
  CalendarDays,
  Hourglass,
  CheckCircle2,
  Loader2,
  Edit,
  RotateCcw,
  Crown,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import MainHeader from '../../components/MainHeader';
import CreateClientPopup from '../../components/popups/CreateClientPopup';
import CreateMandatePopup from '../../components/popups/CreateMandatePopup';
import CreatePropertyPopup from '../../components/popups/CreatePropertyPopup';
import CreateTaskPopup from '../../components/popups/CreateTaskPopup';
import CreateVisitPopup from '../../components/popups/CreateVisitPopup';
import EditVisitPopup from '../../components/popups/EditVisitPopup';
import EditClientPopup from '../../components/popups/EditClientPopup';

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

interface VisitingSoon {
  id: string;
  visit_start_date: string;
  visit_end_date: string | null;
  notes: string | null;
  color: string | null;
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
  const current = new Date(startDate);
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
  const [activePopup, setActivePopup] =
    useState<'client' | 'mandate' | 'property' | 'task' | 'visit' | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  const [recentClients, setRecentClients] = useState<RecentlyAddedClient[]>([]);
  const [visitingSoon, setVisitingSoon] = useState<VisitingSoon[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);
  const [totalClients, setTotalClients] = useState(0);

  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

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

  const fetchTotalClients = async () => {
    setLoadingStats(true);
    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    if (!error && count !== null) setTotalClients(count);
    setLoadingStats(false);
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
        color,
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

    if (!error && data) setVisitingSoon(data as unknown as VisitingSoon[]);
    setLoadingVisits(false);
  };

  const fetchFollowUps = async () => {
    setLoadingTasks(true);
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
      .order('due_date', { ascending: true });

    if (!error && data) setFollowUps(data as unknown as FollowUpTask[]);
    setLoadingTasks(false);
  };

  useEffect(() => {
    fetchRecentClients();
    fetchVisitingSoon();
    fetchFollowUps();
    fetchTotalClients();
  }, []);

  // ---------- Task actions with Undo ----------
  const updateLocalTaskStatus = (id: string, status: FollowUpStatus) => {
    setFollowUps(prev => prev.map(t => (t.id === id ? { ...t, status } : t)));
  };

  const handleSnooze = async (taskId: string) => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + 7);
    const snoozeStr = snoozeDate.toISOString().split('T')[0];

    updateLocalTaskStatus(taskId, 'snoozed'); // optimistic
    await supabase
      .from('client_tasks')
      .update({ status: 'snoozed', snoozed_until: snoozeStr })
      .eq('id', taskId);
  };

  const handleDone = async (taskId: string) => {
    updateLocalTaskStatus(taskId, 'done');
    await supabase.from('client_tasks').update({ status: 'done' }).eq('id', taskId);
  };

  const handleUndo = async (taskId: string) => {
    updateLocalTaskStatus(taskId, 'pending');
    await supabase.from('client_tasks').update({ status: 'pending' }).eq('id', taskId);
  };

    // ---------- Calendar logic with TASKS ----------
  const today = new Date();
  const [calendarMonth] = useState(today.getMonth());
  const [calendarYear] = useState(today.getFullYear());

  const firstOfMonth = new Date(calendarYear, calendarMonth, 1);
  const firstDayIndex = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  // Map visit dates to colors
  const visitDateColors = new Map<string, string>();
  visitingSoon.forEach(v => {
    const start = v.visit_start_date;
    const end = v.visit_end_date || v.visit_start_date;
    const color = v.color || '#ff00ff';
    getDatesBetween(start, end).forEach(d => {
      if (!visitDateColors.has(d)) visitDateColors.set(d, color);
    });
  });

  // Map task dates to counts
  const taskDateCounts = new Map<string, number>();
  followUps.forEach(task => {
    const dateStr = task.due_date;
    taskDateCounts.set(dateStr, (taskDateCounts.get(dateStr) || 0) + 1);
  });

  const calendarCells: Array<{ 
    day: number | null; 
    color: string | null; 
    taskCount: number;
  }> = [];
  
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ day: null, color: null, taskCount: 0 });
  }
  
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(calendarMonth + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const key = `${calendarYear}-${monthStr}-${dayStr}`;
    const color = visitDateColors.get(key) || null;
    const taskCount = taskDateCounts.get(key) || 0;
    calendarCells.push({ day: d, color, taskCount });
  }

  const pendingTasksCount = followUps.filter(t => t.status !== 'done').length;


  return (
    <div style={styles.pageContainer}>
      <MainHeader />
      <main
        style={{
          ...styles.mainContent,
          filter: activePopup || editingVisitId || editingClientId ? 'blur(5px)' : 'none',
        }}
      >
        <h2 style={styles.sectionHeader}>{'// BUYER CONTROL HUB'}</h2>

        {/* Status bar */}
        <div style={styles.statusBar}>
          <span style={styles.statusItem}>
            ACTIVE BUYERS: <strong>{loadingStats ? '...' : totalClients}</strong>
          </span>
          <span style={styles.statusItem}>
            VISITS NEXT 30 DAYS: <strong>{visitingSoon.length}</strong>
          </span>
          <span style={styles.statusItem}>
            PENDING TASKS: <strong>{pendingTasksCount}</strong>
          </span>
          <span style={styles.statusItem}>
            SYSTEM STATUS: <strong style={{ color: '#00ff00' }}>NOMINAL</strong>
          </span>
        </div>

        {/* Subscription Status Badge */}
<div className="mb-6 p-4 bg-[#00ff00]/10 border border-[#00ff00] rounded-lg flex items-center justify-between">
  <div className="flex items-center gap-3">
    <Crown className="text-[#00ff00]" size={24} />
    <div>
      <p className="text-white font-bold">Barracuda Pro Active</p>
      <p className="text-sm text-gray-400">Full access to all features</p>
    </div>
  </div>
  <Link
    href="/account"
    className="px-4 py-2 border border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/10 rounded uppercase text-xs font-bold"
  >
    Manage
  </Link>
</div>


        {/* Quick actions */}
        <div style={styles.quickActions}>
          <button style={styles.actionButton} onClick={() => setActivePopup('client')}>
            <UserPlus size={16} />
            <span>Add New Client</span>
          </button>
          {/* <button style={styles.actionButton} onClick={() => setActivePopup('mandate')}>
            <FilePlus size={16} />
            <span>Create New Mandate</span>
          </button> */}
          {/* <button style={styles.actionButton} onClick={() => setActivePopup('property')}>
            <Home size={16} />
            <span>Add New Property</span>
          </button> */}
        </div>

        {/* Main layout */}
        <div
          style={{ ...styles.contentLayout, ...(isLargeScreen ? styles.contentLayoutLarge : {}) }}
        >
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
                    const name =
                      `${client.first_name || ''} ${client.last_name || ''}`.trim() ||
                      'Unnamed Client';

                    const minB = crit?.min_budget;
                    const maxB = crit?.max_budget;
                    const budgetLabel =
                      minB != null || maxB != null
                        ? `€${(minB || 0).toLocaleString()} - €${(maxB || 0).toLocaleString()}`
                        : 'Budget Not Set';

                    const areas = crit?.locations || 'No areas set';
                    const created = new Date(client.created_at).toLocaleDateString('en-GB');

                    return (
                      <li
  key={client.id}
  style={{
    ...styles.cardItem,
    padding: '15px',
    borderLeft: '4px solid #00ffff',
  }}
>
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
    }}
  >
    <div>
      <div
        style={{
          fontSize: '1.1rem',
          fontWeight: 'bold',
          color: '#fff',
        }}
      >
        {name}
      </div>
      <div style={{ fontSize: '0.7rem', color: '#a0a0ff' }}>
        ID: {client.id.slice(0, 8)}
      </div>
    </div>

    {/* Button container with both buttons side-by-side */}
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={() => setEditingClientId(client.id)}
        style={{
          background: 'transparent',
          border: '1px solid #00ffff',
          color: '#00ffff',
          borderRadius: '4px',
          padding: '5px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '0.75rem',
        }}
      >
        <Edit size={14} /> Edit File
      </button>

      <Link 
        href={`/gatherer/clients/${client.id}`} 
        style={{ textDecoration: 'none' }}
      >
        <button
          style={{
            background: 'transparent',
            border: '1px solid #ff00ff',
            color: '#ff00ff',
            borderRadius: '4px',
            padding: '5px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.75rem',
          }}
        >
          <ExternalLink size={14} /> Scanner
        </button>
      </Link>
    </div>
  </div>

  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      fontSize: '0.9rem',
    }}
  >
    <div style={{ color: '#e0e0ff' }}>
      <strong>Budget:</strong>{' '}
      <span style={{ color: '#00ff00' }}>{budgetLabel}</span>
    </div>
    <div style={{ color: '#e0e0ff' }}>
      <strong>Looking in:</strong>{' '}
      <span style={{ color: '#ff00ff' }}>{areas}</span>
    </div>
    <div
      style={{
        fontSize: '0.75rem',
        color: '#888',
        marginTop: '5px',
      }}
    >
      Added: {created}
    </div>
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
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span
                    style={{ ...styles.panelAction, cursor: 'pointer' }}
                    onClick={() => setActivePopup('visit')}
                  >
                    + Log Visit
                  </span>
                  <Link href="/gatherer/visits" style={styles.panelAction}>
                    See all visits
                  </Link>
                </div>
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
                    const fromLabel = new Date(v.visit_start_date).toLocaleDateString('en-GB');
                    const toLabel = new Date(
                      v.visit_end_date || v.visit_start_date,
                    ).toLocaleDateString('en-GB');
                    const visitColor = v.color || '#ff00ff';

                    return (
                      <li
                        key={v.id}
                        style={{
                          ...styles.cardItem,
                          borderLeft: `4px solid ${visitColor}`,
                          paddingLeft: '16px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              color: '#fff',
                            }}
                          >
                            {name}
                          </span>
                          <span
                            style={{ ...styles.smallLabel, fontSize: '0.65rem' }}
                          >
                            ({v.id.slice(0, 8)})
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            color: visitColor,
                            marginBottom: '6px',
                            textShadow: `0 0 4px ${visitColor}`,
                          }}
                        >
                          📅 {fromLabel} → {toLabel}
                        </div>

                        <div
                          style={{
                            fontSize: '0.95rem',
                            color: '#e0e0ff',
                            fontWeight: 600,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '8px',
                            borderRadius: '4px',
                            marginBottom: '10px',
                            border: `1px solid ${visitColor}40`,
                          }}
                        >
                          {v.notes || 'No visit notes recorded'}
                        </div>

                        <button
                          type="button"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: `${visitColor}20`,
                            border: `1px solid ${visitColor}`,
                            borderRadius: '4px',
                            color: visitColor,
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                          onClick={() => setEditingVisitId(v.id)}
                        >
                          <Edit size={14} /> Edit Visit
                        </button>
                      </li>
                    );
                  })}
                  {visitingSoon.length === 0 && (
                    <li style={{ ...styles.cardItem, opacity: 0.6 }}>No visits planned.</li>
                  )}
                </ul>
              )}
            </section>

            {/* Follow-ups & Tasks with Undo */}
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h3 style={styles.panelTitle}>
                  <Bell size={18} /> Follow-ups & Tasks
                </h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span
                    style={{ ...styles.panelAction, cursor: 'pointer' }}
                    onClick={() => setActivePopup('task')}
                  >
                    + Create Task
                  </span>
                  <Link href="/gatherer/tasks" style={styles.panelAction}>
                    See all tasks
                  </Link>
                </div>
              </div>
              {loadingTasks ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : (
                <ul style={styles.list}>
                  {followUps.map(task => {
                    const isDone = task.status === 'done';
                    const isSnoozed = task.status === 'snoozed';
                    const name = task.clients
                      ? `${task.clients.first_name || ''} ${
                          task.clients.last_name || ''
                        }`.trim()
                      : 'Unknown client';
                    const dueLabel = new Date(task.due_date).toLocaleDateString('en-GB');

                    const bgColor = isDone
                      ? 'rgba(0, 255, 0, 0.08)'
                      : isSnoozed
                      ? 'rgba(255, 255, 0, 0.08)'
                      : 'rgba(0, 255, 255, 0.08)';

                    return (
                      <li
                        key={task.id}
                        style={{
                          ...styles.cardItem,
                          backgroundColor: bgColor,
                          opacity: isDone ? 0.7 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>
                            <strong>{name}</strong>{' '}
                            <span style={styles.smallLabel}>
                              ({task.client_id.slice(0, 8)})
                            </span>
                          </span>
                          <span style={styles.smallLabel}>{dueLabel}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#e0e0ff' }}>
                          {task.notes || 'Follow up with this client.'}
                        </div>
                        <div style={styles.badgeRow}>
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
                          <span style={styles.badgePink}>
                            {task.task_type === 'follow_up' ? 'Call' : 'Task'}
                          </span>
                        </div>

                        <div style={styles.followUpActions}>
                          {!isDone ? (
                            <>
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
                                <Hourglass size={12} /> Snooze 7d
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
                            </>
                          ) : (
                            <button
                              type="button"
                              style={{
                                ...styles.followUpBtn,
                                borderColor: '#ff00ff',
                                backgroundColor: 'rgba(255, 0, 255, 0.1)',
                                color: '#ff00ff',
                              }}
                              onClick={() => handleUndo(task.id)}
                            >
                              <RotateCcw size={12} /> Undo
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {followUps.length === 0 && (
                    <li style={{ ...styles.cardItem, opacity: 0.6 }}>
                      No tasks yet.
                    </li>
                  )}
                </ul>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div style={styles.columnStack}>
            {/* Mini Calendar */}
            <section style={styles.calendarPanel}>
              <div style={styles.panelHeader}>
                <h3 style={{ ...styles.panelTitle, color: '#ff00ff' }}>
                  <CalendarDays size={18} /> Visit Calendar
                </h3>
                <Link href="/gatherer/calendar" style={styles.panelAction}>
                  View Calendar
                </Link>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#e0e0ff' }}>
                {today.toLocaleString('default', { month: 'long' }).toUpperCase()}{' '}
                {calendarYear}
              </div>
                            <div style={styles.calendarGrid}>
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d, idx) => (
                  <div
                    key={idx}
                    style={{
                      textAlign: 'center',
                      fontSize: '0.65rem',
                      color: '#a0a0ff',
                      fontWeight: 'bold',
                    }}
                  >
                    {d}
                  </div>
                ))}
                {calendarCells.map((cell, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.calendarCell,
                      backgroundColor: cell.color ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
                      borderColor: cell.color || 'rgba(0, 255, 255, 0.2)',
                      position: 'relative',
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', color: '#ffffff' }}>
                      {cell.day ?? ''}
                    </span>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'flex-end', 
                      gap: '2px',
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                    }}>
                      {/* Visit indicator dot */}
                      {cell.color && (
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '999px',
                            backgroundColor: cell.color,
                            boxShadow: `0 0 6px ${cell.color}`,
                          }}
                        />
                      )}
                      
                      {/* Task count badge */}
                      {cell.taskCount > 0 && (
                        <span
                          style={{
                            fontSize: '0.55rem',
                            fontWeight: 'bold',
                            color: '#000',
                            backgroundColor: '#ffff00',
                            borderRadius: '999px',
                            padding: '1px 3px',
                            lineHeight: '1',
                            boxShadow: '0 0 4px rgba(255, 255, 0, 0.8)',
                            minWidth: '12px',
                            textAlign: 'center',
                          }}
                        >
                          {cell.taskCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: '12px',
                  fontSize: '0.75rem',
                  color: '#a0a0ff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: '#ff00ff',
                    boxShadow: '0 0 6px #ff00ff',
                  }} />
                  <span>Visit scheduled</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ 
                    fontSize: '0.6rem',
                    fontWeight: 'bold',
                    color: '#000',
                    backgroundColor: '#ffff00',
                    borderRadius: '999px',
                    padding: '1px 4px',
                    boxShadow: '0 0 4px rgba(255, 255, 0, 0.8)',
                  }}>
                    #
                  </span>
                  <span>Task count</span>
                </div>
              </div>

            </section>

            {/* Priority Alerts */}
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
                    Several buyers have no updated criteria in the last 90 days – schedule strategy
                    calls.
                  </div>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      {/* Popups */}
      <CreateClientPopup
        isOpen={activePopup === 'client'}
        onClose={() => {
          setActivePopup(null);
          fetchRecentClients();
          fetchTotalClients();
        }}
      />
      <CreateMandatePopup
        isOpen={activePopup === 'mandate'}
        onClose={() => setActivePopup(null)}
      />
      <CreatePropertyPopup
        isOpen={activePopup === 'property'}
        onClose={() => setActivePopup(null)}
      />
      <CreateTaskPopup
        isOpen={activePopup === 'task'}
        onClose={() => setActivePopup(null)}
        onTaskCreated={fetchFollowUps}
      />
      <CreateVisitPopup
        isOpen={activePopup === 'visit'}
        onClose={() => setActivePopup(null)}
        onVisitCreated={fetchVisitingSoon}
      />
      <EditVisitPopup
        isOpen={!!editingVisitId}
        visitId={editingVisitId}
        onClose={() => setEditingVisitId(null)}
        onVisitUpdated={fetchVisitingSoon}
      />
      {editingClientId && (
        <EditClientPopup
          isOpen={!!editingClientId}
          onClose={() => {
            setEditingClientId(null);
            fetchRecentClients();
          }}
          clientId={editingClientId}
        />
      )}
    </div>
  );
}
