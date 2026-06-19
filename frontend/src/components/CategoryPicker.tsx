import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Category } from '../types'
import CategoryBadge from './CategoryBadge'
import { cn } from '../lib/utils'
import { mergeCategoryOptions, getCategoryAppearance } from '../lib/categoryStyles'
import { ChevronDown, Search } from 'lucide-react'

interface Props {
  value: string | null
  parentCategories: string[]
  categoryOptions: string[]
  categories: Category[]
  onChange: (category: string | null) => void
  mode?: 'cell' | 'filter'
  emptyLabel?: string
}

type MenuPosition = { top: number; left: number; width: number; maxHeight: number }

const DEFAULT_EMPTY_LABELS = {
  cell: 'Set category',
  filter: 'All categories'
} as const

function groupOptions(options: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const option of options) {
    const parent = option.includes(' > ') ? option.split(' > ')[0].trim() : 'Other'
    const existing = groups.get(parent) ?? []
    groups.set(parent, [...existing, option])
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

export default function CategoryPicker({
  value,
  parentCategories,
  categoryOptions,
  categories,
  onChange,
  mode = 'cell',
  emptyLabel
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<MenuPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const allOptions = useMemo(
    // In filter mode, never inject the current value into options — stale/invalid
    // category names (e.g. a bare "Entertainment" after re-tagging) must not
    // persist in the dropdown just because they were once selected as a filter.
    () => mergeCategoryOptions(categoryOptions, categories, mode === 'filter' ? null : value),
    [categoryOptions, categories, value, mode]
  )

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return allOptions
    return allOptions.filter(option => option.toLowerCase().includes(query))
  }, [allOptions, search])

  const groupedOptions = useMemo(() => groupOptions(filteredOptions), [filteredOptions])
  const isFilter = mode === 'filter'
  const resolvedEmptyLabel = emptyLabel ?? DEFAULT_EMPTY_LABELS[mode]
  const minMenuWidth = isFilter ? 240 : 300

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const menuWidth = Math.max(rect.width, minMenuWidth)
    const viewportPadding = 8
    const gap = 4
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
    const spaceAbove = rect.top - viewportPadding
    const preferredHeight = 320
    const openBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove
    const maxHeight = Math.min(preferredHeight, openBelow ? spaceBelow - gap : spaceAbove - gap)

    let left = rect.left
    if (left + menuWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - menuWidth - viewportPadding
    }
    left = Math.max(viewportPadding, left)

    const top = openBelow
      ? rect.bottom + gap
      : rect.top - maxHeight - gap

    setPosition({ top, left, width: menuWidth, maxHeight: Math.max(maxHeight, 160) })
  }, [minMenuWidth])

  const close = useCallback(() => {
    setOpen(false)
    setSearch('')
  }, [])

  const select = useCallback((category: string | null) => {
    onChange(category)
    close()
  }, [onChange, close])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const handleReposition = () => updatePosition()
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open, updatePosition, filteredOptions.length])

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      close()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, close])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'group flex items-start gap-1 rounded-md text-left transition-colors',
          isFilter ? 'min-w-[180px]' : 'min-w-[300px] w-[300px]',
          open && 'ring-2 ring-indigo-500/30'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value ? (
          <CategoryBadge
            category={value}
            parentCategories={parentCategories}
            variant={isFilter ? 'menu' : 'table'}
            className={isFilter ? 'min-w-[160px]' : undefined}
          />
        ) : (
          <span className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
            isFilter
              ? 'min-w-[160px] bg-gray-100 text-gray-600 ring-gray-200'
              : 'min-w-[300px] w-[300px] border border-dashed border-gray-300 italic text-gray-400'
          )}>
            {resolvedEmptyLabel}
          </span>
        )}
        <ChevronDown
          size={12}
          className={cn(
            'shrink-0 text-gray-400 transition-transform',
            open || isFilter ? 'rotate-180 opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        />
      </button>

      {open && position && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          className="fixed z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="overflow-y-auto p-1.5" style={{ maxHeight: position.maxHeight - 52 }}>
            <button
              type="button"
              onClick={() => select(null)}
              className={cn(
                'flex w-full items-center rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50',
                !value && 'bg-gray-50'
              )}
            >
              {isFilter ? (
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                  {resolvedEmptyLabel}
                </span>
              ) : (
                <span className="text-xs italic text-gray-500">Uncategorized</span>
              )}
            </button>

            {filteredOptions.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-gray-400">No matching categories</p>
            ) : (
              [...groupedOptions.entries()].map(([parent, options]) => {
                const parentAppearance = getCategoryAppearance(parent, parentCategories)
                const ParentIcon = parentAppearance.Icon

                return (
                  <div key={parent} className="mt-1">
                    <div className={cn(
                      'flex items-center gap-1.5 px-2 py-1.5',
                      parentAppearance.text
                    )}>
                      <ParentIcon size={12} className={parentAppearance.icon} />
                      <span className="text-[10px] font-semibold uppercase tracking-wide">{parent}</span>
                    </div>
                    <ul className="space-y-0.5">
                      {options.map(option => (
                        <li key={option}>
                          <button
                            type="button"
                            onClick={() => select(option)}
                            className={cn(
                              'flex w-full items-start rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-50',
                              value === option && 'bg-indigo-50/60'
                            )}
                          >
                            <CategoryBadge
                              category={option}
                              parentCategories={parentCategories}
                              variant="menu"
                              className="w-full"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
