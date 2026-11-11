import { useAuth } from '../context/AuthContext';
import { canRegisterBusiness, canDisperse, canManageClients, isAdminRole, canDeleteRole, isAuditorRole } from './roles';

export type WriteScope = 'business' | 'dispersion' | 'clients' | 'admin' | 'delete';

export function useWriteAccess(scope: WriteScope) {
  const { profile } = useAuth();
  if (!profile || ['inactivo', 'inactive'].includes((profile.status || '').toLowerCase())) return false;
  if (isAuditorRole(profile.role)) return false;
  if (scope === 'delete') return canDeleteRole(profile.role);
  if (scope === 'business') return canRegisterBusiness(profile.role);
  if (scope === 'dispersion') return canDisperse(profile.role, profile.authorized_currencies);
  if (scope === 'clients') return canManageClients(profile.role);
  return isAdminRole(profile.role) || profile.role === 'supervisor';
}
