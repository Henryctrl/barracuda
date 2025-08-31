'use client'    

import { MapPin, Layers, FileText, Building, Briefcase } from 'lucide-react';
import { MapComponent } from './_components/MapComponent';

// This is the main component for the /hunter route.
// It establishes the layout: a sidebar for controls and a main area for the map.
export default function HunterPage() {
  return (
    <div className="flex h-screen w-full bg-background-dark font-sans text-text-primary">
      {/* Sidebar Navigation */}
      <aside className="flex h-full w-20 flex-col items-center border-r-2 border-accent-magenta bg-container-bg/80 p-4 shadow-glow-magenta z-10">
        <h1 className="text-xl font-bold text-accent-magenta [filter:drop-shadow(0_0_4px_#ff00ff)]">B</h1>
        <nav className="mt-10 flex flex-col items-center gap-8">
          {/* Active Tab: Cadastre */}
          <a
            href="#"
            title="Cadastre"
            className="group relative rounded-lg bg-accent-cyan p-3 text-background-dark shadow-glow-cyan transition-all hover:scale-110"
          >
            <Layers className="h-6 w-6" />
            <span className="absolute left-full ml-4 hidden w-auto min-w-max origin-left scale-0 rounded-md bg-accent-cyan p-2 text-xs font-bold text-background-dark shadow-md transition-all group-hover:block group-hover:scale-100">
              Cadastre
            </span>
          </a>

          {/* Other tabs - currently inactive */}
          <a href="#" title="DPE" className="group relative text-accent-cyan/70 transition-all hover:scale-110 hover:text-accent-cyan">
            <FileText className="h-6 w-6" />
             <span className="absolute left-full ml-4 hidden w-auto min-w-max origin-left scale-0 rounded-md bg-accent-cyan p-2 text-xs font-bold text-background-dark shadow-md transition-all group-hover:block group-hover:scale-100">
              DPE
            </span>
          </a>
          {/* Add other icons similarly */}
        </nav>
      </aside>

      {/* Main Content Area - The Map */}
      <main className="relative h-full flex-1">
        <MapComponent />
      </main>
    </div>
  );
}
