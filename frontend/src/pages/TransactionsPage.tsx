import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Transaction, Category, PaginatedTransactions, TransactionFilters, TransactionSort, TransactionSortCursor, TransactionPageSize } from '../types'
import { DEFAULT_TRANSACTION_PAGE_SIZE, TRANSACTION_PAGE_SIZE_OPTIONS } from '../types'
import TransactionTable from '../components/TransactionTable'
import BulkActionToolbar from '../components/BulkActionToolbar'
import AddTransactionModal from '../components/AddTransactionModal'
import EditTransactionModal from '../components/EditTransactionModal'
import StatusFilterPicker from '../components/StatusFilterPicker'
import CategoryPicker from '../components/CategoryPicker'
import { useRuleSetCategories } from '../hooks/useRuleSetCategories'
import { mergeCategoryOptions } from '../lib/categoryStyles'
import { invalidateTransactionQueries } from '../lib/invalidateTransactions'
import { buildTransactionQueryParams, DEFAULT_TRANSACTION_SORT, toggleTransactionSort } from '../lib/transactionSort'
import { Search, Plus, RefreshCw, FileText, X } from 'lucide-react'
import RecategorizationBanner from '../components/RecategorizationBanner'
import { useRecategorizationStatus } from '../hooks/useRecategorizationStatus'

export default function TransactionsPage() {
  const qc = useQueryClient()
  const { status: recatStatus, visible: recatVisible, dismiss: recatDismiss } = useRecategorizationStatus()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<TransactionFilters>(() => {
    const category = searchParams.get('category') ?? undefined
    const import_file = searchParams.get('import_file') ?? undefined
    return { ...(category ? { category } : {}), ...(import_file ? { import_file } : {}) }
  })

  useEffect(() => {
    const category = searchParams.get('category') ?? undefined
    const import_file = searchParams.get('import_file') ?? undefined
    setFilters(f => {
      if (f.category === category && f.import_file === import_file) return f
      return { ...f, category, import_file }
    })
  }, [searchParams])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [sort, setSort] = useState<TransactionSort>(DEFAULT_TRANSACTION_SORT)
  const [pageSize, setPageSize] = useState<TransactionPageSize>(DEFAULT_TRANSACTION_PAGE_SIZE)

  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data)
  })
  const categories = categoriesData?.categories ?? []
  const { parentCategories, categoryOptions } = useRuleSetCategories()
  const filterCategoryOptions = mergeCategoryOptions(categoryOptions, categories)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useInfiniteQuery<PaginatedTransactions>({
    queryKey: ['transactions', filters, sort, pageSize],
    queryFn: ({ pageParam }) => {
      const params = buildTransactionQueryParams(
        { ...filters, per_page: pageSize },
        sort,
        pageParam as TransactionSortCursor | null
      )
      return api.get('/transactions', { params }).then(r => r.data)
    },
    initialPageParam: null as TransactionSortCursor | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined
  })

  const transactions = data?.pages.flatMap(p => p.transactions) ?? []

  const invalidate = () => invalidateTransactionQueries(qc)

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Transaction> }) =>
      api.patch(`/transactions/${id}`, { transaction: patch }),
    onSuccess: invalidate
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/transactions/${id}`),
    onSuccess: invalidate
  })

  const bulkMutation = useMutation({
    mutationFn: (payload: { ids: number[]; action_type: string; category?: string }) =>
      api.patch('/transactions/bulk', payload),
    onSuccess: () => {
      setSelectedIds(new Set())
      invalidate()
    }
  })

  const handleToggle = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleToggleAll = useCallback((ids: number[]) => {
    setSelectedIds(prev => prev.size === ids.length ? new Set() : new Set(ids))
  }, [])

  return (
    <div className="w-full">
      {recatVisible && recatStatus && (
        <RecategorizationBanner status={recatStatus} onDismiss={recatDismiss} />
      )}
      <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Transactions</h2>
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value) as TransactionPageSize)}
            className="mt-1 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          >
            {TRANSACTION_PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size} records per page</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"><RefreshCw size={16} /></button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus size={15} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search size={15} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search descriptions..."
            value={filters.search ?? ''}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined }))}
            className="text-sm flex-1 focus:outline-none"
          />
        </div>
        <StatusFilterPicker
          value={filters.status ?? ''}
          onChange={status => setFilters(f => ({ ...f, status }))}
        />
        <CategoryPicker
          mode="filter"
          value={filters.category ?? null}
          parentCategories={parentCategories}
          categoryOptions={filterCategoryOptions}
          categories={categories}
          onChange={category => setFilters(f => ({ ...f, category: category ?? undefined }))}
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={!!filters.flagged} onChange={e => setFilters(f => ({ ...f, flagged: e.target.checked || undefined }))} className="rounded" />
          Flagged only
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={!!filters.uncategorized} onChange={e => setFilters(f => ({ ...f, uncategorized: e.target.checked || undefined }))} className="rounded" />
          Uncategorized only
        </label>
        {filters.import_file && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
            <FileText size={11} />
            {filters.import_file}
            <button
              onClick={() => setFilters(f => ({ ...f, import_file: undefined }))}
              className="ml-0.5 rounded p-0.5 hover:bg-indigo-200 transition-colors"
              aria-label="Clear source file filter"
            >
              <X size={10} />
            </button>
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading transactions...</div>
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
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-sm text-indigo-600 hover:underline disabled:opacity-50"
                >
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
        categoryOptions={filterCategoryOptions}
        onBulkCategorize={(category) => bulkMutation.mutate({ ids: [...selectedIds], action_type: 'categorize', category })}
        onBulkApprove={() => bulkMutation.mutate({ ids: [...selectedIds], action_type: 'approve' })}
        onBulkDelete={() => bulkMutation.mutate({ ids: [...selectedIds], action_type: 'delete' })}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {showAddModal && (
        <AddTransactionModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onCreated={() => { invalidate(); setShowAddModal(false) }}
        />
      )}

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
