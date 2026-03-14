import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Activity, ShieldCheck, Terminal, Layers } from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: '--font-mono' });

export const metadata: Metadata = {
  title: "PADS AI | Neural Diagnostic Terminal",
  description: "Advanced Parkinson's Disease screening workstation powered by hierarchical transformers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full scroll-smooth dark ${inter.variable} ${mono.variable}`}>
      <body className="font-mono antialiased bg-black text-white selection:bg-orange-500/30">
        <div className="relative min-h-screen flex flex-col border-x border-white/5 max-w-[1920px] mx-auto">
          
          {/* Dashboard Header - Sharp & Technical */}
          <header className="sticky top-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/10 px-6">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-600 p-2.5 rounded-sm shadow-[0_0_15px_rgba(234,88,12,0.4)]">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-tighter uppercase">PADS-AI <span className="text-orange-500">v1.0</span></h1>
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Kernel Active</span>
                    </div>
                  </div>
                </div>

                <nav className="hidden lg:flex items-center space-x-1 border-l border-white/10 pl-6 h-10">
                  {['Dashboard', 'Telemetry', 'Neural Stats', 'Archive'].map((item) => (
                    <button key={item} className="px-4 py-2 text-[10px] font-bold text-zinc-500 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest rounded-sm">
                      {item}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="flex items-center space-x-4">
                <div className="hidden xl:flex flex-col items-end mr-4">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Workstation_ID</span>
                  <span className="text-xs font-bold font-mono">BFL-PADS-01</span>
                </div>
                <button className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-sm transition-all group">
                  <ShieldCheck className="h-4 w-4 text-orange-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Medical Auth</span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-grow flex flex-col overflow-x-hidden">
            <div className="flex-grow w-full">
              {children}
            </div>
          </main>

          <footer className="border-t border-white/5 bg-[#050506] p-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 opacity-50">
                  <Terminal className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Diagnostic Console</span>
                </div>
                <div className="flex items-center space-x-2 opacity-50">
                  <Layers className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Multi-Layer Inference</span>
                </div>
              </div>
              
              <div className="text-center md:text-right">
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest leading-loose">
                  Neural assets encrypted. (c) 2026 PADS AI Division.<br/>
                  Qualified Research Access Only. Standard protocol 81-b applied.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
