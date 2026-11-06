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
  totalVentasUsdtCop: number;
  totalLiquidezEsperadaCop: number;
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
    raw: any;
  }>;
  negocios: Array<{
    id: string;
    codigo: string;
    fecha: string;
    clienteId?: string;
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

  const syncWithAirtable = useCallback(
    async (forceLive = false) => {
      setSyncStatus('syncing');
      try {
        const pat = getPat();
        let res: Response;
        if (forceLive || pat) {
          res = await fetch(EDGE_SYNC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pat }),
          });
        } else {
          res = await fetch(EDGE_SYNC_URL);
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (result.snapshot) {
          // If edge function didn't include gastos yet, fetch directly from Airtable table
          if ((!result.snapshot.gastos || result.snapshot.gastos.length === 0) && pat) {
            try {
              const gRes = await fetch('https://api.airtable.com/v0/appncUKgTkDojFj4B/tblNfTwl3rOXdUVbf', {
                headers: { Authorization: `Bearer ${pat}` }
              });
              if (gRes.ok) {
                const gData = await gRes.json();
                result.snapshot.gastos = (gData.records || []).map((r: any, idx: number) => {
                  const f = r.fields || {};
                  return {
                    id: r.id,
                    codigo: String(f['GASTO'] || `GST-${String(idx + 1).padStart(3, '0')}`),
                    concepto: String(f['CONCEPTO'] || 'Gasto Operativo'),
                    categoria: String(f['CATEGORÍA'] || 'Otros Gastos Operativos'),
                    divisa: String(f['DIVISA'] || 'COP'),
                    monto: Number(f['MONTO'] || 0),
                    origenFondos: String(f['ORIGEN FONDOS'] || 'Efectivo Dosquebradas'),
                    fecha: String(f['FECHA GASTO'] || f['FECHA'] || f['FECHA CREACIÓN'] || r.createdTime || '').slice(0, 10),
                    comprobanteUrl: (f['COMPROBANTE'] && f['COMPROBANTE'][0]?.url) || undefined,
                    comprobanteNombre: (f['COMPROBANTE'] && f['COMPROBANTE'][0]?.filename) || undefined,
                    createdTime: r.createdTime,
                  };
                });
              }
            } catch (_) {}
          }
          applySnapshot(result.snapshot);
        }
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2500);
      } catch (err) {
        console.warn('Sync fallback:', err);
        try {
          const { data: cached } = await supabase
            .from('airtable_sync_state')
            .select('snapshot, updated_at')
            .eq('id', 'main')
            .single();
          if (cached?.snapshot) {
            applySnapshot(cached.snapshot);
            setSyncStatus('synced');
            setTimeout(() => setSyncStatus('idle'), 2500);
            return;
          }
        } catch {}
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } finally {
        setLoading(false);
      }
    },
    [applySnapshot]
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

      return {
        id: c.id || c.codigo,
        codigo: fullCode,
        nombre: c.nombre || c['Nombre'] || fullCode,
        pais: c.pais || c['País'] || 'Colombia',
        totalIngresosCOP: totalIngresos,
        totalDispersadoCOP: totalDispersado,
        saldoPendienteCOP: saldoPendiente,
        estado,
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
      const rawClient = Array.isArray(n.cliente) ? n.cliente[0] : (n.clienteId || n.cliente);
      const clienteId = clientRecordIdMap.get(rawClient) || rawClient;
      const clienteNombre = clientMap.get(rawClient) || n.clienteNombre || n.clienteCodigo || 'Cliente';

      // Resolve divisa
      const rawDivisa = Array.isArray(n.divisa) ? n.divisa[0] : (n.divisaId || n.divisaCodigo || n.divisa);
      const divisaCodigo = divisaMap.get(rawDivisa) || n.divisaCodigo || 'USD';

      return {
        id: n.id || n.codigo,
        codigo: n.codigo || n.idNegocio || 'NEG-000',
        fecha: n.fecha || n.fechaRegistro || '',
        clienteId,
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
      const rawClient = Array.isArray(d.cliente) ? d.cliente[0] : (d.clienteId || d.cliente);
      const clienteId = clientRecordIdMap.get(rawClient) || rawClient;
      const clienteNombre = clientMap.get(rawClient) || d.clienteNombre || d.clienteCodigo || 'Cliente';

      return {
        id: d.id || d.codigo,
        codigo: d.codigo || d.idDispersion || 'DISP-000',
        fecha: d.fecha || d.fechaCreacion || '',
        clienteId,
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
      const rawClient = Array.isArray(e.cliente) ? e.cliente[0] : (e.clienteId || e.cliente);
      const clienteId = clientRecordIdMap.get(rawClient) || rawClient;
      const clienteNombre = clientMap.get(rawClient) || (typeof e.cliente === 'string' && e.cliente.trim() ? e.cliente : (e.clienteNombre || ''));

      const isIngreso = String(e.tipo || '').toUpperCase() === 'INGRESO';
      const monto = Number(e.montoCop ?? e.monto ?? e['MONTO (COP)'] ?? 0);
      const fecha = e.fecha || e['FECHA MOVIMIENTO'] || (e.createdTime ? String(e.createdTime).slice(0, 10) : '');

      return {
        id: e.id || e.codigo || `efec-${idx}`,
        codigo: e.codigo || `EF-${idx + 1}`,
        fecha,
        tipo: (isIngreso ? 'Ingreso' : 'Pago') as 'Ingreso' | 'Pago',
        clienteId,
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
      activosLiquidos: (snapshot.activosLiquidos && snapshot.activosLiquidos.length > 0) ? snapshot.activosLiquidos : ACTIVOS_LIQUIDOS,
      activosDigitales: (snapshot.activosDigitales && snapshot.activosDigitales.length > 0) ? snapshot.activosDigitales : ACTIVOS_DIGITALES,
    };
  }, [snapshot]);

  const metrics: MetricsSummary = useMemo(() => {
    const res = snapshot.resumenLiquidacion;
    const totalGastosCOP = (data.gastos || []).reduce((acc, g) => acc + (g.divisa === 'COP' ? g.monto : g.monto * 4000), 0);
    const totalLiqFallback = (data.activosLiquidos || []).reduce((acc: number, a: any) => acc + (a.saldoCop || 0), 0);
    const totalDigFallback = (data.activosDigitales || []).reduce((acc: number, d: any) => acc + (d.saldoUsdt || 0), 0);
    return {
      totalActivosLiquidos: res?.totalActivosLiquidosCop ?? totalLiqFallback,
      totalActivosDigitales: res?.totalActivosDigitalesUsdt ?? totalDigFallback,
      saldoPendienteClientes: res?.totalSaldoPendienteClientesCop ?? 0,
      gananciaEsperada: res?.gananciaEsperadaCop ?? 0,
      totalNegocioCOP: res?.totalNegocioCop ?? 0,
      totalVentasUSDT: res?.totalVentasUsdtCop ?? 0,
      liquidezEsperada: res?.totalLiquidezEsperadaCop ?? 0,
      totalGastosCOP,
    };
  }, [snapshot.resumenLiquidacion, data.gastos]);

  // Direct operations
  const createNegocio = async (payload: any): Promise<boolean> => {
    const pat = getPat();
    const res = await fetch(EDGE_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_negocio', pat, ...payload }),
    });
    const result = await res.json().catch(() => ({}));
    if (result.snapshot) applySnapshot(result.snapshot);
    await syncWithAirtable(true);
    return res.ok;
  };

  const updateNegocio = async (payload: any): Promise<boolean> => {
    const pat = getPat();
    const res = await fetch(EDGE_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_negocio', pat, ...payload }),
    });
    const result = await res.json().catch(() => ({}));
    if (result.snapshot) applySnapshot(result.snapshot);
    await syncWithAirtable(true);
    return res.ok;
  };

  const createDispersion = async (payload: any): Promise<boolean> => {
    const pat = getPat();
    const res = await fetch(EDGE_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_dispersion', pat, ...payload }),
    });
    const result = await res.json().catch(() => ({}));
    if (result.snapshot) applySnapshot(result.snapshot);
    await syncWithAirtable(true);
    return res.ok;
  };

  const createMovimientoEfectivo = async (payload: any): Promise<boolean> => {
    const pat = getPat();
    const cleanPayload = {
      action: 'create_movimiento_efectivo',
      pat,
      codigo: payload.codigo || payload['Código'] || payload.EFECTIVO || ('EFEC-' + Math.floor(1000 + Math.random() * 9000)),
      tipo: String(payload.tipo || payload['Tipo'] || payload.TIPO || 'INGRESO').toUpperCase(),
      montoCop: Number(payload.montoCop ?? payload.monto ?? payload['Monto'] ?? payload['MONTO (COP)'] ?? 0),
      clienteId: payload.clienteId || (Array.isArray(payload.Cliente) ? payload.Cliente[0] : payload.Cliente) || undefined,
      origenFondosId: payload.origenFondosId && payload.origenFondosId !== 'recdOSGJZMR2xqUFq' ? payload.origenFondosId : undefined,
      referencia: payload.referencia || payload['Referencia'] || undefined,
      fecha: payload.fecha || payload['Fecha'] || payload['FECHA MOVIMIENTO'] || new Date().toISOString().split('T')[0],
    };

    const res = await fetch(EDGE_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanPayload),
    });
    const result = await res.json().catch(() => ({}));
    if (result.snapshot) applySnapshot(result.snapshot);
    await syncWithAirtable(true);
    return res.ok;
  };

  const createGasto = async (payload: any): Promise<boolean> => {
    const pat = getPat();
    const res = await fetch(EDGE_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_record',
        pat,
        table: 'GASTOS',
        record: {
          fields: {
            'CONCEPTO': payload.concepto,
            'CATEGORÍA': payload.categoria,
            'DIVISA': payload.divisa || 'COP',
            'MONTO': Number(payload.monto) || 0,
            'ORIGEN FONDOS': payload.origenFondos || 'Efectivo Dosquebradas',
            ...(payload.fecha ? { 'FECHA GASTO': payload.fecha, 'FECHA': payload.fecha } : {}),
            ...(payload.comprobanteUrl ? { 'COMPROBANTE': [{ url: payload.comprobanteUrl }] } : {})
          }
        }
      }),
    });
    await syncWithAirtable(true);
    return res.ok;
  };

  const createCliente = async (nombre: string, pais: string): Promise<any> => {
    const pat = getPat();
    const res = await fetch(EDGE_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_cliente_direct',
        pat,
        record: {
          fields: {
            NOMBRE: nombre.toUpperCase(),
            PAÍS: pais || 'COLOMBIA',
          },
        },
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (result.snapshot) applySnapshot(result.snapshot);
    await syncWithAirtable(true);
    return result;
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
    const pat = getPat();
    const res = await fetch(EDGE_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_record', pat, table, record: { fields } }),
    });
    await syncWithAirtable(true);
    return res.json().catch(() => ({}));
  };

  const updateRecord = async (table: string, id: string, fields: any): Promise<any> => {
    if (table === 'Usuarios') {
      return updateUserPermissions({ id, ...fields });
    }
    if (table === 'Negocios') {
      return updateNegocio({ id, ...fields });
    }
    const pat = getPat();
    const res = await fetch(EDGE_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_record', pat, table, record: { id, fields } }),
    });
    await syncWithAirtable(true);
    return res.json().catch(() => ({}));
  };

  const deleteUser = async (idOrEmail: string): Promise<{ success: boolean; error?: string }> => {
    const pat = getPat();
    const user = data.usuarios.find((u) => u.id === idOrEmail || u.correo === idOrEmail);
    const email = user ? user.correo : idOrEmail;
    const airtableId = user ? user.id : undefined;

    try {
      const res = await fetch(EDGE_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_user',
          email,
          airtableId,
          pat,
        }),
      });
      const resJson = await res.json().catch(() => ({}));
      await syncWithAirtable(true);
      if (res.ok && resJson.ok) {
        return { success: true };
      }
      return { success: false, error: resJson.error || 'Error al eliminar usuario' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error de conexión' };
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
    const pat = getPat();
    const res = await fetch(EDGE_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_user_permissions', pat, ...payload }),
    });
    await syncWithAirtable(true);
    return res.ok;
  };

  useEffect(() => {
    syncWithAirtable();

    // Supabase Realtime Subscription to airtable_sync_state
    const channel = supabase
      .channel('realtime:airtable_sync_state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'airtable_sync_state' }, (payload: any) => {
        if (payload?.new?.snapshot) {
          applySnapshot(payload.new.snapshot);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncWithAirtable, applySnapshot]);

  const createComisionista = async (payload: any): Promise<boolean> => {
    const pat = getPat();
    const res = await fetch(EDGE_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_record',
        pat,
        table: 'COMISIONISTA',
        record: {
          fields: {
            'COMISIONISTA': payload.comisionistaId ? [payload.comisionistaId] : undefined,
            'COMISIONA DE': Array.isArray(payload.comisionaDeIds) ? payload.comisionaDeIds : undefined,
            '% COMISIÓN': Number(payload.porcentajeComision) || 0,
          },
        },
      }),
    });
    await syncWithAirtable(true);
    return res.ok;
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
