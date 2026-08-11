'use client';

import { useRouter } from 'next/navigation';
import { Car, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

interface JobCardProps {
  job: {
    id: string;
    registration_plate: string;
    vehicle_make_model?: string;
    customer_name?: string;
    status: 'in_progress' | 'completed';
  };
}

export default function JobCard({ job }: JobCardProps) {
  const router = useRouter();
  const isCompleted = job.status === 'completed';

  return (
    <div
      onClick={() => router.push(`/bay/${job.id}`)}
      className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-lg cursor-pointer transition group space-y-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-mono tracking-widest text-amber-500 uppercase block">Reg Plate</span>
          <h3 className="text-xl font-bold font-mono tracking-wider text-white mt-0.5">
            {job.registration_plate}
          </h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
            isCompleted
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}
        >
          {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5 animate-pulse" />}
          <span>{isCompleted ? 'Completed' : 'In Progress'}</span>
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
  );
}