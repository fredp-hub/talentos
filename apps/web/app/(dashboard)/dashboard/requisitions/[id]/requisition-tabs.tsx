'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PipelineBoard } from '@/components/requisitions/pipeline-board'
import { AiMatchPanel } from '@/components/requisitions/ai-match-panel'
import { ScreeningQuestions } from '@/components/requisitions/screening-questions'

interface RequisitionTabsProps {
  requisitionId: string
  jobDescription: string | null
}

export function RequisitionTabs({ requisitionId, jobDescription }: RequisitionTabsProps) {
  return (
    <Tabs defaultValue="pipeline">
      <TabsList>
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        <TabsTrigger value="ai">AI Matching</TabsTrigger>
        <TabsTrigger value="screening">Screening</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
      </TabsList>

      <TabsContent value="pipeline" className="mt-4">
        <PipelineBoard requisitionId={requisitionId} />
      </TabsContent>

      <TabsContent value="ai" className="mt-4">
        <AiMatchPanel requisitionId={requisitionId} />
      </TabsContent>

      <TabsContent value="screening" className="mt-4">
        <ScreeningQuestions requisitionId={requisitionId} />
      </TabsContent>

      <TabsContent value="details" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            {jobDescription ? (
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                {jobDescription}
              </pre>
            ) : (
              <p className="text-muted-foreground text-sm">No job description provided.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
