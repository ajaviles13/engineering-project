import { cn } from '../lib/utils'
import { getCategoryAppearance } from '../lib/categoryStyles'

interface Props {
  category: string | null
  parentCategories: string[]
  variant?: 'table' | 'menu'
  className?: string
}

export default function CategoryBadge({ category, parentCategories, variant = 'menu', className }: Props) {
  const appearance = getCategoryAppearance(category, parentCategories)
  const { Icon } = appearance

  return (
    <span
      className={cn(
        'inline-flex items-start gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        variant === 'table' ? 'min-w-[300px] w-[300px]' : 'max-w-full',
        appearance.bg,
        appearance.text,
        appearance.ring,
        className
      )}
      title={appearance.label}
    >
      <Icon size={12} className={cn('mt-0.5 shrink-0', appearance.icon)} />
      <span className="min-w-0 flex-1 line-clamp-2 break-words leading-snug">{appearance.label}</span>
    </span>
  )
}
