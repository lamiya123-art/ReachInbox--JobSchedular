'use client';

import React, { useState } from 'react';
import { Sender, User, ScheduleEmailPayload } from '../lib/types';
import { scheduleEmails } from '../lib/api';
import CsvUploaderModal from './CsvUploaderModal';
import SendLaterPopover from './SendLaterPopover';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Send,
  Upload,
  X,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: Sender[];
  user?: User | null;
  onSuccess: () => void;
}

export default function ComposeModal({ isOpen, onClose, senders, user, onSuccess }: ComposeModalProps) {
  const [selectedSenderId, setSelectedSenderId] = useState(senders[0]?.id || '');
  const [recipientInput, setRecipientInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>(['john.smith@domain.io']);
  const [subject, setSubject] = useState('');
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [startTime, setStartTime] = useState<string | null>(null);

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tiptap Editor with immediatelyRender set to false for SSR compatibility
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your email body here...',
      }),
    ],
    content: '<p>Hi John,</p><p>Following up on our recent conversation regarding your email campaign.</p><p>Best regards,<br/>Oliver</p>',
  });

  // Sync selectedSenderId when senders prop or user updates (preferring logged-in user email)
  React.useEffect(() => {
    if (senders && senders.length > 0) {
      if (user?.email) {
        const userSender = senders.find((s) => s.email.toLowerCase() === user.email.toLowerCase());
        if (userSender) {
          setSelectedSenderId(userSender.id);
          return;
        }
      }
      if (!selectedSenderId || !senders.some((s) => s.id === selectedSenderId)) {
        setSelectedSenderId(senders[0].id);
      }
    }
  }, [senders, user, selectedSenderId]);

  if (!isOpen) return null;

  const commitPendingRecipient = (currentList: string[], input: string) => {
    const email = input.trim().toLowerCase();
    if (email && !currentList.includes(email)) {
      return [...currentList, email];
    }
    return currentList;
  };

  const handleAddRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      const updated = commitPendingRecipient(recipients, recipientInput);
      setRecipients(updated);
      setRecipientInput('');
    }
  };

  const handleInputBlur = () => {
    if (recipientInput.trim()) {
      const updated = commitPendingRecipient(recipients, recipientInput);
      setRecipients(updated);
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients(recipients.filter((r) => r !== emailToRemove));
  };

  const handleCsvUploadSuccess = (importedEmails: string[]) => {
    const combined = Array.from(new Set([...recipients, ...importedEmails]));
    setRecipients(combined);
    setToastMsg({
      type: 'success',
      message: `Imported ${importedEmails.length} recipient address(es) successfully!`,
    });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleSend = async () => {
    const finalRecipients = commitPendingRecipient(recipients, recipientInput);
    if (finalRecipients.length > recipients.length) {
      setRecipients(finalRecipients);
      setRecipientInput('');
    }

    if (finalRecipients.length === 0) {
      setToastMsg({ type: 'error', message: 'Please add at least one recipient email address.' });
      return;
    }
    if (!subject.trim()) {
      setToastMsg({ type: 'error', message: 'Please enter a subject line.' });
      return;
    }

    const htmlBody = editor?.getHTML() || '<p></p>';

    setIsSubmitting(true);
    setToastMsg(null);

    const activeSenderId = selectedSenderId || senders[0]?.id;

    const payload: ScheduleEmailPayload = {
      subject,
      body: htmlBody,
      recipients: finalRecipients,
      startTime: startTime || new Date().toISOString(),
      delayMs,
      hourlyLimit,
      senderId: activeSenderId,
    };

    try {
      const res = await scheduleEmails(payload);
      setToastMsg({
        type: 'success',
        message: `Successfully scheduled ${res.count} email job(s)!`,
      });

      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsSubmitting(false);
      setToastMsg({ type: 'error', message: err.message || 'Failed to schedule email campaign.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 flex justify-end">
      {/* Slide-in Overlay Panel */}
      <div className="w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-250 relative">
        {/* Toast Banner */}
        {toastMsg && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold text-white flex items-center justify-between transition-all ${
              toastMsg.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            <span>{toastMsg.message}</span>
            <button onClick={() => setToastMsg(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Panel Header */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-slate-900 text-base">Compose New Email</h2>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              title="Attachments"
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-200/60 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsSendLaterOpen(!isSendLaterOpen)}
              title="Send Later Options"
              className={`p-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium ${
                startTime
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'text-slate-500 hover:bg-slate-200/60'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-600" />
              {startTime && <span>{format(new Date(startTime), 'MMM d, h:mm a')}</span>}
            </button>

            {/* Send Later Popover */}
            <SendLaterPopover
              isOpen={isSendLaterOpen}
              onClose={() => setIsSendLaterOpen(false)}
              onSelectTime={(timeIso) => setStartTime(timeIso)}
            />

            {/* Primary Send / Send Later Action Button */}
            <button
              disabled={isSubmitting}
              onClick={handleSend}
              className="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-brand-500/20 transition-all transform active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Scheduling...' : startTime ? 'Send Later' : 'Send'}</span>
            </button>
          </div>
        </div>

        {/* Form Fields Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* From Dropdown */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 w-16">From:</span>
            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="flex-1 bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
            >
              {senders.length === 0 ? (
                user ? (
                  <option value="">{user.name} &lt;{user.email}&gt;</option>
                ) : (
                  <option value="">Oliver Brown &lt;oliver.brown@domain.io&gt;</option>
                )
              ) : (
                senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} &lt;{s.email}&gt;
                  </option>
                ))
              )}
            </select>
          </div>

          {/* To Field with Chip Inputs & CSV Upload Link */}
          <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 w-16 pt-1.5">To:</span>
            <div className="flex-1 flex flex-wrap items-center gap-1.5">
              {recipients.map((rec) => (
                <span
                  key={rec}
                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-xs font-medium px-2.5 py-1 rounded-full border border-slate-200"
                >
                  {rec}
                  <button
                    onClick={() => handleRemoveRecipient(rec)}
                    className="text-slate-400 hover:text-red-500 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleAddRecipient}
                onBlur={handleInputBlur}
                placeholder={recipients.length === 0 ? 'Type email & press Enter...' : 'Add email...'}
                className="flex-1 min-w-[140px] bg-transparent text-xs text-slate-800 outline-none py-1"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload List</span>
            </button>
          </div>

          {/* Subject Line */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 w-16">Subject:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Campaign subject line..."
              className="flex-1 bg-transparent text-xs font-medium text-slate-900 outline-none placeholder-slate-400"
            />
          </div>

          {/* Inline Delay & Hourly Limit Steppers */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Delay between 2 emails (ms):
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-medium text-slate-800 outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Sender Hourly Limit (emails/hr):
              </label>
              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-medium text-slate-800 outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Rich Text Editor Toolbar */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            {editor && (
              <div className="bg-slate-100/70 border-b border-slate-200 px-3 py-1.5 flex items-center gap-1 flex-wrap text-slate-600">
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded-lg hover:bg-slate-200 ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900' : ''}`}
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded-lg hover:bg-slate-200 ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900' : ''}`}
                >
                  <Italic className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1" />
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`p-1.5 rounded-lg hover:bg-slate-200 ${editor.isActive('bulletList') ? 'bg-slate-200 text-slate-900' : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`p-1.5 rounded-lg hover:bg-slate-200 ${editor.isActive('orderedList') ? 'bg-slate-200 text-slate-900' : ''}`}
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={`p-1.5 rounded-lg hover:bg-slate-200 ${editor.isActive('blockquote') ? 'bg-slate-200 text-slate-900' : ''}`}
                >
                  <Quote className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1" />
                <button
                  type="button"
                  onClick={() => editor.chain().focus().undo().run()}
                  className="p-1.5 rounded-lg hover:bg-slate-200"
                >
                  <Undo className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().redo().run()}
                  className="p-1.5 rounded-lg hover:bg-slate-200"
                >
                  <Redo className="w-4 h-4" />
                </button>
              </div>
            )}
            <EditorContent editor={editor} className="text-xs text-slate-800" />
          </div>
        </div>

        {/* CSV Uploader Modal */}
        <CsvUploaderModal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          onUploadSuccess={handleCsvUploadSuccess}
        />
      </div>
    </div>
  );
}
