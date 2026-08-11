import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { Car, CheckCircle2, FileText, Camera, Wrench, Info } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default async function CustomerJobView({ 
  params 
}: { 
  params: Promise<{ token: string }> 
}) {
  const resolvedParams = await params;
  const token = resolvedParams.token;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      *,
      images:job_images(*),
      job_parts(*)
    `)
    .eq('share_token', token)
    .single();

  if (error || !job) {
    notFound();
  }

  const isCompleted = job.status === 'completed';
  const parts = job.job_parts || [];
  const images = job.images || [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-16">
      <header className="bg-neutral-900 border-b border-neutral-800 px-4 py-4 text-center">
        <span className="text-xs font-mono tracking-widest text-amber-500 uppercase block mb-1">
          Vehicle Service Portal
        </span>
        <h1 className="text-xl font-bold font-mono tracking-wider">{job.registration_plate}</h1>
        <p className="text-xs text-neutral-400 mt-1">{job.vehicle_make_model || 'Vehicle Inspection Report'}</p>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Status Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium text-neutral-200">Current Status</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
            {isCompleted ? 'Completed' : 'In Progress'}
          </span>
        </div>

        {/* Informational Banner */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 space-y-1">
            <span className="font-semibold block text-amber-400">Live Service Updates</span>
            <p>This page updates dynamically as work progresses on your vehicle. Check back here for real-time inspection notes and media.</p>
          </div>
        </div>

        {/* Parts & Labour Summary */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg space-y-3">
          <label className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-500" />
            Parts & Services Breakdown
          </label>

          <div className="space-y-2 pt-1">
            {parts.length > 0 ? (
              parts.map((part: any, index: number) => (
                <div key={part.id || index} className="flex items-center justify-between bg-neutral-950 border border-neutral-800 p-2.5 rounded-xl text-xs">
                  <div>
                    <span className="font-medium text-neutral-200 block">{part.name}</span>
                    <span className="text-neutral-500 text-[10px]">Qty: {part.quantity || 1}</span>
                  </div>
                  <span className="text-amber-400 font-mono">
                    £{((parseFloat(part.retail_price || '0')) * (part.quantity || 1)).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500 italic">No parts or services logged yet.</p>
            )}

            {job.labour_charge > 0 && (
              <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 p-2.5 rounded-xl text-xs">
                <span className="font-medium text-neutral-200">Labour Charge</span>
                <span className="text-amber-400 font-mono">£{parseFloat(job.labour_charge).toFixed(2)}</span>
              </div>
            )}
          </div>

          {job.total_price > 0 && (
            <div className="border-t border-neutral-800 pt-3 flex items-center justify-between text-sm font-bold">
              <span className="text-neutral-200">Total Price</span>
              <span className="text-amber-400 font-mono text-base">£{parseFloat(job.total_price).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Mechanic Notes / Summary */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg space-y-2">
          <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            Service Notes & Advisories
          </h3>
          {job.mechanic_notes ? (
            <p className="text-xs text-neutral-300 bg-neutral-950 border border-neutral-800 p-3 rounded-xl whitespace-pre-wrap leading-relaxed">
              {job.mechanic_notes}
            </p>
          ) : (
            <div className="bg-neutral-950 border border-neutral-800 border-dashed p-6 rounded-xl text-center">
              <p className="text-xs text-neutral-500 italic">Notes will update here</p>
            </div>
          )}
        </div>

        {/* Inspection Photos */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-500" />
            Inspection Photos ({images.length})
          </h3>
          {images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {images.map((img: any) => (
                <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900">
                  <img src={img.image_url} alt="Inspection view" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 border-dashed p-8 rounded-2xl text-center">
              <Camera className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs text-neutral-500 italic">Images will update here</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}