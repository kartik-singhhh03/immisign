'use client';

import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-[420px] flex-col justify-center gap-4 p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#0D9F8C]">
        <Mail className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-black text-[#081B2E]">Verify your email</h1>
      <p className="text-sm font-medium text-slate-600">
        If email confirmation is enabled for your workspace, check your inbox and follow the link
        before signing in. Agency owners created via signup are confirmed automatically.
      </p>
      <Button asChild className="mx-auto mt-2 rounded-xl bg-[#0D9F8C] font-bold">
        <Link href="/login">Back to login</Link>
      </Button>
    </div>
  );
}
