import { X, Loader, CheckCircle, Tag } from 'lucide-react'
import { cn } from '../lib/utils'
import type { RecategorizationStatus } from '../hooks/useRecategorizationStatus'

interface Props {
  status: RecategorizationStatus
  onDismiss: () => void
}

export default function RecategorizationBanner({ status, onDismiss }: Props) {
  const { running, completed, progress, total, processed, patterns } = status

  const patternList = patterns.length > 0
    ? patterns.slice(0, 3).map(p => `"${p}"`).join(', ') + (patterns.length > 3 ? ` +${patterns.length - 3} more` : '')
    : 'updated keywords'

  const progressPct = Math.min(Math.round(progress), 100)

  return (
    <div className={cn(
      'w-full border-b px-5 py-3 flex items-center gap-3',
      completed
        ? 'bg-green-50 border-green-200'
        : 'bg-indigo-50 border-indigo-200'
    )}>
      {/* Icon */}
      <span className="shrink-0">
        {running
          ? <Loader size={15} className="text-indigo-500 animate-spin" />
          : <CheckCircle size={15} className="text-green-500" />
        }
      </span>

      {/* Main text */}
      <div className="flex-1 min-w-0">
        {running ? (
          <p className="text-sm text-indigo-800">
            <span className="font-medium">Re-tagging transactions</span>
            {' '}matching {patternList}
            <span className="mx-2 text-indigo-400">·</span>
            <span className="font-semibold">{progressPct}% complete</span>
            {total > 0 && (
              <span className="text-indigo-500 ml-1.5 text-xs">({processed.toLocaleString()} / {total.toLocaleString()} records)</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-green-800">
            <span className="font-medium">Re-tagging complete</span>
            {' '}— {total.toLocaleString()} transaction{total !== 1 ? 's' : ''} processed for {patternList}
          </p>
        )}

        {/* Progress bar — only while running */}
        {running && total > 0 && (
          <div className="mt-1.5 h-1 w-full max-w-sm rounded-full bg-indigo-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Keyword chips — small context */}
      {patterns.length > 0 && (
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {patterns.slice(0, 2).map(p => (
            <span key={p} className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
              running ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
            )}>
              <Tag size={10} />
              {p}
            </span>
          ))}
          {patterns.length > 2 && (
            <span className="text-xs text-gray-400">+{patterns.length - 2}</span>
          )}
        </div>
      )}

      {/* Dismiss button — only when complete */}
      {completed && (
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-md text-green-500 hover:text-green-700 hover:bg-green-100 transition-colors"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
