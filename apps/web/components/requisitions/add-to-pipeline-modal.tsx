'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCandidates } from '@/lib/hooks/use-candidates'
import { useAddToPipeline } from '@/lib/hooks/use-requisitions'
import { capitalize } from '@/lib/utils'

interface AddToPipelineModalProps {
  requisitionId: string
  open: boolean
  onClose: () => void
}

export function AddToPipelineModal({ requisitionId, open, onClose }: AddToPipelineModalProps) {
  const [search, setSearch] = useState('')
  const { data: candidates } = useCandidates({ search: search || undefined })
  const add = useAddToPipeline()
  const [added, setAdded] = useState<Set<string>>(new Set())

  async function handleAdd(candidateId: string) {
    try {
      await add.mutateAsync({ candidate_id: candidateId, requisition_id: requisitionId })
      setAdded((prev) => new Set(prev).add(candidateId))
    } catch {
      // candidate may already be in pipeline — ignore
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Candidate to Pipeline</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search candidates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-72 overflow-y-auto divide-y">
            {(candidates ?? []).slice(0, 20).map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {capitalize(c.seniority_level)} · {c.email}
                  </p>
                </div>
                {added.has(c.id) ? (
                  <span className="text-xs text-emerald-600 font-medium">Added</span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleAdd(c.id)}>
                    Add
                  </Button>
                )}
              </div>
            ))}
            {!candidates?.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">No candidates found</p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
