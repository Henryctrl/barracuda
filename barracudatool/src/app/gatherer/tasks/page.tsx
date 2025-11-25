'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  Bell,
  Loader2,
  ArrowLeft,
  Hourglass,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import MainHeader from '../../../components/MainHeader';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type FollowUpStatus = 'pending' | 'snoozed' | 'done';

interface TaskRow {
  id: string;
  client_id: string;
  task_type: string | null;
  status: FollowUpStatus;
  due_date: string;
  notes: string | null;
  clients: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export default function AllTasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_tasks')
      .select(
        `
        id,
        client_id,
        task_type,
        status,
        due_date,
        notes,
        clients (
          first_name,
          last_name
        )
      `
      )
      .order('due_date', { ascending: true });

    if (!error && data) setTasks(data as unknown as TaskRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusChange = async (id: string, status: FollowUpStatus) => {
    await supabase.from('client_tasks').update({ status }).eq('id', id);
    fetchTasks();
  };

  const handleSnooze = async (id: string) => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + 7);
    const snoozeStr = snoozeDate.toISOString().split('T')[0];
    await supabase
      .from('client_tasks')
      .update({ status: 'snoozed', snoozed_until: snoozeStr })
      .eq('id', id);
    fetchTasks();
  };

  return (
    <div className="min-h-screen bg-[#0d0d21] text-[#00ffff] font-[Orbitron]">
      <MainHeader />
      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xl md:text-2xl text-[#ff00ff] uppercase font-bold tracking-wider">
            <Bell size={22} />
            {'// ALL TASKS'}
          </div>
          <Link
            href="/gatherer"
            className="flex items-center gap-2 text-xs uppercase border border-[#00ffff] px-3 py-1.5 rounded hover:bg-[#00ffff]/10"
          >
            <ArrowLeft size={14} /> Back to hub
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-[#00ffff]">
            <Loader2 className="animate-spin" size={40} />
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(t => {
              const name = t.clients
                ? `${t.clients.first_name || ''} ${t.clients.last_name || ''}`.trim()
                : 'Unknown client';
              const due = new Date(t.due_date).toLocaleDateString('en-GB');
              const isDone = t.status === 'done';
              const isSnoozed = t.status === 'snoozed';

              const borderColor = isDone
                ? '#00ff00'
                : isSnoozed
                ? '#ffff00'
                : '#00ffff';

              return (
                <div
                  key={t.id}
                  className="border rounded px-4 py-3 bg-[#020222]/60 flex flex-col gap-1"
                  style={{ borderColor, opacity: isDone ? 0.6 : 1 }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm md:text-base">
                      {name}
                    </span>
                    <span className="text-[0.7rem] text-[#a0a0ff]">
                      Due: {due}
                    </span>
                  </div>
                  <div className="text-xs md:text-sm text-[#e0e0ff]">
                    {t.notes || 'Follow up with this client.'}
                  </div>
                  <div className="flex items-center gap-2 text-[0.7rem] mt-1">
                    <span className="px-2 py-0.5 border border-[#ff00ff] rounded-full text-[#ff00ff]">
                      {t.task_type === 'follow_up' ? 'Call' : 'Task'}
                    </span>
                    {isSnoozed && (
                      <span className="px-2 py-0.5 border border-[#ffff00] rounded-full text-[#ffff00]">
                        Snoozed
                      </span>
                    )}
                    {isDone && (
                      <span className="px-2 py-0.5 border border-[#00ff00] rounded-full text-[#00ff00]">
                        Completed
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {!isDone && (
                      <>
                        <button
                          onClick={() => handleSnooze(t.id)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs border border-[#ff00ff] text-[#ff00ff] rounded py-1 hover:bg-[#ff00ff]/10"
                        >
                          <Hourglass size={12} /> Snooze 7d
                        </button>
                        <button
                          onClick={() => handleStatusChange(t.id, 'done')}
                          className="flex-1 flex items-center justify-center gap-1 text-xs border border-[#00ff00] text-[#00ff00] rounded py-1 hover:bg-[#00ff00]/10"
                        >
                          <CheckCircle2 size={12} /> Done
                        </button>
                      </>
                    )}
                    {isDone && (
                      <button
                        onClick={() => handleStatusChange(t.id, 'pending')}
                        className="flex-1 flex items-center justify-center gap-1 text-xs border border-[#ff00ff] text-[#ff00ff] rounded py-1 hover:bg-[#ff00ff]/10"
                      >
                        <RotateCcw size={12} /> Undo (Pending)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {tasks.length === 0 && (
              <div className="text-center text-sm text-[#a0a0ff] py-10">
                No tasks yet.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
