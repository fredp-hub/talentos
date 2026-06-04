'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, X, Loader2 } from 'lucide-react'

interface ResumeUploadProps {
  candidateId: string
  currentUrl?: string | null
  onUpload: (url: string) => void
}

export function ResumeUpload({ candidateId, currentUrl, onUpload }: ResumeUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Get signed upload URL from our API
      const res = await fetch('/api/resumes/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidateId,
          filename: file.name,
          content_type: file.type,
        }),
      })
      if (!res.ok) throw new Error('Failed to get upload URL')
      const { signed_url, path } = await res.json()

      // Upload directly to Supabase Storage
      const uploadRes = await fetch(signed_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error('Upload failed')

      // Get a long-lived signed URL for viewing
      const supabase = createClient()
      const { data: urlData } = await supabase.storage
        .from('resumes')
        .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 year

      if (urlData?.signedUrl) {
        onUpload(urlData.signedUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {currentUrl ? (
        <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate hover:underline text-primary"
          >
            View Resume
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" />Upload Resume (PDF)</>
          )}
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
