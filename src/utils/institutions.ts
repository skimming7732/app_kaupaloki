export type InstitutionType =
  | 'bank'
  | 'exchange'
  | 'wallet'
  | 'otc'
  | 'psp'
  | 'fintech'
  | 'payment_system';

export type InstitutionStatus = 'active' | 'inactive' | 'review';

export interface InstitucionRecord {
  id: string;
  name: string;
  type: InstitutionType;
  currency: string;
  divisa_id: string | null;
  country: string;
  website_url: string | null;
  logo_url: string | null;
  status: InstitutionStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at_audit: string | null;
}

export const TYPE_LABELS: Record<InstitutionType, string> = {
  bank: 'Banco',
  exchange: 'Exchange',
  wallet: 'Billetera',
  otc: 'OTC',
  psp: 'PSP',
  fintech: 'Fintech',
  payment_system: 'Sistema de Pagos',
};

export type AssetInstitution = Pick<InstitucionRecord, 'id' | 'name' | 'type' | 'currency' | 'website_url' | 'logo_url' | 'status'>;
