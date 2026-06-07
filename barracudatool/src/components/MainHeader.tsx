'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Search, Settings, Compass, Users, CalendarDays } from 'lucide-react'

const navItems = [
  { href: '/gatherer', label: 'Overview', icon: Building2 },
  { href: '/gatherer/prospection', label: 'Prospection', icon: Compass },
  { href: '/gatherer/clients', label: 'Clients', icon: Users },
  { href: '/gatherer/visits', label: 'Visits', icon: CalendarDays },
]

export default function MainHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#171512]/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 text-[#F4EEE7] no-underline">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FF6A1A]/30 bg-[#FF6A1A]/12 text-[#FF8138] shadow-[0_8px_22px_rgba(255,106,26,0.10)]">
              <Building2 size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#F4EEE7]">
                Barracuda
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#867A70]">
                Gatherer workspace
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 no-underline ${
                  isActive
                    ? 'border-[#FF6A1A]/30 bg-[#FF6A1A]/12 text-[#FFB58D] shadow-[0_0_0_1px_rgba(255,106,26,0.06),0_0_24px_rgba(255,106,26,0.08)]'
                    : 'border-white/10 bg-white/[0.03] text-[#B9AEA2] hover:border-[#FF6A1A]/22 hover:bg-[#FF6A1A]/8 hover:text-[#F4EEE7]'
                }`}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-[220px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[#B9AEA2] transition-colors duration-200 focus-within:border-[#FF6A1A]/30 focus-within:bg-[#FF6A1A]/6">
            <Search size={16} className="text-[#867A70]" />
            <input
              type="text"
              placeholder="Search clients or activity"
              className="w-full bg-transparent text-sm text-[#DDD2C8] placeholder:text-[#867A70] focus:outline-none"
            />
          </div>

          <Link
            href="/account"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#FF6A1A]/30 bg-[#FF6A1A]/12 px-4 py-2 text-sm font-medium text-[#FFB58D] transition-all duration-200 no-underline hover:border-[#FF6A1A]/38 hover:bg-[#FF6A1A]/18 hover:text-[#FFD0B4]"
          >
            <Settings size={15} />
            Account
          </Link>
        </div>
      </div>
    </header>
  )
}