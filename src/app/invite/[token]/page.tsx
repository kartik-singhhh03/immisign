import { createAdminClient } from '@/lib/supabase/admin';
import { InviteAcceptForm } from './InviteAcceptForm';

export default async function InvitePage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const token = params.token;

  // Service-role lookup — invite links are opened without an authenticated session.
  const { data: invite, error } = await admin
    .from('invitations')
    .select('id, email, role, token, expires_at, accepted_at, agency_id, agencies(name)')
    .eq('token', token)
    .single();

  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Invalid or Expired Invitation</h1>
          <p className="mt-2 text-slate-500">Please request a new invitation link from your workspace administrator.</p>
        </div>
      </div>
    );
  }

  if (invite.accepted_at) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Invitation Already Accepted</h1>
          <p className="mt-2 text-slate-500">This invitation link has already been used.</p>
          <a href="/login" className="mt-4 inline-block text-blue-600 hover:underline">Go to Login</a>
        </div>
      </div>
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Invitation Expired</h1>
          <p className="mt-2 text-slate-500">This invitation link has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Join {invite.agencies?.name}</h1>
          <p className="text-slate-500 mb-6">You have been invited to join as a {invite.role}. Please set a password to create your account.</p>
          <InviteAcceptForm token={token} email={invite.email} role={invite.role} />
        </div>
      </div>
    </div>
  );
}
