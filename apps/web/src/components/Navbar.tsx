'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Zap, User, Car, LogOut, Wallet, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-1.5 bg-emerald-500 text-slate-950 rounded-xl shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white block leading-none">
              Dhaka Tesla Pool
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase block mt-0.5">
              3-Wheel Electric Mobility
            </span>
          </div>
        </Link>

        {/* Center navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <Link href="/passenger/book" className="hover:text-emerald-400 transition">
            Book a Ride
          </Link>
          <Link href="/driver/dashboard" className="hover:text-emerald-400 transition">
            Driver Hub
          </Link>
          <Link href="/#how-it-works" className="hover:text-emerald-400 transition">
            How It Works
          </Link>
          <Link href="/#story-cast" className="hover:text-emerald-400 transition">
            The Story Cast
          </Link>
        </nav>

        {/* User auth state */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Passenger wallet balance */}
              {user.role === 'PASSENGER' && (
                <Link
                  href="/passenger/wallet"
                  title="View TeslaPay Wallet & Top-up"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-300 transition"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>৳{(user.walletBalancePaisa / 100).toFixed(0)}</span>
                  <span className="text-[10px] text-emerald-400 font-normal">TeslaPay +</span>
                </Link>
              )}

              {/* Driver wallet & vehicle badges */}
              {user.role === 'DRIVER' && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-300">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>৳{((user.walletBalancePaisa || 0) / 100).toFixed(0)}</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Pilot Wallet</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/80 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300">
                    <Car className="w-3.5 h-3.5 text-amber-400" />
                    <span>{user.tesla?.name || 'Tesla'} ({user.tesla?.totalSeats || 3} seats)</span>
                  </div>
                </div>
              )}

              {/* User menu */}
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="font-semibold text-xs text-white block leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                title="Sign out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition"
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
