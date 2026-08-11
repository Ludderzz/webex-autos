'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { 
  Camera, 
  CheckCircle2, 
  ArrowLeft, 
  Upload, 
  Loader2, 
  FileText,
  Car,
  Phone,
  User,
  Download,
  Receipt,
  Lock,
  MessageSquare,
  Plus,
  Trash2,
  Wrench,
  Share2
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PartItem {
  id?: string;
  name: string;
  retail_price: string;
  cost_price: string;
  quantity: number;
}

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

  const [docType, setDocType] = useState<'report' | 'invoice'>('report');
  const [price, setPrice] = useState('');
  const [isPaid, setIsPaid] = useState(false);

  // Parts and Pricing states matching schema: name, cost_price, retail_price, quantity
  const [parts, setParts] = useState<PartItem[]>([]);
  const [newPartName, setNewPartName] = useState('');
  const [newPartRetailPrice, setNewPartRetailPrice] = useState('');
  const [newPartCostPrice, setNewPartCostPrice] = useState('');
  const [newPartQuantity, setNewPartQuantity] = useState('1');
  const [labourCharge, setLabourCharge] = useState('');
  const [savingParts, setSavingParts] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);

      // 1. Get current user & their garage_id to scope the security boundary
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('garage_id')
        .eq('id', user.id)
        .single();

      if (!profile?.garage_id) throw new Error('No garage assigned');

      // 2. Fetch the job scoped strictly to this garage and ID
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          images:job_images(*),
          job_parts(*)
        `)
        .eq('id', jobId)
        .eq('garage_id', profile.garage_id)
        .single();

      if (error) throw error;
      if (!data) {
        router.push('/dashboard');
        return;
      }

      setJob(data);
      setMechanicNotes(data?.mechanic_notes || '');
      setImages(data?.images || []);
      setLabourCharge(data?.labour_charge?.toString() || '');
      setPrice(data?.total_price?.toString() || '');
      
      if (data?.job_parts && data.job_parts.length > 0) {
        const formattedParts = data.job_parts.map((p: any) => ({
          id: p.id,
          name: p.name || '',
          retail_price: p.retail_price?.toString() || '',
          cost_price: p.cost_price?.toString() || '',
          quantity: p.quantity ?? 1
        }));
        setParts(formattedParts);
      }
    } catch (err) {
      console.error('Error fetching active job:', err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = job?.status === 'completed';

  const copyShareLink = () => {
    const token = job?.share_token || jobId;
    const link = `${window.location.origin}/api/${token}`;
    navigator.clipboard.writeText(link);
    alert('Customer share link copied to clipboard!');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCompleted) return;
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${jobId}/${Math.random()}.${fileExt}`;

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
      alert('Error uploading photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (isCompleted) return;
    try {
      setSavingNotes(true);
      await supabase
        .from('jobs')
        .update({ mechanic_notes: mechanicNotes })
        .eq('id', jobId);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const recalculateTotal = async (currentParts: PartItem[], currentLabour: string) => {
    const partsSum = currentParts.reduce((acc, p) => {
      const priceVal = parseFloat(p.retail_price);
      const safePrice = isNaN(priceVal) ? 0 : priceVal;
      const qtyVal = p.quantity || 1;
      return acc + (safePrice * qtyVal);
    }, 0);
    
    const labourNum = parseFloat(currentLabour);
    const safeLabour = isNaN(labourNum) ? 0 : labourNum;
    
    const computedTotal = (partsSum + safeLabour).toFixed(2);
    setPrice(computedTotal);

    await supabase
      .from('jobs')
      .update({ 
        labour_charge: safeLabour,
        total_price: parseFloat(computedTotal)
      })
      .eq('id', jobId);
  };

  const handleAddPart = async () => {
    if (isCompleted || !newPartName.trim()) return;
    try {
      setSavingParts(true);
      const retailNum = newPartRetailPrice ? parseFloat(newPartRetailPrice) : 0;
      const costNum = newPartCostPrice ? parseFloat(newPartCostPrice) : 0;
      const qtyNum = newPartQuantity ? parseInt(newPartQuantity, 10) : 1;

      const { data, error } = await supabase
        .from('job_parts')
        .insert([
          {
            job_id: jobId,
            name: newPartName.trim(),
            retail_price: isNaN(retailNum) ? 0 : retailNum,
            cost_price: isNaN(costNum) ? 0 : costNum,
            quantity: isNaN(qtyNum) ? 1 : qtyNum
          }
        ])
        .select()
        .single();

      if (error) throw error;

      const updatedParts = [...parts, { 
        id: data.id, 
        name: data.name, 
        retail_price: data.retail_price?.toString() || '', 
        cost_price: data.cost_price?.toString() || '',
        quantity: data.quantity ?? 1
      }];
      
      setParts(updatedParts);
      setNewPartName('');
      setNewPartRetailPrice('');
      setNewPartCostPrice('');
      setNewPartQuantity('1');
      await recalculateTotal(updatedParts, labourCharge);
    } catch (err) {
      console.error('Failed to add part:', err);
      alert('Error adding part');
    } finally {
      setSavingParts(false);
    }
  };

  const handleRemovePart = async (partId?: string, index?: number) => {
    if (isCompleted) return;
    try {
      setSavingParts(true);
      if (partId) {
        const { error } = await supabase.from('job_parts').delete().eq('id', partId);
        if (error) throw error;
      }

      const updatedParts = parts.filter((_, i) => i !== index);
      setParts(updatedParts);
      await recalculateTotal(updatedParts, labourCharge);
    } catch (err) {
      console.error('Failed to remove part:', err);
    } finally {
      setSavingParts(false);
    }
  };

  const handleLabourChange = async (val: string) => {
    setLabourCharge(val);
    await recalculateTotal(parts, val);
  };

  const executeCompletion = async (downloadOnly = false) => {
    try {
      setSubmitting(true);
      
      let reportData = {
        jobId: job.id,
        registration: job.registration_plate,
        completedAt: job.completed_at || new Date().toISOString(),
        summary: mechanicNotes,
        imageCount: images.length,
        parts: parts,
        labourCharge: labourCharge,
      };

      if (!isCompleted) {
        const res = await fetch('/api/jobs/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, parts, labourCharge, totalPrice: price }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to complete job');
        reportData = result.data;
      }

      const payload = {
        ...reportData,
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
      <header className="sticky top-0 z-20 bg-neutral-900/85 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => router.push('/dashboard')}
          className="p-2 text-neutral-400 hover:text-white transition rounded-lg hover:bg-neutral-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <span className="text-xs font-mono tracking-widest text-amber-500 uppercase block">
            {isCompleted ? 'Archived Job Record' : 'Active Bay'}
          </span>
          <h1 className="text-lg font-bold font-mono tracking-wider">{job?.registration_plate}</h1>
        </div>
        <button
          type="button"
          onClick={copyShareLink}
          className="p-2 text-amber-400 hover:text-amber-300 transition rounded-lg hover:bg-neutral-800"
          title="Copy Customer Share Link"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {isCompleted && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-3 text-amber-400 text-xs font-semibold">
            <Lock className="w-4 h-4 shrink-0" />
            <span>This job is completed and locked. You can download documents below.</span>
          </div>
        )}

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
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
              {isCompleted ? 'Completed' : 'In Progress'}
            </span>
          </div>

          <div className="border-t border-neutral-800 pt-3 flex flex-col gap-2 text-xs text-neutral-400">
            <div className="flex items-center justify-between">
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
            {job?.customer_phone && (
              <div className="flex items-center justify-end">
                <a 
                  href={`sms:${job.customer_phone}?body=${encodeURIComponent(`Hi ${job.customer_name || ''}, regarding your vehicle (${job.registration_plate}): `)}`} 
                  className="flex items-center gap-1 text-amber-400 hover:underline"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Text Customer</span>
                </a>
              </div>
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
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Total Calculated Price (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 150.00"
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
            </div>
          )}
        </div>

        {/* Parts & Labour Management */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg space-y-4">
          <label className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-500" />
            Parts & Labour breakdown
          </label>

          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block">Labour Charge (£)</label>
            <input
              type="number"
              step="0.01"
              value={labourCharge}
              onChange={(e) => handleLabourChange(e.target.value)}
              disabled={isCompleted}
              placeholder="0.00"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-sm text-neutral-100 focus:outline-none focus:border-amber-500 transition disabled:opacity-60"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <span className="text-xs font-semibold text-neutral-300 block">Parts Used</span>
            
            {parts.length > 0 ? (
              <div className="space-y-2">
                {parts.map((part, index) => (
                  <div key={part.id || index} className="flex items-center justify-between bg-neutral-950 border border-neutral-800 p-2.5 rounded-xl text-xs">
                    <div>
                      <span className="font-medium text-neutral-200 block">{part.name}</span>
                      <span className="text-neutral-500 text-[10px]">Qty: {part.quantity || 1} {part.cost_price ? `• Cost: £${parseFloat(part.cost_price).toFixed(2)}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 font-mono">£{((parseFloat(part.retail_price || '0')) * (part.quantity || 1)).toFixed(2)}</span>
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleRemovePart(part.id, index)}
                          disabled={savingParts}
                          className="text-neutral-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 italic">No parts added yet.</p>
            )}

            {!isCompleted && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  placeholder="Part name (e.g. Brake Pads)"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={newPartRetailPrice}
                    onChange={(e) => setNewPartRetailPrice(e.target.value)}
                    placeholder="Retail (£)"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newPartCostPrice}
                    onChange={(e) => setNewPartCostPrice(e.target.value)}
                    placeholder="Cost (£)"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition"
                  />
                  <input
                    type="number"
                    value={newPartQuantity}
                    onChange={(e) => setNewPartQuantity(e.target.value)}
                    placeholder="Qty"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPart}
                  disabled={savingParts || !newPartName.trim()}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Part</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              Bay Work Log & Notes
            </label>
            {!isCompleted && (
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium transition disabled:opacity-50"
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            )}
          </div>
          <textarea
            value={mechanicNotes}
            onChange={(e) => setMechanicNotes(e.target.value)}
            onBlur={handleSaveNotes}
            disabled={isCompleted}
            placeholder="Type findings, parts replaced, or advisories..."
            rows={4}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition resize-none disabled:opacity-60"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-500" />
              Inspection Photos ({images.length})
            </h3>
          </div>

          {!isCompleted && (
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
          )}

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
          {!isCompleted ? (
            <button
              onClick={() => executeCompletion(false)}
              disabled={submitting}
              className="py-3 px-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Done & Close</span>
            </button>
          ) : (
            <button
              onClick={() => router.push('/dashboard')}
              className="py-3 px-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs"
            >
              <span>Back to Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}