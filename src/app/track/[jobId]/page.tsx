'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { 
  Camera, 
  CheckCircle2, 
  Wrench, 
  ArrowLeft, 
  Upload, 
  Loader2, 
  FileText,
  Car,
  Phone,
  User,
  Download,
  Receipt
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ActiveBayView() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [job, setJob] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mechanicNotes, setMechanicNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // New Export Options State
  const [docType, setDocType] = useState<'report' | 'invoice'>('report');
  const [price, setPrice] = useState('');
  const [isPaid, setIsPaid] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          images:job_images(*)
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;

      setJob(data);
      setMechanicNotes(data?.mechanic_notes || '');
      setImages(data?.images || []);
    } catch (err) {
      console.error('Error fetching active job:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${jobId}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('job-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('job-images')
        .getPublicUrl(filePath);

      const { data: imageRecord, error: dbError } = await supabase
        .from('job_images')
        .insert([
          { job_id: jobId, image_url: publicUrl, caption: 'Bay inspection photo' }
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      setImages((prev) => [imageRecord, ...prev]);
    } catch (err) {
      console.error('Failed to upload photo:', err);
      alert('Error uploading photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      const { error } = await supabase
        .from('jobs')
        .update({ mechanic_notes: mechanicNotes })
        .eq('id', jobId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const executeCompletion = async (downloadOnly = false) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/jobs/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to complete job');

      // Generate document payload with dynamic invoice configurations
      const payload = {
        ...result.data,
        docType,
        price: price.trim() !== '' ? price : undefined,
        isPaid: docType === 'invoice' ? isPaid : undefined,
      };

      const pdfRes = await fetch('/api/jobs/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const blob = await pdfRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Trigger direct file download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${docType}-${job?.registration_plate || 'document'}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      if (!downloadOnly) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Completion error:', err);
      alert(err.message || 'Error finalizing job.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-36">
      <header className="sticky top-0 z-20 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => router.push('/dashboard')}
          className="p-2 text-neutral-400 hover:text-white transition rounded-lg hover:bg-neutral-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <span className="text-xs font-mono tracking-widest text-amber-500 uppercase block">Active Bay</span>
          <h1 className="text-lg font-bold font-mono tracking-wider">{job?.registration_plate}</h1>
        </div>
        <div className="w-9" />
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-300">
              <Car className="w-4 h-4 text-amber-500" />
              <span className="font-medium text-sm">{job?.vehicle_make_model || 'Standard Vehicle'}</span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              In Progress
            </span>
          </div>

          <div className="border-t border-neutral-800 pt-3 flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-neutral-500" />
              <span>{job?.customer_name || 'No Name Provided'}</span>
            </div>
            {job?.customer_phone && (
              <a href={`tel:${job.customer_phone}`} className="flex items-center gap-1 text-amber-400 hover:underline">
                <Phone className="w-3.5 h-3.5" />
                <span>Call Customer</span>
              </a>
            )}
          </div>
        </motion.div>

        {/* Document Format & Financials Configuration */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg space-y-4">
          <label className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" />
            Document Output Settings
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDocType('report')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${docType === 'report' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-neutral-950 border-neutral-800 text-neutral-400'}`}
            >
              Job Details Report
            </button>
            <button
              type="button"
              onClick={() => setDocType('invoice')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${docType === 'invoice' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-neutral-950 border-neutral-800 text-neutral-400'}`}
            >
              Commercial Invoice
            </button>
          </div>

          {docType === 'invoice' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Total Price Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 150.00 (leave blank to omit)"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-sm text-neutral-100 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
              <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 p-3 rounded-xl">
                <span className="text-xs text-neutral-300 font-medium">Payment Status</span>
                <button
                  type="button"
                  onClick={() => setIsPaid(!isPaid)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${isPaid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}
                >
                  {isPaid ? 'Paid' : 'Unpaid / Due'}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              Bay Work Log & Notes
            </label>
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium transition disabled:opacity-50"
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
          <textarea
            value={mechanicNotes}
            onChange={(e) => setMechanicNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Type findings, parts replaced, or advisories..."
            rows={4}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition resize-none"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-500" />
              Inspection Photos ({images.length})
            </h3>
          </div>

          <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-2xl bg-neutral-900/50 hover:bg-neutral-900 cursor-pointer transition group">
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-amber-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs font-medium">Uploading photo...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-400 group-hover:text-neutral-200">
                <div className="p-3 rounded-full bg-neutral-800 group-hover:bg-amber-500/10 group-hover:text-amber-400 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold">Tap to snap or upload bay photo</span>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handlePhotoUpload} 
              disabled={uploading}
              className="hidden" 
            />
          </label>

          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900">
                  <img src={img.image_url} alt="Bay inspection" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-neutral-950/90 backdrop-blur-md border-t border-neutral-800 max-w-md mx-auto space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => executeCompletion(true)}
            disabled={submitting}
            className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download Copy</span>
          </button>
          <button
            onClick={() => executeCompletion(false)}
            disabled={submitting}
            className="py-3 px-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Done & Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}