'use client';

import React from 'react';
import { Mail, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const handleGoogleLogin = () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    window.location.href = `${apiBaseUrl}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500/10 border border-brand-500/30 rounded-2xl mb-4 text-brand-500 shadow-inner">
            <Mail className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ReachInbox</h1>
          <p className="text-sm text-slate-400 mt-1">High-Throughput Email Job Scheduler</p>
        </div>

        {/* Primary Google Login Pill Button */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-medium py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 group"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-base font-semibold">Login with Google</span>
            <ArrowRight className="w-4 h-4 ml-auto opacity-70 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700/80" />
          </div>
          <span className="relative bg-slate-800 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
            or sign up through email
          </span>
        </div>

        {/* Visual-only disabled Email/Password fields per brief spec */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-3.5 opacity-60">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email address</label>
            <input
              type="email"
              disabled
              placeholder="name@company.com"
              className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-slate-300 placeholder-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <input
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-slate-300 placeholder-slate-500 cursor-not-allowed"
            />
          </div>
          <button
            disabled
            type="button"
            className="w-full bg-slate-700 text-slate-400 font-medium py-2.5 px-4 rounded-xl text-sm cursor-not-allowed"
          >
            Sign In with Password (Use Google Login Above)
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-slate-700/50 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-brand-500" />
          <span>OAuth 2.0 Authenticated & Rate-Limited System</span>
        </div>
      </div>
    </div>
  );
}
