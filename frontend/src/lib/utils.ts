import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const ANOMALY_LABELS: Record<string, string> = {
  missing_description: 'Missing Description',
  missing_amount: 'Missing Transaction Amount',
  duplicate: 'Potential Duplicates',
  unusual_amount: 'High Transaction Amount',
  suspicious_round: 'Suspicious Round Amount',
  rules_conflict: 'Custom Rule Conflict'
}

export const ANOMALY_COLORS: Record<string, string> = {
  missing_description: 'bg-yellow-100 text-yellow-800',
  missing_amount: 'bg-orange-100 text-orange-800',
  duplicate: 'bg-orange-100 text-orange-800',
  unusual_amount: 'bg-red-100 text-red-800',
  suspicious_round: 'bg-purple-100 text-purple-800',
  rules_conflict: 'bg-rose-100 text-rose-800'
}
