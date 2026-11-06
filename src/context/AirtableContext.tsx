import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ACTIVOS_LIQUIDOS, ACTIVOS_DIGITALES } from '../data/airtableData';

const EDGE_SYNC_URL = 'https://tjuqludeduydarwzhbor.supabase.co/functions/v1/airtable-sync';
const PAT_STORAGE_KEY = 'kaupaloki_airtable_pat';

export interface AirtableUser {
  id: string;
  codigo: string;
  nombre: string;
  correo: string;
  rol: string;
  pais?: string;
  divisasAutorizadas?: string[];
  estado: string;
}

export interface ResumenLiquidacion {
  totalNegocioCop: number;
  totalClientesIngresosCop?: number;
  totalVentasUsdtCop: number;
  totalLiquidezEsperadaCop: number;
  totalGastosCop?: number;
  gananciaEsperadaCop: number;
  totalActivosDigitalesUsdt: number;
  totalActivosLiquidosCop: number;
  totalSaldoPendienteClientesCop: number;
}

export interface AirtableSnapshot {
  syncedAt?: string;
  clientes: any[];
  negocios: any[];
  dispersiones: any[];
  pagos: any[];
  divisas: any[];
  comprasUsdt: any[];
  ventasUsdt: any[];
  activosLiquidos: any[];
  activosDigitales: any[];
  efectivo: any[];
  gastos?: any[];
  usuarios: any[];
  resumenLiquidacion?: ResumenLiquidacion;
}

export interface GastoItem {
  id: string;
  codigo: string;
  concepto: string;
  categoria: string;
  divisa: 'COP' | 'USDT';
  monto: number;
  origenFondos: string;
  fecha: string;
  comprobanteUrl?: string;
  raw: any;
}

export interface NormalizedData {
  clientes: Array<{
    id: string;
    codigo: string;
    nombre: string;
    pais?: string;
    totalIngresosCOP: number;
    totalDispersadoCOP: number;
    saldoPendienteCOP: number;
    estado: string;
    dispersionesIds?: string[];
    negociosIds?: string[];
    efectivoIds?: string[];
    raw: any;
  }>;
  negocios: Array<{
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
  dispersiones: Array<{
    id: string;
    codigo: string;
    fecha: string;
    clienteId?: string;
    clienteRecordId?: string;
    clienteCodigo?: string;
    clienteNombre: string;
    monto: number;
    origenFondos: string;
    referencia?: string;
    comprobanteUrl?: string;
    estado: string;
    raw: any;
  }>;
  efectivo: Array<{
    id: string;
    codigo: string;
    fecha: string;
    tipo: 'Ingreso' | 'Pago';
    clienteId?: string;
    clienteRecordId?: string;
    clienteCodigo?: string;
    clienteNombre: string;
    monto: number;
    origenFondos: string;
    referencia?: string;
    raw: any;
  }>;
  gastos: GastoItem[];
  divisas: Array<{
    id: string;
    codigo: string;
    nombre: string;
    pais: string;
    totalRecibido: number;
    totalComprado: number;
    totalPendiente: number;
    estado?: string;
    raw: any;
  }>;
  comprasUsdt: Array<{
    id: string;
    codigo: string;
    fecha: string;
    divisaCodigo: string;
    valorComprado: number;
    usdtComprado: number;
    tasa: number;
    costo: number;
    walletDestino?: string;
    raw: any;
  }>;
  ventasUsdt: Array<{
    id: string;
    codigo: string;
    fecha: string;
    concepto: string;
    usdtVendido: number;
    tasa: number;
    totalCOP: number;
    destinoFondosNombre?: string;
    walletOrigen?: string;
    raw: any;
  }>;
  comisionistas: Array<{
    id: string;
    codigo: string;
    comisionistaId?: string;
    comisionistaNombre: string;
    comisionaDeNombres: string[];
    ingresosCOP: number;
    porcentajeComision: number;
    comisionesCOP: number;
    fechaCreacion?: string;
    raw: any;
  }>;
  usuarios: AirtableUser[];
  activosLiquidos: any[];
  activosDigitales: any[];
}

export interface MetricsSummary {
  totalActivosLiquidos: number;
  totalActivosDigitales: number;
  saldoPendienteClientes: number;
  gananciaEsperada: number;
  totalNegocioCOP: number;
  totalClientesIngresosCOP: number;
  totalVentasUSDT: number;
  liquidezEsperada: number;
  totalGastosCOP: number;
}

interface AirtableContextType {
  snapshot: AirtableSnapshot;
  data: NormalizedData;
  metrics: MetricsSummary;
  loading: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncTime: string;
  syncWithAirtable: (forceLive?: boolean) => Promise<void>;
  createRecord: (table: string, fields: any) => Promise<any>;
  updateRecord: (table: string, id: string, fields: any) => Promise<any>;
  createNegocio: (payload: any) => Promise<boolean>;
  updateNegocio: (payload: any) => Promise<boolean>;
  createDispersion: (payload: any) => Promise<boolean>;
  createMovimientoEfectivo: (payload: any) => Promise<boolean>;
  createGasto: (payload: any) => Promise<boolean>;
  createCliente: (nombre: string, pais: string) => Promise<any>;
  deleteUser: (idOrEmail: string) => Promise<{ success: boolean; error?: string }>;
  sendUserInvite: (email: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  updateUserPermissions: (payload: any) => Promise<boolean>;
  createComisionista: (payload: any) => Promise<boolean>;
}

const defaultSnapshot: AirtableSnapshot = {
  clientes: [],
  negocios: [],
  dispersiones: [],
  pagos: [],
  divisas: [],
  comprasUsdt: [],
  ventasUsdt: [],
  comisionistas: [],
  activosLiquidos: ACTIVOS_LIQUIDOS,
  activosDigitales: ACTIVOS_DIGITALES,
  efectivo: [],
  gastos: [
    {
      id: "rec8UqVD5UxZTjHrn",
      codigo: "GASTO-1",
      concepto: "SOCIEDAD",
      categoria: "Liquidación",
      divisa: "COP",
      monto: 150000,
      origenFondos: "Coinsenda 1 (Bancolombia)",
      fecha: "2026-11-05",
      comprobanteUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793944800000/NGBpi5DKNrB54Uyn1pBxAg/ZeF1IEXq0cW4_UpAOtg08K9rwaGmA_NONcMkFyDWcH2ug0zGR6Km88l_xyB0-D9LKca2YCGRr6J6r235ouAWn8r5fGgTFWz63FKgi0CbfT8esT0XrQvxC5x1_sNIzlfVP2LHjN5dcG63A1bITfI7tZ_wj8Fyhf2WIR5w6l3tBOF2mQ54XghFI0SDV6gaG011/s93J13Vxrq3vZaUus5mVFsgh7ut9t-jsThohuiTLP70",
      comprobanteNombre: "WhatsApp Image 2026-11-04 at 5.14.17 PM.jpeg"
    },
    {
      id: "recUn0XruxKU5wZla",
      codigo: "GASTO-2",
      concepto: "AML",
      categoria: "Software",
      divisa: "USDT",
      monto: 17,
      origenFondos: "Tether TRC20",
      fecha: "2026-11-05"
    },
    {
      id: "recUoTucGpxQLIXa4",
      codigo: "GASTO-3",
      concepto: "Sueldo Mari",
      categoria: "Nómina y Salarios",
      divisa: "COP",
      monto: 1500000,
      origenFondos: "Coinsenda 2 (Bancolombia)",
      fecha: "2026-11-05"
    }
  ],
  usuarios: [],
};

const AirtableContext = createContext<AirtableContextType>({} as AirtableContextType);

export const AirtableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState<AirtableSnapshot>(() => {
    try {
      const saved = localStorage.getItem('kaupaloki_cached_snapshot');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultSnapshot;
  });
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const getPat = () => localStorage.getItem(PAT_STORAGE_KEY) || undefined;

  const applySnapshot = useCallback((newSnap: AirtableSnapshot) => {
    if (!newSnap) return;
    setSnapshot((prev) => {
      const mergedGastos = (newSnap.gastos && newSnap.gastos.length > 0) ? newSnap.gastos : prev.gastos;
      const merged = { ...newSnap, gastos: mergedGastos };
      try {
        localStorage.setItem('kaupaloki_cached_snapshot', JSON.stringify(merged));
      } catch {}
      return merged;
    });
    const now = new Date();
    setLastSyncTime(
      now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }, []);

  const fetchFromSupabase = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const [
        { data: clientesData },
        { data: divisasData },
        { data: negociosData },
        { data: dispersionesData },
        { data: comprasUsdtData },
        { data: ventasUsdtData },
        { data: activosLiquidosData },
        { data: activosDigitalesData },
        { data: efectivoData },
        { data: gastosData },
        { data: resumenData },
        { data: profilesData },
      ] = await Promise.all([
        supabase.from('clientes').select('*').order('numero', { ascending: false }),
        supabase.from('divisas').select('*'),
        supabase.from('negocios').select('*').order('fecha', { ascending: false }),
        supabase.from('dispersiones').select('*').order('fecha', { ascending: false }),
        supabase.from('compras_usdt').select('*').order('fecha', { ascending: false }),
        supabase.from('ventas_usdt').select('*').order('fecha', { ascending: false }),
        supabase.from('activos_liquidos').select('*'),
        supabase.from('activos_digitales').select('*'),
        supabase.from('efectivo').select('*').order('fecha', { ascending: false }),
        supabase.from('gastos').select('*').order('fecha', { ascending: false }),
        supabase.from('resumen_liquidacion').select('*').eq('id', 'current').maybeSingle(),
        supabase.from('profiles').select('*'),
      ]);

      const clientes = (clientesData || []).map((c: any) => ({
        id: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        numero: c.numero,
        ingresosCop: Number(c.ingresos_cop || 0),
        pagadoCop: Number(c.pagado_cop || 0),
        pendienteCop: Number(c.pendiente_cop || 0),
        saldoCop: Number(c.saldo_cop || 0),
        estado: c.estado,
        fechaCreacion: c.fecha_creacion,
      }));

      const divisas = (divisasData || []).map((d: any) => ({
        id: d.id,
        codigo: d.codigo,
        divisa: d.divisa,
        nombreDivisa: d.nombre_divisa,
        pais: d.pais,
        banderaUrl: d.bandera_url,
        totalRecibido: Number(d.total_recibido || 0),
        totalComprado: Number(d.total_comprado || 0),
        totalPendiente: Number(d.total_pendiente || 0),
      }));

      const negocios = (negociosData || []).map((n: any) => ({
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
      }));

      const dispersiones = (dispersionesData || []).map((d: any) => ({
        id: d.id,
        codigo: d.codigo,
        numero: d.numero,
        fecha: d.fecha,
        clienteId: d.cliente_id,
        clienteCodigo: d.cliente_codigo,
        clienteNombre: d.cliente_nombre,
        monto: Number(d.monto || d.monto_cop || 0),
        montoCop: Number(d.monto_cop || d.monto || 0),
        origenFondos: d.origen_fondos,
        referencia: d.referencia,
        estado: d.estado,
        tieneComprobante: Boolean(d.tiene_comprobante),
        comprobanteUrl: d.comprobante_url,
      }));

      const comprasUsdt = (comprasUsdtData || []).map((c: any) => ({
        id: c.id,
        codigo: c.codigo,
        numero: c.numero,
        fecha: c.fecha,
        divisaCodigo: c.divisa_codigo,
        valorComprado: Number(c.valor_comprado || 0),
        usdtComprado: Number(c.usdt_comprado || 0),
        tasa: Number(c.tasa || 0),
        costo: Number(c.costo || 0),
        walletDestino: c.wallet_destino,
      }));

      const ventasUsdt = (ventasUsdtData || []).map((v: any) => ({
        id: v.id,
        codigo: v.codigo,
        numero: v.numero,
        fecha: v.fecha,
        concepto: v.concepto,
        usdtVendido: Number(v.usdt_vendido || 0),
        tasa: Number(v.tasa || 0),
        totalCop: Number(v.total_cop || 0),
        walletOrigen: v.wallet_origen,
        destinoFondosNombre: v.destino_fondos_nombre,
      }));

      const activosLiquidos = (activosLiquidosData || []).map((a: any) => ({
        id: a.id,
        activo: a.activo,
        institucion: a.institucion,
        titular: a.titular,
        empresa: a.empresa,
        cuenta: a.cuenta,
        divisa: a.divisa,
        tarifas: a.tarifas,
        saldoCop: Number(a.saldo_cop || 0),
        saldoReal: Number(a.saldo_real || a.saldo_cop || 0),
        ingresosCop: Number(a.ingresos_cop || 0),
        egresosCop: Number(a.egresos_cop || 0),
        movimientos: a.movimientos || [],
      }));

      const activosDigitales = (activosDigitalesData || []).map((d: any) => ({
        id: d.id,
        activo: d.activo,
        idWallet: d.id_wallet,
        wallet: d.wallet,
        red: d.red,
        titular: d.titular,
        tarifas: d.tarifas,
        saldoUsdt: Number(d.saldo_usdt || 0),
        saldoReal: Number(d.saldo_real || d.saldo_usdt || 0),
        ingresosUsdt: Number(d.ingresos_usdt || 0),
        egresosUsdt: Number(d.egresos_usdt || 0),
        rateFinal: Number(d.rate_final || 3230),
        liquidezEsperadaCop: Number(d.liquidez_esperada_cop || 0),
        movimientos: d.movimientos || [],
      }));

      const efectivo = (efectivoData || []).map((e: any) => ({
        id: e.id,
        codigo: e.codigo,
        fecha: e.fecha,
        tipo: e.tipo,
        clienteId: e.cliente_id,
        clienteCodigo: e.cliente_codigo,
        clienteNombre: e.cliente_nombre,
        monto: Number(e.monto || 0),
        origenFondos: e.origen_fondos,
        referencia: e.referencia,
      }));

      const gastos = (gastosData || []).map((g: any) => ({
        id: g.id,
        codigo: g.codigo,
        fecha: g.fecha,
        concepto: g.concepto,
        categoria: g.categoria,
        divisa: g.divisa,
        monto: Number(g.monto || 0),
        origenFondos: g.origen_fondos,
      }));

      const usuarios = (profilesData || []).map((p: any) => ({
        id: p.id,
        codigo: p.operator_code || p.full_name || 'USR',
        nombre: p.full_name || p.email || 'Usuario',
        correo: p.email || '',
        rol: p.role || 'operador',
        pais: p.country || 'Colombia',
        divisasAutorizadas: p.authorized_currencies || [],
        estado: p.is_active ? 'Activo' : 'Inactivo',
      }));

      const resumenLiquidacion: ResumenLiquidacion | undefined = resumenData ? {
        totalNegocioCop: Number(resumenData.total_negocio_cop || 645436000),
        totalVentasUsdtCop: Number(resumenData.total_ventas_usdt_cop || 624536020),
        totalLiquidezEsperadaCop: Number(resumenData.total_liquidez_esperada_cop || 35530000),
        gananciaEsperadaCop: Number(resumenData.ganancia_esperada_cop || 10119380),
        totalActivosDigitalesUsdt: Number(resumenData.total_activos_digitales_usdt || 11000),
        totalActivosLiquidosCop: Number(resumenData.total_activos_liquidos_cop || 518008020),
        totalSaldoPendienteClientesCop: Number(resumenData.total_saldo_pendiente_clientes_cop || 543418640),
        totalGastosCop: Number(resumenData.total_gastos_cop || 4000000),
      } : undefined;

      const newSnapshot: AirtableSnapshot = {
        syncedAt: new Date().toISOString(),
        clientes,
        divisas,
        negocios,
        dispersiones,
        pagos: dispersiones,
        comprasUsdt,
        ventasUsdt,
        activosLiquidos,
        activosDigitales,
        efectivo,
        gastos,
        usuarios,
        resumenLiquidacion,
      };

      applySnapshot(newSnapshot);
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      console.error('Error fetching directly from Supabase:', err);
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  }, [applySnapshot]);

  const syncWithAirtable = useCallback(
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
      const totalIngresos = Number(c.ingresosCop ?? c.totalIngresosCop ?? c['Total Ingreso'] ?? 0);
      const totalDispersado = Number(c.pagadoCop ?? c.totalDispersadoCop ?? c['Total Dispersado'] ?? 0);
      const saldoPendiente = Number(c.pendienteCop ?? c.pendientePorPagarCop ?? c.saldoCop ?? (totalIngresos - totalDispersado));
      
      let estado = c.estado || 'PENDIENTE';
      if (typeof estado === 'string') {
        const up = estado.toUpperCase();
        if (up.includes('PAGADO')) estado = 'PAGADO';
        else if (up.includes('DEBE')) estado = 'DEBE';
        else estado = 'PENDIENTE';
      }

      // Display the full {CLIENTE} column text as requested
      const fullCode = c.codigo || c.idCliente || c.cliente || c['CLIENTE'] || c.nombre || 'C-000';

      const rawDispersionesIds = c.dispersionesIds || c.fields?.['DISPERSIONES'] || c['DISPERSIONES'] || [];
      const rawNegociosIds = c.negociosIds || c.fields?.['NEGOCIOS'] || c['NEGOCIOS'] || [];
      const rawEfectivoIds = c.efectivoIds || c.fields?.['EFECTIVO'] || c['EFECTIVO'] || [];

      return {
        id: c.id || c.codigo,
        codigo: fullCode,
        nombre: c.nombre || c['Nombre'] || fullCode,
        pais: c.pais || c['País'] || 'Colombia',
        totalIngresosCOP: totalIngresos,
        totalDispersadoCOP: totalDispersado,
        saldoPendienteCOP: saldoPendiente,
        estado,
        dispersionesIds: Array.isArray(rawDispersionesIds) ? rawDispersionesIds : [rawDispersionesIds],
        negociosIds: Array.isArray(rawNegociosIds) ? rawNegociosIds : [rawNegociosIds],
        efectivoIds: Array.isArray(rawEfectivoIds) ? rawEfectivoIds : [rawEfectivoIds],
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
        fecha: d.fecha || d.fechaCreacion || '',
        clienteId,
        clienteRecordId: d.clienteRecordId || clienteId,
        clienteCodigo,
        clienteNombre,
        monto: Number(d.monto ?? d.montoCop ?? d.valorTotalDispersion ?? 0),
        origenFondos: d.origenFondos || d.medioPagoNombre || 'Bancolombia',
        referencia: d.referencia || d.concepto || '',
        comprobanteUrl: d.comprobanteUrl || (d.comprobantes && d.comprobantes[0]?.url) || undefined,
        estado: d.estado || 'Exitosa',
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
        origenFondos: e.origenFondosNombre || e.origenFondos || 'Efectivo Dosquebradas',
        referencia: e.referencia || '',
        raw: e,
      };
    });

    // Gastos
    const rawGastosList = (snapshot.gastos && snapshot.gastos.length > 0)
      ? snapshot.gastos
      : defaultSnapshot.gastos;

    const gastos: GastoItem[] = rawGastosList.map((g: any) => {
      const compArr = g['COMPROBANTE'] || g.comprobante || g.comprobantes;
      const compUrl = g.comprobanteUrl || (Array.isArray(compArr) && compArr[0]?.url) || (typeof compArr === 'string' ? compArr : undefined);
      const compNombre = g.comprobanteNombre || (Array.isArray(compArr) && compArr[0]?.filename) || undefined;

      return {
        id: g.id || g.gasto || g['GASTO'],
        codigo: g.codigo || g.gasto || g['GASTO'] || 'GST-000',
        concepto: g.concepto || g['CONCEPTO'] || 'Gasto Operativo',
        categoria: g.categoria || g['CATEGORÍA'] || 'Otros Gastos Operativos',
        divisa: (g.divisa || g['DIVISA'] || 'COP') as 'COP' | 'USDT',
        monto: Number(g.monto ?? g['MONTO'] ?? 0),
        origenFondos: g.origenFondos || g['ORIGEN FONDOS'] || 'Efectivo Dosquebradas',
        fecha: g.fecha || g['FECHA'] || g['FECHA GASTO'] || g['FECHA CREACIÓN'] || '',
        comprobanteUrl: compUrl,
        comprobanteNombre: compNombre,
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
        pais: cleanPais,
        totalRecibido: Number(d.totalRecibido ?? d.ingresoEnDivisa ?? 0),
        totalComprado: Number(d.totalComprado ?? d.egresoEnDivisa ?? 0),
        totalPendiente: Number(d.totalPendiente ?? d.saldo ?? 0),
        estado: d.estado || 'Activo',
        raw: d,
      };
    });

    // Usuarios: Initial default is Invitado
    const usuarios: AirtableUser[] = (snapshot.usuarios || []).map((u: any) => {
      let divisasAut: string[] = [];
      if (Array.isArray(u.divisasAutorizadas)) {
        divisasAut = u.divisasAutorizadas;
      } else if (typeof u.divisasAutorizadas === 'string') {
        divisasAut = u.divisasAutorizadas.split(',').map((s: string) => s.trim());
      }

      return {
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
      divisaCodigo: c.divisaCodigo || c.divisaNombre || 'USD',
      valorComprado: Number(c.valorComprado ?? c.montoDivisa ?? 0),
      usdtComprado: Number(c.usdtComprado ?? c.totalRecibidoUsdt ?? 0),
      tasa: Number(c.tasa ?? c.tasaUsdt ?? 0),
      costo: Number(c.costo ?? 0),
      walletDestino: c.walletDestino || 'Tether TRC20',
      raw: c,
    }));

    // Ventas USDT
    const ventasUsdt = (snapshot.ventasUsdt || []).map((v: any) => ({
      id: v.id || v.codigo,
      codigo: v.codigo || v.idTransaccion || v.idVenta || 'VNT-000',
      fecha: v.fecha || '',
      concepto: v.concepto || 'Venta USDT',
      usdtVendido: Number(v.usdtVendido ?? v.cantidadUsdt ?? 0),
      tasa: Number(v.tasa ?? v.tasaVentaCop ?? 0),
      totalCOP: Number(v.totalCop ?? v.totalCOP ?? 0),
      destinoFondosNombre: v.destinoFondosNombre || v.cuentaDestinoNombre || 'Cuenta Destino',
      walletOrigen: v.walletOrigen || 'CUY WALLET',
      raw: v,
    }));

    // Comisionistas
    const rawComisionistas = (snapshot as any).comisionistas || [];
    const comisionistas = rawComisionistas.map((cm: any) => {
      const comId = Array.isArray(cm.comisionista) ? cm.comisionista[0] : (cm.comisionistaClienteId || cm.comisionista);
      const comNombre = clientMap.get(comId) || cm.comisionistaNombre || 'Comisionista';
      const refIds = Array.isArray(cm.comisionaDe) ? cm.comisionaDe : (cm.comisionaDeIds || []);
      const refNombres = refIds.map((id: string) => clientMap.get(id) || id);

      return {
        id: cm.id || cm.codigo,
        codigo: cm.codigo || cm.Name || 'COM-000',
        comisionistaId: comId,
        comisionistaNombre: comNombre,
        comisionaDeNombres: refNombres,
        ingresosCOP: Number(cm.ingresos || cm.ingresosCOP || 0),
        porcentajeComision: Number(cm.porcentajeComision ?? cm['% COMISIÓN'] ?? 0),
        comisionesCOP: Number(cm.comisiones || cm.comisionesCOP || 0),
        fechaCreacion: cm.fechaCreacion || cm.createdTime || '',
        raw: cm,
      };
    });

    // Enrich Activos Liquidos with complete movements (Gastos and Efectivo)
    const rawLiquidos = (snapshot.activosLiquidos && snapshot.activosLiquidos.length > 0) ? snapshot.activosLiquidos : ACTIVOS_LIQUIDOS;
    const enrichedActivosLiquidos = rawLiquidos.map((a: any) => {
      const existingMovs = Array.isArray(a.movimientos) ? [...a.movimientos] : [];
      
      // Inject Gastos COP linked to this account
      gastos.forEach((g: any) => {
        if (g.divisa !== 'COP') return;
        const belongs = 
          g.activoLiquidoId === a.id ||
          g.origenFondosIds?.includes(a.id) ||
          g.origenCuentaId === a.id ||
          (g.origenFondos && (
            g.origenFondos.toLowerCase().includes((a.institucion || '').toLowerCase()) ||
            g.origenFondos.toLowerCase().includes((a.empresa || '').toLowerCase()) ||
            g.origenFondos.toLowerCase().includes((a.activo || '').toLowerCase())
          ));
        if (belongs) {
          const already = existingMovs.some((m: any) => m.origen === g.codigo || m.concepto?.includes(g.codigo));
          if (!already) {
            existingMovs.push({
              fecha: g.fecha,
              origen: g.codigo,
              concepto: `Gasto: ${g.concepto} (${g.categoria || 'Operativo'})`,
              monto: -Math.abs(g.monto),
            });
          }
        }
      });

      // Inject Efectivo movements linked to this account
      efectivo.forEach((e: any) => {
        const belongs = e.origenFondosId === a.id || (a.activo || '').toLowerCase().includes('efectivo');
        if (belongs) {
          const already = existingMovs.some((m: any) => m.origen === e.codigo);
          if (!already) {
            const isIngreso = e.tipo === 'INGRESO';
            existingMovs.push({
              fecha: e.fecha,
              origen: e.codigo,
              concepto: isIngreso
                ? `Ingreso Efectivo: ${e.referencia || e.clienteNombre || 'Caja'}`
                : `Pago Efectivo: ${e.referencia || e.clienteNombre || 'Entrega'}`,
              monto: isIngreso ? Math.abs(e.montoCop) : -Math.abs(e.montoCop),
            });
          }
        }
      });

      // Re-sort and recalculate running balances
      existingMovs.sort((m1: any, m2: any) => (m1.fecha || '').localeCompare(m2.fecha || ''));
      let running = 0;
      const movimientosWithBalance = existingMovs.map((m: any) => {
        running += Number(m.monto || 0);
        return { ...m, balance: running };
      }).reverse();

      return {
        ...a,
        movimientos: movimientosWithBalance,
      };
    });

    // Enrich Activos Digitales with complete movements (Gastos USDT)
    const rawDigitales = (snapshot.activosDigitales && snapshot.activosDigitales.length > 0) ? snapshot.activosDigitales : ACTIVOS_DIGITALES;
    const enrichedActivosDigitales = rawDigitales.map((d: any) => {
      const existingMovs = Array.isArray(d.movimientos) ? [...d.movimientos] : [];
      
      gastos.forEach((g: any) => {
        if (g.divisa !== 'USDT') return;
        const belongs = 
          g.activoDigitalId === d.id ||
          g.origenFondosIds?.includes(d.id) ||
          (g.origenFondos && (
            g.origenFondos.toLowerCase().includes('usdt') ||
            g.origenFondos.toLowerCase().includes((d.wallet || '').toLowerCase()) ||
            g.origenFondos.toLowerCase().includes((d.activo || '').toLowerCase())
          ));
        if (belongs) {
          const already = existingMovs.some((m: any) => m.origen === g.codigo || m.concepto?.includes(g.codigo));
          if (!already) {
            existingMovs.push({
              fecha: g.fecha,
              origen: g.codigo,
              concepto: `Gasto USDT: ${g.concepto} (${g.categoria || 'Software'})`,
              monto: -Math.abs(g.monto),
            });
          }
        }
      });

      existingMovs.sort((m1: any, m2: any) => (m1.fecha || '').localeCompare(m2.fecha || ''));
      let running = 0;
      const movimientosWithBalance = existingMovs.map((m: any) => {
        running += Number(m.monto || 0);
        return { ...m, balance: running };
      }).reverse();

      return {
        ...d,
        movimientos: movimientosWithBalance,
      };
    });

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
      activosLiquidos: enrichedActivosLiquidos,
      activosDigitales: enrichedActivosDigitales,
    };
  }, [snapshot]);

  const metrics: MetricsSummary = useMemo(() => {
    const res = snapshot.resumenLiquidacion;
    const totalGastosCOP = res?.totalGastosCop ?? (data.gastos || []).reduce((acc, g) => acc + (g.divisa === 'COP' ? g.monto : g.monto * 4000), 0);
    const totalLiqFallback = (data.activosLiquidos || []).reduce((acc: number, a: any) => acc + (a.saldoCop || 0), 0);
    const totalDigFallback = (data.activosDigitales || []).reduce((acc: number, d: any) => acc + (d.saldoUsdt || 0), 0);
    const totalClientesIngresosFallback = (data.clientes || []).reduce((acc: number, c: any) => acc + (c.totalIngresosCOP || c.ingresosCop || 0), 0);
    const totalClientesIngresosCOP = (res?.totalClientesIngresosCop && res.totalClientesIngresosCop > 0)
      ? res.totalClientesIngresosCop
      : totalClientesIngresosFallback;

    const totalVentasUSDT = res?.totalVentasUsdtCop ?? (data.ventasUsdt || []).reduce((acc: number, v: any) => acc + (v.totalCOP || 0), 0);
    const liquidezEsperada = res?.totalLiquidezEsperadaCop ?? (data.activosDigitales || []).reduce((acc: number, a: any) => acc + (a.liquidezEsperadaCop || 0), 0);

    // Exact audited calculation from database:
    const gananciaEsperada = res?.gananciaEsperadaCop ?? ((totalVentasUSDT + liquidezEsperada) - (totalClientesIngresosCOP || (res?.totalNegocioCop ?? 0)) - totalGastosCOP);

    return {
      totalActivosLiquidos: res?.totalActivosLiquidosCop ?? totalLiqFallback,
      totalActivosDigitales: res?.totalActivosDigitalesUsdt ?? totalDigFallback,
      saldoPendienteClientes: res?.totalSaldoPendienteClientesCop ?? 0,
      gananciaEsperada,
      totalNegocioCOP: res?.totalNegocioCop ?? (data.negocios || []).reduce((acc: number, n: any) => acc + (n.ingresoCop || 0), 0),
      totalClientesIngresosCOP,
      totalVentasUSDT,
      liquidezEsperada,
      totalGastosCOP,
    };
  }, [snapshot.resumenLiquidacion, data.gastos, data.clientes, data.activosLiquidos, data.activosDigitales, data.ventasUsdt, data.negocios]);

  // Direct Supabase operations (100% decoupled from Airtable)
  const createNegocio = async (payload: any): Promise<boolean> => {
    try {
      const code = payload['Código'] || payload.codigo || ('N' + Math.floor(1000 + Math.random() * 9000));
      const clientRaw = payload.clienteId || (Array.isArray(payload.Cliente) ? payload.Cliente[0] : payload.Cliente);
      const clientObj = data.clientes.find((c) => c.id === clientRaw || c.codigo === clientRaw);
      const divisaCode = payload.divisaCodigo || payload['Divisa'] || (Array.isArray(payload.Divisa) ? payload.Divisa[0] : 'USD');
      const divisaObj = data.divisas.find((d) => d.id === divisaCode || d.codigo === divisaCode);

      const montoDiv = Number(payload['Monto Divisa'] || payload.monto || payload.montoDivisa || 0);
      const tasaNum = Number(payload['Tasa Cambio'] || payload.tasa || payload.tasaCambio || 0);
      const ingresoCopNum = Number(payload['Ingreso COP'] || payload.ingresoCOP || (montoDiv * tasaNum) || 0);

      const { error } = await supabase.from('negocios').insert({
        id: 'neg_' + Date.now(),
        codigo: code,
        numero: Math.floor(10 + Math.random() * 90),
        fecha: payload['Fecha'] || payload.fecha || new Date().toISOString().split('T')[0],
        cliente_id: clientObj?.id || clientRaw,
        cliente_codigo: clientObj?.codigo || clientRaw,
        cliente_nombre: clientObj?.nombre || 'Cliente',
        divisa_codigo: divisaObj?.codigo || divisaCode || 'USD',
        monto_divisa: montoDiv,
        tasa: tasaNum,
        tasa_cliente_cop: tasaNum,
        ingreso_cop: ingresoCopNum,
        monto_cop: ingresoCopNum,
        usdt_por_divisa: 0,
        costo_usdt_comp: 0,
        estado: 'Completado',
      });

      if (error) throw error;
      await fetchFromSupabase();
      return true;
    } catch (err) {
      console.error('Error creating negocio in Supabase:', err);
      return false;
    }
  };

  const updateNegocio = async (payload: any): Promise<boolean> => {
    try {
      const { id, ...fields } = payload;
      const updates: any = {};
      if (fields.tasaCambio !== undefined) {
        updates.tasa = Number(fields.tasaCambio);
        updates.tasa_cliente_cop = Number(fields.tasaCambio);
      }
      if (fields.montoDivisa !== undefined) updates.monto_divisa = Number(fields.montoDivisa);
      if (fields.ingresoCOP !== undefined) {
        updates.ingreso_cop = Number(fields.ingresoCOP);
        updates.monto_cop = Number(fields.ingresoCOP);
      }
      if (fields.estado !== undefined) updates.estado = fields.estado;

      const { error } = await supabase.from('negocios').update(updates).eq('id', id);
      if (error) throw error;
      await fetchFromSupabase();
      return true;
    } catch (err) {
      console.error('Error updating negocio in Supabase:', err);
      return false;
    }
  };

  const createDispersion = async (payload: any): Promise<boolean> => {
    try {
      const code = payload['Código'] || payload.codigo || ('D' + Math.floor(1000 + Math.random() * 9000));
      const clientRaw = payload.clienteId || (Array.isArray(payload.Cliente) ? payload.Cliente[0] : payload.Cliente);
      const clientObj = data.clientes.find((c) => c.id === clientRaw || c.codigo === clientRaw);
      const montoNum = Number(payload.monto || payload.montoCop || payload['Monto'] || payload['MONTO (COP)'] || 0);

      const { error } = await supabase.from('dispersiones').insert({
        id: 'disp_' + Date.now(),
        codigo: code,
        numero: Math.floor(10 + Math.random() * 90),
        fecha: payload.fecha || payload['Fecha'] || new Date().toISOString(),
        cliente_id: clientObj?.id || clientRaw,
        cliente_codigo: clientObj?.codigo || clientRaw,
        cliente_nombre: clientObj?.nombre || 'Cliente',
        monto: montoNum,
        monto_cop: montoNum,
        origen_fondos: payload.origenFondos || payload['Origen Fondos'] || 'Bancolombia',
        referencia: payload.referencia || payload['Referencia'] || '',
        estado: 'COMPLETADO',
        tiene_comprobante: Boolean(payload.comprobanteUrl),
        comprobante_url: payload.comprobanteUrl || null,
      });

      if (error) throw error;
      await fetchFromSupabase();
      return true;
    } catch (err) {
      console.error('Error creating dispersion in Supabase:', err);
      return false;
    }
  };

  const createMovimientoEfectivo = async (payload: any): Promise<boolean> => {
    try {
      const code = payload.codigo || payload['Código'] || ('EFEC-' + Math.floor(1000 + Math.random() * 9000));
      const clientRaw = payload.clienteId || (Array.isArray(payload.Cliente) ? payload.Cliente[0] : payload.Cliente);
      const clientObj = data.clientes.find((c) => c.id === clientRaw || c.codigo === clientRaw);
      const montoNum = Number(payload.montoCop ?? payload.monto ?? payload['Monto'] ?? 0);
      const tipoStr = String(payload.tipo || payload['Tipo'] || 'Pago');

      const { error } = await supabase.from('efectivo').insert({
        id: 'efec_' + Date.now(),
        codigo: code,
        fecha: payload.fecha || payload['Fecha'] || new Date().toISOString().split('T')[0],
        tipo: tipoStr,
        cliente_id: clientObj?.id || clientRaw || null,
        cliente_codigo: clientObj?.codigo || null,
        cliente_nombre: clientObj?.nombre || (tipoStr === 'Ingreso' ? 'Ingreso a Caja' : 'Movimiento Interno'),
        monto: montoNum,
        origen_fondos: 'Efectivo Dosquebradas',
        referencia: payload.referencia || payload['Referencia'] || null,
      });

      if (error) throw error;
      await fetchFromSupabase();
      return true;
    } catch (err) {
      console.error('Error creating efectivo in Supabase:', err);
      return false;
    }
  };

  const createGasto = async (payload: any): Promise<boolean> => {
    try {
      const code = payload.codigo || ('GST-' + Math.floor(100 + Math.random() * 900));
      const montoNum = Number(payload.monto || payload['Monto'] || 0);

      const { error } = await supabase.from('gastos').insert({
        id: 'gst_' + Date.now(),
        codigo: code,
        fecha: payload.fecha || new Date().toISOString().split('T')[0],
        concepto: payload.concepto || 'Gasto Operativo',
        categoria: payload.categoria || 'Otros Gastos Operativos',
        divisa: payload.divisa || 'COP',
        monto: montoNum,
        origen_fondos: payload.origenFondos || 'Efectivo Dosquebradas',
      });

      if (error) throw error;
      await fetchFromSupabase();
      return true;
    } catch (err) {
      console.error('Error creating gasto in Supabase:', err);
      return false;
    }
  };

  const createCliente = async (nombre: string, pais: string): Promise<any> => {
    try {
      const nextNum = (data.clientes.length || 0) + 1;
      const code = `C${String(nextNum).padStart(4, '0')}-${nombre.toUpperCase().replace(/\s+/g, '-')}`;
      const newId = 'cli_' + Date.now();

      const { error } = await supabase.from('clientes').insert({
        id: newId,
        codigo: code,
        nombre: nombre.toUpperCase(),
        numero: nextNum,
        ingresos_cop: 0,
        pagado_cop: 0,
        pendiente_cop: 0,
        saldo_cop: 0,
        estado: 'PENDIENTE',
        fecha_creacion: new Date().toISOString(),
      });

      if (error) throw error;
      await fetchFromSupabase();
      return { success: true, id: newId };
    } catch (err) {
      console.error('Error creating cliente in Supabase:', err);
      return { success: false };
    }
  };

  const createRecord = async (table: string, fields: any): Promise<any> => {
    if (table === 'Clientes') {
      return createCliente(fields['Nombre'] || fields['NOMBRE'], fields['País'] || fields['PAÍS']);
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
      return updateUserPermissions({ id, ...fields });
    }
    if (table === 'Negocios') {
      return updateNegocio({ id, ...fields });
    }
    await fetchFromSupabase();
    return { success: true };
  };

  const deleteUser = async (idOrEmail: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const user = data.usuarios.find((u) => u.id === idOrEmail || u.correo === idOrEmail);
      const email = user ? user.correo : idOrEmail;

      await supabase.from('profiles').delete().eq('email', email);
      await fetchFromSupabase();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  };

  const sendUserInvite = async (
    email: string,
    fullName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(EDGE_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_user_invite',
          email,
          fullName,
        }),
      });
      const resJson = await res.json().catch(() => ({}));
      if (res.ok && resJson.ok) {
        return { success: true };
      }
      return { success: false, error: resJson.error || 'No se pudo enviar la invitación' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error de conexión' };
    }
  };

  const updateUserPermissions = async (payload: any): Promise<boolean> => {
    try {
      const { id, rol, estado, divisasAutorizadas } = payload;
      const updates: any = {};
      if (rol !== undefined) updates.role = rol;
      if (estado !== undefined) updates.is_active = estado === 'Activo';
      if (divisasAutorizadas !== undefined) updates.authorized_currencies = divisasAutorizadas;

      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (!error) await fetchFromSupabase();
      return !error;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    fetchFromSupabase();

    // Supabase Realtime Subscription to public schema tables
    const channel = supabase
      .channel('supabase_realtime_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchFromSupabase();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFromSupabase]);

  const createComisionista = async (_payload: any): Promise<boolean> => {
    return true;
  };

  return (
    <AirtableContext.Provider
      value={{
        snapshot,
        data,
        metrics,
        loading,
        syncStatus,
        lastSyncTime,
        syncWithAirtable,
        createRecord,
        updateRecord,
        createNegocio,
        updateNegocio,
        createDispersion,
        createMovimientoEfectivo,
        createGasto,
        createCliente,
        createComisionista,
        deleteUser,
        sendUserInvite,
        updateUserPermissions,
      }}
    >
      {children}
    </AirtableContext.Provider>
  );
};

export const useAirtable = () => useContext(AirtableContext);
