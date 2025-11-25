'use client';

import React, { useState, useEffect, CSSProperties } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, User, MapPin, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import MainHeader from '../../../components/MainHeader';
import EditClientPopup from '../../../components/popups/EditClientPopup';
import Popup from '../../../components/Popup'; // Reusing your generic popup wrapper

// --- Supabase ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Interfaces ---
interface VisitEvent {
  id: string;
  client_id: string;
  visit_start_date: string;
  visit_end_date: string;
  notes: string;
  clients: {
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    client_search_criteria: any[]; // For the summary
  };
}

interface TaskEvent {
  id: string;
  client_id: string;
  due_date: string;
  task_type: string;
  status: string;
  notes: string;
  clients: {
    first_name: string;
    last_name: string;
  };
}

// --- Styles ---
const styles: { [key: string]: CSSProperties } = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#0d0d21',
    fontFamily: "'Orbitron', sans-serif",
    color: '#00ffff',
    backgroundImage: `linear-gradient(rgba(13, 13, 33, 0.97), rgba(13, 13, 33, 0.97)), repeating-linear-gradient(45deg, rgba(255, 0, 255, 0.05), rgba(255, 0, 255, 0.05) 1px, transparent 1px, transparent 10px)`,
  },
  mainContent: { padding: '30px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { fontSize: '1.8rem', color: '#ff00ff', textTransform: 'uppercase', textShadow: '0 0 8px rgba(255, 0, 255, 0.7)' },
  navControls: { display: 'flex', gap: '15px', alignItems: 'center' },
  navBtn: { background: 'transparent', border: '1px solid #00ffff', color: '#00ffff', padding: '8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  monthLabel: { fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', minWidth: '200px', textAlign: 'center' },
  
  // Grid
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: 'rgba(0, 255, 255, 0.3)', border: '1px solid rgba(0, 255, 255, 0.3)' },
  dayHeader: { backgroundColor: 'rgba(0, 255, 255, 0.1)', padding: '10px', textAlign: 'center', color: '#ff00ff', fontWeight: 'bold', fontSize: '0.9rem' },
  dayCell: { backgroundColor: '#0d0d21', minHeight: '120px', padding: '5px', display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' },
  dayNumber: { fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', alignSelf: 'flex-end', marginRight: '5px' },
  currentDay: { color: '#ff00ff', fontWeight: 'bold', textShadow: '0 0 5px #ff00ff' },
  
  // Events
  visitPill: { fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255, 0, 255, 0.15)', border: '1px solid #ff00ff', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  taskDot: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', marginRight: '4px' },
  taskRow: { fontSize: '0.7rem', color: '#a0a0ff', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  
  // Detail Popup Specifics
  detailRow: { marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed rgba(0, 255, 255, 0.3)' },
  detailLabel: { color: '#ff00ff', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px', display: 'block' },
  detailValue: { color: '#fff', fontSize: '0.95rem' },
  actionBtn: { marginTop: '20px', width: '100%', padding: '12px', backgroundColor: '#00ffff', border: 'none', borderRadius: '4px', color: '#000', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase' }
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visits, setVisits] = useState<VisitEvent[]>([]);
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected Item for Detail View
  const [selectedVisit, setSelectedVisit] = useState<VisitEvent | null>(null);
  
  // Edit Popup State
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // --- Fetch Data ---
  useEffect(() => {
    fetchMonthData();
  }, [currentDate]);

  const fetchMonthData = async () => {
    setLoading(true);
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

    // 1. Fetch Visits
    const { data: visitsData } = await supabase
      .from('client_visits')
      .select(`
        *,
        clients (first_name, last_name, email, mobile, client_search_criteria(min_budget, max_budget, locations, property_types))
      `)
      .lte('visit_start_date', endOfMonth)
      .gte('visit_end_date', startOfMonth);

    // 2. Fetch Tasks
    const { data: tasksData } = await supabase
      .from('client_tasks')
      .select(`*, clients (first_name, last_name)`)
      .gte('due_date', startOfMonth)
      .lte('due_date', endOfMonth);

    if (visitsData) setVisits(visitsData as any); // utilizing 'any' just for complex join typing simplicity here
    if (tasksData) setTasks(tasksData as any);
    setLoading(false);
  };

  // --- Helpers ---
  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Pad start (Monday start)
    let startPadding = (firstDay.getDay() + 6) % 7; 
    for (let i = 0; i < startPadding; i++) days.push(null);
    
    // Actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isSameDay = (d1: Date, d2Str: string) => {
    const d2 = new Date(d2Str);
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  const isVisitDay = (day: Date, visit: VisitEvent) => {
    const current = day.getTime();
    const start = new Date(visit.visit_start_date).getTime();
    const end = new Date(visit.visit_end_date).getTime();
    return current >= start && current <= end;
  };

  // --- Render ---
  const days = getDaysInMonth();
  const today = new Date();

  return (
    <div style={styles.pageContainer}>
      <MainHeader />
      <main style={styles.mainContent}>
        {/* Header & Nav */}
        <div style={styles.header}>
          <h1 style={styles.title}>// MISSION CALENDAR</h1>
          <div style={styles.navControls}>
            <button style={styles.navBtn} onClick={() => changeMonth(-1)}><ChevronLeft size={20}/></button>
            <div style={styles.monthLabel}>
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
            </div>
            <button style={styles.navBtn} onClick={() => changeMonth(1)}><ChevronRight size={20}/></button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={styles.grid}>
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
            <div key={d} style={styles.dayHeader}>{d}</div>
          ))}
          
          {days.map((day, idx) => {
            if (!day) return <div key={`pad-${idx}`} style={{...styles.dayCell, backgroundColor: 'rgba(0,0,0,0.3)'}} />;
            
            const dayVisits = visits.filter(v => isVisitDay(day, v));
            const dayTasks = tasks.filter(t => isSameDay(day, t.due_date));
            const isToday = isSameDay(day, today.toISOString());

            return (
              <div key={idx} style={styles.dayCell}>
                <span style={{...styles.dayNumber, ...(isToday ? styles.currentDay : {})}}>
                  {day.getDate()}
                </span>
                
                {/* Visits */}
                {dayVisits.map(v => (
                  <div key={v.id} style={styles.visitPill} onClick={() => setSelectedVisit(v)}>
                    <MapPin size={10} style={{display:'inline', marginRight:'4px'}} />
                    {v.clients.last_name}
                  </div>
                ))}

                {/* Tasks */}
                {dayTasks.map(t => (
                  <div key={t.id} style={styles.taskRow} title={t.notes}>
                    <span style={{...styles.taskDot, backgroundColor: t.status === 'done' ? '#00ff00' : '#ffff00'}} />
                    {t.task_type === 'follow_up' ? 'Call' : 'Task'} {t.clients.last_name}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </main>

      {/* --- VISIT DETAIL POPUP --- */}
      {selectedVisit && (
        <Popup isOpen={!!selectedVisit} onClose={() => setSelectedVisit(null)} title={`VISIT: ${selectedVisit.clients.first_name} ${selectedVisit.clients.last_name}`}>
          <div className="flex flex-col gap-4">
            {/* Visit Info */}
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}><Clock size={14} style={{display:'inline'}}/> Dates</span>
              <span style={styles.detailValue}>
                {new Date(selectedVisit.visit_start_date).toLocaleDateString()} — {new Date(selectedVisit.visit_end_date).toLocaleDateString()}
              </span>
            </div>
            
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}><AlertCircle size={14} style={{display:'inline'}}/> Visit Notes</span>
              <span style={styles.detailValue}>{selectedVisit.notes || "No specific notes recorded."}</span>
            </div>

            {/* Criteria Snapshot */}
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}><User size={14} style={{display:'inline'}}/> Client Criteria</span>
              {selectedVisit.clients.client_search_criteria?.[0] ? (
                <div style={{fontSize: '0.9rem', color: '#ccc'}}>
                  <div>Locations: <span style={{color:'#fff'}}>{selectedVisit.clients.client_search_criteria[0].locations}</span></div>
                  <div>Budget: <span style={{color:'#fff'}}>€{selectedVisit.clients.client_search_criteria[0].min_budget / 1000}k - €{selectedVisit.clients.client_search_criteria[0].max_budget / 1000}k</span></div>
                </div>
              ) : <span style={{color:'#888'}}>No criteria set.</span>}
            </div>

            {/* Property Placeholder */}
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}><MapPin size={14} style={{display:'inline'}}/> Selected Properties</span>
              <ul style={{listStyle: 'none', padding: 0, fontSize: '0.9rem', color: '#ccc'}}>
                <li style={{marginBottom: '4px'}}>• Villa La Vigie (Sample)</li>
                <li style={{marginBottom: '4px'}}>• Apt. Croisette (Sample)</li>
                {/* You can connect this to a real 'client_selections' table later */}
              </ul>
            </div>

            {/* Edit Action */}
            <button 
              style={styles.actionBtn}
              onClick={() => {
                setEditingClientId(selectedVisit.client_id);
                setSelectedVisit(null); // Close detail view
              }}
            >
              Modify / Edit Client Info
            </button>
          </div>
        </Popup>
      )}

      {/* --- FULL EDIT POPUP --- */}
      {editingClientId && (
        <EditClientPopup 
          isOpen={!!editingClientId} 
          onClose={() => {
            setEditingClientId(null);
            fetchMonthData(); // Refresh calendar on close
          }} 
          clientId={editingClientId}
        />
      )}
    </div>
  );
}
