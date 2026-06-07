'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  UserPlus,
  Bell,
  CalendarDays,
  Hourglass,
  CheckCircle2,
  Loader2,
  Edit,
  RotateCcw,
  Crown,
  ExternalLink,
  Users,
  CheckSquare,
  Activity,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import MainHeader from '../../components/MainHeader'
import CreateClientPopup from '../../components/popups/CreateClientPopup'
import CreateMandatePopup from '../../components/popups/CreateMandatePopup'
import CreatePropertyPopup from '../../components/popups/CreatePropertyPopup'
import CreateTaskPopup from '../../components/popups/CreateTaskPopup'
import CreateVisitPopup from '../../components/popups/CreateVisitPopup'
import EditVisitPopup from '../../components/popups/EditVisitPopup'
import EditClientPopup from '../../components/popups/EditClientPopup'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface RecentlyAddedClient {
  id: string
  first_name: string | null
  last_name: string | null
  created_at: string
  client_search_criteria?: {
    min_budget: number | null
    max_budget: number | null
    locations: string | null
  }[]
}

interface VisitingSoon {
  id: string
  visit_start_date: string
  visit_end_date: string | null
  notes: string | null
  color: string | null
  clients: {
    id: string
    first_name: string | null
    last_name: string | null
  } | null
}

type FollowUpStatus = 'pending' | 'snoozed' | 'done'

interface FollowUpTask {
  id: string
  client_id: string
  created_at: string
  task_type: string | null
  status: FollowUpStatus
  due_date: string
  snoozed_until: string | null
  notes: string | null
  clients: {
    first_name: string | null
    last_name: string | null
  } | null
}

function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = []
  const startDate = new Date(start)
  const endDate = new Date(end)
  const current = new Date(startDate)

  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}

function formatCurrencyRange(min?: number | null, max?: number | null) {
  if (min != null || max != null) {
    return `€${(min || 0).toLocaleString()} - €${(max || 0).toLocaleString()}`
  }
  return 'Budget not set'
}

function getTaskTone(status: FollowUpStatus) {
  if (status === 'done') {
    return {
      container: 'border-emerald-400/20 bg-emerald-400/8',
      badge: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
      label: 'Completed',
    }
  }

  if (status === 'snoozed') {
    return {
      container: 'border-[#FF6A1A]/22 bg-[#FF6A1A]/8',
      badge: 'border-[#FF6A1A]/28 bg-[#FF6A1A]/10 text-[#FF9A5C]',
      label: 'Snoozed',
    }
  }

  return {
    container: 'border-white/10 bg-white/[0.03]',
    badge: 'border-white/10 bg-white/[0.04] text-[#C7BBB0]',
    label: 'Pending',
  }
}

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string
  icon: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#171512] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FF6A1A]/30 bg-[#FF6A1A]/12 text-[#FF8138] shadow-[0_8px_22px_rgba(255,106,26,0.10)]">
            {icon}
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#F4EEE7]">{title}</h3>
          </div>
        </div>
        {action}
      </div>

      {children}
    </section>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-[#867A70]">
      {children}
    </div>
  )
}

export default function GathererPage() {
  const [activePopup, setActivePopup] =
    useState<'client' | 'mandate' | 'property' | 'task' | 'visit' | null>(null)
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)

  const [recentClients, setRecentClients] = useState<RecentlyAddedClient[]>([])
  const [visitingSoon, setVisitingSoon] = useState<VisitingSoon[]>([])
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([])
  const [totalClients, setTotalClients] = useState(0)

  const [loadingRecent, setLoadingRecent] = useState(true)
  const [loadingVisits, setLoadingVisits] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)

  const fetchRecentClients = async () => {
    setLoadingRecent(true)
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
      .limit(5)

    if (!error && data) setRecentClients(data as RecentlyAddedClient[])
    setLoadingRecent(false)
  }

  const fetchTotalClients = async () => {
    setLoadingStats(true)
    const { count, error } = await supabase.from('clients').select('*', { count: 'exact', head: true })

    if (!error && count !== null) setTotalClients(count)
    setLoadingStats(false)
  }

  const fetchVisitingSoon = async () => {
    setLoadingVisits(true)
    const today = new Date()
    const plus30 = new Date()
    plus30.setDate(today.getDate() + 30)

    const { data, error } = await supabase
      .from('client_visits')
      .select(`
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
      `)
      .gte('visit_start_date', today.toISOString().split('T')[0])
      .lte('visit_start_date', plus30.toISOString().split('T')[0])
      .order('visit_start_date', { ascending: true })

    if (!error && data) setVisitingSoon(data as unknown as VisitingSoon[])
    setLoadingVisits(false)
  }

  const fetchFollowUps = async () => {
    setLoadingTasks(true)
    const { data, error } = await supabase
      .from('client_tasks')
      .select(`
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
      `)
      .order('due_date', { ascending: true })

    if (!error && data) setFollowUps(data as unknown as FollowUpTask[])
    setLoadingTasks(false)
  }

  useEffect(() => {
    fetchRecentClients()
    fetchVisitingSoon()
    fetchFollowUps()
    fetchTotalClients()
  }, [])

  const updateLocalTaskStatus = (id: string, status: FollowUpStatus) => {
    setFollowUps((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
  }

  const handleSnooze = async (taskId: string) => {
    const snoozeDate = new Date()
    snoozeDate.setDate(snoozeDate.getDate() + 7)
    const snoozeStr = snoozeDate.toISOString().split('T')[0]

    updateLocalTaskStatus(taskId, 'snoozed')
    await supabase.from('client_tasks').update({ status: 'snoozed', snoozed_until: snoozeStr }).eq('id', taskId)
  }

  const handleDone = async (taskId: string) => {
    updateLocalTaskStatus(taskId, 'done')
    await supabase.from('client_tasks').update({ status: 'done' }).eq('id', taskId)
  }

  const handleUndo = async (taskId: string) => {
    updateLocalTaskStatus(taskId, 'pending')
    await supabase.from('client_tasks').update({ status: 'pending' }).eq('id', taskId)
  }

  const today = new Date()
  const calendarMonth = today.getMonth()
  const calendarYear = today.getFullYear()

  const firstOfMonth = new Date(calendarYear, calendarMonth, 1)
  const firstDayIndex = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()

  const visitDateColors = useMemo(() => {
    const map = new Map<string, string>()
    visitingSoon.forEach((visit) => {
      const start = visit.visit_start_date
      const end = visit.visit_end_date || visit.visit_start_date
      const color = visit.color || '#FF6A1A'
      getDatesBetween(start, end).forEach((date) => {
        if (!map.has(date)) map.set(date, color)
      })
    })
    return map
  }, [visitingSoon])

  const taskDateCounts = useMemo(() => {
    const map = new Map<string, number>()
    followUps.forEach((task) => {
      const dateStr = task.due_date
      map.set(dateStr, (map.get(dateStr) || 0) + 1)
    })
    return map
  }, [followUps])

  const calendarCells: Array<{
    day: number | null
    color: string | null
    taskCount: number
  }> = []

  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ day: null, color: null, taskCount: 0 })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(calendarMonth + 1).padStart(2, '0')
    const dayStr = String(d).padStart(2, '0')
    const key = `${calendarYear}-${monthStr}-${dayStr}`
    const color = visitDateColors.get(key) || null
    const taskCount = taskDateCounts.get(key) || 0
    calendarCells.push({ day: d, color, taskCount })
  }

  const pendingTasksCount = followUps.filter((t) => t.status !== 'done').length
  const isOverlayOpen = activePopup || editingVisitId || editingClientId

  return (
    <div className="min-h-screen bg-[#12110F] text-[#F4EEE7]">
      <div
        className="min-h-screen"
        style={{
          backgroundImage:
            'radial-gradient(circle at top left, rgba(255,106,26,0.16), transparent 24%), radial-gradient(circle at bottom right, rgba(255,129,56,0.10), transparent 22%)',
        }}
      >
        <MainHeader />

        <main
          className={`mx-auto w-full max-w-[1600px] px-5 py-8 transition-all duration-300 sm:px-8 ${
            isOverlayOpen ? 'blur-[4px]' : ''
          }`}
        >
          <section className="mb-8 flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#FF6A1A]/35 bg-[#FF6A1A]/12 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#FFB58D] shadow-[0_0_0_1px_rgba(255,106,26,0.06),0_0_28px_rgba(255,106,26,0.10)]">
                <Activity size={14} />
                Buyer operations
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-[#F8F3EE] sm:text-4xl">
                Gatherer workspace
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#B9AEA2] sm:text-base">
                Manage client intake, visits, and follow-up operations from one structured
                workspace designed for day-to-day execution.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-4">
              <div className="flex items-center gap-3">
                <Crown className="text-emerald-300" size={20} />
                <div>
                  <p className="text-sm font-semibold text-[#F4EEE7]">Barracuda Pro active</p>
                  <p className="text-xs text-[#B9AEA2]">Full access to Gatherer workflows</p>
                </div>
                <Link
                  href="/account"
                  className="ml-3 inline-flex items-center rounded-full border border-emerald-400/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors duration-200 hover:bg-emerald-400/10"
                >
                  Manage
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-[#171512] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#867A70]">Active buyers</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-[#F4EEE7]">
                {loadingStats ? '...' : totalClients}
              </div>
              <p className="mt-2 text-sm text-[#B9AEA2]">Total active client records in workspace.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#171512] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#867A70]">Visits next 30 days</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-[#FF8138]">{visitingSoon.length}</div>
              <p className="mt-2 text-sm text-[#B9AEA2]">Upcoming booked activity and field planning.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#171512] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#867A70]">Pending tasks</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-[#F4EEE7]">{pendingTasksCount}</div>
              <p className="mt-2 text-sm text-[#B9AEA2]">Open follow-ups still requiring action.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#171512] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#867A70]">Workspace status</div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Operational
              </div>
              <p className="mt-3 text-sm text-[#B9AEA2]">Core client operations running normally.</p>
            </div>
          </section>

          <section className="mb-8 flex flex-wrap gap-3">
            <button
              onClick={() => setActivePopup('client')}
              className="inline-flex items-center gap-2 rounded-full border border-[#FF6A1A]/30 bg-[#FF6A1A]/12 px-4 py-2.5 text-sm font-medium text-[#FFB58D] transition-colors duration-200 hover:bg-[#FF6A1A]/18 hover:text-[#FFD0B4]"
            >
              <UserPlus size={16} />
              Add client
            </button>

            <button
              onClick={() => setActivePopup('visit')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[#DDD2C8] transition-colors duration-200 hover:border-[#FF6A1A]/24 hover:bg-[#FF6A1A]/8 hover:text-[#FF9A5C]"
            >
              <CalendarDays size={16} />
              Log visit
            </button>

            <button
              onClick={() => setActivePopup('task')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[#DDD2C8] transition-colors duration-200 hover:border-[#FF6A1A]/24 hover:bg-[#FF6A1A]/8 hover:text-[#FF9A5C]"
            >
              <CheckSquare size={16} />
              Create task
            </button>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.8fr_1fr]">
            <div className="flex flex-col gap-5">
              <Panel
                title="Recently added clients"
                icon={<Users size={18} />}
                action={
                  <Link
                    href="/gatherer/clients"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#FF8138] transition-colors duration-200 hover:text-[#FF9A5C]"
                  >
                    View all
                    <ArrowRight size={15} />
                  </Link>
                }
              >
                {loadingRecent ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-[#B9AEA2]" size={22} />
                  </div>
                ) : recentClients.length === 0 ? (
                  <EmptyState>No clients have been added yet.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {recentClients.map((client) => {
                      const criteria = client.client_search_criteria?.[0]
                      const name =
                        `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed client'
                      const budgetLabel = formatCurrencyRange(criteria?.min_budget, criteria?.max_budget)
                      const areas = criteria?.locations || 'No areas set'
                      const created = new Date(client.created_at).toLocaleDateString('en-GB')

                      return (
                        <div
                          key={client.id}
                          className="rounded-2xl border border-white/10 bg-[#1D1A17] p-4 transition-colors duration-200 hover:border-[#FF6A1A]/24 hover:bg-[#26221E]"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <h4 className="text-base font-semibold text-[#F4EEE7]">{name}</h4>
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-[#867A70]">
                                  {client.id.slice(0, 8)}
                                </span>
                              </div>

                              <div className="mt-3 grid gap-2 text-sm text-[#B9AEA2] sm:grid-cols-2">
                                <div>
                                  <span className="text-[#867A70]">Budget</span>
                                  <div className="mt-1 font-medium text-emerald-300">{budgetLabel}</div>
                                </div>
                                <div>
                                  <span className="text-[#867A70]">Target areas</span>
                                  <div className="mt-1 text-[#DDD2C8]">{areas}</div>
                                </div>
                              </div>

                              <div className="mt-3 text-xs text-[#867A70]">Added {created}</div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => setEditingClientId(client.id)}
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-[#DDD2C8] transition-colors duration-200 hover:border-[#FF6A1A]/24 hover:bg-[#FF6A1A]/8 hover:text-[#FF9A5C]"
                              >
                                <Edit size={14} />
                                Edit
                              </button>

                              <Link
                                href={`/gatherer/clients/${client.id}`}
                                className="inline-flex items-center gap-2 rounded-full border border-[#FF6A1A]/30 bg-[#FF6A1A]/12 px-3 py-2 text-xs font-medium text-[#FFB58D] transition-colors duration-200 hover:bg-[#FF6A1A]/18 hover:text-[#FFD0B4]"
                              >
                                <ExternalLink size={14} />
                                Open file
                              </Link>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel>

              <Panel
                title="Upcoming visits"
                icon={<CalendarDays size={18} />}
                action={
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setActivePopup('visit')}
                      className="text-sm font-medium text-[#B9AEA2] transition-colors duration-200 hover:text-[#F4EEE7]"
                    >
                      Log visit
                    </button>
                    <Link
                      href="/gatherer/visits"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#FF8138] transition-colors duration-200 hover:text-[#FF9A5C]"
                    >
                      See all
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                }
              >
                {loadingVisits ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-[#B9AEA2]" size={22} />
                  </div>
                ) : visitingSoon.length === 0 ? (
                  <EmptyState>No visits are scheduled in the next 30 days.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {visitingSoon.map((visit) => {
                      const name = visit.clients
                        ? `${visit.clients.first_name || ''} ${visit.clients.last_name || ''}`.trim()
                        : 'Unknown client'
                      const fromLabel = new Date(visit.visit_start_date).toLocaleDateString('en-GB')
                      const toLabel = new Date(visit.visit_end_date || visit.visit_start_date).toLocaleDateString('en-GB')
                      const visitColor = visit.color || '#FF6A1A'

                      return (
                        <div key={visit.id} className="rounded-2xl border border-white/10 bg-[#1D1A17] p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <h4 className="text-base font-semibold text-[#F4EEE7]">{name}</h4>
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-[#867A70]">
                                  {visit.id.slice(0, 8)}
                                </span>
                              </div>

                              <div
                                className="mt-3 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                                style={{
                                  border: `1px solid ${visitColor}40`,
                                  backgroundColor: `${visitColor}18`,
                                  color: visitColor,
                                }}
                              >
                                {fromLabel} → {toLabel}
                              </div>

                              <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-3 text-sm leading-6 text-[#C7BBB0]">
                                {visit.notes || 'No visit notes recorded.'}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setEditingVisitId(visit.id)}
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-[#DDD2C8] transition-colors duration-200 hover:border-[#FF6A1A]/24 hover:bg-[#FF6A1A]/8 hover:text-[#FF9A5C]"
                            >
                              <Edit size={14} />
                              Edit visit
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel>

              <Panel
                title="Follow-ups and tasks"
                icon={<Bell size={18} />}
                action={
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setActivePopup('task')}
                      className="text-sm font-medium text-[#B9AEA2] transition-colors duration-200 hover:text-[#F4EEE7]"
                    >
                      Create task
                    </button>
                    <Link
                      href="/gatherer/tasks"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#FF8138] transition-colors duration-200 hover:text-[#FF9A5C]"
                    >
                      See all
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                }
              >
                {loadingTasks ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-[#B9AEA2]" size={22} />
                  </div>
                ) : followUps.length === 0 ? (
                  <EmptyState>No tasks have been created yet.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {followUps.map((task) => {
                      const name = task.clients
                        ? `${task.clients.first_name || ''} ${task.clients.last_name || ''}`.trim()
                        : 'Unknown client'
                      const dueLabel = new Date(task.due_date).toLocaleDateString('en-GB')
                      const isDone = task.status === 'done'
                      const tone = getTaskTone(task.status)

                      return (
                        <div
                          key={task.id}
                          className={`rounded-2xl border p-4 ${tone.container} ${isDone ? 'opacity-75' : ''}`}
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <h4 className="text-base font-semibold text-[#F4EEE7]">{name}</h4>
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-[#867A70]">
                                  {task.client_id.slice(0, 8)}
                                </span>
                                <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] ${tone.badge}`}>
                                  {tone.label}
                                </span>
                                <span className="rounded-full border border-[#FF6A1A]/24 bg-[#FF6A1A]/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-[#FFB58D]">
                                  {task.task_type === 'follow_up' ? 'Call' : 'Task'}
                                </span>
                              </div>

                              <div className="mt-3 text-sm text-[#867A70]">Due {dueLabel}</div>

                              <div className="mt-3 text-sm leading-6 text-[#C7BBB0]">
                                {task.notes || 'Follow up with this client.'}
                              </div>
                            </div>

                            <div className="flex w-full flex-wrap gap-2 lg:w-auto">
                              {!isDone ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSnooze(task.id)}
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#FF6A1A]/24 bg-[#FF6A1A]/10 px-4 py-2 text-xs font-medium text-[#FFB58D] transition-colors duration-200 hover:bg-[#FF6A1A]/16"
                                  >
                                    <Hourglass size={13} />
                                    Snooze 7d
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDone(task.id)}
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium text-emerald-300 transition-colors duration-200 hover:bg-emerald-400/15"
                                  >
                                    <CheckCircle2 size={13} />
                                    Mark done
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleUndo(task.id)}
                                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-[#DDD2C8] transition-colors duration-200 hover:border-[#FF6A1A]/24 hover:bg-[#FF6A1A]/8 hover:text-[#FF9A5C]"
                                >
                                  <RotateCcw size={13} />
                                  Undo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel>
            </div>

            <div className="flex flex-col gap-5">
              <Panel
                title="Visit calendar"
                icon={<CalendarDays size={18} />}
                action={
                  <Link
                    href="/gatherer/calendar"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#FF8138] transition-colors duration-200 hover:text-[#FF9A5C]"
                  >
                    View calendar
                    <ArrowRight size={15} />
                  </Link>
                }
              >
                <div className="mb-4 text-sm text-[#B9AEA2]">
                  {today.toLocaleString('default', { month: 'long' })} {calendarYear}
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-[0.16em] text-[#867A70]">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-7 gap-2">
                  {calendarCells.map((cell, idx) => (
                    <div
                      key={idx}
                      className="relative min-h-[56px] rounded-xl border border-white/10 bg-black/10 p-2"
                      style={{
                        borderColor: cell.color ? `${cell.color}45` : undefined,
                        backgroundColor: cell.color ? `${cell.color}12` : undefined,
                      }}
                    >
                      <span className="text-xs text-[#DDD2C8]">{cell.day ?? ''}</span>

                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                        {cell.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cell.color }} />}
                        {cell.taskCount > 0 && (
                          <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#FF8138] px-1.5 py-0.5 text-[10px] font-semibold text-[#171512]">
                            {cell.taskCount}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-2 text-xs text-[#867A70]">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF8138]" />
                    Visit scheduled
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#FF8138] px-1.5 py-0.5 text-[10px] font-semibold text-[#171512]">
                      #
                    </span>
                    Task count
                  </div>
                </div>
              </Panel>

              <Panel title="Priority alerts" icon={<Bell size={18} />}>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-[#1D1A17] p-4">
                    <div className="text-sm leading-6 text-[#C7BBB0]">
                      High-budget client arriving next week. Refresh available stock in target zones before outreach.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#1D1A17] p-4">
                    <div className="text-sm leading-6 text-[#C7BBB0]">
                      Several buyers have not updated search criteria in the last 90 days. Schedule review calls.
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          </section>
        </main>

        <CreateClientPopup
          isOpen={activePopup === 'client'}
          onClose={() => {
            setActivePopup(null)
            fetchRecentClients()
            fetchTotalClients()
          }}
        />

        <CreateMandatePopup isOpen={activePopup === 'mandate'} onClose={() => setActivePopup(null)} />
        <CreatePropertyPopup isOpen={activePopup === 'property'} onClose={() => setActivePopup(null)} />

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
              setEditingClientId(null)
              fetchRecentClients()
            }}
            clientId={editingClientId}
          />
        )}
      </div>
    </div>
  )
}