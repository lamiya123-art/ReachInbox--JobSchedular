'use client';

import React from 'react';
import { User } from '../lib/types';
import { logoutUser } from '../lib/api';
import { LogOut, User as UserIcon, Mail } from 'lucide-react';

interface NavbarProps {
  user?: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const handleLogout = async () => {
    try {
      await logoutUser();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 leading-tight">ReachInbox</h1>
          <p className="text-xs text-slate-500 font-medium">Email Outreach Platform</p>
        </div>
      </div>

      {/* User Chip & Logout */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 rounded-full py-1 px-3.5 transition-colors">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-300"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-semibold">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="text-xs">
              <span className="font-semibold text-slate-800 block">{user.name}</span>
              <span className="text-slate-500 block text-[10px] truncate max-w-[140px]">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="ml-2 text-slate-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-slate-200/60"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <UserIcon className="w-4 h-4 animate-pulse" />
            <span>Loading profile...</span>
          </div>
        )}
      </div>
    </header>
  );
}
