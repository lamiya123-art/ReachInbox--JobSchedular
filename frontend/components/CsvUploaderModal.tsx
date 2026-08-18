'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle, X, AlertCircle } from 'lucide-react';

interface CsvUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (emails: string[]) => void;
}

export default function CsvUploaderModal({ isOpen, onClose, onUploadSuccess }: CsvUploaderModalProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg('');
    setIsParsing(true);

    Papa.parse(file, {
      complete: (results) => {
        setIsParsing(false);
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const rawText = JSON.stringify(results.data);
        const matches = rawText.match(emailRegex) || [];
        const uniqueEmails = Array.from(new Set(matches.map((e) => e.toLowerCase())));

        if (uniqueEmails.length === 0) {
          setErrorMsg('No valid email addresses found in the selected file.');
          setParsedEmails([]);
        } else {
          setParsedEmails(uniqueEmails);
        }
      },
      error: (err) => {
        setIsParsing(false);
        setErrorMsg(`Failed to parse file: ${err.message}`);
      },
    });
  };

  const handleConfirm = () => {
    if (parsedEmails.length > 0) {
      onUploadSuccess(parsedEmails);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Upload Recipient List</h3>
              <p className="text-xs text-slate-500">Support CSV or plain text (.txt) files</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-6">
          <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 bg-slate-50 hover:bg-brand-50/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center">
            <input type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
            <FileText className="w-10 h-10 text-slate-400 mb-2" />
            <span className="text-sm font-semibold text-slate-700">Click to select CSV or TXT file</span>
            <span className="text-xs text-slate-400 mt-1">Automatic email extraction & deduplication</span>
          </label>

          {isParsing && (
            <p className="text-xs text-slate-500 mt-3 text-center animate-pulse">Parsing file content...</p>
          )}

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parsedEmails.length > 0 && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Detected {parsedEmails.length} valid email address(es)</span>
              </div>
              <span className="text-[11px] text-slate-400 truncate max-w-[120px]">{fileName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            disabled={parsedEmails.length === 0}
            onClick={handleConfirm}
            className="py-2 px-5 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white shadow-md shadow-brand-500/20"
          >
            Import {parsedEmails.length} Recipient(s)
          </button>
        </div>
      </div>
    </div>
  );
}
