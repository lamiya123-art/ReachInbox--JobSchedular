'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Check, X } from 'lucide-react';
import { addDays, setHours, setMinutes, format } from 'date-fns';

interface SendLaterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTime: (timeIso: string) => void;
}

export default function SendLaterPopover({ isOpen, onClose, onSelectTime }: SendLaterPopoverProps) {
  const defaultNextHour = new Date(Date.now() + 3600000);
  const [selectedDatetime, setSelectedDatetime] = useState(
    format(defaultNextHour, "yyyy-MM-dd'T'HH:mm")
  );

  if (!isOpen) return null;

  const getPresets = () => {
    const tomorrow = addDays(new Date(), 1);
    return [
      {
        label: 'Tomorrow, 9:00 AM',
        value: format(setMinutes(setHours(tomorrow, 9), 0), "yyyy-MM-dd'T'HH:mm"),
      },
      {
        label: 'Tomorrow, 10:00 AM',
        value: format(setMinutes(setHours(tomorrow, 10), 0), "yyyy-MM-dd'T'HH:mm"),
      },
      {
        label: 'Tomorrow, 11:00 AM',
        value: format(setMinutes(setHours(tomorrow, 11), 0), "yyyy-MM-dd'T'HH:mm"),
      },
      {
        label: 'Tomorrow, 3:00 PM',
        value: format(setMinutes(setHours(tomorrow, 15), 0), "yyyy-MM-dd'T'HH:mm"),
      },
    ];
  };

  const handleApplyPreset = (presetValue: string) => {
    setSelectedDatetime(presetValue);
  };

  const handleDone = () => {
    if (selectedDatetime) {
      onSelectTime(new Date(selectedDatetime).toISOString());
      onClose();
    }
  };

  return (
    <div className="absolute top-12 right-0 w-80 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
          <Clock className="w-4 h-4 text-brand-500" />
          <span>Send Later Schedule</span>
        </div>
        <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Date-time picker */}
      <div className="mb-4">
        <label className="block text-[11px] font-medium text-slate-500 mb-1">
          Pick custom date & time
        </label>
        <div className="relative">
          <input
            type="datetime-local"
            value={selectedDatetime}
            onChange={(e) => setSelectedDatetime(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-medium focus:bg-white focus:border-brand-500 outline-none"
          />
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mb-4">
        <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
          Quick Presets
        </span>
        <div className="space-y-1">
          {getPresets().map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset.value)}
              className={`w-full text-left py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                selectedDatetime === preset.value
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{preset.label}</span>
              {selectedDatetime === preset.value && <Check className="w-3.5 h-3.5 text-brand-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={onClose}
          className="py-1.5 px-3 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          onClick={handleDone}
          className="py-1.5 px-4 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/20"
        >
          Done
        </button>
      </div>
    </div>
  );
}
