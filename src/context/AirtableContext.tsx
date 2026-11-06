import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

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
  usuarios: any[];
  resumenLiquidacion?: ResumenLiquidacion;
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
  divisas: Array<{
    id: string;
    codigo: string;
    nombre: string;
    pais?: string;
    totalRecibido: number;
    totalComprado: number;
    totalPendiente: number;
    estado?: string;
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
  createCliente: (nombre: string, pais: string) => Promise<any>;
  deleteUser: (idOrEmail: string) => Promise<{ success: boolean; error?: string }>;
  sendUserInvite: (email: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  updateUserPermissions: (payload: any) => Promise<boolean>;
}

const defaultSnapshot: AirtableSnapshot = {
  clientes: [],
  negocios: [],
  dispersiones: [],
  pagos: [],
  divisas: [],
  comprasUsdt: [],
  ventasUsdt: [],
  activosLiquidos: [],
  activosDigitales: [],
  efectivo: [],
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
    setSnapshot(newSnap);
    try {
      localStorage.setItem('kaupaloki_cached_snapshot', JSON.stringify(newSnap));
    } catch {}
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

      return {
        id: c.id || c.codigo,
        codigo: c.codigo || c.idCliente || 'C-000',
        nombre: c.nombre || c['Nombre'] || 'Cliente',
        pais: c.pais || c['País'] || 'Colombia',
        totalIngresosCOP: totalIngresos,
        totalDispersadoCOP: totalDispersado,
        saldoPendienteCOP: saldoPendiente,
        estado,
        raw: c,
      };
    });

    const negocios = (snapshot.negocios || []).map((n: any) => {
      const montoDiv = Number(n.montoDivisa ?? n.cantidadDivisa ?? 0);
      const tasa = Number(n.tasa ?? n.tasaClienteCop ?? 0);
      const ingreso = Number(n.ingresoCop ?? n.montoCop ?? (montoDiv * tasa));

      return {
        id: n.id || n.codigo,
        codigo: n.codigo || n.idNegocio || 'NEG-000',
        fecha: n.fecha || n.fechaRegistro || '',
        clienteId: Array.isArray(n.cliente) ? n.cliente[0] : (n.clienteId || undefined),
        clienteNombre: n.clienteNombre || n.clienteCodigo || 'Cliente',
        divisaCodigo: n.divisaCodigo || 'USD',
        montoDivisa: montoDiv,
        tasaCambio: tasa,
        ingresoCOP: ingreso,
        estado: n.estado || 'Completado',
        raw: n,
      };
    });

    // Dispersiones (from dispersiones or pagos)
    const rawDispersiones = snapshot.dispersiones?.length ? snapshot.dispersiones : (snapshot.pagos || []);
    const dispersiones = rawDispersiones.map((d: any) => {
      return {
        id: d.id || d.codigo,
        codigo: d.codigo || d.idDispersion || 'DISP-000',
        fecha: d.fecha || d.fechaCreacion || '',
        clienteId: Array.isArray(d.cliente) ? d.cliente[0] : (d.clienteId || undefined),
        clienteNombre: d.clienteNombre || d.clienteCodigo || 'Cliente',
        monto: Number(d.monto ?? d.montoCop ?? d.valorTotalDispersion ?? 0),
        origenFondos: d.origenFondos || d.medioPagoNombre || 'Bancolombia',
        referencia: d.referencia || d.concepto || '',
        comprobanteUrl: d.comprobanteUrl || (d.comprobantes && d.comprobantes[0]?.url) || undefined,
        estado: d.estado || 'Exitosa',
        raw: d,
      };
    });

    const efectivo = (snapshot.efectivo || []).map((e: any) => {
      return {
        id: e.id || e.codigo,
        codigo: e.codigo || 'EFEC-000',
        fecha: e.fecha || '',
        tipo: (e.tipo === 'Ingreso' ? 'Ingreso' : 'Pago') as 'Ingreso' | 'Pago',
        clienteId: Array.isArray(e.cliente) ? e.cliente[0] : (e.clienteId || undefined),
        clienteNombre: e.clienteNombre || e.cliente || '',
        monto: Number(e.monto ?? 0),
        origenFondos: e.origenFondos || 'Caja Efectivo',
        referencia: e.referencia || '',
        raw: e,
      };
    });

    const divisas = (snapshot.divisas || []).map((d: any) => {
      return {
        id: d.id || d.codigo,
        codigo: d.codigo || 'USD',
        nombre: d.nombre || d.nombreDivisa || d.divisa || d.codigo,
        pais: d.pais || '',
        totalRecibido: Number(d.totalRecibido ?? d.ingresoEnDivisa ?? 0),
        totalComprado: Number(d.totalComprado ?? d.egresoEnDivisa ?? 0),
        totalPendiente: Number(d.totalPendiente ?? d.saldo ?? 0),
        estado: d.estado || 'Activo',
        raw: d,
      };
    });

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
        estado: u.estado || 'Activo',
      };
    });

    return {
      clientes,
      negocios,
      dispersiones,
      efectivo,
      divisas,
      usuarios,
      activosLiquidos: snapshot.activosLiquidos || [],
      activosDigitales: snapshot.activosDigitales || [],
    };
  }, [snapshot]);

  const metrics: MetricsSummary = useMemo(() => {
    const res = snapshot.resumenLiquidacion;
    return {
      totalActivosLiquidos: res?.totalActivosLiquidosCop ?? 0,
      totalActivosDigitales: res?.totalActivosDigitalesUsdt ?? 0,
      saldoPendienteClientes: res?.totalSaldoPendienteClientesCop ?? 0,
      gananciaEsperada: res?.gananciaEsperadaCop ?? 0,
      totalNegocioCOP: res?.totalNegocioCop ?? 0,
      totalVentasUSDT: res?.totalVentasUsdtCop ?? 0,
      liquidezEsperada: res?.totalLiquidezEsperadaCop ?? 0,
    };
  }, [snapshot.resumenLiquidacion]);

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
    const res = await fetch(EDGE_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_movimiento_efectivo', pat, ...payload }),
    });
    const result = await res.json().catch(() => ({}));
    if (result.snapshot) applySnapshot(result.snapshot);
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
    // Generic fallback
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
        createCliente,
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
