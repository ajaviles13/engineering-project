import type { QueryClient } from '@tanstack/react-query'

/** Refresh transaction lists and dashboard stats after any data mutation. */
export function invalidateTransactionQueries(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' })
  void qc.invalidateQueries({ queryKey: ['review-transactions'], refetchType: 'all' })
  void qc.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' })
}
