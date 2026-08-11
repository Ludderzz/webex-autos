'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Car, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: () => void;
}

export default function NewJobModal({ isOpen, onClose, onJobCreated }: NewJobModalProps) {
  const router = useRouter();

  const [regPlate, setRegPlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPlate) return;

    try {
      setSubmitting(true);
      // Hardcoded default garage ID for MVP demo local testing
      const defaultGarageId = '00000000-0000-0000-0000-000000000001';

      const res = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationPlate: regPlate,
          vehicleMakeModel: vehicleModel,
          customerName,
          customerPhone,
          customerEmail,
          garageId: defaultGarageId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create job');

      // Reset form fields
      setRegPlate('');
      setVehicleModel('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');

      onClose();
      if (onJobCreated) onJobCreated();

      // Route straight into the active bay view
      router.push(`/bay/${data.job.id}`);
    } catch (err: any) {
      console.error('Error creating job:', err);
      alert(err.message || 'Error creating job record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">New Bay Job</h2>
                <p className="text-xs text-neutral-400">Initialize a fresh vehicle repair session.</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white transition rounded-xl hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl shadow-lg shadow-amber-500/10 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Spinning Up Bay...</span>
                </>
              ) : (
                <span>Launch Bay & Start Job</span>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}