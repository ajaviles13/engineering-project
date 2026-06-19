import { useState } from 'react'
import type { Transaction, Category } from '../types'
import CategoryPicker from './CategoryPicker'
import StatusFilterPicker from './StatusFilterPicker'
import AnomalyBadge from './AnomalyBadge'
import { cn } from '../lib/utils'
import { X, Trash2 } from 'lucide-react'

interface Props {
  transaction: Transaction
  categories: Category[]
  parentCategories: string[]
  categoryOptions: string[]
  onClose: () => void
  onSave: (patch: Partial<Transaction>) => Promise<void>
  onDelete: () => Promise<void>
}

export default function EditTransactionModal({
  transaction,
  categories,
  parentCategories,
  categoryOptions,
  onClose,
  onSave,
  onDelete
}: Props) {
  const [date, setDate] = useState(transaction.date)
  const [description, setDescription] = useState(transaction.description ?? '')
  const [amount, setAmount] = useState(String(transaction.amount))
  const [category, setCategory] = useState<string | null>(transaction.category)
  const [status, setStatus] = useState(transaction.status)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    const parsedAmount = parseFloat(amount)
    if (Number.isNaN(parsedAmount)) {
      setError('Amount must be a valid number')
      return
    }
    setSaving(true)
    try {
      await onSave({
        date,
        description: description.trim() || null,
        amount: parsedAmount,
        category,
        status
      })
      onClose()
    } catch {
      setError('Failed to save transaction. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this transaction? This cannot be undone.')) return
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch {
      setError('Failed to delete transaction. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-start justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit Transaction</h3>
            <p className="mt-0.5 text-xs text-gray-500">ID #{transaction.id} · {transaction.source}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                  parseFloat(amount) >= 0 ? 'text-green-700' : 'text-gray-900'
                )}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Transaction description"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Category</label>
            <CategoryPicker
              value={category}
              parentCategories={parentCategories}
              categoryOptions={categoryOptions}
              categories={categories}
              onChange={setCategory}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Status</label>
            <StatusFilterPicker
              value={status}
              includeAll={false}
              onChange={(v) => { if (v) setStatus(v as Transaction['status']) }}
            />
          </div>

          {(transaction.anomaly_flags && Object.keys(transaction.anomaly_flags).length > 0) && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Flags</label>
              <AnomalyBadge flags={transaction.anomaly_flags} />
            </div>
          )}

          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            <div className="flex justify-between gap-4">
              <span>Created (UTC)</span>
              <span className="text-gray-700">{transaction.created_ts_utc_iso ?? '—'}</span>
            </div>
            <div className="mt-1 flex justify-between gap-4">
              <span>Source file</span>
              <span className="truncate text-gray-700">{transaction.import_file_name ?? 'Manual'}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-gray-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || deleting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
