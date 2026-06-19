import type { LucideIcon } from 'lucide-react'
import {
  TrendingUp, Package, Briefcase, Monitor, Megaphone, Plane, Car,
  UtensilsCrossed, Users, Scale, Zap, Shield, Landmark, Receipt,
  GraduationCap, RefreshCw, Heart, ArrowLeftRight, User, Layers,
  HelpCircle, Tag
} from 'lucide-react'
import type { RuleSetCategories } from '../types'

export type CategoryPalette = {
  bg: string
  panel: string
  text: string
  ring: string
  border: string
  icon: string
  hover: string
}

export type CategoryAppearance = CategoryPalette & {
  known: boolean
  label: string
  parent: string | null
  Icon: LucideIcon
}

const FALLBACK: CategoryAppearance = {
  known: false,
  label: '',
  parent: null,
  Icon: HelpCircle,
  bg: 'bg-slate-50',
  panel: 'bg-slate-50/70',
  text: 'text-slate-600',
  ring: 'ring-slate-200',
  border: 'border-slate-200',
  icon: 'text-slate-500',
  hover: 'hover:bg-slate-100/60'
}

const CATEGORY_PALETTE: CategoryPalette[] = [
  { bg: 'bg-emerald-50', panel: 'bg-emerald-50/70', text: 'text-emerald-700', ring: 'ring-emerald-200', border: 'border-emerald-200', icon: 'text-emerald-600', hover: 'hover:bg-emerald-100/60' },
  { bg: 'bg-orange-50', panel: 'bg-orange-50/70', text: 'text-orange-700', ring: 'ring-orange-200', border: 'border-orange-200', icon: 'text-orange-600', hover: 'hover:bg-orange-100/60' },
  { bg: 'bg-blue-50', panel: 'bg-blue-50/70', text: 'text-blue-700', ring: 'ring-blue-200', border: 'border-blue-200', icon: 'text-blue-600', hover: 'hover:bg-blue-100/60' },
  { bg: 'bg-violet-50', panel: 'bg-violet-50/70', text: 'text-violet-700', ring: 'ring-violet-200', border: 'border-violet-200', icon: 'text-violet-600', hover: 'hover:bg-violet-100/60' },
  { bg: 'bg-pink-50', panel: 'bg-pink-50/70', text: 'text-pink-700', ring: 'ring-pink-200', border: 'border-pink-200', icon: 'text-pink-600', hover: 'hover:bg-pink-100/60' },
  { bg: 'bg-cyan-50', panel: 'bg-cyan-50/70', text: 'text-cyan-700', ring: 'ring-cyan-200', border: 'border-cyan-200', icon: 'text-cyan-600', hover: 'hover:bg-cyan-100/60' },
  { bg: 'bg-amber-50', panel: 'bg-amber-50/70', text: 'text-amber-700', ring: 'ring-amber-200', border: 'border-amber-200', icon: 'text-amber-600', hover: 'hover:bg-amber-100/60' },
  { bg: 'bg-indigo-50', panel: 'bg-indigo-50/70', text: 'text-indigo-700', ring: 'ring-indigo-200', border: 'border-indigo-200', icon: 'text-indigo-600', hover: 'hover:bg-indigo-100/60' },
  { bg: 'bg-rose-50', panel: 'bg-rose-50/70', text: 'text-rose-700', ring: 'ring-rose-200', border: 'border-rose-200', icon: 'text-rose-600', hover: 'hover:bg-rose-100/60' },
  { bg: 'bg-teal-50', panel: 'bg-teal-50/70', text: 'text-teal-700', ring: 'ring-teal-200', border: 'border-teal-200', icon: 'text-teal-600', hover: 'hover:bg-teal-100/60' },
  { bg: 'bg-lime-50', panel: 'bg-lime-50/70', text: 'text-lime-700', ring: 'ring-lime-200', border: 'border-lime-200', icon: 'text-lime-600', hover: 'hover:bg-lime-100/60' },
  { bg: 'bg-fuchsia-50', panel: 'bg-fuchsia-50/70', text: 'text-fuchsia-700', ring: 'ring-fuchsia-200', border: 'border-fuchsia-200', icon: 'text-fuchsia-600', hover: 'hover:bg-fuchsia-100/60' }
]

const CATEGORY_ICONS: LucideIcon[] = [
  TrendingUp, Package, Briefcase, Monitor, Megaphone, Plane, Car,
  UtensilsCrossed, Users, Scale, Zap, Shield, Landmark, Receipt,
  GraduationCap, RefreshCw, Heart, ArrowLeftRight, User, Layers, Tag
]

const PARENT_ICON_MAP: Record<string, LucideIcon> = {
  'Income': TrendingUp,
  'Cost of Goods Sold': Package,
  'Office Expenses': Briefcase,
  'Software & SaaS': Monitor,
  'Advertising & Marketing': Megaphone,
  'Travel': Plane,
  'Transportation': Car,
  'Meals & Entertainment': UtensilsCrossed,
  'Payroll & Labor': Users,
  'Professional Services': Scale,
  'Utilities': Zap,
  'Insurance': Shield,
  'Banking & Finance': Landmark,
  'Taxes & Government': Receipt,
  'Education & Training': GraduationCap,
  'Subscriptions': RefreshCw,
  'Charitable Contributions': Heart,
  'Transfers': ArrowLeftRight,
  'Owner Activity': User,
  'Uncategorized': Layers
}

const PARENT_COLOR_MAP: Record<string, CategoryPalette> = {
  'Income': CATEGORY_PALETTE[0],
  'Cost of Goods Sold': CATEGORY_PALETTE[1],
  'Office Expenses': CATEGORY_PALETTE[2],
  'Software & SaaS': CATEGORY_PALETTE[3],
  'Advertising & Marketing': CATEGORY_PALETTE[4],
  'Travel': CATEGORY_PALETTE[5],
  'Transportation': CATEGORY_PALETTE[6],
  'Meals & Entertainment': CATEGORY_PALETTE[7],
  'Payroll & Labor': CATEGORY_PALETTE[8],
  'Professional Services': CATEGORY_PALETTE[9],
  'Utilities': CATEGORY_PALETTE[10],
  'Insurance': CATEGORY_PALETTE[11],
  'Banking & Finance': CATEGORY_PALETTE[12],
  'Taxes & Government': CATEGORY_PALETTE[13],
  'Education & Training': CATEGORY_PALETTE[14],
  'Subscriptions': CATEGORY_PALETTE[15],
  'Charitable Contributions': CATEGORY_PALETTE[16],
  'Transfers': CATEGORY_PALETTE[17],
  'Owner Activity': CATEGORY_PALETTE[18],
  'Uncategorized': CATEGORY_PALETTE[11]
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function resolveKnownParent(category: string, parentNames: string[]): string | null {
  const trimmed = category.trim()
  if (!trimmed) return null

  if (trimmed.includes(' > ')) {
    const parent = trimmed.split(' > ')[0].trim()
    return parentNames.includes(parent) ? parent : null
  }

  if (parentNames.includes(trimmed)) return trimmed

  for (const parent of parentNames) {
    if (trimmed.startsWith(`${parent}:`) || trimmed.startsWith(`${parent} `)) {
      return parent
    }
  }

  return null
}

export function getCategoryAppearance(
  category: string | null,
  parentNames: string[]
): CategoryAppearance {
  if (!category) {
    return { ...FALLBACK, label: 'Uncategorized' }
  }

  const parent = resolveKnownParent(category, parentNames)
  if (!parent) {
    return { ...FALLBACK, label: category }
  }

  const palette = PARENT_COLOR_MAP[parent]
    ?? CATEGORY_PALETTE[hashString(parent) % CATEGORY_PALETTE.length]
  const Icon = PARENT_ICON_MAP[parent]
    ?? CATEGORY_ICONS[hashString(parent) % CATEGORY_ICONS.length]

  return {
    known: true,
    label: category,
    parent,
    Icon,
    ...palette
  }
}

export function buildRuleSetCategoryOptions(categories: RuleSetCategories): string[] {
  const options: string[] = []
  for (const [parent, children] of Object.entries(categories)) {
    for (const childName of Object.keys(children)) {
      options.push(`${parent} > ${childName}`)
    }
  }
  return options.sort((a, b) => a.localeCompare(b))
}

export function mergeCategoryOptions(
  ruleSetOptions: string[],
  legacyCategories: { name: string }[],
  currentValue?: string | null
): string[] {
  const merged = new Set(ruleSetOptions)
  for (const category of legacyCategories) {
    merged.add(category.name)
  }
  if (currentValue?.trim()) {
    merged.add(currentValue.trim())
  }
  return [...merged].sort((a, b) => a.localeCompare(b))
}
