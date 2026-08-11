import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to combine Tailwind CSS classes safely using clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format standard UK registration plates into clean uppercase with proper spacing (e.g. AB12 CDE).
 */
export function formatRegPlate(plate: string): string {
  if (!plate) return '';
  const cleaned = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 7) {
    return `${cleaned.slice(0, cleaned.length - 3)} ${cleaned.slice(-3)}`;
  }
  return cleaned;
}

/**
 * Format timestamps into friendly relative or absolute dates.
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}