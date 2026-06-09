import { NextRequest, NextResponse } from 'next/server'
import { importCandidates } from '@/app/actions/import-candidates'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { rows } = body

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  if (rows.length > 1000) {
    return NextResponse.json({ error: 'Max 1000 rows per import' }, { status: 400 })
  }

  const summary = await importCandidates(rows)
  return NextResponse.json(summary)
}
