/** Roles that may be assigned as matter agent (matches live DB user_role enum). */
export const ASSIGNABLE_AGENT_ROLES = ['owner', 'admin', 'manager', 'agent', 'reviewer'] as const;

export function agentRoleLabel(role: string): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Case Manager';
    case 'agent':
      return 'Migration Agent';
    case 'reviewer':
      return 'Reviewer';
    default:
      return role;
  }
}
