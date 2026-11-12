import { canRegisterBusiness, canDisperse, canManageClients, isAdminRole, canDeleteRole, isAuditorRole } from '../utils/roles';
import { readAllRows } from '../utils/supabasePagination';
import type { CashToken } from '../utils/tokenVoucherGenerator';
import { capitalLabels, loadCapitalRows, summarizeCapital, type CapitalMovement, type CapitalPerson } from '../utils/capitalSocios';
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { dashboardWriteError, writeDashboardRecord } from '../utils/dashboardWrites';
import { compareChronologicalAsc, compareChronologicalDesc, formatCOP } from '../utils/formatters';

const createCode = (prefix: string, id: string) => prefix + '-' + id.replaceAll('-', '').slice(0, 12).toUpperCase();

const negocioGeneratedFields = ['tasa', 'ingreso_cop', 'monto_cop', 'usdt_por_divisa', 'costo_usdt_comp'];

const EDGE_SYNC_URL = 'https://tjuqludeduydarwzhbor.supabase.co/functions/v1/airtable-sync';
const PAT_STORAGE_KEY = 'kaupaloki_data_pat';

export type CatalogTable = 'compras_usdt' | 'ventas_usdt' | 'activos_liquidos' | 'activos_digitales' | 'divisas';

interface CreationAudit {
  createdBy?: string | null;
  createdByName?: string | null;
  createdAtAudit?: string | null;
}

const creationAudit = (record: any): CreationAudit => {
  const rawCreated = record?.created_at ?? record?.createdAt;
  const fallbackCreated =
    rawCreated &&
    !String(rawCreated).startsWith('2026-11-06 17:27:41') &&
    !String(rawCreated).startsWith('2026-11-06T17:27:41')
      ? rawCreated
      : null;
  return {
    createdBy: record?.created_by ?? record?.createdBy,
    createdByName: record?.created_by_name ?? record?.createdByName,
    createdAtAudit: record?.created_at_audit ?? record?.createdAtAudit ?? fallbackCreated,
  };
};

export interface AppUser extends CreationAudit {
  id: string;
  codigo: string;
  nombre: string;
  correo: string;
  rol: string;
  pais?: string;
  divisasAutorizadas?: string[];
  estado: string;
  twoFactorEnabled?: boolean;
}

export interface ResumenLiquidacion {
  totalNegocioCop: number;
  totalClientesIngresosCop?: number;
  saldoNetoClientesCop?: number;
  totalCapitalInvertidoCop?: number;
  rateUsdtCop?: number;
  totalVentasUsdtCop: number;
  totalLiquidezEsperadaCop: number;
  totalGastosCop?: number;
  totalCostosDispersionCop?: number;
  gananciaEsperadaCop: number;
  totalActivosDigitalesUsdt: number;
  totalActivosLiquidosCop: number;
  totalSaldoPendienteClientesCop: number;
}

export type IngresoMensual = { mes: string; montoCop: number };

export interface DataSnapshot {
  syncedAt?: string;
  ingresosMensuales?: IngresoMensual[];
  clientes: any[];
  negocios: any[];
  dispersiones: any[];
  pagos: any[];
  divisas: any[];
  comprasUsdt: any[];
  ventasUsdt: any[];
  transferenciasInternas?: any[];
  activosLiquidos: any[];
  activosDigitales: any[];
  efectivo: any[];
  gastos?: any[];
  comisionistas?: any[];
  usuarios: any[];
  resumenLiquidacion?: ResumenLiquidacion;
}

export interface TransferenciaInterna extends CreationAudit {
  id: string;
  codigo: string;
  fecha: string;
  tipoOrigen: 'ACTIVO_LIQUIDO' | 'ACTIVO_DIGITAL';
  origenId: string;
  origenNombre: string;
  tipoDestino: 'ACTIVO_LIQUIDO' | 'ACTIVO_DIGITAL';
  destinoId: string;
  destinoNombre: string;
  monto: number;
  divisaOrigen: string;
  montoDestino: number;
  divisaDestino: string;
  tasa: number;
  costo: number;
  divisaCosto: string;
  concepto: string;
  notas?: string;
  comprobanteUrl?: string;
  raw: any;
}

export interface GastoItem extends CreationAudit {
  id: string;
  codigo: string;
  concepto: string;
  categoria: string;
  divisa: 'COP' | 'USDT';
  monto: number;
  origenFondos: string;
  fecha: string;
  comprobanteUrl?: string;
  comprobanteNombre?: string;
  origenFondosId?: string;
  raw: any;
}

export interface NormalizedData {
  clientes: Array<CreationAudit & {
    id: string;
    codigo: string;
    nombre: string;
    pais?: string;
    totalNegocios: number;
    totalIngresosCOP: number;
    totalDispersadoCOP: number;
    saldoPendienteCOP: number;
    porCobrarCOP: number;
    esComisionista: boolean;
    comisionaDeIds: string[];
    totalComisionesCOP: number;
    estado: string;
    dispersionesIds?: string[];
    negociosIds?: string[];
    efectivoIds?: string[];
    raw: any;
  }>;
  negocios: Array<CreationAudit & {
    id: string;
    codigo: string;
    fecha: string;
    clienteId?: string;
    clienteRecordId?: string;
    clienteCodigo?: string;
    clienteNombre: string;
    divisaId?: string;
    divisaCodigo: string;
    montoDivisa: number;
    tasaCambio: number;
    ingresoCOP: number;
    estado: string;
    raw: any;
  }>;
  dispersiones: Array<CreationAudit & {
    id: string;
    codigo: string;
    fecha: string;
    clienteId?: string;
    clienteRecordId?: string;
    clienteCodigo?: string;
    clienteNombre: string;
    monto: number;
    costoCop: number;
    costoOrigenAplicado: boolean;
    origenFondos: string;
    origenFondosId?: string;
    referencia?: string;
    comprobanteUrl?: string;
    estado: string;
    raw: any;
  }>;
  efectivo: Array<CreationAudit & {
    id: string;
    codigo: string;
    fecha: string;
    tipo: 'Ingreso' | 'Pago';
    origenFondosId?: string;
    clienteId?: string;
    clienteRecordId?: string;
    clienteCodigo?: string;
    clienteNombre: string;
    monto: number;
    comisionCop?: number;
    origenFondos: string;
    referencia?: string;
    raw: any;
  }>;
  gastos: GastoItem[];
  divisas: Array<CreationAudit & {
    id: string;
    codigo: string;
    nombre: string;
    nombreDivisa?: string;
    banderaUrl?: string;
    pais: string;
    totalRecibido: number;
    totalComprado: number;
    totalPendiente: number;
    estado?: string;
    raw: any;
  }>;
  comprasUsdt: Array<CreationAudit & {
    id: string;
    codigo: string;
    fecha: string;
    proveedor?: string;
    divisaCodigo: string;
    valorComprado: number;
    usdtComprado: number;
    tasa: number;
    costo: number;
    walletDestino?: string;
    walletDestinoId?: string;
    estado: 'pendiente' | 'recibido';
    saldoCompraAplicado?: boolean;
    fechaRecibido?: string | null;
    recibidoPor?: string | null;
    raw: any;
  }>;
  ventasUsdt: Array<CreationAudit & {
    id: string;
    codigo: string;
    fecha: string;
    concepto: string;
    usdtVendido: number;
    feeUsdt: number;
    tasa: number;
    totalCOP: number;
    destinoFondosNombre?: string;
    walletOrigen?: string;
    walletOrigenId?: string;
    destinoFondosId?: string;
    estado: 'pendiente' | 'recibido';
    saldoVentaAplicado?: boolean;
    fechaRecibido?: string | null;
    recibidoPor?: string | null;
    raw: any;
  }>;
  comisionistas: Array<CreationAudit & {
    id: string;
    codigo: string;
    comisionistaId?: string;
    comisionistaNombre: string;
    comisionaDeIds: string[];
    comisionaDeNombres: string[];
    ingresosCOP: number;
    porcentajeComision: number;
    comisionesCOP: number;
    fechaCreacion?: string;
    raw: any;
  }>;
  transferenciasInternas: TransferenciaInterna[];
  usuarios: AppUser[];
  activosLiquidos: any[];
  activosDigitales: any[];
}

export interface MetricsSummary {
  totalActivosLiquidos: number;
  totalActivosDigitales: number;
  saldoPendienteClientes: number;
  totalPorCobrarClientesCOP: number;
  saldoNetoClientesCOP: number;
  gananciaEsperada: number;
  totalNegocioCOP: number;
  totalClientesIngresosCOP: number;
  totalVentasUSDT: number;
  liquidezEsperada: number;
  totalGastosCOP: number;
  totalCostosDispersionCOP: number;
  interesesSociosCOP: number;
  interesesPagadosCOP: number;
  interesesPendientesCOP: number;
  capitalInvertidoCOP: number | null;
  capitalSociosCOP: number;
  capitalInversionistasCOP: number;
  adelantosSociosCOP: number;
  dividendosSociosCOP: number;
  saldoPendienteSociosCOP: number;
  distribucionPagadaSociosCOP: number;
  compromisosPendientesCOP: number;
  totalPagadoSociosInversionistasCOP: number;
  adelantosPendientesSociosCOP: number;
  gananciaDespuesDividendosCOP: number;
  rateUsdtCop: number;
}

interface DataContextType {
  snapshot: DataSnapshot;
  data: NormalizedData;
  metrics: MetricsSummary;
  loading: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncTime: string;
  syncData: (forceLive?: boolean) => Promise<void>;
  createCatalogRecord: (table: CatalogTable, fields: Record<string, string | number>, editId?: string) => Promise<void>;
  createRecord: (table: string, fields: any) => Promise<any>;
  updateRecord: (table: string, id: string, fields: any) => Promise<any>;
  createNegocio: (payload: any) => Promise<boolean>;
  updateNegocio: (payload: any) => Promise<boolean>;
  deleteNegocio: (id: string) => Promise<boolean>;
  deleteCliente: (id: string) => Promise<boolean>;
  deleteDispersion: (id: string) => Promise<boolean>;
  deleteGasto: (id: string) => Promise<boolean>;
  deleteComisionista: (id: string) => Promise<boolean>;
  deleteCatalogRecord: (table: CatalogTable, id: string) => Promise<boolean>;
  updateRateUsdt: (rate: number) => Promise<boolean>;
  createDispersion: (payload: any) => Promise<boolean>;
  updateDispersion: (payload: any) => Promise<boolean>;
  updateGasto: (payload: any) => Promise<boolean>;
  createMovimientoEfectivo: (payload: any, onTokenCreated?: (token: CashToken) => void) => Promise<boolean>;
  updateMovimientoEfectivo: (payload: any) => Promise<boolean>;
  deleteMovimientoEfectivo: (id: string) => Promise<boolean>;
  createGasto: (payload: any) => Promise<boolean>;
  createCliente: (nombre: string, pais?: string, authorId?: string) => Promise<any>;
  updateCliente: (payload: { id: string; nombre?: string; pais?: string; authorId?: string }) => Promise<boolean>;
  deleteUser: (idOrEmail: string) => Promise<{ success: boolean; error?: string }>;
  adminReset2FA: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  sendUserInvite: (email: string, fullName?: string) => Promise<{ success: boolean; actionLink?: string; error?: string }>;
  createTransferenciaInterna: (payload: any) => Promise<boolean>;
  updateTransferenciaInterna: (id: string, payload: any) => Promise<boolean>;
  deleteTransferenciaInterna: (id: string) => Promise<boolean>;
  updateUserPermissions: (payload: any) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
  saveComisionista: (payload: { id?: string; comisionistaId: string; comisionaDeIds: string[]; porcentajeComision: number }) => Promise<boolean>;
  marcarCompraRecibida: (compraId: string) => Promise<boolean>;
  marcarVentaRecibida: (ventaId: string) => Promise<boolean>;
}

const defaultSnapshot: DataSnapshot = {
  clientes: [],
  negocios: [],
  dispersiones: [],
  pagos: [],
  divisas: [],
  comprasUsdt: [],
  ventasUsdt: [],
  transferenciasInternas: [],
  comisionistas: [],
  activosLiquidos: [],
  activosDigitales: [],
  efectivo: [],
  gastos: [],
  usuarios: [],
};

const DataContext = createContext<DataContextType>({} as DataContextType);

const snapshotTables = {
  clientes: { key: 'clientes', normalize: (c: any) => ({
  ...creationAudit(c),
  id: c.id,
  codigo: c.codigo,
  nombre: c.nombre,
  pais: c.pais,
  numero: c.numero,
  ingresosCop: Number(c.ingresos_cop || 0),
  pagadoCop: Number(c.pagado_cop || 0),
  pendienteCop: Number(c.pendiente_cop || 0),
  saldoCop: c.saldo_cop == null ? undefined : Number(c.saldo_cop),
  estado: c.estado,
  fechaCreacion: c.fecha_creacion,
}) },
  divisas: { key: 'divisas', normalize: (d: any) => ({
  ...creationAudit(d),
  id: d.id,
  codigo: d.codigo,
  divisa: d.divisa,
  nombreDivisa: d.nombre_divisa,
  pais: d.pais,
  banderaUrl: d.bandera_url,
  totalRecibido: Number(d.total_recibido || 0),
  totalComprado: Number(d.total_comprado || 0),
  totalPendiente: Number(d.total_pendiente || 0),
}) },
  negocios: { key: 'negocios', normalize: (n: any) => ({
  ...creationAudit(n),
  id: n.id,
  codigo: n.codigo,
  numero: n.numero,
  fecha: n.fecha,
  clienteId: n.cliente_id,
  clienteCodigo: n.cliente_codigo,
  clienteNombre: n.cliente_nombre,
  divisaCodigo: n.divisa_codigo,
  montoDivisa: Number(n.monto_divisa || 0),
  cantidadDivisa: Number(n.monto_divisa || 0),
  tasa: Number(n.tasa || 0),
  tasaClienteCop: Number(n.tasa_cliente_cop || n.tasa || 0),
  ingresoCop: Number(n.ingreso_cop || 0),
  montoCop: Number(n.monto_cop || n.ingreso_cop || 0),
  usdtPorDivisa: Number(n.usdt_por_divisa || 0),
  costoUsdtComp: Number(n.costo_usdt_comp || 0),
  estado: n.estado,
}) },
  dispersiones: { key: 'dispersiones', normalize: (d: any) => ({
  ...creationAudit(d),
  id: d.id,
  codigo: d.codigo,
  numero: d.numero,
  fecha: d.fecha ? String(d.fecha).slice(0, 10) : '',
  clienteId: d.cliente_id,
  clienteCodigo: d.cliente_codigo,
  clienteNombre: d.cliente_nombre,
  monto: Number(d.monto || d.monto_cop || 0),
  montoCop: Number(d.monto_cop || d.monto || 0),
  costoCop: Number(d.costo_cop ?? 0),
  costoOrigenAplicado: d.costo_origen_aplicado === true,
  origenFondos: d.origen_fondos,
  origenFondosId: d.origen_fondos_id,
  referencia: d.referencia,
  estado: d.estado,
  tieneComprobante: Boolean(d.tiene_comprobante),
  comprobanteUrl: d.comprobante_url,
}) },
  compras_usdt: { key: 'comprasUsdt', normalize: (c: any) => ({
  ...creationAudit(c),
  id: c.id,
  codigo: c.codigo,
  numero: c.numero,
  fecha: c.fecha,
  proveedor: c.proveedor || '',
  divisaCodigo: c.divisa_codigo,
  valorComprado: Number(c.valor_comprado || 0),
  usdtComprado: Number(c.usdt_comprado || 0),
  tasa: Number(c.tasa || 0),
  costo: Number(c.costo || 0),
  walletDestino: c.wallet_destino,
  walletDestinoId: c.wallet_destino_id,
  estado: ((c.estado || 'recibido').toLowerCase()) as 'pendiente' | 'recibido',
  saldoCompraAplicado: c.saldo_compra_aplicado ?? true,
  fechaRecibido: c.fecha_recibido,
  recibidoPor: c.recibido_por,
  raw: c,
}) },
  ventas_usdt: { key: 'ventasUsdt', normalize: (v: any) => ({
  ...creationAudit(v),
  id: v.id,
  codigo: v.codigo,
  numero: v.numero,
  fecha: v.fecha,
  concepto: v.concepto,
  usdtVendido: Number(v.usdt_vendido || 0),
  feeUsdt: Number(v.fee_usdt ?? 0),
  tasa: Number(v.tasa || 0),
  totalCop: Number(v.total_cop || 0),
  walletOrigen: v.wallet_origen,
  walletOrigenId: v.wallet_origen_id,
  destinoFondosId: v.destino_fondos_id,
  destinoFondosNombre: v.destino_fondos_nombre,
  estado: ((v.estado || 'recibido').toLowerCase()) as 'pendiente' | 'recibido',
  saldoVentaAplicado: v.saldo_venta_aplicado ?? true,
  fechaRecibido: v.fecha_recibido,
  recibidoPor: v.recibido_por,
  raw: v,
}) },
  activos_liquidos: { key: 'activosLiquidos', normalize: (a: any) => ({
  ...creationAudit(a),
  id: a.id,
  activo: a.activo,
  institucion: a.institucion,
  institucionId: a.institucion_id,
  institution: a.institution,
  tipo: a.tipo,
  titular: a.titular,
  empresa: a.empresa,
  cuenta: a.cuenta,
  divisa: a.divisa,
  pais: a.pais || 'Colombia',
  apiId: a.api_id || a.identificador_api || '',
  tarifas: a.tarifas,
  saldoCop: Number(a.saldo_cop || 0),
  saldoReal: (a.saldo_real !== null && a.saldo_real !== undefined && a.saldo_real !== '' && (a.institucion || '').toUpperCase() !== 'EFECTIVO' && !(a.activo || '').toUpperCase().includes('EFECTIVO'))
    ? Number(a.saldo_real)
    : null,
  saldoInicial: a.saldo_inicial == null ? null : Number(a.saldo_inicial),
  ingresosCop: Number(a.ingresos_cop || 0),
  egresosCop: Number(a.egresos_cop || 0),
  movimientos: a.movimientos || [],
}) },
  activos_digitales: { key: 'activosDigitales', normalize: (d: any) => ({
  ...creationAudit(d),
  id: d.id,
  activo: d.titular || d.activo || 'Billetera USDT',
  idWallet: d.id_wallet,
  institucionId: d.institucion_id,
  institution: d.institution,
  tipo: d.tipo,
  wallet: d.wallet,
  red: d.red,
  titular: d.titular || d.activo || '',
  pais: d.pais || 'Colombia',
  tarifas: d.tarifas,
  saldoUsdt: Number(d.saldo_usdt || 0),
  saldoReal: (d.saldo_real !== null && d.saldo_real !== undefined && d.saldo_real !== '')
    ? Number(d.saldo_real)
    : null,
  saldoInicial: d.saldo_inicial == null ? null : Number(d.saldo_inicial),
  ingresosUsdt: Number(d.ingresos_usdt || 0),
  egresosUsdt: Number(d.egresos_usdt || 0),
  rateFinal: Number(d.rate_final || 3230),
  liquidezEsperadaCop: Number(d.liquidez_esperada_cop || 0),
  movimientos: d.movimientos || [],
}) },
  efectivo: { key: 'efectivo', normalize: (e: any) => ({
  ...creationAudit(e),
  id: e.id,
  codigo: e.codigo,
  fecha: e.fecha,
  tipo: e.tipo,
  clienteId: e.cliente_id,
  clienteCodigo: e.cliente_codigo,
  clienteNombre: e.cliente_nombre,
  monto: Number(e.monto || 0),
  comisionCop: Number(e.comision_cop ?? 0),
  origenFondos: e.origen_fondos,
  origenFondosId: e.origen_fondos_id,
  referencia: e.referencia,
}) },
  gastos: { key: 'gastos', normalize: (g: any) => ({
  ...creationAudit(g),
  id: g.id,
  codigo: g.codigo,
  fecha: g.fecha,
  concepto: g.concepto,
  categoria: g.categoria,
  divisa: g.divisa,
  monto: Number(g.monto || 0),
  origenFondos: g.origen_fondos,
  origenFondosId: g.origen_fondos_id,
  comprobanteUrl: g.comprobante_url,
}) },
  profiles: { key: 'usuarios', normalize: (p: any) => ({
  ...creationAudit(p),
  id: p.id,
  codigo: p.operator_code || p.full_name || 'USR',
  nombre: p.full_name || p.email || 'Usuario',
  correo: p.email || '',
  rol: p.role || 'operador',
  pais: p.pais || 'Colombia',
  divisasAutorizadas: p.authorized_currencies || [],
  estado: ['invitado', 'invited'].includes(String(p.status).toLowerCase()) ? 'Invitado'
    : ['inactivo', 'inactive'].includes(String(p.status).toLowerCase()) ? 'Inactivo' : 'Activo',
  twoFactorEnabled: Boolean(p.two_factor_enabled),
}) },
  comisionistas: { key: 'comisionistas', normalize: (c: any) => ({
  ...creationAudit(c),
  id: c.id,
  codigo: c.codigo,
  comisionistaClienteId: c.cliente_id,
  comisionaDeIds: Array.isArray(c.referidos_ids) ? c.referidos_ids : [],
  porcentajeComision: Number(c.porcentaje_comision),
  ingresosCOP: Number(c.ingresos_cop || 0),
  comisionesCOP: Number(c.comisiones_cop || 0),
  fechaCreacion: c.fecha_creacion,
}) },
  transferencias_internas: { key: 'transferenciasInternas', normalize: (row: any) => row },
} as const;

type SnapshotTable = keyof typeof snapshotTables;

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, refreshProfile } = useAuth();
  const requireWrite = (scope: 'business' | 'dispersion' | 'clients' | 'admin' | 'delete') => {
    if (isAuditorRole(profile?.role)) {
      throw new Error('El rol de auditor es de solo lectura y no permite modificaciones.');
    }
    const allowed =
      scope === 'delete'
        ? canDeleteRole(profile?.role)
        : scope === 'business'
        ? canRegisterBusiness(profile?.role)
        : scope === 'dispersion'
        ? canDisperse(profile?.role, profile?.authorized_currencies)
        : scope === 'clients'
        ? canManageClients(profile?.role)
        : isAdminRole(profile?.role) || profile?.role === 'supervisor';
    if (!allowed) throw new Error('Tu rol no permite modificar estos registros.');
  };
  const userId = user?.id;
  const latestFetch = useRef(0);
  const activeUserId = useRef(userId);
  activeUserId.current = userId;
  const refreshOwner = useRef(userId);
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refreshRequested = useRef(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snapshot, setSnapshot] = useState<DataSnapshot>(() => {
    try {
      const saved = localStorage.getItem('kaupaloki_cached_snapshot');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultSnapshot;
  });
  const [capitalLedger, setCapitalLedger] = useState<{ userId?: string; rows: CapitalMovement[]; people: CapitalPerson[] }>({ rows: [], people: [] });
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const getPat = () => localStorage.getItem(PAT_STORAGE_KEY) || undefined;

  const applySnapshot = useCallback((newSnap: DataSnapshot) => {
    if (!newSnap) return;
    setSnapshot(newSnap);
    try {
      localStorage.setItem('kaupaloki_cached_snapshot', JSON.stringify(newSnap));
    } catch {}
    const now = new Date();
    setLastSyncTime(
      now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }, []);

  const fetchSnapshot = useCallback(async () => {
    const request = ++latestFetch.current;
    setSyncStatus('syncing');
    try {
      const capitalPromise = userId
        ? loadCapitalRows<CapitalMovement>('capital_movimientos').then(async (rows) => ({
          rows,
          people: rows.length ? await loadCapitalRows<CapitalPerson>('capital_socios').catch(() => []) : [],
        })).catch(() => null)
        : Promise.resolve({ rows: [], people: [] });
      const results = await Promise.all([
        readAllRows(() => supabase.from('clientes').select('*').order('numero', { ascending: false }).order('id')),
        supabase.from('divisas').select('*'),
        readAllRows(() => supabase.from('negocios').select('*').order('fecha', { ascending: false }).order('created_at_audit', { ascending: false, nullsFirst: false }).order('numero', { ascending: false }).order('id')),
        readAllRows(() => supabase.from('dispersiones').select('*').order('fecha', { ascending: false }).order('created_at_audit', { ascending: false, nullsFirst: false }).order('numero', { ascending: false }).order('id')),
        readAllRows(() => supabase.from('compras_usdt').select('*').order('fecha', { ascending: false }).order('created_at_audit', { ascending: false, nullsFirst: false }).order('numero', { ascending: false }).order('id')),
        readAllRows(() => supabase.from('ventas_usdt').select('*').order('fecha', { ascending: false }).order('created_at_audit', { ascending: false, nullsFirst: false }).order('numero', { ascending: false }).order('id')),
        supabase.from('activos_liquidos').select('*, institution:instituciones(id,name,type,currency,website_url,logo_url,color,status)'),
        supabase.from('activos_digitales').select('*, institution:instituciones(id,name,type,currency,website_url,logo_url,color,status)'),
        readAllRows(() => supabase.from('efectivo').select('*').order('fecha', { ascending: false }).order('created_at_audit', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false, nullsFirst: false }).order('id')),
        readAllRows(() => supabase.from('gastos').select('*').order('fecha', { ascending: false }).order('created_at_audit', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false, nullsFirst: false }).order('id')),
        readAllRows(() => supabase.from('transferencias_internas').select('*').order('fecha', { ascending: false }).order('created_at_audit', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false, nullsFirst: false }).order('id')),
        supabase.from('resumen_liquidacion').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.rpc('listar_perfiles_dashboard'),
        readAllRows(() => supabase.rpc('listar_comisionistas_dashboard')),
        supabase.rpc('ingresos_mensuales_inicio').then(({ data, error }) => {
          if (error) console.error('Error loading monthly customer income:', error);
          return { data, error: null };
        }),
      ]);
      if (request !== latestFetch.current) return;
      for (const { error } of results) {
        if (error && !['42501', 'PGRST205'].includes(error.code)) throw error;
      }
      const [
        clientesData, divisasData, negociosData, dispersionesData, comprasUsdtData,
        ventasUsdtData, activosLiquidosData, activosDigitalesData, efectivoData,
        gastosData, transferenciasInternasData, resumenData, profilesData, comisionistasData, ingresosMensualesData,
      ] = results.map((result) => result.data);

      const clientes = (clientesData || []).map(snapshotTables.clientes.normalize);

      const divisas = (divisasData || []).map(snapshotTables.divisas.normalize);

      const negocios = (negociosData || []).map(snapshotTables.negocios.normalize);

      const dispersiones = (dispersionesData || []).map(snapshotTables.dispersiones.normalize);

      const comprasUsdt = (comprasUsdtData || []).map(snapshotTables.compras_usdt.normalize);

      const ventasUsdt = (ventasUsdtData || []).map(snapshotTables.ventas_usdt.normalize);

      const activosLiquidos = (activosLiquidosData || []).map(snapshotTables.activos_liquidos.normalize);

      const activosDigitales = (activosDigitalesData || []).map(snapshotTables.activos_digitales.normalize);

      const efectivo = (efectivoData || []).map(snapshotTables.efectivo.normalize);

      const gastos = (gastosData || []).map(snapshotTables.gastos.normalize);

      const usuarios = (profilesData || []).map(snapshotTables.profiles.normalize);

      const comisionistas = (comisionistasData || []).map(snapshotTables.comisionistas.normalize);

      const resumenLiquidacion: ResumenLiquidacion | undefined = resumenData ? {
        totalNegocioCop: Number(resumenData.total_negocio_cop ?? 0),
        totalVentasUsdtCop: Number(resumenData.total_ventas_usdt_cop ?? 0),
        totalLiquidezEsperadaCop: Number(resumenData.total_liquidez_esperada_cop ?? 0),
        gananciaEsperadaCop: Number(resumenData.ganancia_esperada_cop ?? 0),
        totalActivosDigitalesUsdt: Number(resumenData.total_activos_digitales_usdt ?? 0),
        totalActivosLiquidosCop: Number(resumenData.total_activos_liquidos_cop ?? 0),
        totalSaldoPendienteClientesCop: Number(resumenData.total_saldo_pendiente_clientes_cop ?? 0),
        saldoNetoClientesCop: resumenData.saldo_neto_clientes_cop == null ? undefined : Number(resumenData.saldo_neto_clientes_cop),
        totalCapitalInvertidoCop: resumenData.total_capital_invertido_cop == null ? undefined : Number(resumenData.total_capital_invertido_cop),
        totalGastosCop: resumenData.total_gastos_cop == null ? undefined : Number(resumenData.total_gastos_cop),
        totalCostosDispersionCop: resumenData.total_costos_dispersion_cop == null ? undefined : Number(resumenData.total_costos_dispersion_cop),
        rateUsdtCop: Number(resumenData.rate_usdt_cop || 3950),
      } : undefined;

      const newSnapshot: DataSnapshot = {
        syncedAt: new Date().toISOString(),
        ingresosMensuales: (ingresosMensualesData || []).map((row: { mes: string; monto_cop: number | string }) => ({
          mes: row.mes, montoCop: Number(row.monto_cop),
        })),
        clientes,
        divisas,
        negocios,
        dispersiones,
        pagos: dispersiones,
        comprasUsdt,
        ventasUsdt,
        transferenciasInternas: transferenciasInternasData || [],
        activosLiquidos,
        activosDigitales,
        efectivo,
        gastos,
        usuarios,
        comisionistas,
        resumenLiquidacion,
      };

      const capitalRows = await capitalPromise;
      if (request !== latestFetch.current) return;
      if (capitalRows !== null) setCapitalLedger({ userId, ...capitalRows });
      applySnapshot(newSnapshot);
      setSyncStatus('synced');
      setTimeout(() => {
        if (request === latestFetch.current) setSyncStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('Error fetching directly from Supabase:', err);
      if (request === latestFetch.current) setSyncStatus('error');
    } finally {
      if (request === latestFetch.current) setLoading(false);
    }
  }, [applySnapshot, userId]);

  const fetchFromSupabase = useCallback(() => {
    refreshRequested.current = true;
    if (refreshInFlight.current && refreshOwner.current === userId) return refreshInFlight.current;
    refreshOwner.current = userId;
    const run = async () => {
      while (refreshRequested.current && activeUserId.current === userId) {
        refreshRequested.current = false;
        await fetchSnapshot();
      }
    };
    const pending = run().finally(() => {
      if (refreshInFlight.current === pending) refreshInFlight.current = null;
    });
    refreshInFlight.current = pending;
    return pending;
  }, [fetchSnapshot, userId]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      void fetchFromSupabase();
    }, 200);
  }, [fetchFromSupabase]);

  // Publish committed rows before background reconciliation. Invalidate older reads.
  const publishMutation = (table: SnapshotTable, row: any | null, deletedId?: string) => {
    if (activeUserId.current !== userId) return;
    latestFetch.current++;
    const { key, normalize } = snapshotTables[table];
    setSnapshot((current) => {
      const rows = (current[key] || []) as any[];
      const normalized = row ? normalize(row) : null;
      const id = row?.id ?? deletedId;
      const exists = rows.some((item) => item.id === id);
      let next = rows.filter((item) => item.id !== id);
      if (normalized) {
        next = exists ? rows.map((item) => item.id === id ? normalized : item) : [normalized, ...rows];
      }
      if (normalized?.fecha) next.sort(compareChronologicalDesc);
      return { ...current, [key]: next, ...(table === 'dispersiones' ? { pagos: next } : {}) };
    });
    scheduleRefresh();
  };

  const refreshSavedRow = async (table: SnapshotTable, id: string) => {
    const fields = table === 'activos_liquidos' || table === 'activos_digitales'
      ? '*, institution:instituciones(id,name,type,currency,website_url,logo_url,color,status)' : '*';
    const { data: row, error } = await supabase.from(table).select(fields).eq('id', id).single();
    if (error) {
      // The write succeeded. A failed refresh must not invite a duplicate retry.
      console.error('Error reading a committed row:', error);
      scheduleRefresh();
      return;
    }
    publishMutation(table, row);
  };

  const refreshUsers = useCallback(async () => {
    const { data: profiles, error } = await supabase.rpc('listar_perfiles_dashboard');
    if (activeUserId.current !== userId) return;
    if (error) {
      console.error('Error refreshing profiles:', error);
    } else {
      latestFetch.current++;
      setSnapshot((current) => ({ ...current, usuarios: (profiles || []).map(snapshotTables.profiles.normalize) }));
    }
    scheduleRefresh();
  }, [scheduleRefresh, userId]);

  const syncData = useCallback(
    async (_forceLive = false) => {
      await fetchFromSupabase();
    },
    [fetchFromSupabase]
  );

  // Normalization layer
  const data: NormalizedData = useMemo(() => {
    // 1. Build Client mapping dictionary (by id and by code)
    const clientMap = new Map<string, string>();
    const clientRecordIdMap = new Map<string, string>(); // maps code/name to record id

    (snapshot.clientes || []).forEach((c: any) => {
      // Primary Airtable column is {CLIENTE} which produces e.g. "C0027-DANIEL-RAMIREZ"
      const fullLabel = c.codigo || c.idCliente || c.cliente || c['CLIENTE'] || c.nombre || 'Cliente';
      if (c.id) {
        clientMap.set(c.id, fullLabel);
        clientRecordIdMap.set(c.id, c.id);
      }
      if (c.codigo) {
        clientMap.set(c.codigo, fullLabel);
        clientRecordIdMap.set(c.codigo, c.id);
      }
      if (c.nombre) {
        clientMap.set(c.nombre, fullLabel);
        clientRecordIdMap.set(c.nombre, c.id);
      }
    });

    const clientes = (snapshot.clientes || []).map((c: any) => {
      const cId = c.id;
      const cCode = c.codigo;
      const dynamicIngresos = (snapshot.negocios || [])
        .filter((n: any) => (n.clienteId && n.clienteId === cId) || (n.cliente_id && n.cliente_id === cId) || (n.clienteCodigo && n.clienteCodigo === cCode))
        .reduce((sum: number, n: any) => sum + Number(n.ingresoCop ?? n.ingreso_cop ?? (Number(n.montoDivisa ?? n.monto_divisa ?? 0) * Number(n.tasaCambio ?? n.tasa ?? 0))), 0);
      const dynamicDispersado = (snapshot.dispersiones || [])
        .filter((d: any) => ((d.clienteId && d.clienteId === cId) || (d.cliente_id && d.cliente_id === cId) || (d.clienteCodigo && d.clienteCodigo === cCode)) && String(d.estado || '').toUpperCase() !== 'RECHAZADO')
        .reduce((sum: number, d: any) => sum + Number(d.montoCop ?? d.monto_cop ?? d.monto ?? 0), 0);
      const dynamicNegociosCount = (snapshot.negocios || [])
        .filter((n: any) => (n.clienteId && n.clienteId === cId) || (n.cliente_id && n.cliente_id === cId) || (n.clienteCodigo && n.clienteCodigo === cCode))
        .length;
      const comisionistaRecord = (snapshot.comisionistas || []).find(
        (cm: any) => (cm.comisionistaClienteId && (cm.comisionistaClienteId === c.id || cm.comisionistaClienteId === c.codigo)) ||
                     (cm.cliente_id && (cm.cliente_id === c.id || cm.cliente_id === c.codigo))
      );
      const comisionaDeIds: string[] = comisionistaRecord
        ? (comisionistaRecord.comisionaDeIds || comisionistaRecord.referidos_ids || [])
        : [];
      const porcentajeComision: number = comisionistaRecord
        ? Number(comisionistaRecord.porcentajeComision ?? comisionistaRecord.porcentaje_comision ?? 0)
        : 0;
      const dynamicRefIngresos = comisionaDeIds.length > 0
        ? (snapshot.negocios || [])
            .filter((n: any) => comisionaDeIds.includes(n.clienteId || n.cliente_id) || (n.clienteCodigo && comisionaDeIds.includes(n.clienteCodigo)))
            .reduce((sum: number, n: any) => sum + Number(n.ingresoCop ?? n.ingreso_cop ?? (Number(n.montoDivisa ?? n.monto_divisa ?? 0) * Number(n.tasaCambio ?? n.tasa ?? 0))), 0)
        : 0;
      const pctFactor = porcentajeComision > 1 ? porcentajeComision / 100 : porcentajeComision;
      const totalComisionesCOP: number = comisionistaRecord
        ? Math.max(Number(comisionistaRecord.comisionesCOP ?? comisionistaRecord.comisiones_cop ?? 0), dynamicRefIngresos * pctFactor)
        : 0;
      const esComisionista: boolean = Boolean(comisionistaRecord);

      const totalNegocios = Math.max(Number(c.totalNegocios || c.total_negocios || 0), dynamicNegociosCount);
      const baseIngresos = Number(c.ingresosCop ?? c.totalIngresosCop ?? c['Total Ingreso'] ?? 0);
      const totalIngresos = Math.max(baseIngresos, dynamicIngresos + totalComisionesCOP);
      const totalDispersado = Number(c.pagadoCop ?? c.totalDispersadoCop ?? c['Total Dispersado'] ?? 0);
      const saldo = Number(c.saldoCop ?? (totalIngresos - totalDispersado)) + (totalIngresos - baseIngresos);
      const saldoPendiente = Math.max(0, saldo);
      const porCobrarCOP = Math.max(0, -saldo);
      let estado = c.estado || 'SIN ACTIVIDAD';
      if (typeof estado === 'string') {
        const up = estado.toUpperCase();
        if (porCobrarCOP > 0) estado = 'DEBE';
        else if (saldoPendiente > 0) estado = 'PENDIENTE';
        else if (up.includes('ACTIVIDAD') || up.includes('INACTIVO')) estado = (totalIngresos > 0 || totalDispersado > 0) ? 'PAGADO' : 'SIN ACTIVIDAD';
        else if (up.includes('PAGADO')) estado = 'PAGADO';
        else if (up.includes('DEBE')) estado = 'DEBE';
        else if (totalIngresos === 0 && totalDispersado === 0) estado = 'SIN ACTIVIDAD';
        else estado = 'PENDIENTE';
      }

      const fullCode = c.codigo || c.idCliente || c.cliente || c['CLIENTE'] || c.nombre || 'C-000';

      const rawDispersionesIds = c.dispersionesIds || c.fields?.['DISPERSIONES'] || c['DISPERSIONES'] || [];
      const rawNegociosIds = c.negociosIds || c.fields?.['NEGOCIOS'] || c['NEGOCIOS'] || [];
      const rawEfectivoIds = c.efectivoIds || c.fields?.['EFECTIVO'] || c['EFECTIVO'] || [];

      return {
        id: c.id || c.codigo,
        codigo: fullCode,
        nombre: c.nombre || c['Nombre'] || fullCode,
        pais: c.pais || c['País'] || 'COLOMBIA',
        totalNegocios,
        esComisionista,
        comisionaDeIds,
        totalComisionesCOP,
        porcentajeComision: comisionistaRecord ? Number(comisionistaRecord.porcentajeComision ?? comisionistaRecord.porcentaje_comision ?? 0) : 0,
        totalIngresosCOP: totalIngresos,
        totalDispersadoCOP: totalDispersado,
        saldoPendienteCOP: saldoPendiente,
        porCobrarCOP,
        estado,
        dispersionesIds: Array.isArray(rawDispersionesIds) ? rawDispersionesIds : [rawDispersionesIds],
        negociosIds: Array.isArray(rawNegociosIds) ? rawNegociosIds : [rawNegociosIds],
        efectivoIds: Array.isArray(rawEfectivoIds) ? rawEfectivoIds : [rawEfectivoIds],
        ...creationAudit(c),
        raw: c,
      };
    });

    // Divisa lookup map
    const divisaMap = new Map<string, string>();
    (snapshot.divisas || []).forEach((d: any) => {
      const code = d.codigo || 'USD';
      if (d.id) divisaMap.set(d.id, code);
      divisaMap.set(code, code);
    });

    const negocios = (snapshot.negocios || []).map((n: any) => {
      const montoDiv = Number(n.montoDivisa ?? n.cantidadDivisa ?? n.monto ?? 0);
      const tasa = Number(n.tasa ?? n.tasaClienteCop ?? n.tasaCambio ?? 0);
      const ingreso = Number(n.ingresoCop ?? n.montoCop ?? (montoDiv * tasa));

      // Resolve client id and full label
      const rawClient = Array.isArray(n.cliente)
        ? n.cliente[0]
        : (n.clienteRecordId || n.clienteId || n.cliente);
      const clienteId = clientRecordIdMap.get(rawClient) || rawClient || n.clienteRecordId || n.clienteId;
      const clienteNombre = clientMap.get(rawClient) || n.clienteNombre || n.clienteCodigo || 'Cliente';
      const clienteCodigo = n.clienteCodigo || (rawClient ? clientMap.get(rawClient) : '') || '';

      // Resolve divisa
      const rawDivisa = Array.isArray(n.divisa) ? n.divisa[0] : (n.divisaId || n.divisaCodigo || n.divisa);
      const divisaCodigo = divisaMap.get(rawDivisa) || n.divisaCodigo || 'USD';

      return {
        id: n.id || n.codigo,
        codigo: n.codigo || n.idNegocio || 'NEG-000',
        fecha: n.fecha || n.fechaRegistro || '',
        clienteId,
        clienteRecordId: n.clienteRecordId || clienteId,
        clienteCodigo,
        clienteNombre,
        divisaId: rawDivisa,
        divisaCodigo,
        montoDivisa: montoDiv,
        tasaCambio: tasa,
        ingresoCOP: ingreso,
        estado: n.estado || 'Completado',
        ...creationAudit(n),
        raw: n,
      };
    });

    // Dispersiones
    const rawDispersiones = snapshot.dispersiones?.length ? snapshot.dispersiones : (snapshot.pagos || []);
    const dispersiones = rawDispersiones.map((d: any) => {
      const rawClient = Array.isArray(d.cliente)
        ? d.cliente[0]
        : (d.clienteRecordId || d.clienteId || d.cliente);
      const clienteId = clientRecordIdMap.get(rawClient) || rawClient || d.clienteRecordId || d.clienteId;
      const clienteNombre = clientMap.get(rawClient) || d.clienteNombre || d.clienteCodigo || 'Cliente';
      const clienteCodigo = d.clienteCodigo || (rawClient ? clientMap.get(rawClient) : '') || '';

      return {
        id: d.id || d.codigo,
        codigo: d.codigo || d.idDispersion || 'DISP-000',
        fecha: (d.fecha || d.fechaCreacion) ? String(d.fecha || d.fechaCreacion).slice(0, 10) : '',
        clienteId,
        clienteRecordId: d.clienteRecordId || clienteId,
        clienteCodigo,
        clienteNombre,
        monto: Number(d.monto ?? d.montoCop ?? d.valorTotalDispersion ?? 0),
        costoCop: Number(d.costoCop ?? 0),
        costoOrigenAplicado: d.costoOrigenAplicado === true,
        origenFondos: d.origenFondos || d.medioPagoNombre || 'Sin especificar',
        origenFondosId: d.origenFondosId,
        referencia: d.referencia || d.concepto || '',
        comprobanteUrl: d.comprobanteUrl || (d.comprobantes && d.comprobantes[0]?.url) || undefined,
        estado: d.estado || 'Exitosa',
        ...creationAudit(d),
        raw: d,
      };
    });

    // Efectivo (resolve assigned client from CLIENTE column)
    const efectivo = (snapshot.efectivo || []).map((e: any, idx: number) => {
      const rawClient = Array.isArray(e.cliente)
        ? e.cliente[0]
        : (e.clienteRecordId || e.clienteId || e.cliente);
      const clienteId = clientRecordIdMap.get(rawClient) || rawClient || e.clienteRecordId || e.clienteId;
      const clienteNombre = clientMap.get(rawClient) || (typeof e.cliente === 'string' && e.cliente.trim() ? e.cliente : (e.clienteNombre || ''));
      const clienteCodigo = e.clienteCodigo || (rawClient ? clientMap.get(rawClient) : '') || '';

      const isIngreso = String(e.tipo || '').toUpperCase() === 'INGRESO';
      const monto = Number(e.montoCop ?? e.monto ?? e['MONTO (COP)'] ?? 0);
      const fecha = e.fecha || e['FECHA MOVIMIENTO'] || (e.createdTime ? String(e.createdTime).slice(0, 10) : '');

      return {
        id: e.id || e.codigo || `efec-${idx}`,
        codigo: e.codigo || `EF-${idx + 1}`,
        fecha,
        tipo: (isIngreso ? 'Ingreso' : 'Pago') as 'Ingreso' | 'Pago',
        clienteId,
        clienteRecordId: e.clienteRecordId || clienteId,
        clienteCodigo,
        clienteNombre: clienteNombre || (isIngreso ? 'Ingreso de Caja' : 'Movimiento Interno'),
        monto,
        comisionCop: Number(e.comisionCop ?? 0),
        origenFondos: e.origenFondosNombre || e.origenFondos || 'Sin especificar',
        origenFondosId: e.origenFondosId,
        referencia: e.referencia || '',
        ...creationAudit(e),
        raw: e,
      };
    });

    // Gastos
    const rawGastosList = snapshot.gastos || [];

    const gastos: GastoItem[] = rawGastosList.map((g: any) => {
      const compArr = g['COMPROBANTE'] || g.comprobante || g.comprobantes;
      const compUrl = g.comprobanteUrl || (Array.isArray(compArr) && compArr[0]?.url) || (typeof compArr === 'string' ? compArr : undefined);
      const compNombre = g.comprobanteNombre || (Array.isArray(compArr) && compArr[0]?.filename) || undefined;

      return {
        id: g.id || g.gasto || g['GASTO'],
        codigo: g.codigo || g.gasto || g['GASTO'] || 'G00001',
        concepto: g.concepto || g['CONCEPTO'] || 'Gasto Operativo',
        categoria: g.categoria || g['CATEGORÍA'] || 'Otros Gastos Operativos',
        divisa: (g.divisa || g['DIVISA'] || 'COP') as 'COP' | 'USDT',
        monto: Number(g.monto ?? g['MONTO'] ?? 0),
        origenFondos: g.origenFondos || g['ORIGEN FONDOS'] || 'Sin especificar',
        origenFondosId: g.origenFondosId,
        fecha: g.fecha || g['FECHA'] || g['FECHA GASTO'] || g['FECHA CREACIÓN'] || '',
        comprobanteUrl: compUrl,
        comprobanteNombre: compNombre,
        ...creationAudit(g),
        raw: g,
      };
    });

    // Divisas: remove (BRA), (COL), (USA) from country name
    const divisas = (snapshot.divisas || []).map((d: any) => {
      const rawPais = d.pais || d.nombrePais || '';
      const cleanPais = rawPais.replace(/\s*\([A-Z0-9-]+\)\s*/g, '').trim() || 'Internacional';

      return {
        id: d.id || d.codigo,
        codigo: d.codigo || 'USD',
        nombre: d.nombre || d.nombreDivisa || d.divisa || d.codigo,
        nombreDivisa: d.nombreDivisa,
        banderaUrl: d.banderaUrl,
        pais: cleanPais,
        totalRecibido: Number(d.totalRecibido ?? d.ingresoEnDivisa ?? 0),
        totalComprado: Number(d.totalComprado ?? d.egresoEnDivisa ?? 0),
        totalPendiente: Number(d.totalPendiente ?? d.saldo ?? 0),
        estado: d.estado || 'Activo',
        ...creationAudit(d),
        raw: d,
      };
    });

    // Usuarios: Initial default is Invitado
    const usuarios: AppUser[] = (snapshot.usuarios || []).map((u: any) => {
      let divisasAut: string[] = [];
      if (Array.isArray(u.divisasAutorizadas)) {
        divisasAut = u.divisasAutorizadas;
      } else if (typeof u.divisasAutorizadas === 'string') {
        divisasAut = u.divisasAutorizadas.split(',').map((s: string) => s.trim());
      }

      return {
        ...creationAudit(u),
        id: u.id || u.codigo,
        codigo: u.codigo || 'USR-000',
        nombre: u.nombre || u.nombreCompleto || 'Usuario',
        correo: u.correo || u.email || '',
        rol: u.rol || 'Operador',
        pais: u.pais || 'Colombia',
        divisasAutorizadas: divisasAut,
        estado: u.estado || 'Invitado',
      };
    });

    // Compras USDT
    const comprasUsdt = (snapshot.comprasUsdt || []).map((c: any) => ({
      id: c.id || c.codigo,
      codigo: c.codigo || c.idTransaccion || c.idCompra || 'CMP-000',
      fecha: c.fecha || c.fechaCompra || '',
      proveedor: c.proveedor || '',
      divisaCodigo: c.divisaCodigo || c.divisaNombre || 'USD',
      valorComprado: Number(c.valorComprado ?? c.montoDivisa ?? 0),
      usdtComprado: Number(c.usdtComprado ?? c.totalRecibidoUsdt ?? 0),
      tasa: Number(c.tasa ?? c.tasaUsdt ?? 0),
      costo: Number(c.costo ?? 0),
      walletDestino: c.walletDestino,
      walletDestinoId: c.walletDestinoId,
      ...creationAudit(c),
      raw: c,
    }));

    // Ventas USDT
    const ventasUsdt = (snapshot.ventasUsdt || []).map((v: any) => ({
      id: v.id || v.codigo,
      codigo: v.codigo || v.idTransaccion || v.idVenta || 'VNT-000',
      fecha: v.fecha || '',
      concepto: v.concepto || 'Venta USDT',
      usdtVendido: Number(v.usdtVendido ?? v.cantidadUsdt ?? 0),
      feeUsdt: Number(v.feeUsdt ?? 0),
      tasa: Number(v.tasa ?? v.tasaVentaCop ?? 0),
      totalCOP: Number(v.totalCop ?? v.totalCOP ?? 0),
      destinoFondosNombre: v.destinoFondosNombre || v.cuentaDestinoNombre,
      walletOrigen: v.walletOrigen,
      walletOrigenId: v.walletOrigenId,
      destinoFondosId: v.destinoFondosId,
      ...creationAudit(v),
      raw: v,
    }));

    // Comisionistas
    const rawComisionistas = snapshot.comisionistas || [];
    const comisionistas = rawComisionistas.map((cm: any, idx: number) => {
      const comId = Array.isArray(cm.comisionista) ? cm.comisionista[0] : (cm.comisionistaClienteId || cm.cliente_id || cm.comisionista);
      const comNombre = clientMap.get(comId) || cm.comisionistaNombre || cm.cliente_nombre || 'Comisionista';
      const refIds = Array.isArray(cm.comisionaDe) ? cm.comisionaDe : (cm.comisionaDeIds || cm.referidos_ids || []);
      const refNombres = refIds.map((id: string) => clientMap.get(id) || id);

      return {
        id: cm.id || cm.codigo,
        codigo: cm.codigo || cm.Name || `COM-${String(idx + 1).padStart(4, '0')}`,
        comisionistaId: comId,
        comisionistaClienteId: comId,
        comisionistaNombre: comNombre,
        comisionaDeIds: refIds,
        comisionaDeNombres: refNombres,
        ingresosCOP: Number(cm.ingresos || cm.ingresosCOP || cm.ingresos_cop || 0),
        porcentajeComision: Number(cm.porcentajeComision ?? cm.porcentaje_comision ?? cm['% COMISIÓN'] ?? 0),
        comisionesCOP: Number(cm.comisiones || cm.comisionesCOP || cm.comisiones_cop || 0),
        fechaCreacion: cm.fechaCreacion || cm.fecha_creacion || cm.createdTime || '',
        ...creationAudit(cm),
        raw: cm,
      };
    });

    // Transferencias Internas
    const transferenciasInternas: TransferenciaInterna[] = (snapshot.transferenciasInternas || []).map((t: any) => ({
      id: t.id,
      codigo: t.codigo || 'TRF-000',
      fecha: t.fecha || '',
      tipoOrigen: t.tipo_origen || t.tipoOrigen,
      origenId: t.origen_id || t.origenId,
      origenNombre: t.origen_nombre || t.origenNombre || '',
      tipoDestino: t.tipo_destino || t.tipoDestino,
      destinoId: t.destino_id || t.destinoId,
      destinoNombre: t.destino_nombre || t.destinoNombre || '',
      monto: Number(t.monto || 0),
      divisaOrigen: t.divisa_origen || t.divisaOrigen || 'COP',
      montoDestino: Number(t.monto_destino ?? t.montoDestino ?? t.monto ?? 0),
      divisaDestino: t.divisa_destino || t.divisaDestino || 'COP',
      tasa: Number(t.tasa ?? 1),
      costo: Number(t.costo ?? 0),
      divisaCosto: t.divisa_costo || t.divisaCosto || 'COP',
      concepto: t.concepto || '',
      notas: t.notas,
      comprobanteUrl: t.comprobante_url || t.comprobanteUrl,
      ...creationAudit(t),
      raw: t,
    }));

    // Combine stored movements and transactions linked to this specific account.
    type LinkedMovement = CreationAudit & {
      fecha: string;
      origen: string;
      concepto: string;
      monto: number;
      tercero?: string;
      replaceConcept?: boolean;
      estado?: 'pendiente' | 'recibido';
      esPendiente?: boolean;
      idOriginal?: string;
      tipoOperacion?: 'COMPRA_USDT' | 'VENTA_USDT' | 'EFECTIVO' | 'DISPERSION' | 'TRANSFERENCIA';
    };
    const mergeMovements = (account: any, linked: LinkedMovement[], excludedOrigins: Set<string>) => {
      // Imported statements are newest first, including entries on the same day.
      const existing = Array.isArray(account.movimientos)
        ? account.movimientos.filter((entry) => !excludedOrigins.has(entry.origen)).reverse()
        : [];
      for (const movement of linked) {
        const index = existing.findIndex((entry) => entry.origen === movement.origen || entry.concepto?.includes(movement.origen));
        if (index < 0) existing.push(movement);
        else {
          existing[index] = {
            ...existing[index],
            monto: movement.monto,
            concepto: movement.replaceConcept ? movement.concepto : existing[index].concepto,
            createdBy: existing[index].createdBy ?? movement.createdBy,
            createdByName: existing[index].createdByName ?? movement.createdByName,
            createdAtAudit: existing[index].createdAtAudit ?? movement.createdAtAudit,
            estado: movement.estado ?? existing[index].estado,
            esPendiente: movement.esPendiente ?? existing[index].esPendiente,
            idOriginal: movement.idOriginal ?? existing[index].idOriginal,
            tipoOperacion: movement.tipoOperacion ?? existing[index].tipoOperacion,
          };
        }
      }
      existing.sort((a, b) => compareChronologicalAsc(a, b, false));
      const net = existing.reduce((total, entry) => total + (entry.esPendiente ? 0 : Number(entry.monto || 0)), 0);
      const closing = account.saldoCop ?? account.saldoUsdt;
      let balance = account.saldoInicial != null ? Number(account.saldoInicial) : (closing != null ? Number(closing) - net : 0);
      return existing.map((entry) => {
        if (!entry.esPendiente) {
          balance += Number(entry.monto || 0);
        }
        return { ...entry, balance };
      }).reverse();
    };

    const movement = (
      row: CreationAudit & { fecha: string; codigo: string }, concepto: string, monto: number
    ): LinkedMovement => ({ ...creationAudit(row), fecha: row.fecha, origen: row.codigo, concepto, monto });

    const matchesAccount = (row: { origenFondosId?: string; origenFondos: string }, account: any) => {
      if (row.origenFondosId) return row.origenFondosId === account.id;
      const label = row.origenFondos?.trim().toLowerCase();
      return Boolean(label && label === account.activo?.trim().toLowerCase());
    };

    const capitalRows = capitalLedger.userId === userId ? capitalLedger.rows : [];
    const capitalPeople = new Map(capitalLedger.people.map((person) => [person.id, person.nombre]));
    const capitalEntries = (accountId: string, digital: boolean): LinkedMovement[] => capitalRows
      .filter((row) => (digital ? row.cuenta_digital_id : row.cuenta_liquida_id) === accountId)
      .map((row) => {
        const socioNombre = capitalPeople.get(row.socio_id);
        return {
          ...creationAudit(row),
          fecha: row.fecha,
          origen: row.codigo,
          concepto: 'Capital & Socios · ' + capitalLabels[row.tipo] + (socioNombre ? ' · ' + socioNombre : ''),
          tercero: socioNombre,
          monto: Number(row.monto) * (row.tipo === 'CONTRATO' ? 1 : -1),
        };
      });

    const enrichedActivosLiquidos = (snapshot.activosLiquidos || []).map((account) => ({
      ...account,
      movimientos: mergeMovements(account, [
        ...capitalEntries(account.id, false),
        ...gastos.filter((g) => g.divisa === 'COP' && matchesAccount(g, account))
          .map((g) => movement(g, 'Gasto: ' + g.concepto, -Math.abs(g.monto))),
        ...efectivo.filter((e) => matchesAccount(e, account))
          .map((e) => {
            if (e.tipo === 'Ingreso') return movement(e, 'Ingreso de efectivo', e.monto);
            const clientName = e.clienteId || e.clienteCodigo ? e.clienteNombre : '';
            const client = clientName ? ' a ' + clientName : '';
            const fee = clientName || e.comisionCop ? ' + Comisión ' + formatCOP(e.comisionCop) : '';
            return { ...movement(e, 'Pago en efectivo' + client + fee, -(e.monto - e.comisionCop)), replaceConcept: true };
          }),
        ...dispersiones.filter((d) => d.origenFondosId === account.id && d.estado.trim().toUpperCase() !== 'RECHAZADO')
          .flatMap((d) => [
            movement(d, 'Dispersión a ' + d.clienteNombre, -d.monto),
            ...(d.costoOrigenAplicado && d.costoCop > 0 ? [{
              ...movement(d, 'Costo de dispersión · ' + d.clienteNombre, -d.costoCop),
              origen: d.codigo + '-FEE',
            }] : []),
          ]),
        ...ventasUsdt.filter((v) => v.destinoFondosId === account.id)
          .map((v) => ({
            ...movement(v, 'Venta USDT: ' + v.concepto, v.totalCOP),
            estado: v.estado,
            esPendiente: v.estado === 'pendiente',
            idOriginal: v.id,
            tipoOperacion: 'VENTA_USDT' as const,
          })),
        ...transferenciasInternas.filter((t) => t.tipoOrigen === 'ACTIVO_LIQUIDO' && t.origenId === account.id)
          .flatMap((t) => [
            movement(t, 'Transferencia a ' + (t.destinoNombre || 'cuenta') + (t.concepto ? ': ' + t.concepto : ''), -t.monto),
            ...(t.costo > 0 && t.divisaCosto === 'COP' ? [{
              ...creationAudit(t),
              fecha: t.fecha,
              origen: t.codigo + '-FEE',
              concepto: 'Comisión transferencia ' + t.codigo,
              monto: -t.costo,
            }] : []),
          ]),
        ...transferenciasInternas.filter((t) => t.tipoDestino === 'ACTIVO_LIQUIDO' && t.destinoId === account.id)
          .map((t) => movement(t, 'Transferencia desde ' + (t.origenNombre || 'cuenta') + (t.concepto ? ': ' + t.concepto : ''), t.montoDestino)),
      ], new Set([
        ...ventasUsdt.filter((v) => v.destinoFondosId && v.destinoFondosId !== account.id).map((v) => v.codigo),
        ...dispersiones
          .filter((d) => d.estado.trim().toUpperCase() === 'RECHAZADO' || (d.origenFondosId && d.origenFondosId !== account.id))
          .flatMap((d) => [d.codigo, d.codigo + '-FEE']),
      ])),
    }));

    const enrichedActivosDigitales = (snapshot.activosDigitales || []).map((account) => ({
      ...account,
      movimientos: mergeMovements(account, [
        ...capitalEntries(account.id, true),
        ...gastos.filter((g) => g.divisa === 'USDT' && matchesAccount(g, account))
          .map((g) => movement(g, 'Gasto USDT: ' + g.concepto, -Math.abs(g.monto))),
        ...comprasUsdt.filter((c) => c.walletDestinoId === account.id)
          .map((c) => ({
            ...movement(c, 'Compra USDT en ' + c.divisaCodigo, c.usdtComprado),
            estado: c.estado,
            esPendiente: c.estado === 'pendiente',
            idOriginal: c.id,
            tipoOperacion: 'COMPRA_USDT' as const,
          })),
        ...ventasUsdt.filter((v) => v.walletOrigenId === account.id)
          .flatMap((v) => [
            movement(v, 'Venta USDT: ' + v.concepto, -v.usdtVendido),
            ...(v.feeUsdt > 0 ? [{
              ...movement(v, 'Fee de envío · Venta USDT', -v.feeUsdt),
              origen: v.codigo + '-FEE',
            }] : []),
          ]),
        ...transferenciasInternas.filter((t) => t.tipoOrigen === 'ACTIVO_DIGITAL' && t.origenId === account.id)
          .flatMap((t) => [
            movement(t, 'Transferencia a ' + (t.destinoNombre || 'billetera') + (t.concepto ? ': ' + t.concepto : ''), -t.monto),
            ...(t.costo > 0 && t.divisaCosto === 'USDT' ? [{
              ...creationAudit(t),
              fecha: t.fecha,
              origen: t.codigo + '-FEE',
              concepto: 'Comisión transferencia ' + t.codigo,
              monto: -t.costo,
            }] : []),
          ]),
        ...transferenciasInternas.filter((t) => t.tipoDestino === 'ACTIVO_DIGITAL' && t.destinoId === account.id)
          .map((t) => movement(t, 'Transferencia desde ' + (t.origenNombre || 'billetera') + (t.concepto ? ': ' + t.concepto : ''), t.montoDestino)),
      ], new Set(ventasUsdt.filter((v) => v.walletOrigenId && v.walletOrigenId !== account.id).flatMap((v) => [v.codigo, v.codigo + '-FEE']))),
    }));

    negocios.sort(compareChronologicalDesc);
    dispersiones.sort(compareChronologicalDesc);
    efectivo.sort(compareChronologicalDesc);
    gastos.sort(compareChronologicalDesc);
    comprasUsdt.sort(compareChronologicalDesc);
    ventasUsdt.sort(compareChronologicalDesc);
    transferenciasInternas.sort(compareChronologicalDesc);

    return {
      clientes,
      negocios,
      dispersiones,
      efectivo,
      gastos,
      divisas,
      usuarios,
      comprasUsdt,
      ventasUsdt,
      comisionistas,
      transferenciasInternas,
      activosLiquidos: enrichedActivosLiquidos,
      activosDigitales: enrichedActivosDigitales,
    };
  }, [snapshot, capitalLedger, userId]);

  const metrics: MetricsSummary = useMemo(() => {
    const res = snapshot.resumenLiquidacion;
    const totalGastosCOP = res?.totalGastosCop ?? (data.gastos || []).reduce((acc, g) => acc + (g.divisa === 'COP' ? g.monto : g.monto * 4000), 0);
    const totalCostosDispersionCOP = res?.totalCostosDispersionCop ?? data.dispersiones.reduce(
      (total, item) => item.estado.trim().toUpperCase() === 'RECHAZADO' ? total : total + item.costoCop, 0
    );
    const totalLiqFallback = (data.activosLiquidos || []).reduce((acc: number, a: any) => acc + (a.saldoCop || 0), 0);
    const totalDigFallback = data.activosDigitales.reduce(
      (total, wallet) => wallet.activo != null && wallet.activo !== 'TEST' ? total + (wallet.saldoUsdt || 0) : total,
      0,
    );
    const totalSaldoPendiente = data.clientes.reduce((total, cliente) => total + cliente.saldoPendienteCOP, 0);
    const totalPorCobrarClientesCOP = data.clientes.reduce((total, cliente) => total + cliente.porCobrarCOP, 0);
    const saldoNetoClientesCOP = res?.saldoNetoClientesCop ?? (totalSaldoPendiente - totalPorCobrarClientesCOP);
    const totalClientesIngresosFallback = (data.clientes || []).reduce((acc: number, c: any) => acc + (c.totalIngresosCOP || c.ingresosCop || 0), 0);
    const totalClientesIngresosCOP = (res?.totalClientesIngresosCop && res.totalClientesIngresosCop > 0)
      ? res.totalClientesIngresosCop
      : totalClientesIngresosFallback;

    const rateUsdt = Number(res?.rateUsdtCop || 3950);
    const totalActivosLiquidos = res?.totalActivosLiquidosCop ?? totalLiqFallback;
    const totalActivosDigitales = res?.totalActivosDigitalesUsdt ?? totalDigFallback;
    const totalVentasUSDT = res?.totalVentasUsdtCop ?? (data.ventasUsdt || []).reduce((acc: number, v: any) => acc + (v.totalCOP || 0), 0);

    // Dynamic Liquidez Esperada in COP: total USDT * current rate
    const liquidezEsperada = totalActivosDigitales * rateUsdt;

    // Interest is already included in gastos. Dividends are deducted after net profit.
    const capitalTotals = summarizeCapital(
      capitalLedger.userId === userId ? capitalLedger.rows : [],
      capitalLedger.userId === userId ? capitalLedger.people : []
    );
    const capitalInvertidoCOP = res?.totalCapitalInvertidoCop ?? (userId && capitalLedger.userId === userId ? capitalTotals.capital : null);
    const distribucionPagadaSociosCOP = capitalTotals.sociosPaidDistributions;
    const adelantosPendientesSociosCOP = capitalTotals.unabsorbedAdvances;
    const interesesPagadosCOP = capitalTotals.interestPaid;
    const interesesPendientesCOP = capitalTotals.interestUnpaid;
    const totalPagadoSociosInversionistasCOP = distribucionPagadaSociosCOP + interesesPagadosCOP;
    const compromisosPendientesCOP = capitalTotals.balanceSocios + capitalTotals.balanceInversionistas;

    const gananciaEsperada = totalActivosLiquidos + liquidezEsperada + distribucionPagadaSociosCOP
      - saldoNetoClientesCOP - interesesPendientesCOP - (capitalInvertidoCOP ?? 0);
    const dividendosSociosCOP = capitalTotals.sociosTotalDividends;
    const gananciaDespuesDividendosCOP = gananciaEsperada - dividendosSociosCOP;

    return {
      totalActivosLiquidos,
      totalActivosDigitales,
      saldoPendienteClientes: data.clientes.length ? totalSaldoPendiente : (res?.totalSaldoPendienteClientesCop ?? 0),
      totalPorCobrarClientesCOP,
      saldoNetoClientesCOP,
      gananciaEsperada,
      totalNegocioCOP: res?.totalNegocioCop ?? (data.negocios || []).reduce((acc: number, n: any) => acc + (n.ingresoCop || 0), 0),
      totalClientesIngresosCOP,
      totalVentasUSDT,
      liquidezEsperada,
      totalGastosCOP,
      totalCostosDispersionCOP,
      interesesSociosCOP: capitalTotals.interest,
      interesesPagadosCOP,
      interesesPendientesCOP,
      capitalInvertidoCOP,
      capitalSociosCOP: capitalTotals.capitalSocios,
      capitalInversionistasCOP: capitalTotals.capitalInversionistas,
      adelantosSociosCOP: capitalTotals.advances,
      dividendosSociosCOP,
      saldoPendienteSociosCOP: capitalTotals.balanceSocios,
      distribucionPagadaSociosCOP,
      compromisosPendientesCOP,
      totalPagadoSociosInversionistasCOP,
      adelantosPendientesSociosCOP,
      gananciaDespuesDividendosCOP,
      rateUsdtCop: rateUsdt,
    };
  }, [snapshot.resumenLiquidacion, data.gastos, data.dispersiones, data.clientes, data.activosLiquidos, data.activosDigitales, data.ventasUsdt, data.negocios, capitalLedger, userId]);

  // Direct Supabase operations (100% decoupled from Airtable)
  const createNegocio = async (payload: any): Promise<boolean> => {
    requireWrite('business');
    try {
      const clientRaw = payload.clienteId || (Array.isArray(payload.Cliente) ? payload.Cliente[0] : payload.Cliente);
      const clientObj = data.clientes.find((c) => c.id === clientRaw || c.codigo === clientRaw);
      const divisaCode = payload.divisaCodigo || (Array.isArray(payload.Divisa) ? payload.Divisa[0] : payload.Divisa);
      const divisaObj = data.divisas.find((d) => d.id === divisaCode || d.codigo === divisaCode);
      if (!clientObj || !divisaObj) throw new Error('Selecciona un cliente y una divisa válidos.');

      const montoDiv = Number(payload['Monto Divisa'] || payload.monto || payload.montoDivisa || 0);
      const rate = payload['Tasa Cambio'] ?? payload.tasa ?? payload.tasaCambio;
      const tasaNum = rate == null || String(rate).trim() === '' ? NaN : Number(rate);
      if (!Number.isFinite(tasaNum) || tasaNum < 0) throw new Error('Ingresa una tasa válida.');
      const id = crypto.randomUUID();
      const { error } = await supabase.rpc('crear_negocio_dashboard', {
        p_id: id,
        p_cliente_id: clientObj.id,
        p_divisa_codigo: divisaObj.codigo,
        p_fecha: payload['Fecha'] || payload.fecha || new Date().toISOString().slice(0, 10),
        p_monto: montoDiv,
        p_tasa: tasaNum,
        p_codigo: payload.codigo || null,
      });
      if (error?.code === '22023') throw new Error(error.message);
      if (error) throw error;
      await refreshSavedRow('negocios', id);
      return true;
    } catch (err) {
      console.error('Error creating negocio in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo guardar el registro.');
    }
  };

  const deleteNegocio = async (id: string): Promise<boolean> => {
    requireWrite('delete');
    try {
      const { error } = await supabase.from('negocios').delete().eq('id', id).select('id').single();
      if (error) throw error;
      publishMutation('negocios', null, id);
      return true;
    } catch (err) {
      console.error('Error deleting negocio in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo eliminar el negocio.');
    }
  };

  const deleteCliente = async (id: string): Promise<boolean> => {
    requireWrite('delete');
    try {
      await supabase.from('client_shared_links').delete().eq('client_id', id);
      const { error } = await supabase.from('clientes').delete().eq('id', id).select('id').single();
      if (error) throw error;
      publishMutation('clientes', null, id);
      return true;
    } catch (err) {
      console.error('Error deleting cliente in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo eliminar el cliente.');
    }
  };

  const deleteDispersion = async (id: string): Promise<boolean> => {
    requireWrite('delete');
    try {
      const { error } = await supabase.from('dispersiones').delete().eq('id', id).select('id').single();
      if (error) throw error;
      publishMutation('dispersiones', null, id);
      return true;
    } catch (err) {
      console.error('Error deleting dispersion in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo eliminar la dispersión.');
    }
  };

  const deleteGasto = async (id: string): Promise<boolean> => {
    requireWrite('delete');
    try {
      const { error } = await supabase.from('gastos').delete().eq('id', id).select('id').single();
      if (error) throw error;
      publishMutation('gastos', null, id);
      return true;
    } catch (err) {
      console.error('Error deleting gasto in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo eliminar el gasto.');
    }
  };

  const deleteComisionista = async (id: string): Promise<boolean> => {
    requireWrite('delete');
    try {
      const { error } = await supabase.from('comisionistas').delete().eq('id', id).select('id').single();
      if (error) throw error;
      publishMutation('comisionistas', null, id);
      return true;
    } catch (err) {
      console.error('Error deleting comisionista in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo eliminar el comisionista.');
    }
  };

  const deleteCatalogRecord = async (table: CatalogTable, id: string): Promise<boolean> => {
    requireWrite('delete');
    try {
      const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No se pudo eliminar el registro o no cuentas con los permisos requeridos.');
      }
      publishMutation(table, null, id);
      return true;
    } catch (err) {
      console.error(`Error deleting from ${table} in Supabase:`, err);
      throw dashboardWriteError(err, 'No se pudo eliminar el registro.');
    }
  };

  const updateRateUsdt = async (rate: number): Promise<boolean> => {
    requireWrite('admin');
    try {
      if (!Number.isFinite(rate) || rate <= 0) throw new Error('La tasa debe ser mayor a 0');
      const { error } = await supabase.rpc('actualizar_rate_usdt', { p_rate: rate });
      if (error) throw error;
      latestFetch.current++;
      setSnapshot((current) => ({
        ...current,
        resumenLiquidacion: current.resumenLiquidacion ? { ...current.resumenLiquidacion, rateUsdtCop: rate } : current.resumenLiquidacion,
      }));
      scheduleRefresh();
      return true;
    } catch (err) {
      console.error('Error updating rate in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo actualizar la tasa.');
    }
  };

  const updateNegocio = async (payloadOrId: any, maybeFields?: any): Promise<boolean> => {
    requireWrite('business');
    try {
      const payload = typeof payloadOrId === 'string' && maybeFields
        ? { id: payloadOrId, ...maybeFields }
        : (typeof payloadOrId === 'object' && payloadOrId ? payloadOrId : { id: payloadOrId });
      const { id, ...fields } = payload;
      const updates: any = {};
      const clientId = fields.clienteId || fields.Cliente?.[0];
      const currencyId = fields.divisaId || fields.Divisa?.[0];
      if (clientId) {
        const client = data.clientes.find((item) => item.id === clientId);
        if (!client) throw new Error('Selecciona un cliente válido.');
        updates.cliente_id = client.id;
        updates.cliente_codigo = client.codigo;
        updates.cliente_nombre = client.nombre;
      }
      if (currencyId) {
        const currency = data.divisas.find((item) => item.id === currencyId || item.codigo === currencyId);
        if (!currency) throw new Error('Selecciona una divisa válida.');
        updates.divisa_codigo = currency.codigo;
      }
      if (fields.fecha || fields.Fecha) updates.fecha = fields.fecha || fields.Fecha;
      fields.tasaCambio ??= fields['Tasa Cambio'];
      fields.montoDivisa ??= fields['Monto Divisa'];
      fields.ingresoCOP ??= fields['Ingreso COP'];
      if (fields.tasaCambio !== undefined) {
        updates.tasa = Number(fields.tasaCambio);
        updates.tasa_cliente_cop = Number(fields.tasaCambio);
      }
      if (fields.montoDivisa !== undefined) updates.monto_divisa = Number(fields.montoDivisa);
      if (fields.ingresoCOP !== undefined) {
        updates.ingreso_cop = Number(fields.ingresoCOP);
        updates.monto_cop = Number(fields.ingresoCOP);
      } else if (fields.montoDivisa !== undefined && fields.tasaCambio !== undefined) {
        const calculated = Number(fields.montoDivisa) * Number(fields.tasaCambio);
        updates.ingreso_cop = calculated;
        updates.monto_cop = calculated;
      }
      if (fields.estado !== undefined) updates.estado = fields.estado;
      if (fields.authorId) updates.created_by = fields.authorId;

      const { data: saved, error } = await writeDashboardRecord(updates,
        (record) => {
          const update = supabase.from('negocios').update(record).eq('id', id);
          return (fields.authorId ? update.is('created_by', null) : update).select('*').single();
        },
        { generatedColumns: negocioGeneratedFields },
      );
      if (error) throw error;
      publishMutation('negocios', saved);
      return true;
    } catch (err) {
      console.error('Error updating negocio in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo actualizar el negocio.');
    }
  };

  const createDispersion = async (payload: any): Promise<boolean> => {
    requireWrite('dispersion');
    try {
      const clientRaw = payload.clienteId || (Array.isArray(payload.Cliente) ? payload.Cliente[0] : payload.Cliente);
      const clientObj = data.clientes.find((c) => c.id === clientRaw || c.codigo === clientRaw);
      const montoNum = Number(payload.monto || payload.montoCop || payload['Monto'] || payload['MONTO (COP)'] || 0);

      const insertData: any = {
        fecha: payload.fecha || payload['Fecha'] || new Date().toISOString(),
        cliente_id: clientObj?.id || clientRaw,
        cliente_codigo: clientObj?.codigo || clientRaw,
        cliente_nombre: clientObj?.nombre || 'Cliente',
        monto: montoNum,
        monto_cop: montoNum,
        costo_cop: Number(payload.costoCop ?? 0),
        origen_fondos: payload.origenFondos || payload['Origen de Fondos'] || payload['Origen Fondos'] || 'COINSENDA-KAUPALOKI',
        origen_fondos_id: payload.origenFondosId || null,
        referencia: payload.referencia || payload['Referencia'] || '',
        estado: 'COMPLETADO',
        tiene_comprobante: Boolean(payload.comprobanteUrl),
        comprobante_url: payload.comprobanteUrl || null,
      };
      if (payload.codigo) insertData.codigo = payload.codigo;

      const id = crypto.randomUUID();
      const { data: saved, error } = await writeDashboardRecord({ ...insertData, id }, (fields) => supabase.from('dispersiones').insert(fields).select('*').single(), {
        fallbackCode: createCode('DISP', id),
        generatedColumns: ['monto_cop', 'tiene_comprobante'],
        optionalColumns: ['origen_fondos_id'],
      });

      if (error) throw error;
      publishMutation('dispersiones', saved);
      return true;
    } catch (err) {
      console.error('Error creating dispersion in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo guardar el registro.');
    }
  };

  const createMovimientoEfectivo = async (payload: any, onTokenCreated?: (token: CashToken) => void): Promise<boolean> => {
    requireWrite('admin');
    try {
      const clientRaw = payload.clienteId || (Array.isArray(payload.Cliente) ? payload.Cliente[0] : payload.Cliente);
      const clientObj = data.clientes.find((c) => c.id === clientRaw || c.codigo === clientRaw);
      const montoNum = Number(payload.montoCop ?? payload.monto ?? payload['Monto'] ?? 0);
      const tipoStr = String(payload.tipo || payload['Tipo'] || 'PAGO').toUpperCase();
      const referencia = String(payload.referencia ?? payload['Referencia'] ?? '').trim();
      if (!referencia) throw new Error('Ingresa una referencia.');

      const insertData: any = {
        fecha: payload.fecha || payload['Fecha'] || new Date().toISOString().split('T')[0],
        tipo: tipoStr,
        cliente_id: clientObj?.id || clientRaw || null,
        cliente_codigo: clientObj?.codigo || null,
        cliente_nombre: clientObj?.nombre || (tipoStr === 'INGRESO' ? 'Ingreso a Caja' : 'Movimiento Interno'),
        monto: montoNum,
        comision_cop: Number(payload.comisionCop ?? 0),
        origen_fondos: payload.origenFondos || 'EFECTIVO-CAJA',
        origen_fondos_id: payload.origenFondosId || null,
        referencia,
      };
      if (payload.codigo) insertData.codigo = payload.codigo;

      if (payload.tokenRequestId) {
        const { data: token, error } = await supabase.rpc('registrar_pago_con_token', {
          p_pago: { ...insertData, id: payload.tokenRequestId },
        });
        if (error) throw error;
        await refreshSavedRow('efectivo', (token as CashToken).efectivo_id!);
        onTokenCreated?.(token as CashToken);
        return true;
      }

      const id = crypto.randomUUID();
      const { data: saved, error } = await writeDashboardRecord({ ...insertData, id }, (fields) => supabase.from('efectivo').insert(fields).select('*').single(), {
        fallbackCode: createCode('EFEC', id),
        generatedColumns: [],
        optionalColumns: ['origen_fondos_id'],
      });

      if (error) throw error;
      publishMutation('efectivo', saved);
      return true;
    } catch (err) {
      console.error('Error creating efectivo in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo guardar el registro.');
    }
  };

  const updateMovimientoEfectivo = async (payload: any): Promise<boolean> => {
    requireWrite('admin');
    try {
      const clientRaw = payload.clienteId || (Array.isArray(payload.Cliente) ? payload.Cliente[0] : payload.Cliente);
      const clientObj = data.clientes.find((c) => c.id === clientRaw || c.codigo === clientRaw);
      const montoNum = Number(payload.montoCop ?? payload.monto ?? payload['Monto'] ?? 0);
      const tipoStr = String(payload.tipo || payload['Tipo'] || 'PAGO').toUpperCase();
      const referencia = String(payload.referencia ?? payload['Referencia'] ?? '').trim();
      if (!referencia) throw new Error('Ingresa una referencia.');

      const updateData: any = {
        fecha: payload.fecha || payload['Fecha'],
        tipo: tipoStr,
        cliente_id: clientObj?.id || clientRaw || null,
        cliente_codigo: clientObj?.codigo || null,
        cliente_nombre: clientObj?.nombre || (tipoStr === 'INGRESO' ? 'Ingreso a Caja' : 'Movimiento Interno'),
        monto: montoNum,
        comision_cop: Number(payload.comisionCop ?? 0),
        origen_fondos: payload.origenFondos || 'EFECTIVO-CAJA',
        origen_fondos_id: payload.origenFondosId || null,
        referencia,
      };

      const targetId = String(payload.id).startsWith('caja:')
        ? (data.efectivo.find((e) => e.codigo === payload.codigo)?.id || payload.id)
        : payload.id;

      const { data: saved, error } = await supabase.from('efectivo').update(updateData).eq('id', targetId).select('*').single();
      if (error) throw error;
      publishMutation('efectivo', saved);
      return true;
    } catch (err) {
      console.error('Error updating efectivo in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo actualizar el movimiento de efectivo.');
    }
  };

  const deleteMovimientoEfectivo = async (id: string): Promise<boolean> => {
    requireWrite('delete');
    try {
      const targetId = id.startsWith('caja:')
        ? (data.efectivo.find((e) => e.codigo === id.replace('caja:', ''))?.id || id)
        : id;
      const { error } = await supabase.from('efectivo').delete().eq('id', targetId).select('id').single();
      if (error) throw error;
      publishMutation('efectivo', null, targetId);
      return true;
    } catch (err) {
      console.error('Error deleting efectivo in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo eliminar el movimiento de efectivo.');
    }
  };

  const createGasto = async (payload: any): Promise<boolean> => {
    requireWrite('admin');
    try {
      const montoNum = Number(payload.monto || payload['Monto'] || 0);

      const insertData: any = {
        fecha: payload.fecha || new Date().toISOString().split('T')[0],
        concepto: String(payload.concepto || 'GASTO OPERATIVO').trim().toUpperCase(),
        categoria: payload.categoria || 'Otros Gastos Operativos',
        divisa: payload.divisa || 'COP',
        monto: montoNum,
        origen_fondos: payload.origenFondos || 'COINSENDA-KAUPALOKI',
        origen_fondos_id: payload.origenFondosId || null,
        comprobante_url: payload.comprobanteUrl || null,
      };
      if (payload.codigo) insertData.codigo = payload.codigo;

      const id = crypto.randomUUID();
      const { data: saved, error } = await writeDashboardRecord({ ...insertData, id }, (fields) => supabase.from('gastos').insert(fields).select('*').single(), {
        fallbackCode: createCode('GST', id),
        generatedColumns: [],
        optionalColumns: ['origen_fondos_id', ...(!payload.comprobanteUrl ? ['comprobante_url'] : [])],
      });

      if (error) throw error;
      publishMutation('gastos', saved);
      return true;
    } catch (err) {
      console.error('Error creating gasto in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo guardar el registro.');
    }
  };

  const createCliente = async (nombre: string, pais: string = 'COLOMBIA', authorId?: string): Promise<any> => {
    requireWrite('clients');
    try {
      const id = crypto.randomUUID();
      const author = authorId ? data.usuarios.find((u) => u.id === authorId) : null;
      const { data: inserted, error } = await writeDashboardRecord({
        id,
        nombre: nombre.trim().toUpperCase(),
        pais: pais || 'COLOMBIA',
        ingresos_cop: 0,
        pagado_cop: 0,
        pendiente_cop: 0,
        saldo_cop: 0,
        total_negocios: 0,
        estado: 'SIN ACTIVIDAD',
        fecha_creacion: new Date().toISOString(),
        ...(authorId ? { created_by: authorId, created_by_name: author?.nombre } : {}),
      }, (fields) => supabase.from('clientes').insert(fields).select('*').single(), {
        fallbackCode: createCode('CLI', id),
        optionalColumns: /^(COL|COLOMBIA)$/i.test(pais?.trim() || 'COL') ? ['pais'] : [],
      });

      if (error) throw error;
      publishMutation('clientes', inserted);
      return { success: true, id: inserted?.id };
    } catch (err) {
      console.error('Error creating cliente in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo guardar el cliente.');
    }
  };

  const updateCliente = async (payload: { id: string; nombre?: string; pais?: string; authorId?: string }): Promise<boolean> => {
    requireWrite('clients');
    try {
      const updates: any = {};
      if (payload.nombre !== undefined) updates.nombre = payload.nombre.trim().toUpperCase();
      if (payload.pais !== undefined) updates.pais = payload.pais.trim();
      if (payload.authorId !== undefined) {
        updates.created_by = payload.authorId || null;
        const author = payload.authorId ? data.usuarios.find((u) => u.id === payload.authorId) : null;
        updates.created_by_name = author?.nombre || null;
      }

      const { data: saved, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', payload.id).select('*').single();

      if (error) throw error;
      publishMutation('clientes', saved);
      return true;
    } catch (err) {
      console.error('Error updating cliente in Supabase:', err);
      throw dashboardWriteError(err, 'No se pudo actualizar el cliente.');
    }
  };

  const createCatalogRecord: DataContextType['createCatalogRecord'] = async (table, fields, editId) => {
    requireWrite('admin');
    const id = editId || crypto.randomUUID();
    let record: Record<string, string | number> = editId ? { ...fields } : { ...fields, id };
    const accountLabel = (accounts: any[], accountId: string | number) => {
      const account = accounts.find((item) => item.id === accountId);
      if (!account) throw new Error('La cuenta seleccionada ya no está disponible.');
      return account.activo || account.institucion || account.wallet;
    };

    switch (table) {
      case 'compras_usdt':
        if (editId) {
          if (fields.wallet_destino_id) record.wallet_destino = accountLabel(data.activosDigitales, fields.wallet_destino_id);
          break;
        }
        record = {
          ...record, codigo: 'AUTO',
          wallet_destino: accountLabel(data.activosDigitales, fields.wallet_destino_id),
        };
        break;
      case 'ventas_usdt':
        if (editId) {
          if (fields.wallet_origen_id) record.wallet_origen = accountLabel(data.activosDigitales, fields.wallet_origen_id);
          if (fields.destino_fondos_id) record.destino_fondos_nombre = accountLabel(data.activosLiquidos, fields.destino_fondos_id);
          break;
        }
        record = {
          ...record, codigo: 'AUTO',
          total_cop: Number(fields.usdt_vendido) * Number(fields.tasa),
          wallet_origen: accountLabel(data.activosDigitales, fields.wallet_origen_id),
          destino_fondos_nombre: accountLabel(data.activosLiquidos, fields.destino_fondos_id),
        };
        break;
      case 'activos_liquidos': {
        const account = data.activosLiquidos.find((item) => item.id === editId);
        if (account) {
          const isCash = (name: unknown, institution: unknown) =>
            String(institution ?? '').toUpperCase() === 'EFECTIVO' || String(name ?? '').toUpperCase().includes('EFECTIVO');
          const remainsCash = fields.institucion_id
            ? isCash('', fields.institucion)
            : isCash(fields.activo ?? account.activo, fields.institucion ?? account.institucion);
          if (isCash(account.activo, account.institucion) !== remainsCash) {
            throw new Error('La cuenta debe conservar su tipo de origen, Caja o cuenta bancaria.');
          }
        }
        break;
      }
      case 'activos_digitales':
        if (!editId && fields.wallet) record.id_wallet = fields.wallet;
        break;
      case 'divisas':
        record = { ...record, divisa: fields.codigo, total_recibido: 0, total_comprado: 0, total_pendiente: 0 };
        break;
    }

    if (Object.values(record).some((value) => typeof value === 'number' && !Number.isFinite(value))) {
      throw new Error('El resultado de la operación no es un número válido.');
    }
    const { data: saved, error } = editId
      ? await supabase.from(table).update(record).eq('id', editId).select('*').single()
      : await writeDashboardRecord(record, (fields) => supabase.from(table).insert(fields).select('*').single());
    if (error?.code === 'P0001' && /^(El monto supera|Selecciona un origen|La cuenta de destino|El ajuste supera|Ingresa montos|Las cuentas de un registro)/.test(error.message)) throw new Error(error.message);
    if (error) throw dashboardWriteError(error, 'No se pudo guardar el registro.');
    if (table === 'activos_liquidos' || table === 'activos_digitales') {
      await refreshSavedRow(table, id);
    } else {
      publishMutation(table, saved);
    }
  };

  const updateGasto = async (payload: any) => {
    requireWrite('admin');
    const { data: saved, error } = await supabase.from('gastos').update({
      concepto: String(payload.concepto || '').trim().toUpperCase(), categoria: payload.categoria, divisa: payload.divisa, monto: payload.monto,
      origen_fondos: payload.origenFondos, origen_fondos_id: payload.origenFondosId, fecha: payload.fecha,
    }).eq('id', payload.id).select('*').single();
    if (error) throw dashboardWriteError(error, 'No se pudo editar el gasto.');
    publishMutation('gastos', saved);
    return true;
  };

  const updateDispersion = async (payload: any) => {
    requireWrite('dispersion');
    const cliente = data.clientes.find((item) => item.id === payload.clienteId);
    if (!cliente) throw new Error('Selecciona un cliente válido.');
    const { data: saved, error } = await writeDashboardRecord({
      cliente_id: cliente.id, cliente_codigo: cliente.codigo, cliente_nombre: cliente.nombre,
      monto: payload.monto, monto_cop: payload.monto, origen_fondos: payload.origenFondos,
      ...(payload.costoCop !== undefined ? { costo_cop: payload.costoCop } : {}),
      origen_fondos_id: payload.origenFondosId, fecha: payload.fecha, referencia: payload.referencia,
    }, (record) => supabase.from('dispersiones').update(record).eq('id', payload.id).select('*').single(),
    { generatedColumns: ['monto_cop'] });
    if (error) throw dashboardWriteError(error, 'No se pudo editar la dispersión.');
    publishMutation('dispersiones', saved);
    return true;
  };

  const createRecord = async (table: string, fields: any): Promise<any> => {
    if (table === 'Clientes') {
      return createCliente(fields['Nombre'] || fields['NOMBRE'], fields['País'] || fields['PAÍS']);
    }
    if (table === 'Clientes' || table === 'clientes') {
      return updateCliente({ id, ...fields });
    }
    if (table === 'Negocios') {
      return createNegocio(fields);
    }
    if (table === 'Dispersiones') {
      return createDispersion(fields);
    }
    if (table === 'Efectivo') {
      return createMovimientoEfectivo(fields);
    }
    if (table === 'Gastos' || table === 'GASTOS') {
      return createGasto(fields);
    }
    await fetchFromSupabase();
    return { success: true };
  };

  const updateRecord = async (table: string, id: string, fields: any): Promise<any> => {
    if (table === 'Usuarios') {
      return updateUserPermissions({
        id,
        nombre: fields.Nombre,
        email: fields.Correo || fields.email,
        rol: fields.Rol,
        pais: fields['País'],
        divisasAutorizadas: fields['Divisas Autorizadas'],
        estado: fields.Estado,
      });
    }
    if (table === 'Negocios') {
      return updateNegocio({ id, ...fields });
    }
    await fetchFromSupabase();
    return { success: true };
  };

  const adminReset2FA = async (targetUserId: string): Promise<{ success: boolean; error?: string }> => {
    requireWrite('admin');
    try {
      const { error } = await supabase.rpc('admin_restablecer_2fa', { target_user_id: targetUserId });
      if (error) throw dashboardWriteError(error, 'No se pudo restablecer el 2FA del usuario.');
      await refreshUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al restablecer 2FA' };
    }
  };

  const deleteUser = async (idOrEmail: string): Promise<{ success: boolean; error?: string }> => {
    requireWrite('admin');
    try {
      const user = data.usuarios.find((u) => u.id === idOrEmail || u.correo === idOrEmail);
      if (!user) throw new Error('El perfil ya no está disponible.');
      const { data: deleted, error } = await supabase.rpc('eliminar_perfil_dashboard', { p_id: user.id });
      if (error || !deleted) throw dashboardWriteError(error, 'No se pudo eliminar el perfil.');
      publishMutation('profiles', null, user.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  };

  const sendUserInvite = async (
    email: string,
    fullName?: string
  ): Promise<{ success: boolean; actionLink?: string; error?: string }> => {
    requireWrite('admin');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Inicia sesión para enviar la invitación.');
      const res = await fetch(EDGE_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({
          action: 'send_user_invite',
          email,
          fullName,
        }),
      });
      const resJson = await res.json().catch(() => ({}));
      if (res.ok && resJson.ok) {
        return { success: true, actionLink: resJson.actionLink };
      }
      return { success: false, error: resJson.error || 'No se pudo enviar la invitación' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error de conexión' };
    }
  };

  const updateUserPermissions = async (payload: any): Promise<boolean> => {
    requireWrite('admin');
    try {
      const { id, nombre, email, correo, pais, rol, estado, divisasAutorizadas } = payload;
      const updates: any = {};
      if (nombre !== undefined) updates.full_name = nombre;
      const targetEmail = email ?? correo;
      if (targetEmail !== undefined && typeof targetEmail === 'string') {
        const cleanEmail = targetEmail.trim().toLowerCase();
        if (cleanEmail) updates.email = cleanEmail;
      }
      if (pais !== undefined) updates.pais = pais;
      if (rol !== undefined) updates.role = rol;
      if (estado !== undefined) updates.status = estado.toLowerCase();
      if (divisasAutorizadas !== undefined) updates.authorized_currencies = divisasAutorizadas;

      const { data: updated, error } = await supabase.rpc('actualizar_perfil_dashboard', { p_id: id, p_changes: updates });
      if (error || !updated) throw dashboardWriteError(error, 'No se pudo actualizar el usuario.');
      if (id === profile?.id) await refreshProfile();
      await refreshUsers();
      return true;
    } catch (error) {
      throw dashboardWriteError(error, 'No se pudo actualizar el usuario.');
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchFromSupabase();

    // Supabase Realtime Subscription to public schema tables
    const channel = supabase
      .channel('supabase_realtime_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public' }, scheduleRefresh)
      .subscribe();

    return () => {
      latestFetch.current++;
      refreshRequested.current = false;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [fetchFromSupabase, scheduleRefresh, userId]);

  const saveComisionista: DataContextType['saveComisionista'] = async (payload) => {
    requireWrite('admin');
    const record = {
      cliente_id: payload.comisionistaId,
      referidos_ids: payload.comisionaDeIds,
      porcentaje_comision: payload.porcentajeComision,
    };
    const { data: saved, error } = payload.id
      ? await supabase.from('comisionistas').update(record).eq('id', payload.id).select('*').single()
      : await supabase.from('comisionistas').insert(record).select('*').single();
    if (error) throw dashboardWriteError(error, payload.id ? 'No se pudo editar el comisionista.' : 'No se pudo registrar el comisionista.');
    publishMutation('comisionistas', saved);
    return true;
  };

  const createTransferenciaInterna = async (payload: any): Promise<boolean> => {
    requireWrite('admin');
    try {
      const record = {
        fecha: payload.fecha || new Date().toISOString().slice(0, 10),
        tipo_origen: payload.tipoOrigen,
        origen_id: payload.origenId,
        origen_nombre: payload.origenNombre,
        tipo_destino: payload.tipoDestino,
        destino_id: payload.destinoId,
        destino_nombre: payload.destinoNombre,
        monto: Number(payload.monto),
        divisa_origen: payload.divisaOrigen || (payload.tipoOrigen === 'ACTIVO_DIGITAL' ? 'USDT' : 'COP'),
        monto_destino: Number(payload.montoDestino || payload.monto),
        divisa_destino: payload.divisaDestino || (payload.tipoDestino === 'ACTIVO_DIGITAL' ? 'USDT' : 'COP'),
        tasa: Number(payload.tasa || 1),
        costo: Number(payload.costo || 0),
        divisa_costo: payload.divisaCosto || (payload.tipoOrigen === 'ACTIVO_DIGITAL' ? 'USDT' : 'COP'),
        concepto: payload.concepto?.trim() || '',
        notas: payload.notas?.trim() || null,
        comprobante_url: payload.comprobanteUrl || null,
      };
      const { data: saved, error } = await supabase.from('transferencias_internas').insert(record).select('*').single();
      if (error) throw error;
      publishMutation('transferencias_internas', saved);
      return true;
    } catch (err: any) {
      console.error('Error creating transferencia interna:', err);
      throw dashboardWriteError(err, 'No se pudo registrar la transferencia interna.');
    }
  };

  const updateTransferenciaInterna = async (id: string, payload: any): Promise<boolean> => {
    requireWrite('admin');
    try {
      const record = {
        fecha: payload.fecha,
        tipo_origen: payload.tipoOrigen,
        origen_id: payload.origenId,
        origen_nombre: payload.origenNombre,
        tipo_destino: payload.tipoDestino,
        destino_id: payload.destinoId,
        destino_nombre: payload.destinoNombre,
        monto: Number(payload.monto),
        divisa_origen: payload.divisaOrigen,
        monto_destino: Number(payload.montoDestino || payload.monto),
        divisa_destino: payload.divisaDestino,
        tasa: Number(payload.tasa || 1),
        costo: Number(payload.costo || 0),
        divisa_costo: payload.divisaCosto,
        concepto: payload.concepto?.trim() || '',
        notas: payload.notas?.trim() || null,
        comprobante_url: payload.comprobanteUrl || null,
      };
      const { data: saved, error } = await supabase.from('transferencias_internas').update(record).eq('id', id).select('*').single();
      if (error) throw error;
      publishMutation('transferencias_internas', saved);
      return true;
    } catch (err: any) {
      console.error('Error updating transferencia interna:', err);
      throw dashboardWriteError(err, 'No se pudo actualizar la transferencia interna.');
    }
  };

  const deleteTransferenciaInterna = async (id: string): Promise<boolean> => {
    requireWrite('delete');
    try {
      const { error } = await supabase.from('transferencias_internas').delete().eq('id', id).select('id').single();
      if (error) throw error;
      publishMutation('transferencias_internas', null, id);
      return true;
    } catch (err: any) {
      console.error('Error deleting transferencia interna:', err);
      throw dashboardWriteError(err, 'No se pudo eliminar la transferencia interna.');
    }
  };

  const marcarCompraRecibida = async (compraId: string): Promise<boolean> => {
    requireWrite('admin');
    const { data: res, error } = await supabase.rpc('marcar_compra_usdt_recibida', { p_compra_id: compraId });
    if (error) throw dashboardWriteError(error, 'No se pudo marcar la compra como recibida.');
    await scheduleRefresh();
    return true;
  };

  const marcarVentaRecibida = async (ventaId: string): Promise<boolean> => {
    requireWrite('admin');
    const { data: res, error } = await supabase.rpc('marcar_venta_usdt_recibida', { p_venta_id: ventaId });
    if (error) throw dashboardWriteError(error, 'No se pudo marcar la venta como recibida.');
    await scheduleRefresh();
    return true;
  };

  return (
    <DataContext.Provider
      value={{
        snapshot,
        data,
        metrics,
        loading,
        syncStatus,
        lastSyncTime,
        syncData,
        refreshUsers,
        syncWithAirtable: syncData,
        createCatalogRecord,
        createRecord,
        updateRecord,
        createNegocio,
        updateNegocio,
        createDispersion,
        updateDispersion,
        updateGasto,
        createMovimientoEfectivo,
        updateMovimientoEfectivo,
        deleteMovimientoEfectivo,
        createGasto,
        createCliente,
        updateCliente,
        deleteNegocio,
        deleteCliente,
        deleteDispersion,
        deleteGasto,
        deleteComisionista,
        deleteCatalogRecord,
        createTransferenciaInterna,
        updateTransferenciaInterna,
        deleteTransferenciaInterna,
        updateRateUsdt,
        saveComisionista,
        deleteUser,
        adminReset2FA,
        sendUserInvite,
        updateUserPermissions,
        marcarCompraRecibida,
        marcarVentaRecibida,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);

// Backward compatibility exports
export { useData as useAirtable, DataProvider as AirtableProvider };
export type { DataContextType as AirtableContextType, AppUser as AppUser };
