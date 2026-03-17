import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative hero-grid overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--navy-dark)]" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--teal)] opacity-[0.04] rounded-full blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32">
          <div className="max-w-3xl mx-auto text-center stagger-children">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[var(--teal)]/10 border border-[var(--teal)]/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-[var(--teal)] animate-pulse" />
              <span className="text-xs font-semibold text-[var(--teal-light)] tracking-wide">AI-Powered Detection</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95] mb-6">
              <span className="gradient-text">NeuroPD</span>
              <br />
              <span className="text-white/90 text-3xl md:text-4xl font-bold">Parkinson&apos;s Detection System</span>
            </h1>

            <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
              Advanced motion analysis using wearable sensor data.
              Upload smartwatch recordings for real-time AI diagnosis powered by transformer neural networks.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/analyze" className="btn-primary text-base px-10 py-4 animate-pulse-glow">
                Start Analysis →
              </Link>
              <a href="#workflow" className="btn-outline text-base px-10 py-4">
                How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Clinical-Grade Analysis</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Our platform combines multi-sensor data processing with deep learning for accurate Parkinson&apos;s screening.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
            {/* Feature 1 */}
            <div className="card-hover group">
              <div className="w-12 h-12 rounded-lg bg-[var(--teal)]/10 flex items-center justify-center mb-5 group-hover:bg-[var(--teal)]/20 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Multi-Sensor Analysis</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Processes accelerometer (AccX, AccY, AccZ) and gyroscope (GyrX, GyrY, GyrZ) data from both wrists simultaneously.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-hover group">
              <div className="w-12 h-12 rounded-lg bg-[var(--teal)]/10 flex items-center justify-center mb-5 group-hover:bg-[var(--teal)]/20 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <path d="M12 8v4l2 2" />
                  <circle cx="12" cy="12" r="1" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Transformer Model</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Hierarchical Transformer architecture with cross-attention layers analyzes motion patterns across time windows.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-hover group">
              <div className="w-12 h-12 rounded-lg bg-[var(--teal)]/10 flex items-center justify-center mb-5 group-hover:bg-[var(--teal)]/20 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Clinical AI Report</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Gemini-powered explanation generates detailed clinical insights including risk assessment and differential analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-24 px-6 bg-[var(--surface)]/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Three simple steps from raw sensor data to clinical diagnosis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children">
            {[
              {
                step: '01',
                title: 'Upload Sensor Data',
                desc: 'Upload synchronized left and right wrist sensor files from smartwatch recordings.',
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'AI Analysis',
                desc: 'The transformer model preprocesses signals and runs hierarchical inference across time windows.',
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Diagnosis + Report',
                desc: 'View the AI diagnosis (HC / PD / DD), confidence scores, probability analysis, and clinical report.',
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-[var(--teal)]/10 border border-[var(--teal)]/20 flex items-center justify-center mx-auto mb-6 text-[var(--teal-light)]">
                  {item.icon}
                </div>
                <span className="absolute top-0 right-1/4 text-6xl font-black text-white/[0.03]">{item.step}</span>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link href="/analyze" className="btn-primary text-base px-10 py-4">
              Begin Analysis →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
