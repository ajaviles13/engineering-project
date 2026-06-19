import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { RuleSetContent, ChildCategory } from '../types'
import { ChevronDown, ChevronRight, Plus, X, RotateCcw, Save, Sparkles, Layers, Hash } from 'lucide-react'
import { cn } from '../lib/utils'
import { getCategoryAppearance, type CategoryPalette } from '../lib/categoryStyles'
import { findPatternConflict, normalizePattern } from '../lib/ruleSetPatterns'
import { invalidateTransactionQueries } from '../lib/invalidateTransactions'

// ─── AI Toggle ───────────────────────────────────────────────────────────────
function AiToggle() {
  const [enabled, setEnabled] = useState(false)
  return (
    <button
      onClick={() => setEnabled(e => !e)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
        enabled
          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
      )}
    >
      <Sparkles size={14} className={enabled ? 'text-indigo-500' : 'text-gray-400'} />
      Enable AI Categorization
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 ml-0.5">
        Beta
      </span>
      <span
        className={cn(
          'relative inline-flex h-4 w-7 items-center rounded-full transition-colors ml-1',
          enabled ? 'bg-indigo-500' : 'bg-gray-300'
        )}
      >
        <span
          className={cn(
            'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
            enabled ? 'translate-x-3.5' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  )
}

// ─── Vertical value list (Keywords / Merchants) ──────────────────────────────
function ValueListSection({
  title,
  values,
  placeholder,
  accent,
  onAdd,
  onRemove,
  validatePattern,
}: {
  title: string
  values: string[]
  placeholder: string
  accent: CategoryPalette
  onAdd: (value: string) => void
  onRemove: (index: number) => void
  validatePattern?: (value: string) => string | null
}) {
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')
  const [error, setError] = useState('')

  const commit = () => {
    const trimmed = val.trim()
    if (!trimmed) {
      setAdding(false)
      setVal('')
      setError('')
      return
    }

    const conflict = validatePattern?.(trimmed)
    if (conflict) {
      setError(`Already used by ${conflict}`)
      return
    }

    onAdd(trimmed)
    setVal('')
    setError('')
    setAdding(false)
  }

  const cancel = () => {
    setAdding(false)
    setVal('')
    setError('')
  }

  return (
    <div className="flex-1 min-w-0">
      <h4 className="text-[11px] font-semibold text-gray-400 tracking-widest mb-2">{title}</h4>
      <div className={cn('overflow-hidden rounded-lg border bg-white/90', accent.border)}>
        {adding ? (
          <div className={cn('flex items-center gap-2 border-b px-3 py-2.5', accent.bg, accent.border)}>
            <input
              autoFocus
              value={val}
              onChange={e => { setVal(e.target.value); setError('') }}
              onKeyDown={e => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') cancel()
              }}
              placeholder={placeholder}
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200/80"
            />
            <button
              onClick={commit}
              className={cn('rounded-md px-2 py-1 text-xs font-medium transition-colors', accent.text, accent.hover)}
            >
              Add
            </button>
            <button
              onClick={cancel}
              className="px-1 py-1 text-xs text-gray-400 transition-colors hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setAdding(true); setError('') }}
            className={cn(
              'flex w-full items-center gap-1.5 border-b px-3 py-2.5 text-sm font-medium transition-colors',
              accent.border,
              accent.text,
              accent.hover
            )}
          >
            <Plus size={14} />
            Add New +
          </button>
        )}

        {error && (
          <p className="border-b px-3 py-2 text-xs text-red-600">{error}</p>
        )}

        {values.length === 0 && !adding ? (
          <p className="px-3 py-5 text-center text-xs text-gray-400">No entries yet</p>
        ) : (
          <ul className="divide-y divide-gray-100/80">
            {values.map((item, i) => (
              <li
                key={`${item}-${i}`}
                className={cn('group flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 transition-colors', accent.hover)}
              >
                <span className="truncate">{item}</span>
                <button
                  onClick={() => onRemove(i)}
                  className="shrink-0 p-0.5 rounded text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                  aria-label={`Remove ${item}`}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Child category row ───────────────────────────────────────────────────────
function ChildRow({
  childName,
  parentName,
  data,
  accent,
  ruleSetContent,
  onUpdate,
}: {
  childName: string
  parentName: string
  data: ChildCategory
  accent: CategoryPalette
  ruleSetContent: RuleSetContent
  onUpdate: (updated: ChildCategory) => void
}) {
  const categoryLabel = `${parentName} > ${childName}`
  const validateKeywords = (pattern: string) => {
    const key = normalizePattern(pattern)
    if (data.keywords.some(k => normalizePattern(k) === key)) return categoryLabel
    return findPatternConflict(ruleSetContent, pattern, categoryLabel)
  }
  const validateMerchants = (pattern: string) => {
    const key = normalizePattern(pattern)
    if (data.merchants.some(m => normalizePattern(m) === key)) return categoryLabel
    return findPatternConflict(ruleSetContent, pattern, categoryLabel)
  }
  const addKeyword = (kw: string) =>
    onUpdate({ ...data, keywords: [...data.keywords, kw] })
  const removeKeyword = (i: number) =>
    onUpdate({ ...data, keywords: data.keywords.filter((_, idx) => idx !== i) })
  const addMerchant = (m: string) =>
    onUpdate({ ...data, merchants: [...data.merchants, m] })
  const removeMerchant = (i: number) =>
    onUpdate({ ...data, merchants: data.merchants.filter((_, idx) => idx !== i) })

  return (
    <div className={cn('rounded-lg border bg-white/90 p-4 shadow-sm', accent.border, accent.ring, 'ring-1 ring-inset')}>
      <div className={cn('mb-4 flex items-center justify-between gap-4 border-b pb-3', accent.border)}>
        <p className={cn('text-sm font-semibold', accent.text)}>{childName}</p>
        {data.accounting_account && (
          <span className={cn('shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium', accent.bg, accent.border, accent.text)}>
            {data.accounting_account}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ValueListSection
          title="KEYWORDS"
          values={data.keywords}
          placeholder="e.g. invoice payment"
          accent={accent}
          validatePattern={validateKeywords}
          onAdd={addKeyword}
          onRemove={removeKeyword}
        />
        <ValueListSection
          title="MERCHANTS"
          values={data.merchants}
          placeholder="e.g. Stripe"
          accent={accent}
          validatePattern={validateMerchants}
          onAdd={addMerchant}
          onRemove={removeMerchant}
        />
      </div>
    </div>
  )
}

// ─── Parent category accordion ────────────────────────────────────────────────
function ParentSection({
  parentName,
  children,
  parentCategories,
  ruleSetContent,
  onUpdateChild,
}: {
  parentName: string
  children: Record<string, ChildCategory>
  parentCategories: string[]
  ruleSetContent: RuleSetContent
  onUpdateChild: (childName: string, updated: ChildCategory) => void
}) {
  const [open, setOpen] = useState(false)
  const childCount = Object.keys(children).length
  const totalPatterns = Object.values(children).reduce(
    (acc, c) => acc + c.keywords.length + c.merchants.length,
    0
  )
  const appearance = getCategoryAppearance(parentName, parentCategories)
  const CategoryIcon = appearance.Icon

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors',
          open ? appearance.bg : 'hover:bg-gray-50'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
              open ? cn(appearance.bg, appearance.icon, appearance.ring, 'ring-1 ring-inset') : 'bg-gray-100 text-gray-400'
            )}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
              appearance.bg,
              appearance.ring
            )}
          >
            <CategoryIcon size={14} className={appearance.icon} />
          </span>
          <span className="text-sm font-semibold text-gray-900 truncate">{parentName}</span>
          <span className="shrink-0 text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
            {childCount} {childCount === 1 ? 'subcategory' : 'subcategories'}
          </span>
        </div>
        <span className="shrink-0 text-xs text-gray-400 tabular-nums">
          {totalPatterns} {totalPatterns === 1 ? 'pattern' : 'patterns'}
        </span>
      </button>

      {open && (
        <div className={cn('space-y-3 border-t px-5 pb-5 pt-3', appearance.panel, appearance.border)}>
          {Object.entries(children).map(([childName, childData]) => (
            <ChildRow
              key={childName}
              parentName={parentName}
              childName={childName}
              data={childData}
              accent={appearance}
              ruleSetContent={ruleSetContent}
              onUpdate={(updated) => onUpdateChild(childName, updated)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RulesPage() {
  const qc = useQueryClient()
  const [localContent, setLocalContent] = useState<RuleSetContent | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')

  const { data: serverData, isLoading } = useQuery<{ rule_set: RuleSetContent }>({
    queryKey: ['rule_set'],
    queryFn: () => api.get('/rule_set').then(r => r.data),
  })

  useEffect(() => {
    if (serverData && !localContent) {
      setLocalContent(serverData.rule_set)
    }
  }, [serverData, localContent])

  const saveMutation = useMutation({
    mutationFn: (content: RuleSetContent) => api.put('/rule_set', { rule_set: content }),
    onSuccess: (res) => {
      setIsDirty(false)
      setSaveError('')
      qc.invalidateQueries({ queryKey: ['rule_set'] })
      if (res.data.recategorization_enqueued) {
        const count = res.data.recategorization_patterns?.length ?? 0
        setSaveNotice(
          count === 1
            ? 'Rules saved. Matching transactions are being recategorized in the background.'
            : `Rules saved. Recategorizing transactions matching ${count} updated patterns in the background.`
        )
        invalidateTransactionQueries(qc)
      } else {
        setSaveNotice('Rules saved.')
      }
    },
    onError: (err: unknown) => {
      const errors = (err as { response?: { data?: { errors?: string[] } } })?.response?.data?.errors
      setSaveError(errors?.join(' ') ?? 'Failed to save rules. Please try again.')
      setSaveNotice('')
    }
  })

  const resetMutation = useMutation({
    mutationFn: () => api.post('/rule_set/reset'),
    onSuccess: (res) => {
      setLocalContent(res.data.rule_set)
      setIsDirty(false)
      qc.invalidateQueries({ queryKey: ['rule_set'] })
    }
  })

  const updateChild = useCallback((parentName: string, childName: string, updated: ChildCategory) => {
    setLocalContent(prev => {
      if (!prev) return prev
      return {
        ...prev,
        categories: {
          ...prev.categories,
          [parentName]: {
            ...prev.categories[parentName],
            [childName]: updated
          }
        }
      }
    })
    setIsDirty(true)
  }, [])

  if (isLoading || !localContent) {
    return <div className="p-8 text-center text-gray-400">Loading rules...</div>
  }

  const totalParents = Object.keys(localContent.categories).length
  const parentCategories = Object.keys(localContent.categories).sort((a, b) => a.localeCompare(b))
  const totalPatterns = Object.values(localContent.categories).reduce(
    (acc, children) =>
      acc +
      Object.values(children).reduce(
        (sum, c) => sum + c.keywords.length + c.merchants.length,
        0
      ),
    0
  )

  return (
    <div className="w-full space-y-5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Category Tags</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Match transactions automatically using keywords and merchant names
          </p>
        </div>
        <AiToggle />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="bg-indigo-50 rounded-xl p-4 flex items-start gap-3">
          <Layers size={18} className="text-indigo-600 mt-0.5" />
          <div>
            <p className="text-2xl font-semibold text-gray-900">{totalParents}</p>
            <p className="text-xs text-gray-600 mt-0.5">Parent categories</p>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 flex items-start gap-3">
          <Hash size={18} className="text-purple-600 mt-0.5" />
          <div>
            <p className="text-2xl font-semibold text-gray-900">{totalPatterns}</p>
            <p className="text-xs text-gray-600 mt-0.5">Matching patterns</p>
          </div>
        </div>
      </div>

      {/* Save bar */}
      {(isDirty || saveError || saveNotice) && (
        <div className={cn(
          'rounded-xl border px-4 py-3',
          saveError ? 'border-red-200 bg-red-50' : saveNotice && !isDirty ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
        )}>
          <div className="flex items-center justify-between gap-4">
            <p className={cn(
              'text-sm font-medium',
              saveError ? 'text-red-800' : saveNotice && !isDirty ? 'text-green-800' : 'text-amber-800'
            )}>
              {saveError || saveNotice || 'You have unsaved changes'}
            </p>
            {isDirty && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSaveError('')
                    setSaveNotice('')
                    qc.fetchQuery({ queryKey: ['rule_set'] }).then((data: unknown) => {
                      const d = data as { rule_set: RuleSetContent }
                      setLocalContent(d.rule_set)
                      setIsDirty(false)
                    })
                  }}
                  className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-700 transition-colors hover:bg-amber-100"
                >
                  Discard
                </button>
                <button
                  onClick={() => {
                    setSaveError('')
                    setSaveNotice('')
                    localContent && saveMutation.mutate(localContent)
                  }}
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save size={13} />
                  {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rule set card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-medium text-gray-700">Default Rule Base</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
              Active
            </span>
          </div>
          <button
            onClick={() => {
              if (confirm('Reset all rules to the default starter? Your changes will be lost.')) {
                resetMutation.mutate()
              }
            }}
            disabled={resetMutation.isPending}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-white transition-colors disabled:opacity-50 bg-white"
          >
            <RotateCcw size={11} />
            Reset to default
          </button>
        </div>

        {Object.entries(localContent.categories).map(([parentName, children]) => (
          <ParentSection
            key={parentName}
            parentName={parentName}
            parentCategories={parentCategories}
            ruleSetContent={localContent}
            children={children as Record<string, ChildCategory>}
            onUpdateChild={(childName, updated) => updateChild(parentName, childName, updated)}
          />
        ))}
      </div>
    </div>
  )
}
