//src/app/gatherer/clients/page.tsx

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Search,
  Edit,
  Trash2,
  Loader2,
  User,
  MapPin,
  TrendingUp,
  ExternalLink,
  UserPlus,
  Users,
} from 'lucide-react'
import MainHeader from '../../../components/MainHeader'
import EditClientPopup from '../../../components/popups/EditClientPopup'
import CreateClientPopup from '../../../components/popups/CreateClientPopup'
import Link from 'next/link'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface ClientSummary {
  id: string
  first_name: string
  last_name: string
  email: string
  mobile: string
  client_search_criteria: {
    min_budget: number
    max_budget: number
    locations: string
  }[]
}

function formatBudget(min?: number, max?: number) {
  const minLabel = min ? `€${(min / 1000).toFixed(0)}k` : '€0'
  const maxLabel = max ? `€${(max / 1000).toFixed(0)}k` : 'Open'
  return `${minLabel} - ${maxLabel}`
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [showCreatePopup, setShowCreatePopup] = useState(false)

  const fetchClients = async () => {
    setIsLoading(true)

    const { data, error } = await supabase
      .from('clients')
      .select(`
        id, first_name, last_name, email, mobile,
        client_search_criteria (min_budget, max_budget, locations)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching clients:', error)
    } else {
      setClients((data as unknown as ClientSummary[]) || [])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client and all associated data?')) return

    const { error } = await supabase.from('clients').delete().eq('id', id)

    if (error) {
      alert('Error deleting client')
    } else {
      setClients((prev) => prev.filter((client) => client.id !== id))
    }
  }

  const filteredClients = useMemo(() => {
    return clients.filter((client) =>
      `${client.first_name} ${client.last_name} ${client.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    )
  }, [clients, searchTerm])

  const isOverlayOpen = showCreatePopup || editingClientId

  return (
    <div className="min-h-screen bg-[#141310] text-stone-100">
      <div
        className="min-h-screen"
        style={{
          backgroundImage:
            'radial-gradient(circle at top left, rgba(245,158,11,0.10), transparent 24%), radial-gradient(circle at bottom right, rgba(251,191,36,0.06), transparent 24%)',
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
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-amber-200">
                <Users size={14} />
                Client operations
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">
                Client database
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400 sm:text-base">
                Review client records, search criteria, and next-step actions from one structured
                workspace designed for prospect follow-up and market matching.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-[280px]">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500"
                />
                <input
                  className="w-full rounded-full border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-300/25 focus:outline-none focus:ring-0"
                  placeholder="Search clients"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button
                onClick={() => setShowCreatePopup(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-200 transition-colors duration-200 hover:bg-amber-400/15"
              >
                <UserPlus size={16} />
                Add client
              </button>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                Total clients
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-stone-100">
                {isLoading ? '...' : clients.length}
              </div>
              <p className="mt-2 text-sm text-stone-400">All current client records in the workspace.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                Matching results
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-amber-300">
                {isLoading ? '...' : filteredClients.length}
              </div>
              <p className="mt-2 text-sm text-stone-400">Clients currently matching the active search.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                Search state
              </div>
              <div className="mt-3 text-sm font-medium text-stone-200">
                {searchTerm ? `Filtering by “${searchTerm}”` : 'Showing all clients'}
              </div>
              <p className="mt-2 text-sm text-stone-400">
                Use search to narrow by name or email.
              </p>
            </div>
          </section>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-stone-400" size={36} />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-black/10 px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-300">
                <Users size={24} />
              </div>
              <h2 className="text-lg font-semibold text-stone-100">
                {searchTerm ? 'No matching clients found' : 'No clients yet'}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-stone-400">
                {searchTerm
                  ? 'Try a different search term or clear the filter to see all client records.'
                  : 'Create your first client record to begin tracking search criteria, activity, and market opportunities.'}
              </p>

              {!searchTerm && (
                <button
                  onClick={() => setShowCreatePopup(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition-colors duration-200 hover:bg-amber-400/15"
                >
                  <UserPlus size={16} />
                  Add first client
                </button>
              )}
            </div>
          ) : (
            <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredClients.map((client) => {
                const criteria = client.client_search_criteria?.[0]
                const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim()
                const email = client.email || 'No email recorded'
                const locations = criteria?.locations || 'No locations set'
                const budget = formatBudget(criteria?.min_budget, criteria?.max_budget)

                return (
                  <article
                    key={client.id}
                    className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300/20 hover:bg-white/[0.045]"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/gatherer/clients/${client.id}`}
                          className="block text-lg font-semibold tracking-tight text-stone-100 transition-colors duration-200 hover:text-amber-200"
                        >
                          {fullName || 'Unnamed client'}
                        </Link>
                        <div className="mt-1 text-sm text-stone-500">{email}</div>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-300">
                        <User size={18} />
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#1b1916] px-4 py-3">
                        <MapPin size={16} className="mt-0.5 text-stone-500" />
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                            Target areas
                          </div>
                          <div className="mt-1 text-stone-200">{locations}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#1b1916] px-4 py-3">
                        <TrendingUp size={16} className="mt-0.5 text-stone-500" />
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                            Budget range
                          </div>
                          <div className="mt-1 font-medium text-emerald-300">{budget}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
                      <Link
                        href={`/gatherer/clients/${client.id}`}
                        className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition-colors duration-200 hover:bg-amber-400/15"
                      >
                        <ExternalLink size={16} />
                        Open market scanner
                      </Link>

                      <button
                        onClick={() => setEditingClientId(client.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-stone-200 transition-colors duration-200 hover:bg-white/[0.08]"
                      >
                        <Edit size={14} />
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(client.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors duration-200 hover:bg-red-400/15"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </article>
                )
              })}
            </section>
          )}
        </main>

        {showCreatePopup && (
          <CreateClientPopup
            isOpen={showCreatePopup}
            onClose={() => {
              setShowCreatePopup(false)
              fetchClients()
            }}
          />
        )}

        {editingClientId && (
          <EditClientPopup
            isOpen={!!editingClientId}
            onClose={() => {
              setEditingClientId(null)
              fetchClients()
            }}
            clientId={editingClientId}
          />
        )}
      </div>
    </div>
  )
}