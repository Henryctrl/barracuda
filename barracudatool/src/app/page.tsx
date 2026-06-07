import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  Search,
  FileSearch,
  Users,
  CheckSquare,
  CalendarDays,
  UserCog,
  ShieldCheck,
  Map,
} from 'lucide-react'

const primaryModules = [
  {
    title: 'Hunter',
    href: '/hunter',
    description: 'Map-led parcel search, cadastral exploration, and property discovery workflows.',
    icon: Search,
    eyebrow: 'Discovery',
  },
  {
    title: 'Gatherer',
    href: '/gatherer',
    description: 'Prospection workflows, lead review, uploads, and operational collection tools.',
    icon: Building2,
    eyebrow: 'Prospection',
  },
  {
    title: 'DPE Search',
    href: '/dpe-search',
    description: 'Energy certificate lookup and performance-focused property review.',
    icon: FileSearch,
    eyebrow: 'Energy',
  },
]

const secondaryModules = [
  {
    title: 'Clients',
    href: '/gatherer/clients',
    description: 'Track client records, follow-up, and relationship context.',
    icon: Users,
  },
  {
    title: 'Tasks',
    href: '/gatherer/tasks',
    description: 'Manage operational actions, next steps, and team workflow.',
    icon: CheckSquare,
  },
  {
    title: 'Visits',
    href: '/gatherer/visits',
    description: 'Review scheduled viewings, appointments, and field activity.',
    icon: CalendarDays,
  },
  {
    title: 'Account',
    href: '/account',
    description: 'Profile, subscription, and workspace-level account settings.',
    icon: UserCog,
  },
]

const statusItems = [
  {
    label: 'Data sources',
    value: 'Cadastre, DVF, DPE',
    tone: 'text-[#FF9C66]',
  },
  {
    label: 'Workspace mode',
    value: 'Authenticated',
    tone: 'text-[#79C08F]',
  },
  {
    label: 'Coverage',
    value: 'France-focused',
    tone: 'text-[#D8CEC5]',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#12110F] text-[#F4EEE7]">
      <div
        className="min-h-screen"
        style={{
          backgroundImage:
            'radial-gradient(circle at top left, rgba(255,106,26,0.16), transparent 24%), radial-gradient(circle at bottom right, rgba(255,129,56,0.10), transparent 22%)',
        }}
      >
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10">
          <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#FF6A1A]/35 bg-[#FF6A1A]/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#FFB58D] shadow-[0_0_0_1px_rgba(255,106,26,0.06),0_0_28px_rgba(255,106,26,0.10)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Premium property intelligence
              </div>

              <h1 className="text-4xl font-semibold tracking-tight text-[#F8F3EE] sm:text-5xl">
                Barracuda
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#B9AEA2] sm:text-base">
                A focused workspace for French property search, prospecting, and client operations.
                Start with the module that matches the job at hand, then move into map-led review,
                data enrichment, and follow-up workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto">
              {statusItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm"
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#867A70]">
                    {item.label}
                  </div>
                  <div className={`mt-2 text-sm font-medium ${item.tone}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </header>

          <section className="mb-10">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#F4EEE7]">
                  Core workflows
                </h2>
                <p className="mt-1 text-sm text-[#9D9186]">
                  Primary entry points for search, prospecting, and energy intelligence.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {primaryModules.map((module) => {
                const Icon = module.icon

                return (
                  <Link
                    key={module.title}
                    href={module.href}
                    className="group rounded-3xl border border-white/10 bg-[#171512] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FF6A1A]/35 hover:bg-[#1D1A17] hover:shadow-[0_18px_50px_rgba(0,0,0,0.22),0_0_0_1px_rgba(255,106,26,0.05),0_0_30px_rgba(255,106,26,0.08)]"
                  >
                    <div className="mb-6 flex items-start justify-between">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FF6A1A]/30 bg-[#FF6A1A]/12 text-[#FF8138] shadow-[0_0_0_1px_rgba(255,106,26,0.04),0_10px_24px_rgba(255,106,26,0.14)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[#867A70]">
                        {module.eyebrow}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold tracking-tight text-[#F4EEE7]">
                      {module.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-[#A99D91]">
                      {module.description}
                    </p>

                    <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#FF8138] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#FF9A5C]">
                      Open module
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-[#171512] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#FF6A1A]/30 bg-[#FF6A1A]/12 text-[#FF8138] shadow-[0_8px_22px_rgba(255,106,26,0.10)]">
                  <Map className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[#F4EEE7]">
                    Workspace navigation
                  </h2>
                  <p className="text-sm text-[#9D9186]">
                    Supporting areas for account management and day-to-day operations.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {secondaryModules.map((module) => {
                  const Icon = module.icon

                  return (
                    <Link
                      key={module.title}
                      href={module.href}
                      className="group rounded-2xl border border-white/10 bg-[#1D1A17] p-4 transition-all duration-200 hover:border-[#FF6A1A]/28 hover:bg-[#26221E]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#DDD2C8]">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-[#F4EEE7]">
                              {module.title}
                            </h3>
                            <ArrowRight className="h-4 w-4 text-[#867A70] transition-colors duration-200 group-hover:text-[#FF8138]" />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#A99D91]">
                            {module.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#FF6A1A]/12 to-transparent p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
              <h2 className="text-lg font-semibold tracking-tight text-[#F4EEE7]">
                How to use Barracuda
              </h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#867A70]">
                    Step 1
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#C7BBB0]">
                    Use Hunter when you want to search by area, inspect parcels, and start map-led exploration.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#867A70]">
                    Step 2
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#C7BBB0]">
                    Move into Gatherer for prospecting, lead review, uploads, and structured operational follow-up.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#867A70]">
                    Step 3
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#C7BBB0]">
                    Use DPE Search, Clients, Tasks, and Visits to enrich records and move work toward conversion.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#FF6A1A]/32 bg-[#FF6A1A]/10 p-4 text-sm leading-6 text-[#D8CDC2] shadow-[0_0_24px_rgba(255,106,26,0.08)]">
                Barracuda is designed as a map-first property intelligence workspace: calm at entry, precise in workflow, and structured for professional use.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}