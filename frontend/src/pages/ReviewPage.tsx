import { useState } from 'react'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import type { Transaction, Category, PaginatedTransactions, TransactionSort, TransactionSortCursor } from '../types'
import TransactionTable from '../components/TransactionTable'
import BulkActionToolbar from '../components/BulkActionToolbar'
import EditTransactionModal from '../components/EditTransactionModal'
import { useRuleSetCategories } from '../hooks/useRuleSetCategories'
import { mergeCategoryOptions } from '../lib/categoryStyles'
import { invalidateTransactionQueries } from '../lib/invalidateTransactions'
import { buildTransactionQueryParams, DEFAULT_TRANSACTION_SORT, toggleTransactionSort } from '../lib/transactionSort'
import RecategorizationBanner from '../components/RecategorizationBanner'
import { useRecategorizationStatus } from '../hooks/useRecategorizationStatus'

export default function ReviewPage() {
  const [searchParams] = useSearchParams()
  const filter = searchParams.get('filter') ?? 'all'
  const { status: recatStatus, visible: recatVisible, dismiss: recatDismiss } = useRecategorizationStatus()
  const qc = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [sort, setSort] = useState<TransactionSort>(DEFAULT_TRANSACTION_SORT)

  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data)
  })
  const categories = categoriesData?.categories ?? []
  const { parentCategories, categoryOptions } = useRuleSetCategories()
  const bulkCategoryOptions = mergeCategoryOptions(categoryOptions, categories)

  const queryParams =
    filter === 'flagged' ? { flagged: 'true' }
    : filter === 'uncategorized' ? { uncategorized: 'true' }
    : filter === 'pending' ? { status: 'pending' }
    : { needs_review: 'true' }

  const filterTabs = [
    ['all', 'All'],
    ['pending', 'Pending Review'],
    ['flagged', 'Flagged'],
    ['uncategorized', 'Uncategorized']
  ] as const

  const titles: Record<string, string> = {
    all: 'All Review Items',
    pending: 'Pending Review',
    flagged: 'Flagged Transactions',
    uncategorized: 'Uncategorized Transactions'
  }

  const subtitles: Record<string, string> = {
    all: 'transactions requiring attention',
    pending: 'pending transactions',
    flagged: 'flagged transactions',
    uncategorized: 'uncategorized transactions'
  }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<PaginatedTransactions>({
    queryKey: ['review-transactions', filter, sort],
    queryFn: ({ pageParam }) => {
      const params = buildTransactionQueryParams(
        { ...queryParams },
        sort,
        pageParam as TransactionSortCursor | null
      )
      return api.get('/transactions', { params }).then(r => r.data)
    },
    initialPageParam: null as TransactionSortCursor | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined
  })

  const transactions = data?.pages.flatMap(p => p.transactions) ?? []
  const totalCount = data?.pages[0]?.total_count

  const invalidate = () => invalidateTransactionQueries(qc)

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Transaction> }) => api.patch(`/transactions/${id}`, { transaction: patch }),
    onSuccess: invalidate
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/transactions/${id}`),
    onSuccess: invalidate
  })

  const bulkMutation = useMutation({
    mutationFn: (payload: { ids: number[]; action_type: string; category?: string }) => api.patch('/transactions/bulk', payload),
    onSuccess: () => { setSelectedIds(new Set()); invalidate() }
  })

  const handleToggle = (id: number) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const handleToggleAll = (ids: number[]) => setSelectedIds(prev => prev.size === ids.length ? new Set() : new Set(ids))

  return (
    <div className="w-full">
      {recatVisible && recatStatus && (
        <RecategorizationBanner status={recatStatus} onDismiss={recatDismiss} />
      )}
      <div className="p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">{titles[filter] ?? 'Review'}</h2>
        <p className="text-sm text-gray-500">
          {isLoading && totalCount == null
            ? 'Loading...'
            : `${(totalCount ?? 0).toLocaleString()} ${subtitles[filter] ?? 'transactions'}`}
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        {filterTabs.map(([f, label]) => (
          <a
            key={f}
            href={`/review?filter=${f}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {label}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <>
            <TransactionTable
              transactions={transactions}
              categories={categories}
              parentCategories={parentCategories}
              categoryOptions={categoryOptions}
              selectedIds={selectedIds}
              sort={sort}
              onSort={(column) => setSort(current => toggleTransactionSort(current, column))}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
              onUpdate={(id, patch) => updateMutation.mutate({ id, patch })}
              onEdit={setEditingTransaction}
            />
            {hasNextPage && (
              <div className="p-4 text-center border-t border-gray-100">
                <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="text-sm text-indigo-600 hover:underline disabled:opacity-50">
                  {isFetchingNextPage ? 'Loading more...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <BulkActionToolbar
        selectedCount={selectedIds.size}
        parentCategories={parentCategories}
        categoryOptions={bulkCategoryOptions}
        onBulkCategorize={(category) => bulkMutation.mutate({ ids: [...selectedIds], action_type: 'categorize', category })}
        onBulkApprove={() => bulkMutation.mutate({ ids: [...selectedIds], action_type: 'approve' })}
        onBulkDelete={() => bulkMutation.mutate({ ids: [...selectedIds], action_type: 'delete' })}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          categories={categories}
          parentCategories={parentCategories}
          categoryOptions={categoryOptions}
          onClose={() => setEditingTransaction(null)}
          onSave={async (patch) => {
            await updateMutation.mutateAsync({ id: editingTransaction.id, patch })
          }}
          onDelete={async () => {
            await deleteMutation.mutateAsync(editingTransaction.id)
          }}
        />
      )}
      </div>
    </div>
  )
}
