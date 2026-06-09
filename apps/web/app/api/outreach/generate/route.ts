import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAndLogOutreach } from '@/app/actions/generate-outreach'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidateId, reqId, channel } = await request.json()
  if (!candidateId || !reqId) {
    return NextResponse.json({ error: 'candidateId and reqId required' }, { status: 400 })
  }

  try {
    const result = await generateAndLogOutreach({ candidateId, reqId, channel })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
