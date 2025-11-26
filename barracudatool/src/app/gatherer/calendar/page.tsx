'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalIcon,
  MapPin,
  Clock,
  AlertCircle,
  User,
  Loader2,
  Phone,
  Mail,
  CheckSquare,
  Clock3,
} from 'lucide-react';
import MainHeader from '../../../components/MainHeader';
import Popup from '../../../components/Popup';
import EditClientPopup from '../../../components/popups/EditClientPopup';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------- Types ----------
interface ClientCriteria {
  min_budget: number | null;
  max_budget: number | null;
  locations: string | null;
  property_types: string[] | null;
}

interface VisitClient {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  mobile: string | null;
  client_search_criteria: ClientCriteria[] | null;
}

interface VisitEvent {
  id: string;
  client_id: string;
  visit_start_date: string;
  visit_end_date: string;
  notes: string | null;
  color: string | null;
  clients: VisitClient;
}

interface TaskClient {
  first_name: string | null;
  last_name: string | null;
}

interface TaskEvent {
  id: string;
  client_id: string;
  due_date: string;
  task_type: string;
  status: string;
  notes: string | null;
  clients: TaskClient;
}

type ViewMode = 'month' | 'week' | 'day';

const VISIT_COLORS = ['#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff8800'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const [visits, setVisits] = useState<VisitEvent[]>([]);
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedVisit, setSelectedVisit] = useState<VisitEvent | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskEvent | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  // ----- Date range helpers -----
  const getRangeForView = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const d = currentDate.getDate();
    if (viewMode === 'month') {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { start, end };
    }
    if (viewMode === 'week') {
      const dayOfWeek = (currentDate.getDay() + 6) % 7;
      const start = new Date(y, m, d - dayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    }
    const start = new Date(y, m, d);
    const end = new Date(y, m, d);
    return { start, end };
  };

  const { start, end } = getRangeForView();
  const rangeStartStr = start.toISOString().split('T')[0];
  const rangeEndStr = end.toISOString().split('T')[0];

  // ----- Fetch data -----
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: visitsData } = await supabase
        .from('client_visits')
        .select(
          `
          id,
          client_id,
          visit_start_date,
          visit_end_date,
          notes,
          color,
          clients (
            first_name,
            last_name,
            email,
            mobile,
            client_search_criteria (
              min_budget,
              max_budget,
              locations,
              property_types
            )
          )
        `
        )
        .lte('visit_start_date', rangeEndStr)
        .gte('visit_end_date', rangeStartStr);

      const { data: tasksData } = await supabase
        .from('client_tasks')
        .select(
          `
          id,
          client_id,
          due_date,
          task_type,
          status,
          notes,
          clients (
            first_name,
            last_name
          )
        `
        )
        .gte('due_date', rangeStartStr)
        .lte('due_date', rangeEndStr);

      setVisits((visitsData as unknown as VisitEvent[]) || []);
      setTasks((tasksData as unknown as TaskEvent[]) || []);
      setLoading(false);
    };

    fetchData();
  }, [rangeStartStr, rangeEndStr, viewMode]);

  // ----- Navigation -----
  const changeMonth = (delta: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + delta);
    setCurrentDate(d);
  };

  const changeWeek = (delta: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta * 7);
    setCurrentDate(d);
  };

  const changeDay = (delta: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta);
    setCurrentDate(d);
  };

  const goPrev = () => {
    if (viewMode === 'month') changeMonth(-1);
    else if (viewMode === 'week') changeWeek(-1);
    else changeDay(-1);
  };

  const goNext = () => {
    if (viewMode === 'month') changeMonth(1);
    else if (viewMode === 'week') changeWeek(1);
    else changeDay(1);
  };

  // ----- Helpers -----
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    const startPadding = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startPadding; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };

  const isSameDay = (d: Date, dateStr: string) => {
    const other = new Date(dateStr);
    return (
      d.getDate() === other.getDate() &&
      d.getMonth() === other.getMonth() &&
      d.getFullYear() === other.getFullYear()
    );
  };

  const isVisitDay = (d: Date, v: VisitEvent) => {
    const current = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const start = new Date(v.visit_start_date);
    const startNorm = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    
    const end = new Date(v.visit_end_date);
    const endNorm = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    
    return current >= startNorm && current <= endNorm;
  };

  const today = new Date();

  const updateVisitColor = async (visitId: string, color: string) => {
    await supabase.from('client_visits').update({ color }).eq('id', visitId);
    setVisits(prev => prev.map(v => (v.id === visitId ? { ...v, color } : v)));
    setSelectedVisit(prev => (prev && prev.id === visitId ? { ...prev, color } : prev));
  };

  // ----- Task icon helper -----
  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'follow_up':
        return Phone;
      case 'email':
        return Mail;
      case 'meeting':
        return Clock3;
      default:
        return CheckSquare;
    }
  };

  // ----- Components -----
  const renderVisitPill = (v: VisitEvent) => {
    const bgColor = v.color || 'rgba(255, 0, 255, 0.15)';
    const borderColor = v.color || '#ff00ff';
    const lastName = v.clients?.last_name || 'Client';
    return (
      <div
        key={v.id}
        className="text-[0.7rem] px-2 py-1 rounded border cursor-pointer truncate mb-1 font-bold"
        style={{ backgroundColor: bgColor, borderColor }}
        onClick={() => setSelectedVisit(v)}
      >
        <MapPin size={11} className="inline mr-1" />
        {lastName}
      </div>
    );
  };

  const renderTaskPill = (t: TaskEvent) => {
    const isDone = t.status === 'done';
    const TaskIcon = getTaskIcon(t.task_type);
    const lastName = t.clients?.last_name || 'Client';
    
    return (
      <div
        key={t.id}
        className={`text-[0.7rem] px-2 py-1 rounded border cursor-pointer truncate mb-1 font-bold flex items-center gap-1 ${
          isDone 
            ? 'bg-green-500/20 border-green-500 text-green-400' 
            : 'bg-yellow-400/20 border-yellow-400 text-yellow-300'
        }`}
        onClick={() => setSelectedTask(t)}
        title={t.notes || ''}
      >
        <TaskIcon size={11} className="shrink-0" />
        <span className="truncate">{lastName}</span>
      </div>
    );
  };

  const renderMonthView = () => {
    const days = getMonthDays();
    return (
      <div className="grid grid-cols-7 gap-px bg-[#00ffff]/30 border border-[#00ffff]/30">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
          <div key={d} className="bg-[#00ffff]/10 p-2 text-center text-[#ff00ff] font-bold text-xs md:text-sm">
            {d}
          </div>
        ))}

        {days.map((day, idx) => {
          if (!day) return <div key={`pad-${idx}`} className="bg-black/30 min-h-[90px] md:min-h-[120px]" />;

          const dayVisits = visits.filter(v => isVisitDay(day, v));
          const dayTasks = tasks.filter(t => isSameDay(day, t.due_date));
          const isToday =
            day.getDate() === today.getDate() &&
            day.getMonth() === today.getMonth() &&
            day.getFullYear() === today.getFullYear();

          return (
            <div 
              key={idx} 
              className={`
                min-h-[90px] md:min-h-[120px] p-1.5 flex flex-col gap-1 relative transition-colors
                ${isToday 
                  ? 'bg-[#ff00ff]/10 border-2 border-[#ff00ff] shadow-[inset_0_0_15px_rgba(255,0,255,0.2)] z-10' 
                  : 'bg-[#0d0d21] hover:bg-[#0d0d21]/80'
                }
              `}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-xs ${isToday ? 'text-[#ff00ff] font-extrabold text-base drop-shadow-[0_0_5px_rgba(255,0,255,0.8)]' : 'text-white/60'}`}>
                  {day.getDate()}
                </span>
                
                {/* Task count badge */}
                {dayTasks.length > 0 && (
                  <div className="flex items-center gap-1 bg-yellow-400/20 border border-yellow-400 rounded-full px-1.5 py-0.5">
                    <CheckSquare size={10} className="text-yellow-400" />
                    <span className="text-[0.6rem] font-bold text-yellow-300">{dayTasks.length}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 w-full flex-1 overflow-auto">
                {dayVisits.map(renderVisitPill)}
                {dayTasks.map(renderTaskPill)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekOrDayView = () => {
    const isWeek = viewMode === 'week';
    const days: Date[] = [];

    if (isWeek) {
      const base = new Date(start);
      for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        days.push(d);
      }
    } else {
      days.push(new Date(currentDate));
    }

    const hours = Array.from({ length: 12 }, (_, i) => i + 8);

    return (
      <div className={`grid ${isWeek ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]'} border border-[#00ffff]/30 overflow-auto max-h-[70vh]`}>
        <div className="bg-[#00ffff]/10 border-b border-r border-[#00ffff]/30" />

        {days.map((d, idx) => {
          const dayTasks = tasks.filter(t => isSameDay(d, t.due_date));
          return (
            <div key={idx} className="bg-[#00ffff]/10 p-2 text-center text-[#ff00ff] text-xs font-bold border-b border-[#00ffff]/30 sticky top-0 z-10">
              <div>{d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</div>
              {dayTasks.length > 0 && (
                <div className="flex items-center justify-center gap-1 mt-1 bg-yellow-400/20 border border-yellow-400 rounded-full px-2 py-0.5 mx-auto w-fit">
                  <CheckSquare size={10} className="text-yellow-400" />
                  <span className="text-[0.6rem] text-yellow-300">{dayTasks.length}</span>
                </div>
              )}
            </div>
          );
        })}

        {hours.map(h => (
          <React.Fragment key={h}>
            <div className="text-[0.65rem] text-gray-400 p-1 border-r border-b border-[#00ffff]/10 text-right pr-2">
              {`${h.toString().padStart(2, '0')}:00`}
            </div>
            
            {days.map((d) => {
              const dayVisits = visits.filter(v => isVisitDay(d, v));
              const dayTasks = tasks.filter(t => isSameDay(d, t.due_date));
              
              const hasContent = h === 8 && (dayVisits.length > 0 || dayTasks.length > 0);

              return (
                <div key={`${d.toISOString()}-${h}`} className="border-b border-[#00ffff]/10 p-1 min-h-[45px]">
                  {hasContent && (
                    <div className="flex flex-col gap-1">
                      {dayVisits.map(renderVisitPill)}
                      {dayTasks.map(renderTaskPill)}
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0d0d21] font-[Orbitron] text-[#00ffff]"
      style={{
        backgroundImage: `linear-gradient(rgba(13, 13, 33, 0.97), rgba(13, 13, 33, 0.97)), repeating-linear-gradient(45deg, rgba(255, 0, 255, 0.05), rgba(255, 0, 255, 0.05) 1px, transparent 1px, transparent 10px)`,
      }}
    >
      <MainHeader />
      <main className="p-4 md:p-8">
        <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-6 w-full">
          <div className="flex items-center gap-2 text-xl md:text-2xl text-[#ff00ff] uppercase font-bold tracking-wider drop-shadow-[0_0_8px_rgba(255,0,255,0.7)]">
            <CalIcon size={24} />
            {'// MISSION CALENDAR'}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full xl:w-auto justify-center xl:justify-end">
            <div className="flex rounded border border-[#00ffff] overflow-hidden shrink-0">
              {(['month', 'week', 'day'] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-4 py-2 text-xs uppercase font-bold transition-colors ${
                    viewMode === m
                      ? 'bg-[#00ffff] text-[#0d0d21]'
                      : 'bg-transparent text-[#00ffff] hover:bg-[#00ffff]/10'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 bg-[#00ffff]/5 p-1 rounded border border-[#00ffff]/20">
              <button
                onClick={goPrev}
                className="p-2 text-[#00ffff] hover:bg-[#00ffff]/20 rounded transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="text-white font-bold w-36 text-center text-sm md:text-base tracking-widest">
                {currentDate.toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase()}
              </div>
              
              <button
                onClick={goNext}
                className="p-2 text-[#00ffff] hover:bg-[#00ffff]/20 rounded transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-6 py-2 bg-[#ff00ff] text-white font-bold text-xs uppercase rounded shadow-[0_0_15px_rgba(255,0,255,0.4)] hover:bg-[#ff00ff]/80 hover:shadow-[0_0_20px_rgba(255,0,255,0.6)] transition-all shrink-0"
            >
              Today
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-[#00ffff]">
            <Loader2 className="animate-spin" size={40} />
          </div>
        ) : (
          viewMode === 'month' ? renderMonthView() : renderWeekOrDayView()
        )}
      </main>

      {/* VISIT POPUP */}
      {selectedVisit && (
        <Popup
          isOpen={!!selectedVisit}
          onClose={() => setSelectedVisit(null)}
          title={`VISIT: ${selectedVisit.clients?.first_name || ''} ${selectedVisit.clients?.last_name || ''}`}
        >
          <div className="flex flex-col gap-4">
            <div className="border-b border-[#00ffff]/30 pb-3 mb-1">
              <span className="flex items-center gap-1 text-[#ff00ff] text-xs uppercase mb-1"><Clock size={14} /> Dates</span>
              <span className="text-white text-sm">
                {new Date(selectedVisit.visit_start_date).toLocaleDateString()} — {new Date(selectedVisit.visit_end_date).toLocaleDateString()}
              </span>
            </div>

            <div className="border-b border-[#00ffff]/30 pb-3 mb-1">
              <span className="flex items-center gap-1 text-[#ff00ff] text-xs uppercase mb-1"><AlertCircle size={14} /> Notes</span>
              <span className="text-white text-sm">{selectedVisit.notes || 'No notes.'}</span>
            </div>

            <div className="border-b border-[#00ffff]/30 pb-3 mb-1">
              <span className="flex items-center gap-1 text-[#ff00ff] text-xs uppercase mb-1"><User size={14} /> Criteria</span>
              {selectedVisit.clients?.client_search_criteria?.[0] ? (
                <div className="text-gray-300 text-sm">
                  <div>Loc: <span className="text-white">{selectedVisit.clients.client_search_criteria[0].locations || '-'}</span></div>
                  <div>Budget: <span className="text-white">
                    {selectedVisit.clients.client_search_criteria[0].min_budget ? `€${selectedVisit.clients.client_search_criteria[0].min_budget}` : '-'}
                  </span></div>
                </div>
              ) : <span className="text-gray-500 text-sm">No criteria.</span>}
            </div>

            <div className="border-b border-[#00ffff]/30 pb-3 mb-1">
              <span className="block text-[#ff00ff] text-xs uppercase mb-1">Color Tag</span>
              <div className="flex gap-2">
                {VISIT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => updateVisitColor(selectedVisit.id, c)}
                    className={`w-6 h-6 rounded-full border ${selectedVisit.color === c ? 'border-white ring-2 ring-white/50' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              className="w-full py-3 bg-[#00ffff] text-black font-bold rounded uppercase hover:bg-[#00ffff]/80 transition-colors mt-2"
              onClick={() => {
                setEditingClientId(selectedVisit.client_id);
                setSelectedVisit(null);
              }}
            >
              Modify / Edit Client
            </button>
          </div>
        </Popup>
      )}

      {/* TASK POPUP */}
      {selectedTask && (
        <Popup
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title={`TASK: ${selectedTask.task_type.toUpperCase().replace('_', ' ')}`}
        >
          <div className="flex flex-col gap-4">
            <div className="border-b border-[#00ffff]/30 pb-3 mb-1">
              <span className="flex items-center gap-1 text-[#ff00ff] text-xs uppercase mb-1"><User size={14} /> Client</span>
              <span className="text-white text-sm">
                {selectedTask.clients?.first_name} {selectedTask.clients?.last_name}
              </span>
            </div>

            <div className="border-b border-[#00ffff]/30 pb-3 mb-1">
              <span className="flex items-center gap-1 text-[#ff00ff] text-xs uppercase mb-1"><Clock size={14} /> Due Date</span>
              <span className="text-white text-sm">{new Date(selectedTask.due_date).toLocaleDateString()}</span>
            </div>

            <div className="border-b border-[#00ffff]/30 pb-3 mb-1">
              <span className="flex items-center gap-1 text-[#ff00ff] text-xs uppercase mb-1"><AlertCircle size={14} /> Status</span>
              <span className={`text-sm font-bold ${selectedTask.status === 'done' ? 'text-green-400' : 'text-yellow-400'}`}>
                {selectedTask.status.toUpperCase()}
              </span>
            </div>

            <div className="border-b border-[#00ffff]/30 pb-3 mb-1">
              <span className="flex items-center gap-1 text-[#ff00ff] text-xs uppercase mb-1"><AlertCircle size={14} /> Notes</span>
              <span className="text-white text-sm">{selectedTask.notes || 'No notes.'}</span>
            </div>

            <button
              className="w-full py-3 bg-[#00ffff] text-black font-bold rounded uppercase hover:bg-[#00ffff]/80 transition-colors mt-2"
              onClick={() => {
                setEditingClientId(selectedTask.client_id);
                setSelectedTask(null);
              }}
            >
              Edit Client & Tasks
            </button>
          </div>
        </Popup>
      )}

      {/* FULL EDIT POPUP */}
      {editingClientId && (
        <EditClientPopup
          isOpen={!!editingClientId}
          onClose={() => {
            setEditingClientId(null);
          }}
          clientId={editingClientId}
        />
      )}
    </div>
  );
}
