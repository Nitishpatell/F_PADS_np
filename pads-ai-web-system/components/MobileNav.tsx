'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--surface-light)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--teal)] transition-all"
        aria-label="Toggle mobile menu"
        id="mobile-menu-button"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="8" x2="21" y2="8" />
            <line x1="3" y1="16" x2="21" y2="16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-12 right-0 w-52 glass border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-fade-in-up z-50">
          <div className="p-2 space-y-1">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span>Home</span>
            </Link>
            <Link
              href="/analyze"
              onClick={() => setOpen(false)}
              className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              <span>Analyze</span>
            </Link>
          </div>
          <div className="px-4 py-3 border-t border-[var(--border)] bg-white/[0.02]">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              <span className="text-[10px] font-medium text-[var(--text-muted)]">AI Model Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
