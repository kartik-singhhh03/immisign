/** True when POST /api/agreements/standard confirmed dispatch (native or SignWell). */
export function isAgreementDispatchSuccess(data: {
  signwellResult?: { id?: string | null } | null;
  signingProvider?: string | null;
  signingUrl?: string | null;
}): boolean {
  if (data.signwellResult?.id) return true;
  return data.signingProvider === 'native' && Boolean(data.signingUrl);
}
