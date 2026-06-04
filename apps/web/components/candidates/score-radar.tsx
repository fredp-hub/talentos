'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface ScoreRadarProps {
  personality_fit: number
  cognitive_score: number
  ai_aptitude_score: number
  role_alignment: number
}

export function ScoreRadar({
  personality_fit,
  cognitive_score,
  ai_aptitude_score,
  role_alignment,
}: ScoreRadarProps) {
  const data = [
    { dimension: 'Personality', value: personality_fit },
    { dimension: 'Cognitive', value: cognitive_score },
    { dimension: 'AI Aptitude', value: ai_aptitude_score },
    { dimension: 'Role Fit', value: role_alignment },
  ]

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Radar
          name="Score"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(value: number) => [value.toFixed(1), 'Score']}
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
