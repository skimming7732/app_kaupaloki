export const staffRoles = ['super_admin', 'administrador', 'supervisor', 'operador', 'comercial', 'dispersor', 'auditor'] as const;
export type StaffRole = typeof staffRoles[number];
export const roleLabels: Record<StaffRole, string> = {
  super_admin: 'Super Admin',
  administrador: 'Administrador',
  supervisor: 'Supervisor',
  operador: 'Operador',
  comercial: 'Comercial',
  dispersor: 'Dispersor',
  auditor: 'Auditor',
};
export const isAdminRole = (role?: string) => role === 'administrador' || role === 'super_admin';
export const canDeleteRole = (role?: string) => ['super_admin', 'administrador', 'supervisor'].includes(role || '');
export const isAuditorRole = (role?: string) => role === 'auditor';
export const requiresCurrencies = (role?: string) => ['comercial', 'dispersor', 'operador'].includes(role || '');
export const canRegisterBusiness = (role?: string) =>
  !isAuditorRole(role) && (isAdminRole(role) || role === 'comercial' || role === 'operador' || role === 'supervisor');
export const canDisperse = (role?: string, authorized?: string[]) =>
  !isAuditorRole(role) && (isAdminRole(role) || role === 'dispersor' || role === 'operador' || role === 'supervisor') && currencyAllowed(role, authorized, 'COP');
export const canManageClients = (role?: string) =>
  !isAuditorRole(role) && (isAdminRole(role) || requiresCurrencies(role) || role === 'supervisor');
export const currencyAllowed = (role: string | undefined, authorized: string[] | undefined, code: string) =>
  !requiresCurrencies(role) || !authorized?.length || authorized.includes(code);
export const supervisorCanRead = (path: string) =>
  !['/panel-control', '/dashboard', '/capital', '/capital-socios', '/socios-inversionistas'].some((root) => path === root || path.startsWith(root + '/'));
export const auditorCanRead = (_path: string) => true;
