import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { Import, ImportError } from '../types'
import { useImportSync } from '../hooks/useImportSync'
import { Upload, FileText, CheckCircle, XCircle, Loader, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../lib/utils'

const STATUS_ICONS = {
  pending: <Loader size={16} className="text-yellow-500 animate-spin" />,
  processing: <Loader size={16} className="text-blue-500 animate-spin" />,
  completed: <CheckCircle size={16} className="text-green-500" />,
  failed: <XCircle size={16} className="text-red-500" />
}

// ─── Error Report Modal ───────────────────────────────────────────────────────
function ErrorReportModal({ imp, onClose }: { imp: Import; onClose: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null)

  const errors: ImportError[] = imp.error_log ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import Error Report</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{imp.filename}</span>
              {' '}· {imp.row_count} imported · {errors.length} skipped
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary banner */}
        <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">
              {errors.length === 1
                ? '1 row could not be imported.'
                : `${errors.length} rows could not be imported.`}
            </p>
            <p className="mt-0.5 text-amber-700">
              Review the details below, fix the highlighted values in your file, and re-upload.
            </p>
          </div>
        </div>

        {/* Error list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {errors.map((err, i) => {
            const isOpen = expanded === i
            const dataEntries = Object.entries(err.data ?? {})
            return (
              <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className="w-full flex items-start justify-between gap-2 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-700 shrink-0 mt-0.5">
                      Row {err.row}
                    </span>
                    <span className="text-sm text-gray-700 line-clamp-2 break-words leading-snug min-w-0">{err.reason}</span>
                  </div>
                  {isOpen
                    ? <ChevronUp size={15} className="text-gray-400 shrink-0 mt-1" />
                    : <ChevronDown size={15} className="text-gray-400 shrink-0 mt-1" />
                  }
                </button>

                {/* Row data */}
                {isOpen && dataEntries.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Row contents</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      {dataEntries.map(([col, val]) => (
                        <div key={col} className="flex items-baseline gap-2 min-w-0">
                          <span className="text-xs text-gray-400 w-24 shrink-0 capitalize">{col}</span>
                          <span className={cn(
                            'text-xs font-mono truncate',
                            val ? 'text-gray-800' : 'text-gray-300 italic'
                          )}>
                            {val || '(empty)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Fix the rows above in your CSV file, then upload it again.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ImportPage() {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [reportImport, setReportImport] = useState<Import | null>(null)

  const { imports, isLoading } = useImportSync()

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post('/imports', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['imports'], refetchType: 'all' })
    },
    onError: () => setError('Upload failed. Please check the file and try again.')
  })

  const handleFile = (file: File) => {
    setError('')
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are supported')
      return
    }
    uploadMutation.mutate(file)
  }

  const openReport = async (imp: Import) => {
    if ((imp.error_log ?? []).length > 0) {
      setReportImport(imp)
      return
    }
    // Fetch full details in case the list response is stale
    const res = await api.get(`/imports/${imp.id}`)
    setReportImport(res.data.import)
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">Import CSV</h2>
        <p className="text-sm text-gray-500">Upload a CSV file with columns: date, amount, description, category (optional)</p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-6 ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-gray-400 bg-white'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <Upload size={32} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-700 font-medium">Drop CSV file here or click to browse</p>
        <p className="text-sm text-gray-400 mt-1">Supports: date, amount, description, category</p>
        {uploadMutation.isPending && <p className="text-indigo-600 text-sm mt-2">Uploading...</p>}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Sample CSV format */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6">
        <p className="text-xs font-medium text-gray-600 mb-2">Expected CSV format:</p>
        <img
          src="/images/Example_Import_Dataset.png"
          alt="Example CSV import format showing date, description, amount, and category columns"
          className="max-w-full rounded-lg border border-gray-200"
        />
      </div>

      {/* Import history */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Import History</h3>
        {isLoading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : imports.length === 0 ? (
          <div className="text-gray-400 text-sm">No imports yet</div>
        ) : (
          <div className="space-y-2">
            {imports.map(imp => (
              <div key={imp.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-4">
                <FileText size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{imp.filename}</p>
                  <p className="text-xs text-gray-500">{new Date(imp.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className={imp.row_count === 0 && imp.status === 'completed' ? 'text-amber-600 font-medium' : ''}>
                    {imp.status === 'completed' || imp.status === 'failed'
                      ? `${imp.row_count.toLocaleString()} imported`
                      : null}
                  </span>
                  {imp.error_count > 0 && (
                    <button
                      onClick={() => openReport(imp)}
                      className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 hover:underline transition-colors font-medium"
                    >
                      <AlertCircle size={12} />
                      {imp.error_count} {imp.error_count === 1 ? 'error' : 'errors'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {STATUS_ICONS[imp.status]}
                  <span className="text-xs capitalize text-gray-600">{imp.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error report modal */}
      {reportImport && (
        <ErrorReportModal imp={reportImport} onClose={() => setReportImport(null)} />
      )}
    </div>
  )
}
