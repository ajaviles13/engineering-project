import { useState } from 'react'
import CategoryBadge from './CategoryBadge'
import { Check, Tag, Trash2, X } from 'lucide-react'

interface Props {
  selectedCount: number
  parentCategories: string[]
  categoryOptions: string[]
  onBulkCategorize: (category: string) => void
  onBulkApprove: () => void
  onBulkDelete: () => void
  onClearSelection: () => void
}

export default function BulkActionToolbar({
  selectedCount,
  parentCategories,
  categoryOptions,
  onBulkCategorize,
  onBulkApprove,
  onBulkDelete,
  onClearSelection
}: Props) {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl bg-gray-900 px-5 py-3 text-white shadow-lg">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="h-4 w-px bg-gray-600" />

      <div className="relative">
        <button
          onClick={() => setShowCategoryPicker(!showCategoryPicker)}
          className="flex items-center gap-1.5 rounded-lg bg-gray-700 px-3 py-1.5 text-sm transition-colors hover:bg-gray-600"
        >
          <Tag size={13} />
          Categorize
        </button>
        {showCategoryPicker && (
          <div className="absolute bottom-full left-0 mb-2 max-h-72 min-w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-gray-900 shadow-xl">
            {categoryOptions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No categories configured</p>
            ) : (
              categoryOptions.map(name => (
                <button
                  key={name}
                  onClick={() => { onBulkCategorize(name); setShowCategoryPicker(false) }}
                  className="flex w-full items-center px-3 py-2 text-left hover:bg-gray-50"
                >
                  <CategoryBadge category={name} parentCategories={parentCategories} />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button
        onClick={onBulkApprove}
        className="flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-sm transition-colors hover:bg-green-600"
      >
        <Check size={13} />
        Approve
      </button>

      <button
        onClick={onBulkDelete}
        className="flex items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 text-sm transition-colors hover:bg-red-600"
      >
        <Trash2 size={13} />
        Delete
      </button>

      <button onClick={onClearSelection} className="ml-1 text-gray-400 hover:text-white">
        <X size={16} />
      </button>
    </div>
  )
}
