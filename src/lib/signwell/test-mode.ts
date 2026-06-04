/** SignWell test_mode: test API does not deliver real signer emails. */
export function signwellTestMode(): boolean {
  if (process.env.SIGNWELL_TEST_MODE === 'true') return true;
  if (process.env.SIGNWELL_TEST_MODE === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}
