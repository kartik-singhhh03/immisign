'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const redirectTo = `${base}/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="animate-in fade-in-50">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-[#111111]">
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>
      <div className="mt-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAFAFA] text-[#111111]">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-tight text-[#111111]">
          Reset your password
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Enter your work email and we will send a secure recovery link.
        </p>
      </div>
      {sent ? (
        <p className="mt-8 text-sm font-semibold text-[#111111]">
          Check your inbox for a password reset link.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="email" className="font-bold text-slate-700">
              Work email
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@agency.com.au"
              className="h-12 rounded-xl border-slate-200 bg-white"
            />
          </div>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="h-12 rounded-xl bg-[#111111] text-base font-black hover:bg-[#222222]"
          >
            {loading ? 'Sending…' : 'Send recovery link'}
          </Button>
        </form>
      )}
    </div>
  );
}
