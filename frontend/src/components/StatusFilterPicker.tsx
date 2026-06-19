import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/utils'
import { ChevronDown } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses', className: 'bg-gray-100 text-gray-600 ring-gray-200' },
  { value: 'pending', label: 'Pending', className: 'bg-yellow-100 text-yellow-800 ring-yellow-200' },
  { value: 'approved', label: 'Approved', className: 'bg-green-100 text-green-800 ring-green-200' },
  { value: 'flagged', label: 'Flagged', className: 'bg-red-100 text-red-800 ring-red-200' }
] as const

interface Props {
  value?: string
  onChange: (value: string | undefined) => void
  includeAll?: boolean
  mode?: 'filter' | 'cell'
}

export default function StatusFilterPicker({ value = '', onChange, includeAll = true, mode = 'filter' }: Props) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const options = includeAll ? STATUS_OPTIONS : STATUS_OPTIONS.filter(o => o.value !== '')

  const selected = options.find(o => o.value === (value ?? '')) ?? options[0]

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    setPosition({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 160) })
  }, [])

  const close = useCallback(() => setOpen(false), [])

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
  }, [open, updatePosition])

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

  const isCell = mode === 'cell'

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded-md text-left transition-colors',
          isCell ? 'min-w-[120px]' : 'min-w-[140px]',
          open && 'ring-2 ring-indigo-500/30'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn(
          'inline-flex flex-1 items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
          selected.className
        )}>
          {selected.label}
        </span>
        <ChevronDown size={12} className={cn(
          'shrink-0 text-gray-400 transition-transform',
          open || isCell ? 'rotate-180 opacity-100' : 'opacity-0 group-hover:opacity-100'
        )} />
      </button>

      {open && position && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          className="fixed z-50 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          {options.map(option => (
            <button
              key={option.value || 'all'}
              type="button"
              onClick={() => { onChange(option.value || undefined); close() }}
              className={cn(
                'flex w-full items-center rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50',
                (value ?? '') === option.value && 'bg-indigo-50/60'
              )}
            >
              <span className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                option.className
              )}>
                {option.label}
              </span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
