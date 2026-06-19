import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { invalidateTransactionQueries } from '../lib/invalidateTransactions'

export interface RecategorizationStatus {
  running: boolean
  completed: boolean
  progress: number
  total: number
  processed: number
  patterns: string[]
  started_at?: string
  completed_at?: string
}

export function useRecategorizationStatus() {
  const qc = useQueryClient()
  const wasRunningRef = useRef(false)

  const { data } = useQuery<RecategorizationStatus>({
    queryKey: ['recategorization_status'],
    queryFn: () => api.get('/recategorization_status').then(r => r.data),
    refetchInterval: (query) => {
      const d = query.state.data
      return d?.running ? 2000 : false
    },
    staleTime: 0
  })

  // When job transitions running → completed, invalidate transactions so the
  // filter dropdown and table both reflect the newly re-tagged categories.
  useEffect(() => {
    if (wasRunningRef.current && data && !data.running && data.completed) {
      invalidateTransactionQueries(qc)
    }
    wasRunningRef.current = !!data?.running
  }, [data, qc])

  const dismissMutation = useMutation({
    mutationFn: () => api.delete('/recategorization_status'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recategorization_status'] })
  })

  const visible = !!(data?.running || data?.completed)

  return {
    status: data,
    visible,
    dismiss: () => dismissMutation.mutate()
  }
}
