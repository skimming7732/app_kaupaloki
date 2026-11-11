export const staffRoles = ['super_admin', 'administrador', 'supervisor', 'operador', 'comercial', 'dispersor'] as const;
export type StaffRole = typeof staffRoles[number];
export const roleLabels: Record<StaffRole, string> = {
  super_admin: 'Super Admin', administrador: 'Administrador', supervisor: 'Supervisor',
  operador: 'Operador', comercial: 'Comercial', dispersor: 'Dispersor',
};
export const isAdminRole = (role?: string) => role === 'administrador' || role === 'super_admin';
export const requiresCurrencies = (role?: string) => ['comercial', 'dispersor', 'operador'].includes(role || '');
export const canRegisterBusiness = (role?: string) => isAdminRole(role) || role === 'comercial' || role === 'operador';
export const canDisperse = (role?: string, authorized?: string[]) =>
  (isAdminRole(role) || role === 'dispersor' || role === 'operador') && currencyAllowed(role, authorized, 'COP');
export const canManageClients = (role?: string) => isAdminRole(role) || requiresCurrencies(role);
export const currencyAllowed = (role: string | undefined, authorized: string[] | undefined, code: string) =>
  !requiresCurrencies(role) || !authorized?.length || authorized.includes(code);
export const supervisorCanRead = (path: string) =>
  !['/panel-control', '/dashboard', '/capital', '/capital-socios', '/socios-inversionistas'].some((root) => path === root || path.startsWith(root + '/'));
