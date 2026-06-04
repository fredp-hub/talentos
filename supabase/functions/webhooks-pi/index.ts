import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Webhook receiver for PI assessment results from Predictive Index API.
// Validates the payload signature, then upserts into assessment_results.

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const secret = Deno.env.get('PI_WEBHOOK_SECRET')
  const sig = req.headers.get('x-pi-signature')

  if (!secret || sig !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const payload = await req.json() as {
      candidate_email: string
      framework: string
      scores: {
        personality_fit?: number
        cognitive_score?: number
        derailer_risk?: number
        alignment_score?: number
      }
      administered_at: string
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('email', payload.candidate_email)
      .single()

    if (!candidate) {
      return new Response(JSON.stringify({ error: 'Candidate not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { error } = await supabase.from('assessment_results').insert({
      candidate_id: candidate.id,
      framework: payload.framework,
      raw_data: payload as unknown as Record<string, unknown>,
      personality_fit: payload.scores.personality_fit ?? null,
      cognitive_score: payload.scores.cognitive_score ?? null,
      derailer_risk: payload.scores.derailer_risk ?? null,
      alignment_score: payload.scores.alignment_score ?? null,
      administered_at: payload.administered_at,
    })

    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
