'use client';
import { useState } from 'react';
import { Layers, FileText, Home, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { MapComponent } from './_components/MapComponent';

// This is the main component for the /hunter route.
// It establishes the layout: a sidebar for controls and a main area for the map.
export default function HunterPage() {
  // State to manage which view (Cadastre, DPE, or Sales) is active
  const [activeView, setActiveView] = useState<'cadastre' | 'dpe' | 'sales'>('cadastre');
  
  return (
    <div className="flex flex-col sm:flex-row h-screen w-full bg-background-dark font-sans text-text-primary">
      {/* Main Content Area - The Map */}
      <main className="relative h-full flex-1 order-1 sm:order-2 pb-20 sm:pb-0">
        {/* Pass the activeView state to MapComponent */}
        <MapComponent activeView={activeView} />
      </main>

      {/* Sidebar Navigation */}
      <aside className="flex w-full h-20 sm:h-full sm:w-20 flex-row sm:flex-col items-center justify-center border-t-2 sm:border-t-0 sm:border-r-2 border-accent-magenta bg-container-bg/80 p-4 shadow-glow-magenta z-10 order-2 sm:order-1 fixed bottom-0 sm:static">
        <nav className="flex flex-row sm:flex-col items-center justify-center gap-4 sm:gap-8">
          
          {/* Cadastre View Button */}
          <button
            onClick={() => setActiveView('cadastre')}
            title="Cadastre"
            className={`group relative rounded-lg p-3 transition-all hover:scale-110 ${
              activeView === 'cadastre'
                ? 'bg-accent-cyan text-background-dark shadow-glow-cyan'
                : 'text-accent-cyan/70 hover:text-accent-cyan'
            }`}
          >
            <Layers className="h-6 w-6" />
            <span className="absolute bottom-full mb-4 sm:bottom-auto sm:top-auto sm:left-full sm:ml-4 hidden w-auto min-w-max origin-bottom sm:origin-left scale-0 rounded-md bg-accent-cyan p-2 text-xs font-bold text-background-dark shadow-md transition-all group-hover:block group-hover:scale-100">
              Cadastre
            </span>
          </button>
          
          {/* DPE View Button */}
          <button
            onClick={() => setActiveView('dpe')}
            title="DPE"
            className={`group relative rounded-lg p-3 transition-all hover:scale-110 ${
              activeView === 'dpe'
                ? 'bg-accent-cyan text-background-dark shadow-glow-cyan'
                : 'text-accent-cyan/70 hover:text-accent-cyan'
            }`}
          >
            <FileText className="h-6 w-6" />
            <span className="absolute bottom-full mb-4 sm:bottom-auto sm:top-auto sm:left-full sm:ml-4 hidden w-auto min-w-max origin-bottom sm:origin-left scale-0 rounded-md bg-accent-cyan p-2 text-xs font-bold text-background-dark shadow-md transition-all group-hover:block group-hover:scale-100">
              DPE
            </span>
          </button>
          
          {/* Return Home Button */}
          <Link
            href="/"
            title="Return Home"
            className="group relative rounded-lg bg-accent-magenta p-3 text-background-dark shadow-glow-magenta transition-all hover:scale-110"
          >
            <Home className="h-6 w-6" />
            <span className="absolute bottom-full mb-4 sm:bottom-auto sm:top-auto sm:left-full sm:ml-4 hidden w-auto min-w-max origin-bottom sm:origin-left scale-0 rounded-md bg-accent-magenta p-2 text-xs font-bold text-background-dark shadow-md transition-all group-hover:block group-hover:scale-100">
              Home
            </span>
          </Link>
          
          {/* Sales (DVF) View Button */}
          <button
            onClick={() => setActiveView('sales')}
            title="Sales Data"
            className={`group relative rounded-lg p-3 transition-all hover:scale-110 ${
              activeView === 'sales'
                ? 'bg-accent-cyan text-background-dark shadow-glow-cyan'
                : 'text-accent-cyan/70 hover:text-accent-cyan'
            }`}
          >
            <DollarSign className="h-6 w-6" />
            <span className="absolute bottom-full mb-4 sm:bottom-auto sm:top-auto sm:left-full sm:ml-4 hidden w-auto min-w-max origin-bottom sm:origin-left scale-0 rounded-md bg-accent-cyan p-2 text-xs font-bold text-background-dark shadow-md transition-all group-hover:block group-hover:scale-100">
              Sales
            </span>
          </button>

        </nav>
      </aside>
    </div>
  );
}
