'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Zap, LogOut, Wallet, Car, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const walletBdt = ((user?.walletBalancePaisa || 0) / 100).toFixed(0);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Zap className="w-4 h-4 text-slate-950 fill-current" />
          </div>
          <span className="font-bold text-sm text-white tracking-tight hidden sm:block">
            Dhaka Tesla Pool
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/passenger/book" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all">
            Book
          </Link>
          <Link href="/driver/dashboard" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all">
            Driver Hub
          </Link>
          <Link href="/#how-it-works" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all">
            How It Works
          </Link>
        </nav>

        {/* Right: auth */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Wallet badge */}
              {user.role === 'PASSENGER' && (
                <Link
                  href="/passenger/wallet"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-xs font-semibold text-emerald-400 transition-all"
                >
                  <Wallet className="w-3 h-3" />
                  ৳{walletBdt}
                </Link>
              )}

              {user.role === 'DRIVER' && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-semibold text-emerald-400">
                    <Wallet className="w-3 h-3" />
                    ৳{walletBdt}
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-semibold text-amber-400">
                    <Car className="w-3 h-3" />
                    {user.tesla?.name || 'Tesla'}
                  </div>
                </div>
              )}

              {/* User pill */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-all"
                >
                  <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-[11px]">
                    {user.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-white hidden sm:block max-w-[80px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 glass-card rounded-xl p-1 border border-white/[0.08] z-50">
                    <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                      <p className="text-xs font-semibold text-white">{user.name}</p>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">{user.role}</p>
                    </div>
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-md shadow-emerald-500/20 transition"
              >
                Join Pool
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
