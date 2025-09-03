'use client'    

import { Layers, FileText } from 'lucide-react';
import { MapComponent } from './_components/MapComponent';

// This is the main component for the /hunter route.
// It establishes the layout: a sidebar for controls and a main area for the map.
export default function HunterPage() {
  return (
    <div className="flex flex-col sm:flex-row h-screen w-full bg-background-dark font-sans text-text-primary">
      {/* Main Content Area - The Map (comes first on mobile, reordered visually) */}
      <main className="relative h-full flex-1 order-1 sm:order-2 pb-20 sm:pb-0">
        <MapComponent />
      </main>

      {/* Sidebar Navigation - Bottom on mobile, left sidebar on SM+ */}
      <aside className="flex w-full h-20 sm:h-full sm:w-20 flex-row sm:flex-col items-center justify-center sm:justify-start border-t-2 sm:border-t-0 sm:border-r-2 border-accent-magenta bg-container-bg/80 p-4 shadow-glow-magenta z-10 order-2 sm:order-1 fixed bottom-0 sm:static">
        <h1 className="text-xl font-bold text-accent-magenta [filter:drop-shadow(0_0_4px_#ff00ff)] hidden sm:block">B</h1>
        <nav className="flex flex-row sm:flex-col items-center gap-4 sm:gap-8 sm:mt-10">
          {/* Active Tab: Cadastre */}
          <a
            href="#"
            title="Cadastre"
            className="group relative rounded-lg bg-accent-cyan p-3 text-background-dark shadow-glow-cyan transition-all hover:scale-110"
          >
            <Layers className="h-6 w-6" />
            <span className="absolute bottom-full mb-4 sm:bottom-auto sm:top-auto sm:left-full sm:ml-4 hidden w-auto min-w-max origin-bottom sm:origin-left scale-0 rounded-md bg-accent-cyan p-2 text-xs font-bold text-background-dark shadow-md transition-all group-hover:block group-hover:scale-100">
              Cadastre
            </span>
          </a>

          {/* Other tabs - currently inactive */}
          <a href="#" title="DPE" className="group relative text-accent-cyan/70 transition-all hover:scale-110 hover:text-accent-cyan">
            <FileText className="h-6 w-6" />
            <span className="absolute bottom-full mb-4 sm:bottom-auto sm:top-auto sm:left-full sm:ml-4 hidden w-auto min-w-max origin-bottom sm:origin-left scale-0 rounded-md bg-accent-cyan p-2 text-xs font-bold text-background-dark shadow-md transition-all group-hover:block group-hover:scale-100">
              DPE
            </span>
          </a>
          {/* Add other icons similarly */}
        </nav>
      </aside>
    </div>
  );
}
