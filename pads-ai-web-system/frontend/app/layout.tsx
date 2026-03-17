import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NeuroPD — Parkinson's Detection System",
  description: "AI-powered motion analysis using wearable sensor data for Parkinson's Disease detection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth dark">
      <body className="antialiased min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 glass border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-lg bg-[var(--teal)] flex items-center justify-center shadow-[0_0_15px_-3px_rgba(13,148,136,0.5)] group-hover:shadow-[0_0_25px_-3px_rgba(13,148,136,0.7)] transition-shadow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white">
                  Neuro<span className="text-[var(--teal-light)]">PD</span>
                </h1>
                <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wider uppercase">
                  Detection System
                </p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              <Link href="/" className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Home
              </Link>
              <Link href="/analyze" className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-all">
                Analyze
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[var(--surface-light)] border border-[var(--border)]">
                <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">AI Model Active</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[var(--border)] bg-[var(--navy-dark)]">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded bg-[var(--teal)] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[var(--text-secondary)]">NeuroPD</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] text-center">
                © 2026 NeuroPD — AI-Powered Parkinson&apos;s Detection. For research and clinical use only.
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Transformer Model v1.0 • PADS Dataset
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
