'use client';

import React from 'react';
import { EmailJob } from '../lib/types';
import { Mail, Clock, CheckCircle2, AlertTriangle, RefreshCw, Paperclip, ArrowLeft, Trash2, Archive, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';

interface EmailDetailProps {
  email?: EmailJob | null;
  onClose?: () => void;
}

export default function EmailDetail({ email, onClose }: EmailDetailProps) {
  if (!email) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-8 text-center text-slate-400 h-[calc(100vh-4rem)]">
        <Mail className="w-16 h-16 stroke-1 mb-3 text-slate-300" />
        <h3 className="text-base font-semibold text-slate-700">No Email Selected</h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Select an item from the list to view its complete content, execution logs, and scheduling status.
        </p>
      </div>
    );
  }

  const getStatusBanner = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3 text-emerald-800 text-xs font-medium mb-6">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900">Email Delivered Successfully</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Sent at {email.sentAt ? format(new Date(email.sentAt), 'PPpp') : 'N/A'} via Ethereal SMTP.
              </p>
            </div>
          </div>
        );
      case 'RESCHEDULED':
        return (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center gap-3 text-purple-800 text-xs font-medium mb-6">
            <RefreshCw className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <p className="font-semibold text-purple-900">Sender Rate Limit Exceeded — Rescheduled</p>
              <p className="text-[11px] text-purple-700 mt-0.5">
                Pushed to next hour window: {format(new Date(email.nextAttemptAt), 'PPpp')}. Zero jobs dropped.
              </p>
            </div>
          </div>
        );
      case 'QUEUED':
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-amber-800 text-xs font-medium mb-6">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
            <div>
              <p className="font-semibold text-amber-900">Queued in BullMQ Delayed Set</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Scheduled for {format(new Date(email.scheduledFor), 'PPpp')}.
              </p>
            </div>
          </div>
        );
      case 'FAILED':
        return (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 text-red-800 text-xs font-medium mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Delivery Error</p>
              <p className="text-[11px] text-red-700 mt-0.5">{email.lastError || 'Failed to dispatch email'}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Detail Header Bar */}
      <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="text-xs font-medium text-slate-500 font-mono">
            Ref ID: {email.id.substring(0, 13)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <button className="p-1.5 hover:bg-slate-100 rounded-lg hover:text-slate-600 transition-colors">
            <Archive className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 rounded-lg hover:text-red-600 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 rounded-lg hover:text-slate-600 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Body View */}
      <div className="p-6 max-w-4xl mx-auto w-full flex-1">
        {/* Subject */}
        <h2 className="text-xl font-bold text-slate-900 mb-4">{email.subject}</h2>

        {/* Status Banner */}
        {getStatusBanner(email.status)}

        {/* Sender & Recipient Metadata */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-sm">
              {email.sender?.name ? email.sender.name.charAt(0) : 'O'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900">
                  {email.sender?.name || 'Oliver Brown'}
                </span>
                <span className="text-xs text-slate-400">&lt;{email.sender?.email || 'oliver.brown@domain.io'}&gt;</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                To: <span className="font-medium text-slate-700">{email.recipient}</span>
              </p>
            </div>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            {format(new Date(email.createdAt), 'MMM d, yyyy, h:mm a')}
          </span>
        </div>

        {/* Formatted HTML Body */}
        <div
          className="prose prose-slate max-w-none text-sm text-slate-800 leading-relaxed mb-8"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />

        {/* Technical Audit Footer */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 mt-8">
          <h4 className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
            Execution Technical Audit
          </h4>
          <div className="grid grid-cols-2 gap-2 text-slate-600">
            <div>
              <span className="text-slate-400">BullMQ Job ID:</span>{' '}
              <span className="font-mono text-slate-800">{email.bullJobId || 'Pending Enqueue'}</span>
            </div>
            <div>
              <span className="text-slate-400">Campaign ID:</span>{' '}
              <span className="font-mono text-slate-800">{email.campaignId}</span>
            </div>
            <div>
              <span className="text-slate-400">Attempts Made:</span>{' '}
              <span className="font-semibold text-slate-800">{email.attempts}</span>
            </div>
            <div>
              <span className="text-slate-400">Scheduled Send Time:</span>{' '}
              <span className="text-slate-800">{format(new Date(email.scheduledFor), 'PPpp')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
