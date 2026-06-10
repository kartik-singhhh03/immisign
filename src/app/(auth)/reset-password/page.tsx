'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push('/login?reset=success');
  };

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in-50">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Set new password</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Enter your new password below.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-6">
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-gray-700 font-semibold">
              New password
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 px-4"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password" className="text-gray-700 font-semibold">
              Confirm new password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 px-4"
            />
          </div>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#111111] text-white font-bold rounded-xl"
          >
            {loading ? 'Updating…' : 'Reset password'}
          </Button>
        </div>
      </form>
      <p className="px-8 text-center text-sm text-gray-500 font-medium">
        Back to{' '}
        <Link href="/login" className="text-[#111111] font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  );
}
