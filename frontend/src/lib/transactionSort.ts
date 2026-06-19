import type { TransactionSort, TransactionSortCursor } from '../types'

export const DEFAULT_TRANSACTION_SORT: TransactionSort = {
  sortBy: 'date',
  sortDir: 'desc'
}

export function toggleTransactionSort(current: TransactionSort, column: string): TransactionSort {
  return {
    sortBy: column,
    sortDir: current.sortBy === column && current.sortDir === 'desc' ? 'asc' : 'desc'
  }
}

export function buildTransactionQueryParams(
  base: Record<string, unknown>,
  sort: TransactionSort,
  cursor?: TransactionSortCursor | null
) {
  const params: Record<string, unknown> = {
    ...base,
    sort_by: sort.sortBy,
    sort_dir: sort.sortDir
  }

  if (cursor) {
    params.cursor_id = cursor.id
    params.cursor_sort_value = cursor.sort_value
    params.cursor_sort_by = cursor.sort_by
    params.cursor_sort_dir = cursor.sort_dir
  }

  return params
}
