'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { CalendarDays, Loader2, ArrowLeft, Edit } from 'lucide-react';
import MainHeader from '../../../components/MainHeader';
import EditVisitPopup from '../../../components/popups/EditVisitPopup';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface VisitRow {
  id: string;
  visit_start_date: string;
  visit_end_date: string | null;
  notes: string | null;
  color: string | null;
  clients: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export default function AllVisitsPage() {
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);

  const fetchVisits = async () => {
    setLoading(true);
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
          first_name,
          last_name
        )
      `
      )
      .order('visit_start_date', { ascending: true });

    if (!error && data) setVisits(data as unknown as VisitRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d21] text-[#00ffff] font-[Orbitron]">
      <MainHeader />
      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xl md:text-2xl text-[#ff00ff] uppercase font-bold tracking-wider">
            <CalendarDays size={22} />
            {'// ALL VISITS'}
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
            {visits.map(v => {
              const name = v.clients
                ? `${v.clients.first_name || ''} ${v.clients.last_name || ''}`.trim()
                : 'Unknown client';
              const from = new Date(v.visit_start_date).toLocaleDateString('en-GB');
              const to = new Date(v.visit_end_date || v.visit_start_date).toLocaleDateString(
                'en-GB',
              );
              const color = v.color || '#ff00ff';

              return (
                <div
                  key={v.id}
                  className="border rounded px-4 py-3 bg-[#020222]/60 flex flex-col gap-2"
                  style={{ borderColor: color, borderLeftWidth: '4px' }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm md:text-base">{name}</span>
                    <span className="text-[0.7rem] text-[#a0a0ff]">ID: {v.id.slice(0, 8)}</span>
                  </div>

                  <div className="text-sm font-bold" style={{ color }}>
                    📅 {from} → {to}
                  </div>

                  <div className="text-xs md:text-sm text-[#e0e0ff] bg-white/5 p-2 rounded">
                    {v.notes || 'No notes'}
                  </div>

                  <button
                    onClick={() => setEditingVisitId(v.id)}
                    className="self-end flex items-center gap-1 text-xs uppercase font-bold px-3 py-1.5 rounded border transition-colors hover:bg-white/10"
                    style={{ borderColor: color, color }}
                  >
                    <Edit size={12} /> Edit Visit
                  </button>
                </div>
              );
            })}
            {visits.length === 0 && (
              <div className="text-center text-sm text-[#a0a0ff] py-10">
                No visits recorded yet.
              </div>
            )}
          </div>
        )}
      </main>

      <EditVisitPopup
        isOpen={!!editingVisitId}
        visitId={editingVisitId}
        onClose={() => setEditingVisitId(null)}
        onVisitUpdated={fetchVisits}
      />
    </div>
  );
}
