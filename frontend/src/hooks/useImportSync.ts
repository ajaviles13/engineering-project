import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Import } from '../types'
import { invalidateTransactionQueries } from '../lib/invalidateTransactions'

export type ImportCompletionNotice = {
  filename: string
  row_count: number
  error_count: number
  status: 'completed' | 'failed'
}

function completionNotice(imp: Import): ImportCompletionNotice {
  return {
    filename: imp.filename,
    row_count: imp.row_count,
    error_count: imp.error_count,
    status: imp.status as 'completed' | 'failed'
  }
}

function isFinishedStatus(status: string) {
  return status === 'completed' || status === 'failed'
}

/** Polls import status app-wide and refreshes transactions/dashboard when a job finishes. */
export function useImportSync() {
  const qc = useQueryClient()
  const prevStatuses = useRef(new Map<number, string>())
  const handledCompletions = useRef(new Set<number>())
  const initialSnapshot = useRef<Map<number, string> | null>(null)
  const [notice, setNotice] = useState<ImportCompletionNotice | null>(null)

  const { data, isLoading } = useQuery<{ imports: Import[] }>({
    queryKey: ['imports'],
    queryFn: () => api.get('/imports').then(r => r.data),
    refetchInterval: (query) => {
      const hasInProgress = query.state.data?.imports.some(i =>
        ['pending', 'processing'].includes(i.status)
      )
      return hasInProgress ? 2000 : false
    }
  })

  const imports = data?.imports ?? []

  useEffect(() => {
    if (isLoading) return

    if (!initialSnapshot.current) {
      initialSnapshot.current = new Map(imports.map(imp => [imp.id, imp.status]))
      imports.forEach(imp => {
        if (isFinishedStatus(imp.status)) {
          handledCompletions.current.add(imp.id)
        }
        prevStatuses.current.set(imp.id, imp.status)
      })
      return
    }

    imports.forEach(imp => {
      const initialStatus = initialSnapshot.current!.get(imp.id)
      const isFinished = isFinishedStatus(imp.status)

      if (isFinished && !handledCompletions.current.has(imp.id)) {
        const wasCompletedAtLoad = initialStatus !== undefined && isFinishedStatus(initialStatus)

        if (!wasCompletedAtLoad) {
          invalidateTransactionQueries(qc)
          setNotice(completionNotice(imp))
        }

        handledCompletions.current.add(imp.id)
      }

      if (initialStatus === undefined && !isFinished) {
        initialSnapshot.current!.set(imp.id, imp.status)
      }

      prevStatuses.current.set(imp.id, imp.status)
    })
  }, [imports, isLoading, qc])

  return {
    imports,
    isLoading,
    notice,
    dismissNotice: () => setNotice(null)
  }
}
