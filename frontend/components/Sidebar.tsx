'use client';

import React from 'react';
import { Plus, Clock, CheckCircle2 } from 'lucide-react';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  scheduledCount: number;
  sentCount: number;
  onOpenCompose: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  scheduledCount,
  sentCount,
  onOpenCompose,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between h-[calc(100vh-4rem)]">
      <div>
        {/* Green "Compose" Pill Button */}
        <button
          onClick={onOpenCompose}
          className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all transform active:scale-95 mb-6"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Compose</span>
        </button>

        {/* Navigation Section */}
        <nav className="space-y-1">
          <button
            onClick={() => onTabChange('scheduled')}
            className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'scheduled'
                ? 'bg-amber-50 text-amber-900 border border-amber-200/80 shadow-sm font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock
                className={`w-4 h-4 ${
                  activeTab === 'scheduled' ? 'text-amber-600' : 'text-slate-400'
                }`}
              />
              <span>Scheduled</span>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                activeTab === 'scheduled'
                  ? 'bg-amber-200/80 text-amber-900'
                  : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {scheduledCount}
            </span>
          </button>

          <button
            onClick={() => onTabChange('sent')}
            className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'sent'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 shadow-sm font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2
                className={`w-4 h-4 ${
                  activeTab === 'sent' ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              <span>Sent</span>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                activeTab === 'sent'
                  ? 'bg-emerald-200/80 text-emerald-900'
                  : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {sentCount}
            </span>
          </button>
        </nav>
      </div>

      {/* System Operational Badge */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
        <div className="flex items-center gap-2 font-medium text-slate-700 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>BullMQ Worker Active</span>
        </div>
        <p className="text-[11px] text-slate-400">Rate limiter: Atomic Redis Counter (3600s TTL)</p>
      </div>
    </aside>
  );
}
