import type { Transaction, Category, TransactionSort } from '../types'
import AnomalyBadge from './AnomalyBadge'
import CategoryPicker from './CategoryPicker'
import StatusFilterPicker from './StatusFilterPicker'
import { formatCurrency, formatDate, cn } from '../lib/utils'
import { ArrowDown, ArrowUp, ArrowUpDown, FileText, Pencil } from 'lucide-react'

function formatUtcIso(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    })
  } catch {
    return iso
  }
}

const SORTABLE_COLUMNS: { key: string; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created (UTC)' }
]

interface Props {
  transactions: Transaction[]
  categories: Category[]
  parentCategories: string[]
  categoryOptions?: string[]
  selectedIds: Set<number>
  sort: TransactionSort
  onSort: (column: string) => void
  onToggle: (id: number) => void
  onToggleAll: (ids: number[]) => void
  onUpdate: (id: number, patch: Partial<Transaction>) => void
  onEdit?: (transaction: Transaction) => void
}

function SortableHeader({
  label,
  column,
  sort,
  onSort
}: {
  label: string
  column: string
  sort: TransactionSort
  onSort: (column: string) => void
}) {
  const active = sort.sortBy === column
  const Icon = active ? (sort.sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        'inline-flex items-center gap-1 font-medium transition-colors hover:text-gray-900',
        active ? 'text-indigo-600' : 'text-gray-600'
      )}
    >
      {label}
      <Icon size={14} className={cn(active ? 'text-indigo-500' : 'text-gray-400')} />
    </button>
  )
}

export default function TransactionTable({
  transactions,
  categories,
  parentCategories,
  categoryOptions = [],
  selectedIds,
  sort,
  onSort,
  onToggle,
  onToggleAll,
  onUpdate,
  onEdit
}: Props) {
  const allSelected = transactions.length > 0 && transactions.every(t => selectedIds.has(t.id))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left">
            <th className="w-16 px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleAll(transactions.map(t => t.id))}
                className="rounded"
              />
            </th>
            {SORTABLE_COLUMNS.map(({ key, label }) => (
              <th key={key} className="px-4 py-3">
                <SortableHeader label={label} column={key} sort={sort} onSort={onSort} />
              </th>
            ))}
            <th className="px-4 py-3 font-medium text-gray-600">Flags</th>
            <th className="px-4 py-3 font-medium text-gray-600">Source File</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((txn) => (
            <tr key={txn.id} className={cn('hover:bg-gray-50 transition-colors', selectedIds.has(txn.id) && 'bg-indigo-50/50')}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(txn.id)}
                    onChange={() => onToggle(txn.id)}
                    className="rounded"
                  />
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(txn)}
                      title="Edit transaction"
                      className="rounded p-1 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(txn.date)}</td>
              <td className="max-w-xs truncate px-4 py-3 text-gray-900">
                {txn.description || <span className="italic text-gray-400">No description</span>}
              </td>
              <td className={cn('whitespace-nowrap px-4 py-3 font-medium', txn.amount >= 0 ? 'text-green-700' : 'text-gray-900')}>
                {formatCurrency(txn.amount)}
              </td>
              <td className="px-4 py-3">
                <CategoryPicker
                  value={txn.category}
                  parentCategories={parentCategories}
                  categoryOptions={categoryOptions}
                  categories={categories}
                  onChange={(category) => onUpdate(txn.id, { category })}
                />
              </td>
              <td className="px-4 py-3">
                <StatusFilterPicker
                  mode="cell"
                  value={txn.status}
                  includeAll={false}
                  onChange={(v) => { if (v) onUpdate(txn.id, { status: v as Transaction['status'] }) }}
                />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                {formatUtcIso(txn.created_ts_utc_iso)}
              </td>
              <td className="px-4 py-3">
                <AnomalyBadge flags={txn.anomaly_flags} />
              </td>
              <td className="px-4 py-3">
                {txn.import_file_name ? (
                  <span className="inline-flex max-w-[160px] items-center gap-1 truncate rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600" title={txn.import_file_name}>
                    <FileText size={11} className="shrink-0 text-gray-400" />
                    {txn.import_file_name}
                  </span>
                ) : (
                  <span className="text-xs italic text-gray-400">Manual</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length === 0 && (
        <div className="py-12 text-center text-gray-400">No transactions found</div>
      )}
    </div>
  )
}
