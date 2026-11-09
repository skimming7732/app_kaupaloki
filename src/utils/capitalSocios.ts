import { supabase } from '../lib/supabase';

export type CapitalPerson = { id: string; nombre: string; tipo: 'SOCIO' | 'INVERSIONISTA' };
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
  const outflow = row.tipo === 'ADELANTO' || row.tipo === 'LIQUIDACION' || (row.tipo === 'INTERES' && row.medio) ? amount : 0;
  const withdrawal = row.tipo === 'RETIRO' ? amount : 0;
  return { contribution, dividends, interest, outflow, withdrawal, capital: contribution - withdrawal, balance: dividends + interest - outflow };
}

export function summarizeCapital(rows: CapitalMovement[]) {
  return rows.reduce((sum, row) => {
    const amounts = capitalAmounts(row);
    sum.capital += amounts.capital;
    sum.balance += amounts.balance;
    sum.interest += amounts.interest;
    sum.dividends += amounts.dividends;
    return sum;
  }, { capital: 0, balance: 0, interest: 0, dividends: 0 });
}

export async function loadCapitalRows<T>(table: 'capital_socios' | 'capital_movimientos'): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const order = table === 'capital_movimientos' ? 'fecha' : 'nombre';
    const { data, error } = await supabase.from(table).select('*')
      .order(order, { ascending: table === 'capital_socios' }).order('id')
      .range(offset, offset + 499);
    if (error) throw error;
    const batch = (data || []) as T[];
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}
