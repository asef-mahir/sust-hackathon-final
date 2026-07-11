import Link from 'next/link';
import { FaMoneyBillWave, FaExclamationTriangle, FaNetworkWired, FaArrowRight } from 'react-icons/fa';

export default function HomePage() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden bg-slate-50 px-6 py-12">
      
      {/* Background soft glowing effects for a modern light look */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-cyan-400/10 blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-[120px]"></div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        
        {/* Hackathon Badge */}
        <div className="mb-6 inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-sm font-semibold text-cyan-700 shadow-sm">
          <span className="mr-2 flex h-2 w-2 animate-pulse rounded-full bg-cyan-500"></span>
          bKash presents SUST CSE Carnival 2026
        </div>

        {/* Hero Title */}
        <h1 className="mb-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-7xl">
          Liquidity Sentinel
        </h1>

        {/* Hero Subtitle */}
        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
          Multi-provider liquidity and anomaly decision support. Providing multi-network agents with unified operational views without compromising provider boundaries.
        </p>

        {/* Launch CTA */}
        <Link
          href="/login"
          className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-cyan-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-cyan-500 hover:shadow-[0_0_20px_-5px_rgba(8,145,178,0.5)] active:scale-95"
        >
          Enter Command Center
          <FaArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>

        {/* The Pitch / Core Features Section */}
        <div className="mt-24 grid w-full grid-cols-1 gap-8 text-left md:grid-cols-3">
          
          {/* Feature 1 */}
          <div className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-cyan-200 hover:shadow-md">
            <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-600">
              <FaMoneyBillWave className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Unified View</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Merge physical cash and e-money visibility across bKash, Nagad, and Rocket into one seamless, comprehensive dashboard.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-cyan-200 hover:shadow-md">
            <div className="mb-4 rounded-lg bg-amber-50 p-3 text-amber-600">
              <FaExclamationTriangle className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Smart Alerts</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Detect hidden provider shortages, synthetic cluster transactions, and operational pressure before they disrupt service.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-cyan-200 hover:shadow-md">
            <div className="mb-4 rounded-lg bg-blue-50 p-3 text-blue-600">
              <FaNetworkWired className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Coordinated Response</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Route actionable evidence to the exact stakeholder—Ops or Risk Teams—while safely protecting individual data ownership.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}