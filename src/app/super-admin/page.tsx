'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { 
  ShieldAlert, 
  Wrench, 
  Activity, 
  Building2, 
  Loader2, 
  CheckCircle2,
  Clock,
  LogOut,
  Lock,
  Mail
} from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'Eludlam1221@gmail.com';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userSession, setUserSession] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Login form state
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [garagesOverview, setGaragesOverview] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({
    totalGarages: 0,
    activeRepairs: 0,
    completedRepairs: 0,
  });

  useEffect(() => {
    checkAccessAndFetch();
  }, []);

  const checkAccessAndFetch = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        setUserSession(user);
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      setUserSession(user);
      setIsSuperAdmin(true);
      await fetchMasterData();

    } catch (err: any) {
      console.error('Access check error:', err?.message || err);
      setIsSuperAdmin(false);
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');

    try {
      // Check if the entered email matches the authorized super admin email
      if (email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        throw new Error('Unauthorized Access: This email does not possess super-admin clearance.');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: SUPER_ADMIN_EMAIL,
        options: {
          emailRedirectTo: `${window.location.origin}/super-admin`,
        },
      });

      if (error) throw error;
      alert('Secure magic link sent! Check your inbox to log in instantly.');
    } catch (err: any) {
      setLoginError(err?.message || 'Failed to send login link');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsSuperAdmin(false);
    setUserSession(null);
    setEmail('');
  };

  const fetchMasterData = async () => {
    try {
      const { data: garages, error: garagesError } = await supabase
        .from('garages')
        .select('*');

      if (garagesError) throw garagesError;

      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          garage_id,
          registration_plate,
          status,
          created_at
        `);

      if (jobsError) throw jobsError;

      let activeCount = 0;
      let completedCount = 0;

      const enrichedGarages = (garages || []).map((garage) => {
        const garageJobs = (jobs || []).filter((j) => j.garage_id === garage.id);
        const inProgress = garageJobs.filter((j) => j.status === 'in_progress');
        const completed = garageJobs.filter((j) => j.status === 'completed');

        activeCount += inProgress.length;
        completedCount += completed.length;

        const sortedJobs = [...garageJobs].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastJob = sortedJobs[0];

        return {
          ...garage,
          totalJobs: garageJobs.length,
          activeRepairs: inProgress.length,
          completedRepairs: completed.length,
          lastActivity: lastJob ? lastJob.created_at : null,
        };
      });

      setGaragesOverview(enrichedGarages);
      setGlobalStats({
        totalGarages: garages?.length || 0,
        activeRepairs: activeCount,
        completedRepairs: completedCount,
      });

    } catch (err: any) {
      console.error('Error fetching master overview data:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // GATEKEEPER VIEW
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold font-mono tracking-wider uppercase text-white">RESTRICTED ACCESS</h1>
            <p className="text-xs text-neutral-400">
              {userSession 
                ? `Logged in as ${userSession.email}. This account lacks Super-Admin clearance.` 
                : 'Authentication required to access Master Command.'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">Authorized Super-Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Admin Email"
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-10 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50 transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold uppercase tracking-wider text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 font-mono disabled:opacity-50"
            >
              {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Magic Login Link</span>}
            </button>
          </form>

          {userSession && (
            <button
              onClick={handleSignOut}
              className="w-full bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 font-semibold text-xs py-2.5 rounded-xl transition"
            >
              Sign Out Current User
            </button>
          )}

          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition"
            >
              &larr; Return to Application Terminal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FULL SUPER-ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <header className="sticky top-0 z-30 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono tracking-wider uppercase text-white">WEBEX // MASTER COMMAND</h1>
            <span className="text-xs text-neutral-400">Cross-Garage Infrastructure & Diagnostics</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Lock Command</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Garages</span>
              <Building2 className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-white">{globalStats.totalGarages}</div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Bay Repairs</span>
              <Wrench className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-amber-400">{globalStats.activeRepairs}</div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Completed Jobs</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-400">{globalStats.completedRepairs}</div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Connected Garage Fleet</h2>
            </div>
            <button 
              onClick={fetchMasterData}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Refresh Telemetry
            </button>
          </div>

          {garagesOverview.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 text-xs">
              No garages registered in the database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 text-[11px] uppercase tracking-wider text-neutral-400 bg-neutral-950/50">
                    <th className="p-4 font-semibold">Garage Name / ID</th>
                    <th className="p-4 font-semibold text-center">Active Repairs</th>
                    <th className="p-4 font-semibold text-center">Completed</th>
                    <th className="p-4 font-semibold">Last Activity Timestamp</th>
                    <th className="p-4 font-semibold text-right">Status / Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-xs">
                  {garagesOverview.map((garage) => {
                    return (
                      <tr key={garage.id} className="hover:bg-neutral-800/30 transition">
                        <td className="p-4">
                          <div className="font-bold text-white uppercase font-mono">{garage.name}</div>
                          <div className="text-[10px] text-neutral-500 font-mono">ID: {garage.id}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                            {garage.activeRepairs}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-neutral-300 font-medium">
                            {garage.completedRepairs}
                          </span>
                        </td>
                        <td className="p-4 text-neutral-300 font-mono">
                          {garage.lastActivity ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-neutral-500" />
                              <span>{new Date(garage.lastActivity).toLocaleString()}</span>
                            </div>
                          ) : (
                            <span className="text-neutral-600 italic">No activity yet</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Nominal
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}