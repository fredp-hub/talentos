import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@talentos/types'

export async function POST(req: NextRequest) {
  try {
    const { candidate_id, filename } = await req.json()
    if (!candidate_id || !filename) {
      return NextResponse.json({ error: 'candidate_id and filename required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list: Array<{ name: string; value: string; options?: object }>) => {
            try {
              list.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
              )
            } catch {}
          },
        },
      }
    )

    const storagePath = `${candidate_id}/${Date.now()}_${filename}`

    const { data, error } = await supabase.storage
      .from('resumes')
      .createSignedUploadUrl(storagePath)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      signed_url: data.signedUrl,
      path: storagePath,
      token: data.token,
    })
  } catch (err) {
    console.error('[resumes/upload]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
