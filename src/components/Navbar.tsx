'use client';

import { useRouter } from 'next/navigation';
import { Wrench, Plus, LogOut, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
  onNewJobClick?: () => void;
  showNewJobButton?: boolean;
}

export default function Navbar({ onNewJobClick, showNewJobButton = true }: NavbarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
      {/* Brand / Logo */}
      <div 
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20 transition">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold font-mono tracking-wider text-white">GARAGE LAB</h1>
          <span className="text-xs text-neutral-400">Command Center</span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2.5 rounded-xl bg-neutral-800/50 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition"
          title="Dashboard"
        >
          <LayoutDashboard className="w-4 h-4" />
        </button>

        {showNewJobButton && onNewJobClick && (
          <button
            onClick={onNewJobClick}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/10 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Job</span>
          </button>
        )}
      </div>
    </header>
  );
}