'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RequisitionForm } from '@/components/requisitions/requisition-form'
import { Plus } from 'lucide-react'

export function NewRequisitionButton() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        New Requisition
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Requisition</DialogTitle>
          </DialogHeader>
          <RequisitionForm
            onSuccess={(id) => {
              setOpen(false)
              router.push(`/dashboard/requisitions/${id}`)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
