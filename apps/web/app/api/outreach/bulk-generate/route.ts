import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bulkGenerateOutreach } from '@/app/actions/generate-outreach'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidateIds, reqId, channel } = await request.json()
  if (!Array.isArray(candidateIds) || !reqId) {
    return NextResponse.json({ error: 'candidateIds[] and reqId required' }, { status: 400 })
  }

  if (candidateIds.length > 50) {
    return NextResponse.json({ error: 'Max 50 at once' }, { status: 400 })
  }

  const result = await bulkGenerateOutreach(candidateIds, reqId, channel ?? 'email')
  return NextResponse.json(result)
}
