import { ANOMALY_LABELS, ANOMALY_COLORS } from '../lib/utils'

interface Props {
  flags: Record<string, unknown>
}

export default function AnomalyBadge({ flags }: Props) {
  const entries = Object.entries(flags)
  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, value]) => {
        const flagData = value as { message?: string } | null
        // Prefer the message stored in the flag, fall back to static label map, then the raw key
        const label = flagData?.message || ANOMALY_LABELS[key] || key
        const color = ANOMALY_COLORS[key]
          || (key.startsWith('custom_flag_') ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700')
        return (
          <span
            key={key}
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${color}`}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}
