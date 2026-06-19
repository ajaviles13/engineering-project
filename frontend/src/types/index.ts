export interface User {
  id: number
  email: string
}

export interface Transaction {
  id: number
  date: string
  description: string | null
  amount: number
  category: string | null
  status: 'pending' | 'approved' | 'flagged'
  source: 'manual' | 'csv'
  anomaly_flags: Record<string, unknown>
  created_ts_utc_iso: string | null
  import_file_name: string | null
  created_at: string
}

export interface Category {
  id: number
  name: string
  color: string
}

export interface Rule {
  id: number
  name: string
  condition_field: 'description' | 'amount' | 'date'
  condition_operator: string
  condition_value: string
  action_type: 'categorize' | 'flag' | 'set_status'
  action_value: string
  priority: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface ImportError {
  row: number
  data: Record<string, string | null>
  reason: string
}

export interface Import {
  id: number
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  row_count: number
  error_count: number
  error_log: ImportError[]
  created_at: string
}

export interface DashboardStats {
  total_transactions: number
  flagged_count: number
  uncategorized_count: number
  pending_review_count: number
  total_amount: number
  spending_by_category: Record<string, number>
  monthly_totals: Record<string, number>
}

export interface TransactionSortCursor {
  id: number
  sort_by: string
  sort_dir: 'asc' | 'desc'
  sort_value: string | number | null
}

export interface TransactionSort {
  sortBy: string
  sortDir: 'asc' | 'desc'
}

export interface PaginatedTransactions {
  transactions: Transaction[]
  next_cursor: TransactionSortCursor | null
  has_more: boolean
  total_count?: number | null
}

export const TRANSACTION_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const
export type TransactionPageSize = typeof TRANSACTION_PAGE_SIZE_OPTIONS[number]
export const DEFAULT_TRANSACTION_PAGE_SIZE: TransactionPageSize = 50

export interface TransactionFilters {
  status?: string
  category?: string
  start_date?: string
  end_date?: string
  search?: string
  uncategorized?: boolean
  flagged?: boolean
  import_file?: string
}

// Rule Set (hierarchical YAML-based rules)
export interface ChildCategory {
  accounting_account: string
  keywords: string[]
  merchants: string[]
}

export interface RuleSetCategories {
  [parentName: string]: {
    [childName: string]: ChildCategory
  }
}

export interface RuleSetContent {
  version: string
  settings: {
    default_category: string
    case_sensitive: boolean
    normalize_whitespace: boolean
    strip_special_characters: boolean
  }
  categories: RuleSetCategories
}
