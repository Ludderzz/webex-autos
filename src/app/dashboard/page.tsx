'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { 
  Wrench, 
  Plus, 
  Car, 
  Loader2, 
  Search,
  ChevronRight,
  FileText,
  Receipt,
  Trash2,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewPart {
  name: string;
  retailPrice: string;
  quantity: string;
}

export default function GarageDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'completed'>('in_progress');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Garage Context State
  const [garageName, setGarageName] = useState('GARAGE LAB');
  const [garageId, setGarageId] = useState<string | null>(null);

  // New Job Form State
  const [regPlate, setRegPlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [parts, setParts] = useState<NewPart[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initDashboard();
  }, []);

  const initDashboard = async () => {
    try {
      setLoading(true);

      // 1. Get current user profile and garage info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('garage_id, garages(name)')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.garage_id) {
        throw new Error('Could not find associated garage for this user.');
      }

      setGarageId(profile.garage_id);
      
      // Extract garage name from relation if available
      const fetchedGarageName = (profile.garages as any)?.name;
      if (fetchedGarageName) {
        setGarageName(fetchedGarageName);
      }

      // 2. Fetch jobs filtered specifically by this garage_id
      await fetchJobs(profile.garage_id);
    } catch (err: any) {
      console.error('Error initializing dashboard:', err?.message || err);
      setLoading(false);
    }
  };

  const fetchJobs = async (targetGarageId?: string) => {
    const activeGarageId = targetGarageId || garageId;
    if (!activeGarageId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          images:job_images(count),
          parts:job_parts(*)
        `)
        .eq('garage_id', activeGarageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err: any) {
      console.error('Error fetching jobs:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleAddPartRow = () => {
    setParts([...parts, { name: '', retailPrice: '', quantity: '1' }]);
  };

  const handleRemovePartRow = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const handlePartChange = (index: number, field: keyof NewPart, value: string) => {
    const updated = [...parts];
    updated[index][field] = value;
    setParts(updated);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPlate || !garageId) return;

    try {
      setSubmitting(true);

      // Insert Job directly via Supabase client with the garage_id explicitly included
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert([
          {
            garage_id: garageId,
            registration_plate: regPlate,
            vehicle_make_model: vehicleModel,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail,
            status: 'in_progress',
          }
        ])
        .select()
        .single();

      if (jobError) throw jobError;
      const newJobId = newJob.id;

      // If user added dynamic parts, insert them directly into job_parts table
      if (parts.length > 0) {
        const formattedParts = parts
          .filter((p) => p.name.trim() !== '')
          .map((p) => ({
            job_id: newJobId,
            name: p.name,
            retail_price: parseFloat(p.retailPrice) || 0,
            cost_price: 0,
            quantity: parseInt(p.quantity, 10) || 1,
          }));

        if (formattedParts.length > 0) {
          const { error: partsError } = await supabase
            .from('job_parts')
            .insert(formattedParts);

          if (partsError) console.error('Error inserting initial parts:', partsError);
        }
      }

      // Reset Form State
      setRegPlate('');
      setVehicleModel('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setParts([]);
      setIsModalOpen(false);

      await fetchJobs();
      router.push(`/bay/${newJobId}`);
    } catch (err: any) {
      console.error('Error creating job:', err);
      alert(err.message || 'Error creating job record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadCardDoc = async (job: any, docType: 'report' | 'invoice') => {
    try {
      const payload = {
        jobId: job.id,
        registration: job.registration_plate,
        completedAt: job.completed_at || job.created_at,
        summary: job.mechanic_notes,
        imageCount: job.images?.length || 0,
        docType,
        price: job.price || undefined,
        isPaid: job.is_paid || false,
        parts: (job.parts || []).map((part: any) => ({
          name: part.name || part.part_name,
          costPrice: part.cost_price ?? part.cost,
          retailPrice: part.retail_price ?? part.price,
          quantity: part.quantity || 1,
        })),
      };

      const pdfRes = await fetch('/api/jobs/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const blob = await pdfRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${docType}-${job.registration_plate}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to download document:', err);
      alert('Error generating document download.');
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.registration_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.vehicle_make_model?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'in_progress') return matchesSearch && job.status === 'in_progress';
    if (activeTab === 'completed') return matchesSearch && job.status === 'completed';
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono tracking-wider uppercase">{garageName}</h1>
            <span className="text-xs text-neutral-400">Command Center</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/10 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Job</span>
          </button>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-red-400 bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 rounded-xl transition"
            title="Lock Terminal"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Lock Terminal</span>
          </button>
        </div>
      </header>

      {/* Main Command Center Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* Search and Tabs Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'in_progress' 
                  ? 'bg-amber-500 text-neutral-950 shadow' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              In Bay ({jobs.filter(j => j.status === 'in_progress').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'completed' 
                  ? 'bg-amber-500 text-neutral-950 shadow' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'all' 
                  ? 'bg-amber-500 text-neutral-950 shadow' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All Jobs
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search reg, make, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        {/* Jobs Grid / List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-neutral-500">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-12 text-center space-y-3">
            <Car className="w-10 h-10 text-neutral-600 mx-auto" />
            <h3 className="text-sm font-semibold text-neutral-300">No jobs found</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Get started by clicking "+ New Job" to assign a vehicle to an active bay.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredJobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-lg transition group space-y-4"
              >
                <div 
                  onClick={() => router.push(`/bay/${job.id}`)}
                  className="cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono tracking-widest text-amber-500 uppercase block">Reg Plate</span>
                      <h3 className="text-xl font-bold font-mono tracking-wider text-white mt-0.5">{job.registration_plate}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      job.status === 'in_progress' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {job.status === 'in_progress' ? 'In Progress' : 'Completed'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800">
                    <div className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{job.vehicle_make_model || 'Standard Vehicle'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 font-medium group-hover:translate-x-1 transition">
                      <span>Open Bay</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Always available download / document action triggers on every card */}
                <div className="flex items-center gap-2 pt-3 border-t border-neutral-800">
                  <button
                    onClick={() => handleDownloadCardDoc(job, 'report')}
                    className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <span>Report</span>
                  </button>
                  <button
                    onClick={() => handleDownloadCardDoc(job, 'invoice')}
                    className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Receipt className="w-3.5 h-3.5 text-amber-500" />
                    <span>Invoice</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* New Job Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">New Bay Job</h2>
                  <p className="text-xs text-neutral-400">Enter vehicle and initial parts details.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-neutral-400 hover:text-white text-sm font-medium"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Registration Plate *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ST07 FST"
                    value={regPlate}
                    onChange={(e) => setRegPlate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm font-mono uppercase text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Vehicle Make & Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ford Focus ST225"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="07123 456789"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                {/* Dynamic Parts Section */}
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Initial Parts / Items Used
                    </label>
                    <button
                      type="button"
                      onClick={handleAddPartRow}
                      className="flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Part</span>
                    </button>
                  </div>

                  {parts.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">No parts added yet. Click "+ Add Part" to itemize.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {parts.map((part, index) => (
                        <div key={index} className="flex items-center gap-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                          <input
                            type="text"
                            placeholder="Part Name / Description"
                            value={part.name}
                            onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price (£)"
                            value={part.retailPrice}
                            onChange={(e) => handlePartChange(index, 'retailPrice', e.target.value)}
                            className="w-20 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                          />
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={part.quantity}
                            onChange={(e) => handlePartChange(index, 'quantity', e.target.value)}
                            className="w-14 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 text-center"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePartRow(index)}
                            className="text-neutral-500 hover:text-red-400 p-1 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Bay...</span>
                    </>
                  ) : (
                    <span>Launch Bay & Start Job</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}