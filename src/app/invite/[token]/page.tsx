'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { dbRoleToUi } from '@/lib/auth/db-roles';

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [invite, setInvite] = React.useState<{
    email: string;
    role: string;
    full_name: string | null;
    agency_name: string;
    agency_slug: string;
  } | null>(null);
  const [fullName, setFullName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/team/invite/${params.token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid invitation');
        setInvite({
          email: data.email,
          role: dbRoleToUi(data.role),
          full_name: data.full_name,
          agency_name: data.agency_name,
          agency_slug: data.agency_slug,
        });
        setFullName(data.full_name || '');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: params.token,
          password,
          full_name: fullName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not accept invitation');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });
      if (signInError) throw signInError;

      router.push(`/workspace/${data.agency_slug || invite.agency_slug}/dashboard`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#0D9F8C] border-t-transparent" />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-[#081B2E]">Invitation unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        <Button asChild className="mt-6">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-2xl font-black text-[#081B2E]">Join {invite?.agency_name}</h1>
      <p className="mt-2 text-sm text-slate-600">
        You were invited as <strong>{invite?.role}</strong>. Set a password to activate your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
        <label className="grid gap-2">
          <Label>Email</Label>
          <Input value={invite?.email || ''} disabled className="h-11 rounded-xl" />
        </label>
        <label className="grid gap-2">
          <Label>Full name</Label>
          <Input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11 rounded-xl"
          />
        </label>
        <label className="grid gap-2">
          <Label>Password</Label>
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl"
          />
        </label>
        <label className="grid gap-2">
          <Label>Confirm password</Label>
          <Input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 rounded-xl"
          />
        </label>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <Button
          type="submit"
          disabled={submitting}
          className="h-12 rounded-xl bg-[#0D9F8C] font-bold"
        >
          {submitting ? 'Creating account…' : 'Accept invitation & sign in'}
        </Button>
      </form>
    </div>
  );
}
