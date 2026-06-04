'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ResumeUpload } from './resume-upload'
import { useUpdateCandidate } from '@/lib/hooks/use-candidates'
import { FileText, StickyNote } from 'lucide-react'

interface CandidateAtsSectionProps {
  candidateId: string
  resumeUrl: string | null
  notes: string | null
}

export function CandidateAtsSection({ candidateId, resumeUrl, notes }: CandidateAtsSectionProps) {
  const update = useUpdateCandidate()
  const [currentResumeUrl, setCurrentResumeUrl] = useState(resumeUrl)

  async function handleResumeUpload(url: string) {
    setCurrentResumeUrl(url)
    await update.mutateAsync({ id: candidateId, resume_url: url })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Resume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResumeUpload
            candidateId={candidateId}
            currentUrl={currentResumeUrl}
            onUpload={handleResumeUpload}
          />
          {currentResumeUrl && (
            <div className="mt-3 rounded border bg-muted/30 overflow-hidden" style={{ height: 200 }}>
              <iframe
                src={currentResumeUrl}
                className="w-full h-full"
                title="Resume preview"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
