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
    <header className="sticky top-0 z-50 bg-[#090e1c] border-b border-slate-800/90 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-7 h-7 bg-blue-600 group-hover:bg-blue-500 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/30 transition-colors">
            <Zap className="w-4 h-4 text-white fill-current" />
          </div>
          <span className="font-display font-bold text-sm text-white tracking-tight hidden sm:block">
            Dhaka Tesla Pool
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/passenger/book" className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-lg transition-colors">
            Book a Seat
          </Link>
          <Link href="/driver/dashboard" className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-lg transition-colors">
            Driver Hub
          </Link>
          <Link href="/#how-it-works" className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-lg transition-colors">
            How It Works
          </Link>
        </nav>

        {/* Right: auth */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Passenger wallet badge */}
              {user.role === 'PASSENGER' && (
                <Link
                  href="/passenger/wallet"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 rounded-lg text-xs font-semibold text-blue-400 font-mono transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>৳{walletBdt}</span>
                </Link>
              )}

              {/* Driver wallet & vehicle badges */}
              {user.role === 'DRIVER' && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs font-semibold text-blue-400 font-mono">
                    <Wallet className="w-3.5 h-3.5" />
                    <span>৳{walletBdt}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-300">
                    <Car className="w-3.5 h-3.5 text-amber-400" />
                    <span>{user.tesla?.name || 'Tesla'}</span>
                  </div>
                </div>
              )}

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors"
                >
                  <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-[11px]">
                    {user.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-white hidden sm:block max-w-[90px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#0c1426] border border-slate-700/90 rounded-xl p-1.5 shadow-2xl z-50 ring-1 ring-black/60">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{user.role}</p>
                    </div>
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-medium text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
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
