import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import type { UserRole } from '@talentos/types'

// Map pathname prefix to page title
function getTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname.startsWith('/dashboard/requisitions')) return 'Requisitions'
  if (pathname.startsWith('/dashboard/candidates')) return 'Candidates'
  if (pathname.startsWith('/dashboard/assessments')) return 'Assessments'
  if (pathname.startsWith('/dashboard/certifications')) return 'Certifications'
  if (pathname.startsWith('/dashboard/placements')) return 'Placements'
  if (pathname.startsWith('/dashboard/analytics')) return 'Analytics'
  if (pathname.startsWith('/dashboard/clients')) return 'Clients'
  if (pathname.startsWith('/dashboard/outreach')) return 'Outreach Campaign'
  if (pathname.startsWith('/dashboard/candidates/import')) return 'Import Candidates'
  if (pathname.startsWith('/intake')) return 'Candidate Intake'
  return 'TalentOS'
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const userMeta = user.user_metadata as {
    full_name?: string
    role?: UserRole
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          title="TalentOS"
          userEmail={user.email}
          userName={userMeta.full_name}
          userRole={userMeta.role ?? 'recruiter'}
        />
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl animate-in-up">{children}</div>
        </main>
      </div>
    </div>
  )
}
