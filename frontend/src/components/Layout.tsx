import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useImportSync } from '../hooks/useImportSync'
import api from '../lib/api'
import { LayoutDashboard, List, AlertTriangle, Tag, Zap, Upload, LogOut, CheckCircle, X } from 'lucide-react'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/transactions', label: 'Transactions', icon: List },
  { to: '/review', label: 'Review', icon: AlertTriangle },
  { to: '/rules', label: 'Category Tags', icon: Tag },
  { to: '/custom-rules', label: 'Rules', icon: Zap },
  { to: '/import', label: 'Import CSV', icon: Upload }
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { notice, dismissNotice } = useImportSync()

  const handleLogout = async () => {
    try { await api.delete('/auth/logout') } catch {}
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white lg:w-64 xl:w-72">
        <div className="border-b border-gray-200 p-4 lg:p-5">
          <h1 className="text-lg font-semibold text-gray-900 lg:text-xl">BookKeeper</h1>
          <p className="mt-0.5 truncate text-xs text-gray-500 lg:text-sm">{user?.email}</p>
        </div>
        <nav className="flex-1 p-2 lg:p-3">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  'mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors lg:gap-3 lg:px-4 lg:py-2.5 lg:text-[15px]',
                  isActive
                    ? 'bg-indigo-50 font-medium text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )
              }
            >
              <Icon size={16} className="lg:h-[18px] lg:w-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-2 lg:p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 lg:gap-3 lg:px-4 lg:py-2.5 lg:text-[15px]"
          >
            <LogOut size={16} className="lg:h-[18px] lg:w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="w-full">
          {notice && (
            <div className={cn(
              'mx-6 mt-4 flex items-start gap-3 rounded-xl border px-4 py-3',
              notice.status === 'failed'
                ? 'border-red-200 bg-red-50'
                : notice.row_count === 0
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-green-200 bg-green-50'
            )}>
              {notice.status === 'failed' ? (
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
              ) : notice.row_count === 0 ? (
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
              ) : (
                <CheckCircle size={18} className="mt-0.5 shrink-0 text-green-500" />
              )}
              <div className="min-w-0 flex-1 text-sm">
                {notice.status === 'failed' ? (
                  <p className="font-medium text-red-800">Import failed — {notice.filename}</p>
                ) : notice.row_count === 0 ? (
                  <>
                    <p className="font-medium text-amber-800">Import finished with 0 transactions — {notice.filename}</p>
                    <p className="mt-0.5 text-amber-700">
                      No new rows were saved. Check for duplicates or re-upload after fixing the file.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-green-800">
                      Import complete — {notice.row_count.toLocaleString()} transaction{notice.row_count === 1 ? '' : 's'} added
                    </p>
                    <p className="mt-0.5 text-green-700">{notice.filename}</p>
                  </>
                )}
                {notice.status === 'completed' && notice.row_count > 0 && (
                  <Link
                    to={`/transactions?import_file=${encodeURIComponent(notice.filename)}`}
                    className="mt-1 inline-block font-medium text-indigo-600 hover:underline"
                  >
                    View transactions →
                  </Link>
                )}
              </div>
              <button
                onClick={dismissNotice}
                className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-white/60 hover:text-gray-600"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
