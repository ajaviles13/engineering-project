import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { DashboardStats } from '../types'
import { cn, formatCurrency } from '../lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid
} from 'recharts'
import { AlertTriangle, Tag, Clock, DollarSign, ArrowUpRight, Activity, PieChart as PieChartIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b']

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
}

type ChartTooltipProps = {
  active?: boolean
  payload?: Array<{ value: number; name?: string; payload?: { month?: string; name?: string } }>
  label?: string
}

function ChartTooltip({ active, payload, label, hint }: ChartTooltipProps & { hint?: string }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  const displayLabel = label ?? entry.payload?.month ?? entry.payload?.name ?? entry.name
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      {displayLabel && <p className="mb-0.5 text-xs font-medium text-gray-500">{displayLabel}</p>}
      <p className="text-sm font-semibold text-gray-900">{formatCurrency(entry.value)}</p>
      {hint && <p className="mt-1 text-xs text-indigo-600">{hint}</p>}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse w-full space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-4 w-64 rounded bg-gray-200" />
        </div>
        <div className="h-16 w-40 rounded-xl bg-gray-200" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-xl bg-gray-200" />
        <div className="h-80 rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    staleTime: 0,
    refetchOnMount: 'always'
  })

  if (isLoading) return <DashboardSkeleton />
  if (!data) return null

  const spendingData = Object.entries(data.spending_by_category).map(([name, value]) => ({
    name, value: Math.abs(value as number)
  }))
  const totalCategorySpend = spendingData.reduce((sum, item) => sum + item.value, 0)

  const monthlyData = Object.entries(data.monthly_totals).map(([month, total]) => ({
    month: MONTH_LABELS[month.slice(5)] ?? month.slice(5),
    total: total as number
  }))

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">Financial Overview</p>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">Overview of your transactions and review queue</p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Net balance</p>
          <p className={cn(
            'text-xl font-semibold tracking-tight',
            data.total_amount >= 0 ? 'text-emerald-600' : 'text-gray-900'
          )}>
            {formatCurrency(data.total_amount)}
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<DollarSign size={20} />}
          label="Total Transactions"
          value={data.total_transactions.toLocaleString()}
          accent="indigo"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="Flagged"
          value={data.flagged_count.toLocaleString()}
          accent="red"
          link="/review?filter=flagged"
        />
        <StatCard
          icon={<Tag size={20} />}
          label="Uncategorized"
          value={data.uncategorized_count.toLocaleString()}
          accent="amber"
          link="/review?filter=uncategorized"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Pending Review"
          value={data.pending_review_count.toLocaleString()}
          accent="sky"
          link="/review?filter=pending"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Activity size={16} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-gray-900">Monthly Totals</h3>
              </div>
              <p className="text-xs text-gray-500">Net transaction volume over the last 12 months</p>
            </div>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.75} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${Math.abs(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }} />
                <Bar dataKey="total" fill="url(#barGradient)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No monthly data available yet" />
          )}
        </div>

        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <PieChartIcon size={16} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-gray-900">Spending by Category</h3>
              </div>
              <p className="text-xs text-gray-500">
                Top categories by expense volume
                {totalCategorySpend > 0 && (
                  <span className="ml-1 font-medium text-gray-700">
                    · {formatCurrency(totalCategorySpend)} total
                  </span>
                )}
                <span className="ml-1 text-gray-400">· Click a segment to filter transactions</span>
              </p>
            </div>
          </div>
          {spendingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={spendingData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={98}
                  paddingAngle={2}
                  stroke="none"
                  style={{ cursor: 'pointer' }}
                  onClick={(entry) => {
                    if (entry?.name) {
                      navigate(`/transactions?category=${encodeURIComponent(entry.name)}`)
                    }
                  }}
                >
                  {spendingData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                      className="transition-opacity hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<ChartTooltip hint="Click to view transactions" />}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No categorized spending data yet" />
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
  link
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: 'indigo' | 'red' | 'amber' | 'sky'
  link?: string
}) {
  const accents = {
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    red: 'bg-red-50 text-red-600 ring-red-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    sky: 'bg-sky-50 text-sky-600 ring-sky-100'
  }

  const content = (
    <div className={cn(
      'rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all duration-200',
      link && 'hover:border-gray-300 hover:shadow-md'
    )}>
      <div className="flex items-center gap-2.5">
        <div className={cn('rounded-lg p-2 ring-1 ring-inset', accents[accent])}>
          {icon}
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <div className="mt-3">
        {link ? (
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-semibold tracking-tight text-indigo-600 group-hover:underline">
              {value}
            </span>
            <ArrowUpRight
              size={18}
              className="text-indigo-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </div>
        ) : (
          <p className="text-2xl font-semibold tracking-tight text-gray-900">{value}</p>
        )}
      </div>
    </div>
  )

  return link ? <Link to={link} className="group block">{content}</Link> : content
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
      <PieChartIcon size={28} className="mb-2 text-gray-300" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}
