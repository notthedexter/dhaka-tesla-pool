'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-xs text-slate-400 mb-6">
            An unexpected error occurred during execution.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
