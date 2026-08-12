'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { 
  Wrench, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Smartphone, 
  FileText, 
  CheckCircle2, 
  Lock, 
  Car, 
  MessageSquare, 
  Loader2, 
  X,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [garageName, setGarageName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        let registeredGarageName = garageName || 'My Garage';

        // 1. DO NOT create auth user or database rows here anymore.
        // Instead, send email, password, and garageName directly to your /api/checkout route.
        const checkoutRes = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, garageName: registeredGarageName }),
        });
        const checkoutData = await checkoutRes.json();
        
        if (checkoutData.url) {
          window.location.href = checkoutData.url; // Redirects user to Stripe hosted checkout
        } else {
          throw new Error(checkoutData.error || 'Failed to create payment session');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate');
      setLoading(false);
    }
  };

  const openModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setErrorMsg('');
    setSuccessMsg('');
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-amber-500 selection:text-neutral-950">
      {/* Announcement Bar */}
      <div className="w-full bg-amber-500 text-neutral-950 px-4 py-2 text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-sm">
        <span className="bg-neutral-950 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-full uppercase">New</span>
        <span>WebEx Auto is now available as a Progressive Web App (PWA)! Install it on your device for quick access.</span>
      </div>

      {/* Header / Nav */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-neutral-900">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="font-mono font-bold tracking-wider text-sm">WEBEX AUTO</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => openModal('login')}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white transition px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Dashboard Login</span>
          </button>
          <button
            onClick={() => openModal('signup')}
            className="hidden sm:flex items-center gap-2 text-xs font-semibold text-neutral-950 transition px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Start Free Trial</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-16 text-center space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-3.5 h-3.5" />
            <span>7-Day Free Trial • £50/month All Access.</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-2xl mx-auto leading-tight">
            Workshop management built for the <span className="text-amber-500">independent garage</span>.
          </h1>

          <p className="text-sm sm:text-base text-neutral-400 max-w-lg mx-auto leading-relaxed">
            Snap photos from the bay, log advisories instantly, and give your customers a live real-time tracking link. Zero friction.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openModal('signup')}
              className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/10 transition flex items-center justify-center gap-2 group"
            >
              <span>Start Free Trial (£50/mo)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
            <button
              onClick={() => openModal('login')}
              className="w-full sm:w-auto px-6 py-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-semibold text-sm rounded-xl border border-neutral-800 transition"
            >
              Sign In
            </button>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left"
        >
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 space-y-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Mobile Bay Cam</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Snap photos directly from your phone in the bay. They sync instantly to the job file.
            </p>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 space-y-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Live Customer Link</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Send clients a secure tracking link so they can see progress and findings in real-time.
            </p>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 space-y-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Flat Fee Simplicity</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              One transparent monthly price. Every feature included for every mechanic in the shop.
            </p>
          </div>
        </motion.div>

        {/* Future Roadmap / Pathway Section */}
        <div className="border-t border-neutral-900 pt-16 space-y-8 text-left">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-500">Upcoming Infrastructure</span>
            <h2 className="text-2xl font-bold tracking-tight text-white">The Future Roadmap</h2>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">Active upgrades currently in development to streamline your bay throughput even further.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-neutral-900/30 border border-neutral-800/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-neutral-800 text-amber-400">
                  <Car className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Coming Soon</span>
              </div>
              <h3 className="text-sm font-bold text-white">Instant DVLA Vehicle Lookup</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Type a registration plate to automatically fetch make, model, year, fuel type, and MOT history directly into the job file.
              </p>
            </div>

            <div className="bg-neutral-900/30 border border-neutral-800/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-neutral-800 text-amber-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">Planned Q4</span>
              </div>
              <h3 className="text-sm font-bold text-white">Automated WhatsApp Updates</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Trigger automated SMS and WhatsApp status updates directly to customers when their vehicle inspection report is finalized.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Highlight Box */}
        <div className="border-t border-neutral-900 pt-16">
          <div className="bg-gradient-to-b from-neutral-900 to-neutral-900/40 border border-neutral-800 rounded-3xl p-8 sm:p-10 text-center space-y-6 max-w-2xl mx-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-500">7-Day Free Trial Included</span>
              <h3 className="text-2xl font-bold text-white">Everything You Need. One Flat Rate.</h3>
              <p className="text-xs text-neutral-400">No per-user fees, no hidden add-ons. Full workshop management unlocked.</p>
            </div>

            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-extrabold font-mono text-white">£50</span>
              <span className="text-xs text-neutral-400 font-mono">/ month</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs max-w-md mx-auto pt-2">
              <div className="flex items-center gap-2 text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Unlimited Job Cards & Bays</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Mobile Camera Integration</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Short-Link Service History</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Priority Support & Updates</span>
              </div>
            </div>

            <button
              onClick={() => openModal('signup')}
              className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg transition"
            >
              Start Free Trial Now
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 border-t border-neutral-900 text-center text-xs text-neutral-500">
        <p>© 2026 WebEx Auto. Built for independent workshops.</p>
      </footer>

      {/* Auth Modal (Login / Sign Up) */}
      <AnimatePresence>
        {isAuthOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6 relative"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold font-mono text-white">
                    {authMode === 'login' ? 'Dashboard Access' : 'Create Garage Account'}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {authMode === 'login' ? 'Sign in to your garage dashboard.' : 'Start your 7-day free trial (£50/mo after).'}
                  </p>
                </div>
                <button
                  onClick={() => setIsAuthOpen(false)}
                  className="p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Garage / Workshop Name
                    </label>
                    <input
                      type="text"
                      required
                      value={garageName}
                      onChange={(e) => setGarageName(e.target.value)}
                      placeholder="e.g. Apex Performance Motors"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mechanic@webexauto.co.uk"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{authMode === 'login' ? 'Authenticating...' : 'Redirecting to Checkout...'}</span>
                    </>
                  ) : (
                    <span>{authMode === 'login' ? 'Sign In to Dashboard' : 'Start Free Trial & Register'}</span>
                  )}
                </button>
              </form>

              {/* Mode Switcher Footer */}
              <div className="pt-2 text-center text-xs text-neutral-400 border-t border-neutral-800">
                {authMode === 'login' ? (
                  <p>
                    Don't have a garage account?{' '}
                    <button
                      onClick={() => { setAuthMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-amber-400 font-semibold hover:underline"
                    >
                      Sign Up (Free Trial)
                    </button>
                  </p>
                ) : (
                  <p>
                    Already registered?{' '}
                    <button
                      onClick={() => { setAuthMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-amber-400 font-semibold hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}