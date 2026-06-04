import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge function: triggered after assessment results are inserted/updated.
// Calls the scoring engine and upserts a new candidate_scores row.

serve(async (req) => {
  try {
    const { candidate_id, role_id } = await req.json() as {
      candidate_id: string
      role_id: string
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch latest assessment data
    const [{ data: aiData }, { data: assessments }, { data: role }] = await Promise.all([
      supabase
        .from('ai_aptitude_assessments')
        .select('*')
        .eq('candidate_id', candidate_id)
        .order('assessed_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('assessment_results')
        .select('*')
        .eq('candidate_id', candidate_id)
        .order('administered_at', { ascending: false })
        .limit(5),
      supabase.from('roles').select('*').eq('id', role_id).single(),
    ])

    if (!aiData || !assessments || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing data to compute score' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Aggregate assessment scores
    const personality_fit =
      assessments.reduce((sum, a) => sum + (a.personality_fit ?? 0), 0) /
      assessments.filter((a) => a.personality_fit != null).length || 0

    const cognitive_score =
      assessments.reduce((sum, a) => sum + (a.cognitive_score ?? 0), 0) /
      assessments.filter((a) => a.cognitive_score != null).length || 0

    const derailer_risk =
      assessments.reduce((sum, a) => sum + (a.derailer_risk ?? 0), 0) /
      assessments.filter((a) => a.derailer_risk != null).length || 0

    // Compute ai_aptitude with 1.4x output_judgment multiplier
    const raw_output = Math.min(aiData.output_judgment_score * 1.4, 100)
    const ai_aptitude_score =
      (aiData.prompt_reasoning_score +
        aiData.tool_breadth_score +
        raw_output +
        aiData.change_tolerance_score) / 4

    const overall_score =
      personality_fit * role.weight_personality +
      cognitive_score * role.weight_cognitive +
      ai_aptitude_score * role.weight_ai_aptitude +
      (assessments[0]?.alignment_score ?? 0) * role.weight_alignment

    // Mark previous scores as not current
    await supabase
      .from('candidate_scores')
      .update({ is_current: false })
      .eq('candidate_id', candidate_id)

    // Insert new current score
    const { error } = await supabase.from('candidate_scores').insert({
      candidate_id,
      overall_score: Math.min(Math.max(overall_score, 0), 100),
      ai_aptitude_score: Math.min(Math.max(ai_aptitude_score, 0), 100),
      personality_fit,
      cognitive_score,
      derailer_risk,
      is_current: true,
      scoring_model_version: Deno.env.get('SCORING_MODEL_VERSION') ?? 'v1.0.0',
      computed_at: new Date().toISOString(),
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
