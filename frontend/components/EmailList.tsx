'use client';

import React, { useState } from 'react';
import { EmailJob } from '../lib/types';
import { Search, Filter, ArrowUpDown, Inbox, Clock, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface EmailListProps {
  emails: EmailJob[];
  selectedEmailId?: string | null;
  onSelectEmail: (email: EmailJob) => void;
  isLoading: boolean;
  activeTab: 'scheduled' | 'sent';
}

export default function EmailList({
  emails,
  selectedEmailId,
  onSelectEmail,
  isLoading,
  activeTab,
}: EmailListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmails = emails.filter((email) => {
    const q = searchQuery.toLowerCase();
    return (
      email.recipient.toLowerCase().includes(q) ||
      email.subject.toLowerCase().includes(q) ||
      email.body.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Sent
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
            Queued
          </span>
        );
      case 'RESCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            <RefreshCw className="w-3 h-3" />
            Rescheduled
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
            <AlertTriangle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="w-96 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-4rem)]">
      {/* Top Search & Filter Bar */}
      <div className="p-3.5 border-b border-slate-200 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search recipients, subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-transparent focus:border-slate-300 focus:bg-white rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-semibold text-slate-700 capitalize">
            {activeTab} ({filteredEmails.length})
          </span>
          <div className="flex items-center gap-2">
            <button className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700">
              <Filter className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row List Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-3.5 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Inbox className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No {activeTab} emails found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try matching a different search term.' : `Your ${activeTab} queue is empty.`}
            </p>
          </div>
        ) : (
          filteredEmails.map((email) => {
            const isSelected = selectedEmailId === email.id;
            const displayDate = email.sentAt || email.scheduledFor || email.createdAt;
            const formattedDate = format(new Date(displayDate), 'MMM d, h:mm a');

            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-slate-100/90 border-l-4 border-l-brand-500'
                    : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-800 truncate max-w-[170px]">
                    To: {email.recipient}
                  </span>
                  <span className="text-[11px] text-slate-400">{formattedDate}</span>
                </div>

                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-xs font-semibold text-slate-900 truncate flex-1">
                    {email.subject}
                  </h4>
                  {getStatusBadge(email.status)}
                </div>

                <p
                  className="text-xs text-slate-500 line-clamp-1"
                  dangerouslySetInnerHTML={{
                    __html: email.body.replace(/<[^>]*>?/gm, ''),
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
