import { Badge } from '@/components/ui/badge'
import { capitalize } from '@/lib/utils'
import type { AssessmentFramework } from '@talentos/types'

const frameworkLabels: Record<AssessmentFramework, string> = {
  PI_behavioral: 'PI Behavioral',
  PI_cognitive: 'PI Cognitive',
  hogan_HPI: 'Hogan HPI',
  hogan_HDS: 'Hogan HDS',
  hogan_MVPI: 'Hogan MVPI',
}

interface AssessmentStatusBadgeProps {
  framework: AssessmentFramework
  score?: number | null
}

export function AssessmentStatusBadge({ framework, score }: AssessmentStatusBadgeProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium">{frameworkLabels[framework]}</span>
      {score != null ? (
        <Badge variant="success">{score.toFixed(1)}</Badge>
      ) : (
        <Badge variant="secondary">Pending</Badge>
      )}
    </div>
  )
}
