'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react'
import type { CSVCandidateRow, ImportSummary } from '@/app/actions/import-candidates'

// ── CSV parsing (client-side preview) ─────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const values = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').replace(/^"|"$/g, '').trim()
    })
    return row
  })
}

const COLUMN_MAP: Record<string, keyof CSVCandidateRow> = {
  email: 'email',
  full_name: 'full_name',
  name: 'full_name',
  first_name: 'first_name',
  last_name: 'last_name',
  phone: 'phone',
  city: 'location_city',
  location_city: 'location_city',
  state: 'location_state',
  location_state: 'location_state',
  title: 'source_job_title',
  job_title: 'source_job_title',
  source_job_title: 'source_job_title',
  years_experience: 'years_experience',
  experience: 'years_experience',
  skills: 'primary_stack',
  primary_stack: 'primary_stack',
  rate: 'rate_floor_hourly',
  rate_floor_hourly: 'rate_floor_hourly',
  work_type: 'work_type',
  remote: 'remote_preference',
  remote_preference: 'remote_preference',
  availability: 'availability',
  ai_experience: 'ai_experience',
  source: 'source',
  source_job_id: 'source_job_id',
}

function mapRow(raw: Record<string, string>): CSVCandidateRow {
  const mapped: Partial<CSVCandidateRow> = {}
  for (const [key, val] of Object.entries(raw)) {
    const normalized = key.toLowerCase().replace(/\s+/g, '_')
    const field = COLUMN_MAP[normalized]
    if (field) (mapped as Record<string, string>)[field] = val
  }
  return mapped as CSVCandidateRow
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CSVCandidateRow[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportSummary | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text).map(mapRow).filter((r) => r.email)
      setPreview(rows.slice(0, 10))
    }
    reader.readAsText(f)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const f = e.dataTransfer.files[0]
      if (f && f.name.endsWith('.csv')) handleFile(f)
    },
    [handleFile],
  )

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setProgress(0)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text).map(mapRow).filter((r) => r.email)

      // Simulate progress during import
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 5, 90))
      }, 200)

      try {
        const res = await fetch('/api/candidates/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows }),
        })
        const summary: ImportSummary = await res.json()
        clearInterval(progressInterval)
        setProgress(100)
        setResult(summary)
      } catch {
        clearInterval(progressInterval)
        setResult({
          total: rows.length,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: [{ row: 0, email: '', message: 'Network error — please retry' }],
        })
      } finally {
        setImporting(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Candidates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a CSV to bulk-add candidates to the iLabor campaign database
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">
          {file ? file.name : 'Drop a CSV here or click to browse'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Required column: <code>email</code> — all others optional
        </p>
      </div>

      {/* Column mapping hint */}
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Recognized column names</p>
        <div className="flex flex-wrap gap-1">
          {Object.keys(COLUMN_MAP).map((k) => (
            <code key={k} className="text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
              {k}
            </code>
          ))}
        </div>
      </div>

      {/* Preview table */}
      {preview.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">
              Preview — first {preview.length} rows
            </p>
            <button
              onClick={() => { setFile(null); setPreview([]); setResult(null) }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
          <div className="border rounded-xl overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Stack</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Availability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{row.email}</TableCell>
                    <TableCell className="text-xs">{row.full_name ?? `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()}</TableCell>
                    <TableCell className="text-xs">{row.source_job_title ?? '—'}</TableCell>
                    <TableCell className="text-xs">{typeof row.primary_stack === 'string' ? row.primary_stack?.slice(0, 30) : '—'}</TableCell>
                    <TableCell className="text-xs">{row.rate_floor_hourly ? `$${row.rate_floor_hourly}` : '—'}</TableCell>
                    <TableCell className="text-xs">{row.availability ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Import progress */}
      {importing && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Importing…</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-4 ${
          result.errors.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {result.errors.length > 0 ? (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            <span className="font-semibold text-gray-900">Import complete</span>
          </div>
          <div className="flex gap-4 text-sm">
            <div><span className="text-gray-500">Total</span><br /><strong>{result.total}</strong></div>
            <div><span className="text-green-600">Inserted</span><br /><strong>{result.inserted}</strong></div>
            <div><span className="text-blue-600">Updated</span><br /><strong>{result.updated}</strong></div>
            <div><span className="text-gray-400">Skipped</span><br /><strong>{result.skipped}</strong></div>
            {result.errors.length > 0 && (
              <div><span className="text-red-500">Errors</span><br /><strong>{result.errors.length}</strong></div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              {result.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs text-red-600">
                  Row {e.row} ({e.email}): {e.message}
                </p>
              ))}
              {result.errors.length > 5 && (
                <p className="text-xs text-gray-400">+{result.errors.length - 5} more errors</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Import button */}
      {file && !importing && !result && (
        <div className="flex justify-end">
          <Button onClick={handleImport} className="gap-2">
            <FileText className="h-4 w-4" />
            Import Candidates
          </Button>
        </div>
      )}
    </div>
  )
}
