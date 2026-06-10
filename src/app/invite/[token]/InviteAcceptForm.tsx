"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { passwordPolicyMessage, validatePassword } from "@/lib/auth/password-policy"

export function InviteAcceptForm({ token, email, role }: { token: string, email: string, role: string }) {
  const supabase = React.useMemo(() => createClient(), [])
  const [password, setPassword] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [oauthLoading, setOauthLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  React.useEffect(() => {
    const completeOauthInvite = async () => {
      const params = new URLSearchParams(window.location.search);
      if (!params.get('oauth')) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return;
      setOauthLoading(true);
      try {
        const res = await fetch('/api/auth/accept-invite-oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to accept invitation via Google');
        router.push(payload.agency_slug ? `/workspace/${payload.agency_slug}/dashboard` : '/dashboard');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'OAuth invite acceptance failed');
      } finally {
        setOauthLoading(false);
      }
    };
    void completeOauthInvite();
  }, [router, supabase, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const policy = validatePassword(password)
      if (!policy.valid) {
        throw new Error(policy.errors.join(' '))
      }
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, fullName })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to accept invitation')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email || email,
        password,
      })
      if (signInError) {
        router.push(`/login?email=${encodeURIComponent(data.email || email)}`)
        return
      }

      router.push(data.agency_slug ? `/workspace/${data.agency_slug}/dashboard` : '/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
      setLoading(false)
    }
  }

  const handleGoogleAccept = async () => {
    setError(null)
    setOauthLoading(true)
    const redirectTo = `${window.location.origin}/invite/${token}?oauth=1`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })
    if (oauthError) {
      setError(oauthError.message)
      setOauthLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">{error}</div>}
      
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
        <Input type="email" value={email} disabled className="bg-slate-50 text-slate-500" />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
        <Input 
          type="text" 
          value={fullName} 
          onChange={(e) => setFullName(e.target.value)} 
          required 
          placeholder="Jane Doe"
          className="bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Create Password</label>
        <Input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          placeholder="••••••••"
          className="bg-white"
          minLength={12}
        />
        <p className="text-[11px] text-slate-400 mt-1">{passwordPolicyMessage()}</p>
      </div>

      <Button type="submit" disabled={loading || oauthLoading} className="w-full bg-[#111111] hover:bg-[#222222] text-white rounded-xl h-12">
        {loading ? "Creating Account..." : "Create Account & Join"}
      </Button>

      <Button type="button" variant="outline" disabled={loading || oauthLoading} onClick={handleGoogleAccept} className="w-full rounded-xl h-12">
        {oauthLoading ? "Connecting Google..." : "Continue with Google"}
      </Button>
    </form>
  )
}
