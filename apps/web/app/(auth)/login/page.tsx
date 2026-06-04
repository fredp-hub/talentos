import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="w-full max-w-md px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">TalentOS</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          AI-powered staffing intelligence
        </p>
      </div>
      <div className="rounded-xl border bg-card shadow-sm p-8">
        <h2 className="mb-6 text-xl font-semibold">Sign in to your account</h2>
        <LoginForm />
      </div>
    </div>
  )
}
