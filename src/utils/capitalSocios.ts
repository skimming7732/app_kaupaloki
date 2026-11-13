import { supabase } from '../lib/supabase';

export type CapitalPerson = {
  id: string;
  nombre: string;
  tipo: 'SOCIO' | 'INVERSIONISTA';
  created_by?: string | null;
  created_by_name?: string | null;
  created_at_audit?: string | null;
};
export type CapitalKind = 'CONTRATO' | 'DIVIDENDO' | 'INTERES' | 'LIQUIDACION' | 'ADELANTO' | 'RETIRO';
export type CapitalMethod = 'EFECTIVO' | 'CUENTA' | 'USDT';
export type CapitalMovement = {
  id: string;
  codigo: string;
  socio_id: string;
  fecha: string;
  tipo: CapitalKind;
  monto: number;
  monto_cop: number;
  tasa: number | null;
  medio: CapitalMethod | null;
  cuenta_liquida_id: string | null;
  cuenta_digital_id: string | null;
  contrato_id: string | null;
  condiciones: string | null;
  created_at?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at_audit?: string | null;
  numero?: number | null;
};

export const capitalLabels: Record<CapitalKind, string> = {
  CONTRATO: 'Aporte de capital',
  DIVIDENDO: 'Dividendo',
  INTERES: 'Interés',
  LIQUIDACION: 'Liquidación de saldo',
  ADELANTO: 'Adelanto',
  RETIRO: 'Retiro de capital',
};

export function capitalAmounts(row: CapitalMovement) {
  const amount = Number(row.monto_cop);
  const contribution = row.tipo === 'CONTRATO' ? amount : 0;
  const dividends = row.tipo === 'DIVIDENDO' ? amount : 0;
  const interest = row.tipo === 'INTERES' ? amount : 0;
  const advances = row.tipo === 'ADELANTO' ? amount : 0;
  const liquidaciones = row.tipo === 'LIQUIDACION' ? amount : 0;
  const outflow = row.tipo === 'ADELANTO' || row.tipo === 'LIQUIDACION' || (row.tipo === 'INTERES' && row.medio) ? amount : 0;
  const withdrawal = row.tipo === 'RETIRO' ? amount : 0;
  return {
    contribution,
    dividends,
    interest,
    advances,
    liquidaciones,
    outflow,
    withdrawal,
    capital: contribution - withdrawal,
    balance: dividends + interest - outflow,
  };
}

export function summarizeCapital(rows: CapitalMovement[], people?: CapitalPerson[]) {
  const initial = {
    capital: 0,
    capitalSocios: 0,
    capitalInversionistas: 0,
    balance: 0,
    balanceSocios: 0,
    balanceInversionistas: 0,
    interest: 0,
    interestPaid: 0,
    interestUnpaid: 0,
    dividends: 0,
    advances: 0,
    liquidaciones: 0,
    unabsorbedAdvances: 0,
    sociosPaidDistributions: 0,
    sociosTotalDividends: 0,
  };

  const partnerTypeById = new Map<string, 'SOCIO' | 'INVERSIONISTA'>();
  if (people) {
    for (const p of people) {
      partnerTypeById.set(p.id, p.tipo);
    }
  }

  const byPerson = new Map<string, { capital: number; balance: number; dividends: number; advances: number; liquidaciones: number; interest: number; interestPaid: number; interestUnpaid: number }>();

  for (const row of rows) {
    const amounts = capitalAmounts(row);
    initial.capital += amounts.capital;
    initial.balance += amounts.balance;
    initial.interest += amounts.interest;
    initial.dividends += amounts.dividends;
    initial.advances += amounts.advances;
    initial.liquidaciones += amounts.liquidaciones;

    const isPaidInterest = row.tipo === 'INTERES' && Boolean(row.medio);
    if (isPaidInterest) initial.interestPaid += amounts.interest;
    else if (row.tipo === 'INTERES') initial.interestUnpaid += amounts.interest;

    const current = byPerson.get(row.socio_id) || { capital: 0, balance: 0, dividends: 0, advances: 0, liquidaciones: 0, interest: 0, interestPaid: 0, interestUnpaid: 0 };
    current.capital += amounts.capital;
    current.balance += amounts.balance;
    current.dividends += amounts.dividends;
    current.advances += amounts.advances;
    current.liquidaciones += amounts.liquidaciones;
    current.interest += amounts.interest;
    if (isPaidInterest) current.interestPaid += amounts.interest;
    else if (row.tipo === 'INTERES') current.interestUnpaid += amounts.interest;
    byPerson.set(row.socio_id, current);
  }

  for (const [socioId, stats] of byPerson.entries()) {
    const tipo = partnerTypeById.get(socioId);
    const isSocio = tipo ? tipo === 'SOCIO' : (stats.advances > 0 || stats.dividends > 0);
    if (isSocio) {
      initial.capitalSocios += stats.capital;
      initial.balanceSocios += stats.balance;
      initial.unabsorbedAdvances += Math.max(0, stats.advances - stats.dividends);
      initial.sociosPaidDistributions += stats.advances + stats.liquidaciones;
      initial.sociosTotalDividends += Math.max(stats.dividends, stats.advances);
    } else {
      initial.capitalInversionistas += stats.capital;
      initial.balanceInversionistas += stats.balance;
    }
  }

  return initial;
}

export function summarizeCapitalPeople(rows: CapitalMovement[], people: CapitalPerson[]) {
  const totals = new Map<string, { aportadoCOP: number; retiradoCOP: number }>();
  for (const row of rows) {
    const current = totals.get(row.socio_id) || { aportadoCOP: 0, retiradoCOP: 0 };
    const amounts = capitalAmounts(row);
    current.aportadoCOP += amounts.contribution;
    current.retiradoCOP += amounts.withdrawal;
    totals.set(row.socio_id, current);
  }
  return people.map((person) => {
    const amounts = totals.get(person.id) || { aportadoCOP: 0, retiradoCOP: 0 };
    return { nombre: person.nombre, tipo: person.tipo, ...amounts, capitalCOP: amounts.aportadoCOP - amounts.retiradoCOP };
  }).sort((a, b) => b.capitalCOP - a.capitalCOP || a.nombre.localeCompare(b.nombre));
}

export async function loadCapitalRows<T>(table: 'capital_socios' | 'capital_movimientos'): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from(table).select('*');
    if (table === 'capital_movimientos') {
      query = query
        .order('fecha', { ascending: false })
        .order('created_at_audit', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .order('numero', { ascending: false, nullsFirst: false })
        .order('id');
    } else {
      query = query.order('nombre', { ascending: true }).order('id');
    }
    const { data, error } = await query.range(offset, offset + 499);
    if (error) throw error;
    const batch = (data || []) as T[];
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}
