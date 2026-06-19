import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Rule, RuleSetContent } from '../types'
import { Plus, Trash2, Zap, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '../lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  description: 'Description',
  amount: 'Amount',
  date: 'Date',
}

const OPERATOR_OPTIONS: Record<string, { value: string; label: string }[]> = {
  description: [
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'matches_regex', label: 'Matches Regex' },
  ],
  amount: [
    { value: 'gt', label: 'Is Greater Than' },
    { value: 'gte', label: 'Is Greater Than or Equal To' },
    { value: 'lt', label: 'Is Less Than' },
    { value: 'lte', label: 'Is Less Than or Equal To' },
    { value: 'eq', label: 'Is Equal To' },
  ],
  date: [
    { value: 'day_of_week', label: 'Day of Week' },
    { value: 'month', label: 'Month' },
  ],
}

const ACTION_OPTIONS = [
  { value: 'categorize', label: 'Set Category To' },
  { value: 'flag', label: 'Flag As' },
  { value: 'set_status', label: 'Mark Status As' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'flagged', label: 'Flagged' },
]

const DAY_OPTIONS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function describeRule(rule: Rule): string {
  const field = FIELD_LABELS[rule.condition_field] ?? rule.condition_field
  const ops = OPERATOR_OPTIONS[rule.condition_field] ?? []
  const opLabel = ops.find(o => o.value === rule.condition_operator)?.label ?? rule.condition_operator
  const cond = `${field} ${opLabel} "${rule.condition_value}"`

  const actionOpt = ACTION_OPTIONS.find(a => a.value === rule.action_type)
  const actionLabel = actionOpt?.label ?? rule.action_type
  return `${cond} → ${actionLabel} "${rule.action_value}"`
}

function buildCategoryOptions(content: RuleSetContent | null): string[] {
  if (!content) return []
  const opts: string[] = []
  for (const [parent, children] of Object.entries(content.categories)) {
    if (typeof children === 'object' && children !== null) {
      for (const child of Object.keys(children)) {
        opts.push(`${parent} > ${child}`)
      }
    }
  }
  return opts.sort()
}

// ─── Empty form state ─────────────────────────────────────────────────────────

interface FormData {
  name: string
  condition_field: string
  condition_operator: string
  condition_value: string
  action_type: string
  action_value: string
}

function emptyForm(): FormData {
  return {
    name: '',
    condition_field: 'description',
    condition_operator: 'contains',
    condition_value: '',
    action_type: 'categorize',
    action_value: '',
  }
}

// ─── Rule form ────────────────────────────────────────────────────────────────

function RuleForm({
  categoryOptions,
  onSubmit,
  onCancel,
  error,
  isPending,
}: {
  categoryOptions: string[]
  onSubmit: (data: FormData) => void
  onCancel: () => void
  error: string
  isPending: boolean
}) {
  const [form, setForm] = useState<FormData>(emptyForm)

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      // Reset dependent fields when the field selector changes
      if (key === 'condition_field') {
        next.condition_operator = OPERATOR_OPTIONS[value as string]?.[0]?.value ?? ''
        next.condition_value = ''
      }
      // Reset action value when action type changes
      if (key === 'action_type') {
        next.action_value = ''
      }
      return next
    })
  }

  const operators = OPERATOR_OPTIONS[form.condition_field] ?? []

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">New Rule</h3>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Rule Name</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setField('name', e.target.value)}
          placeholder="e.g. Flag large expenses"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      {/* Condition */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">When</p>
        <div className="grid grid-cols-3 gap-2">
          {/* Field */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Field</label>
            <select
              value={form.condition_field}
              onChange={e => setField('condition_field', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {Object.entries(FIELD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Operator */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Condition</label>
            <select
              value={form.condition_operator}
              onChange={e => setField('condition_operator', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {operators.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          {/* Value */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Value</label>
            {form.condition_field === 'date' && form.condition_operator === 'day_of_week' ? (
              <select
                value={form.condition_value}
                onChange={e => setField('condition_value', e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Select day…</option>
                {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : form.condition_field === 'date' && form.condition_operator === 'month' ? (
              <select
                value={form.condition_value}
                onChange={e => setField('condition_value', e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Select month…</option>
                {MONTH_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input
                type={form.condition_field === 'amount' ? 'number' : 'text'}
                step={form.condition_field === 'amount' ? '0.01' : undefined}
                value={form.condition_value}
                onChange={e => setField('condition_value', e.target.value)}
                placeholder={form.condition_field === 'amount' ? '0.00' : 'Enter value…'}
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            )}
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Then</p>
        <div className="grid grid-cols-2 gap-2">
          {/* Action type */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Action</label>
            <select
              value={form.action_type}
              onChange={e => setField('action_type', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {ACTION_OPTIONS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Action value */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {form.action_type === 'categorize' ? 'Category' : form.action_type === 'flag' ? 'Flag Label' : 'Status'}
            </label>
            {form.action_type === 'categorize' ? (
              <select
                value={form.action_value}
                onChange={e => setField('action_value', e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Select category…</option>
                {categoryOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : form.action_type === 'set_status' ? (
              <select
                value={form.action_value}
                onChange={e => setField('action_value', e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Select status…</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.action_value}
                onChange={e => setField('action_value', e.target.value)}
                placeholder="e.g. High Value"
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSubmit(form)}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Zap size={13} />
          {isPending ? 'Saving…' : 'Create Rule'}
        </button>
      </div>
    </div>
  )
}

// ─── Rule row ─────────────────────────────────────────────────────────────────

function RuleRow({ rule, onDelete }: { rule: Rule; onDelete: (id: number) => void }) {
  const actionBadge = {
    categorize: 'bg-green-100 text-green-700',
    flag: 'bg-red-100 text-red-700',
    set_status: 'bg-indigo-100 text-indigo-700',
  }[rule.action_type] ?? 'bg-gray-100 text-gray-700'

  const actionLabel = ACTION_OPTIONS.find(a => a.value === rule.action_type)?.label ?? rule.action_type

  return (
    <div className="group flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-0">
      <span className={cn(
        'mt-0.5 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset shrink-0',
        rule.active ? 'bg-green-100 text-green-700 ring-green-200' : 'bg-gray-100 text-gray-500 ring-gray-200'
      )}>
        {rule.active ? <CheckCircle size={11} className="mr-1" /> : <XCircle size={11} className="mr-1" />}
        {rule.active ? 'Active' : 'Inactive'}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{rule.name}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{describeRule(rule)}</p>
      </div>

      <span className={cn('shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', actionBadge)}>
        {actionLabel}
      </span>

      <button
        onClick={() => onDelete(rule.id)}
        className="shrink-0 rounded-md p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
        aria-label="Delete rule"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CustomRulesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')

  const { data: rulesData, isLoading } = useQuery<{ rules: Rule[] }>({
    queryKey: ['custom_rules'],
    queryFn: () => api.get('/rules').then(r => r.data),
  })

  const { data: ruleSetData } = useQuery<{ rule_set: RuleSetContent }>({
    queryKey: ['rule_set'],
    queryFn: () => api.get('/rule_set').then(r => r.data),
  })

  const categoryOptions = buildCategoryOptions(ruleSetData?.rule_set ?? null)

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/rules', { rule: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom_rules'] })
      setShowForm(false)
      setFormError('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setFormError(msg ?? 'Failed to create rule. Please try again.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom_rules'] }),
  })

  const rules = rulesData?.rules ?? []

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">Loading rules…</div>
  }

  return (
    <div className="w-full space-y-5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Rules</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Automatically categorize, flag, or update transactions based on custom conditions
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setFormError('') }}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={14} />
            Add Rule
          </button>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-gray-200 bg-blue-50/50 px-4 py-3">
        <p className="text-xs text-blue-800 font-medium mb-1">How rules work</p>
        <p className="text-xs text-blue-700">
          Rules are applied during CSV import and when a new rule is created (sweeping all non-approved transactions).
          If two rules match the same transaction, a conflict flag is added for manual review.
          Category Tags (keyword matching) always take priority over custom rules.
        </p>
      </div>

      {/* New rule form */}
      {showForm && (
        <RuleForm
          categoryOptions={categoryOptions}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => { setShowForm(false); setFormError('') }}
          error={formError}
          isPending={createMutation.isPending}
        />
      )}

      {/* Rules list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50/80">
          <span className="text-sm font-medium text-gray-700">
            Active Rules
            {rules.length > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                {rules.length}
              </span>
            )}
          </span>
          <span className="text-xs text-gray-400">Applied in priority order</span>
        </div>

        {rules.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Zap size={28} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No custom rules yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add a rule to automatically act on transactions matching your conditions
            </p>
          </div>
        ) : (
          rules.map(rule => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onDelete={(id) => {
                if (confirm(`Delete rule "${rule.name}"?`)) deleteMutation.mutate(id)
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}
