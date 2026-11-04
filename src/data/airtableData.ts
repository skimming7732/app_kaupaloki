export interface Cliente {
  id: string;
  codigo: string;
  idCliente?: string;
  nombre: string;
  ingresosCop: number;
  pagadoCop: number;
  pendienteCop: number;
  pendientePorPagarCop?: number;
  saldoCop?: number;
  fechaCreacion: string;
  numero: number;
}

export interface Divisa {
  id: string;
  codigo: string;
  divisa?: string;
  totalRecibido: number;
  totalComprado: number;
  totalPendiente: number;
  ingresoEnDivisa?: number;
  egresoEnDivisa?: number;
  saldo?: number;
  saldoEnCustodia?: number;
}

export interface CompraUSDT {
  id: string;
  codigo: string;
  idTransaccion?: string;
  fechaCompra: string;
  fecha?: string;
  divisaCodigo: string;
  divisaNombre?: string;
  valorComprado: number;
  montoDivisa?: number;
  usdtComprado: number;
  totalRecibidoUsdt?: number;
  costo: number;
  tasa: number;
  tasaUsdt?: number;
  walletDestino?: string;
  negocioVinculado?: string;
  numero: number;
}

export interface Negocio {
  id: string;
  codigo: string;
  idNegocio?: string;
  fechaRegistro: string;
  fecha?: string;
  clienteCodigo: string;
  clienteNombre: string;
  divisaCodigo: string;
  montoDivisa: number;
  cantidadDivisa?: number;
  tasa: number;
  tasaClienteCop?: number;
  ingresoCop: number;
  montoCop?: number;
  usdtPorDivisa: number;
  montoUsdt?: number;
  costoUsdtComp: number;
  precioCompra: number | null;
  compraRelCodigo?: string;
  porcentajeComision?: number;
  totalRevenue?: number;
  totalPagarClienteCop?: number;
  numero: number;
}

export interface ComprobanteItem {
  id?: string;
  url: string;
  nombre?: string;
}

export interface Pago {
  id: string;
  codigo: string;
  idDispersion?: string;
  clienteCodigo: string;
  clienteNombre: string;
  montoCop: number;
  valorTotalDispersion?: number;
  estado: 'COMPLETADO' | 'RECHAZADO';
  comprobanteUrl?: string;
  comprobanteNombre?: string;
  comprobantes?: ComprobanteItem[];
  tieneComprobante?: boolean;
  numero: number;
  fechaCreacion?: string;
  fecha?: string;
  referencia?: string;
  concepto?: string;
  origenFondos?: string;
  medioPagoNombre?: string;
}

export interface VentaUsdt {
  id: string;
  nombre: string;
  idTransaccion?: string;
  fecha: string;
  concepto: string;
  usdtVendido: number;
  cantidadUsdt?: number;
  tasa: number;
  tasaVentaCop?: number;
  impuestos?: number;
  destinoFondosNombre: string;
  cuentaDestinoNombre?: string;
  walletOrigen?: string;
  totalCop: number;
  montoNetoRecibidoCop?: number;
}

export interface MovimientoActivo {
  id?: string;
  fecha: string;
  origen: string;
  concepto: string;
  monto: number;
  balance: number;
  tipo?: 'debito' | 'credito';
}

export interface ActivoLiquido {
  id: string;
  activo: string;
  institucion: string;
  empresa: string;
  ingresosCop: number;
  egresosCop: number;
  saldoCop: number;
  titular?: string;
  cuenta?: string;
  tarifas?: string;
  saldoDisponible?: number;
  saldoTotal?: number;
  movimientos?: MovimientoActivo[];
}

export interface ActivoDigital {
  id: string;
  activo: string;
  idWallet: string;
  wallet: string;
  red: string;
  titular?: string;
  tarifas?: string;
  ingresoUsdt?: number;
  ingresosUsdt: number;
  egresosUsdt: number;
  saldoUsdt: number;
  saldoReal?: number;
  movimientos?: MovimientoActivo[];
}

export interface Admin {
  id: string;
  codigo: string;
  nombre: string;
  pais: string;
  numero: number;
  rol?: string;
  email?: string;
  status?: string;
  authorized_currencies?: string[];
}

export interface UsuarioAirtable extends Admin {}

export const CLIENTES: Cliente[] = [
  {
    id: "recg4j8GuJAxEBQsF",
    codigo: "C0017-DR-N",
    idCliente: "C0017-DR-N",
    nombre: "DR N",
    ingresosCop: 841980951.5,
    pagadoCop: 400000000,
    pendienteCop: 441980951.5,
    pendientePorPagarCop: 441980951.5,
    saldoCop: 441980951.5,
    fechaCreacion: "2026-11-04",
    numero: 17
  },
  {
    id: "reclaNodta2RwisAg",
    codigo: "C0018-TEST-1",
    idCliente: "C0018-TEST-1",
    nombre: "TEST 1",
    ingresosCop: 0,
    pagadoCop: 0,
    pendienteCop: 0,
    pendientePorPagarCop: 0,
    saldoCop: 0,
    fechaCreacion: "2026-11-04",
    numero: 18
  },
  {
    id: "recAx9MTO2zhScoSP",
    codigo: "C0019-CLIENTE-PRUEBA-VERIFICADO",
    idCliente: "C0019-CLIENTE-PRUEBA-VERIFICADO",
    nombre: "CLIENTE PRUEBA VERIFICADO",
    ingresosCop: 0,
    pagadoCop: 0,
    pendienteCop: 0,
    pendientePorPagarCop: 0,
    saldoCop: 0,
    fechaCreacion: "2026-11-04",
    numero: 19
  }
];

export const DIVISAS: Divisa[] = [
  { id: "recX2WcOyLsk8YcJN", codigo: "USDT", divisa: "USDT", totalRecibido: 22867, totalComprado: 22867, totalPendiente: 0, ingresoEnDivisa: 22867, egresoEnDivisa: 22867, saldo: 0, saldoEnCustodia: 0 },
  { id: "rec5f7Xzww3xl88nq", codigo: "BRL", divisa: "BRL", totalRecibido: 600000, totalComprado: 600000, totalPendiente: 0, ingresoEnDivisa: 600000, egresoEnDivisa: 600000, saldo: 0, saldoEnCustodia: 0 },
  { id: "rec7tYgRg0cJZunNW", codigo: "PEN", divisa: "PEN", totalRecibido: 110000, totalComprado: 110000, totalPendiente: 0, ingresoEnDivisa: 110000, egresoEnDivisa: 110000, saldo: 0, saldoEnCustodia: 0 },
  { id: "recdSG05fjNiX8bDs", codigo: "ARS", divisa: "ARS", totalRecibido: 30000000, totalComprado: 30000000, totalPendiente: 0, ingresoEnDivisa: 30000000, egresoEnDivisa: 30000000, saldo: 0, saldoEnCustodia: 0 },
  { id: "recjr5hVAnG5bObTV", codigo: "CLP", divisa: "CLP", totalRecibido: 49000000, totalComprado: 49000000, totalPendiente: 0, ingresoEnDivisa: 49000000, egresoEnDivisa: 49000000, saldo: 0, saldoEnCustodia: 0 },
  { id: "recE1m9kP4x7z2w5v", codigo: "MXN", divisa: "MXN", totalRecibido: 310000, totalComprado: 310000, totalPendiente: 0, ingresoEnDivisa: 310000, egresoEnDivisa: 310000, saldo: 0, saldoEnCustodia: 0 },
  { id: "recG4n8qR2y6x1z9b", codigo: "UYU", divisa: "UYU", totalRecibido: 900000, totalComprado: 0, totalPendiente: 900000, ingresoEnDivisa: 900000, egresoEnDivisa: 0, saldo: 900000, saldoEnCustodia: 900000 },
  { id: "recQ2kNgwFWmex2PB", codigo: "HNL", divisa: "HNL", totalRecibido: 0, totalComprado: 0, totalPendiente: 0, ingresoEnDivisa: 0, egresoEnDivisa: 0, saldo: 0, saldoEnCustodia: 0 },
  { id: "recqs25uNy07U35kP", codigo: "COP", divisa: "COP", totalRecibido: 0, totalComprado: 0, totalPendiente: 0, ingresoEnDivisa: 0, egresoEnDivisa: 0, saldo: 0, saldoEnCustodia: 0 },
  { id: "recYp1VcNnt28sXvM", codigo: "USD", divisa: "USD", totalRecibido: 0, totalComprado: 0, totalPendiente: 0, ingresoEnDivisa: 0, egresoEnDivisa: 0, saldo: 0, saldoEnCustodia: 0 },
  { id: "recK7p3wT9x5z1m4c", codigo: "VES", divisa: "VES", totalRecibido: 0, totalComprado: 0, totalPendiente: 0, ingresoEnDivisa: 0, egresoEnDivisa: 0, saldo: 0, saldoEnCustodia: 0 }
];

export const COMPRAS_USDT: CompraUSDT[] = [
  {
    id: "recA1x8kM3p9z2w5v",
    codigo: "ARS-04-11-26-0010",
    idTransaccion: "ARS-04-11-26-0010",
    fechaCompra: "2026-11-04",
    fecha: "2026-11-04",
    divisaCodigo: "ARS",
    divisaNombre: "ARS",
    valorComprado: 30000000,
    montoDivisa: 30000000,
    usdtComprado: 25000,
    totalRecibidoUsdt: 25000,
    costo: 0.000833,
    tasa: 1200,
    tasaUsdt: 1200,
    walletDestino: "CUY WALLET",
    negocioVinculado: "N0017-ARS",
    numero: 10
  },
  {
    id: "recB2y9lN4q0x3z6w",
    codigo: "BRL-04-11-26-0011",
    idTransaccion: "BRL-04-11-26-0011",
    fechaCompra: "2026-11-04",
    fecha: "2026-11-04",
    divisaCodigo: "BRL",
    divisaNombre: "BRL",
    valorComprado: 600000,
    montoDivisa: 600000,
    usdtComprado: 107107,
    totalRecibidoUsdt: 107107,
    costo: 0.178512,
    tasa: 5.6019,
    tasaUsdt: 5.6019,
    walletDestino: "CUY WALLET",
    negocioVinculado: "N0018-BRL",
    numero: 11
  },
  {
    id: "recC3z0mO5r1y4a7x",
    codigo: "PEN-04-11-26-0012",
    idTransaccion: "PEN-04-11-26-0012",
    fechaCompra: "2026-11-04",
    fecha: "2026-11-04",
    divisaCodigo: "PEN",
    divisaNombre: "PEN",
    valorComprado: 110000,
    montoDivisa: 110000,
    usdtComprado: 32000,
    totalRecibidoUsdt: 32000,
    costo: 0.290909,
    tasa: 3.4375,
    tasaUsdt: 3.4375,
    walletDestino: "FRANZ WALLET",
    negocioVinculado: "N0019-PEN",
    numero: 12
  },
  {
    id: "recD4a1nP6s2z5b8y",
    codigo: "CLP-04-11-26-0013",
    idTransaccion: "CLP-04-11-26-0013",
    fechaCompra: "2026-11-04",
    fecha: "2026-11-04",
    divisaCodigo: "CLP",
    divisaNombre: "CLP",
    valorComprado: 49000000,
    montoDivisa: 49000000,
    usdtComprado: 50000,
    totalRecibidoUsdt: 50000,
    costo: 0.00102,
    tasa: 980,
    tasaUsdt: 980,
    walletDestino: "FRANZ WALLET",
    negocioVinculado: "N0020-CLP",
    numero: 13
  },
  {
    id: "recE5b2oQ7t3a6c9z",
    codigo: "MXN-04-11-26-0014",
    idTransaccion: "MXN-04-11-26-0014",
    fechaCompra: "2026-11-04",
    fecha: "2026-11-04",
    divisaCodigo: "MXN",
    divisaNombre: "MXN",
    valorComprado: 310000,
    montoDivisa: 310000,
    usdtComprado: 15000,
    totalRecibidoUsdt: 15000,
    costo: 0.048387,
    tasa: 20.6667,
    tasaUsdt: 20.6667,
    walletDestino: "FRANZ WALLET",
    negocioVinculado: "N0022-MXN",
    numero: 14
  }
];

export const NEGOCIOS: Negocio[] = [
  {
    id: "rec4n7P8dE8R8X041",
    codigo: "N0017-ARS",
    idNegocio: "N0017-ARS",
    fechaRegistro: "2026-11-04",
    fecha: "2026-11-04",
    clienteCodigo: "C0017-DR-N",
    clienteNombre: "DR N",
    divisaCodigo: "ARS",
    montoDivisa: 30000000,
    cantidadDivisa: 30000000,
    tasa: 2.38,
    tasaClienteCop: 2.38,
    ingresoCop: 71400000,
    montoCop: 71400000,
    usdtPorDivisa: 25000,
    montoUsdt: 25000,
    costoUsdtComp: 0.000833,
    precioCompra: 2856,
    compraRelCodigo: "ARS-04-11-26-0010",
    porcentajeComision: 0.1,
    totalRevenue: 8600000,
    totalPagarClienteCop: 71400000,
    numero: 17
  },
  {
    id: "recB1p9kQ7t3x9c6e",
    codigo: "N0018-BRL",
    idNegocio: "N0018-BRL",
    fechaRegistro: "2026-11-04",
    fecha: "2026-11-04",
    clienteCodigo: "C0017-DR-N",
    clienteNombre: "DR N",
    divisaCodigo: "BRL",
    montoDivisa: 600000,
    cantidadDivisa: 600000,
    tasa: 560,
    tasaClienteCop: 560,
    ingresoCop: 336000000,
    montoCop: 336000000,
    usdtPorDivisa: 107107,
    montoUsdt: 107107,
    costoUsdtComp: 0.178512,
    precioCompra: 3137.05,
    compraRelCodigo: "BRL-04-11-26-0011",
    porcentajeComision: 0.02,
    totalRevenue: 6742400,
    totalPagarClienteCop: 336000000,
    numero: 18
  },
  {
    id: "recC2L4kY8n7w0d5g",
    codigo: "N0019-PEN",
    idNegocio: "N0019-PEN",
    fechaRegistro: "2026-11-04",
    fecha: "2026-11-04",
    clienteCodigo: "C0017-DR-N",
    clienteNombre: "DR N",
    divisaCodigo: "PEN",
    montoDivisa: 110000,
    cantidadDivisa: 110000,
    tasa: 900,
    tasaClienteCop: 900,
    ingresoCop: 99000000,
    montoCop: 99000000,
    usdtPorDivisa: 32000,
    montoUsdt: 32000,
    costoUsdtComp: 0.290909,
    precioCompra: 3093.75,
    compraRelCodigo: "PEN-04-11-26-0012",
    porcentajeComision: 0.03,
    totalRevenue: 3400000,
    totalPagarClienteCop: 99000000,
    numero: 19
  },
  {
    id: "recM3S9vX2q6r4f8j",
    codigo: "N0020-CLP",
    idNegocio: "N0020-CLP",
    fechaRegistro: "2026-11-04",
    fecha: "2026-11-04",
    clienteCodigo: "C0017-DR-N",
    clienteNombre: "DR N",
    divisaCodigo: "CLP",
    montoDivisa: 49000000,
    cantidadDivisa: 49000000,
    tasa: 3.15,
    tasaClienteCop: 3.15,
    ingresoCop: 154350000,
    montoCop: 154350000,
    usdtPorDivisa: 50000,
    montoUsdt: 50000,
    costoUsdtComp: 0.00102,
    precioCompra: 3087,
    compraRelCodigo: "CLP-04-11-26-0013",
    porcentajeComision: 0.035,
    totalRevenue: 5650000,
    totalPagarClienteCop: 154350000,
    numero: 20
  },
  {
    id: "recQ5T8zW1p9s3h7k",
    codigo: "N0021-UYU",
    idNegocio: "N0021-UYU",
    fechaRegistro: "2026-11-04",
    fecha: "2026-11-04",
    clienteCodigo: "C0017-DR-N",
    clienteNombre: "DR N",
    divisaCodigo: "UYU",
    montoDivisa: 900000,
    cantidadDivisa: 900000,
    tasa: 73,
    tasaClienteCop: 73,
    ingresoCop: 65700000,
    montoCop: 65700000,
    usdtPorDivisa: 0,
    montoUsdt: 0,
    costoUsdtComp: 0,
    precioCompra: null,
    porcentajeComision: 0,
    totalRevenue: 0,
    totalPagarClienteCop: 65700000,
    numero: 21
  },
  {
    id: "recV7X2bN4m8k1j6l",
    codigo: "N0022-MXN",
    idNegocio: "N0022-MXN",
    fechaRegistro: "2026-11-04",
    fecha: "2026-11-04",
    clienteCodigo: "C0017-DR-N",
    clienteNombre: "DR N",
    divisaCodigo: "MXN",
    montoDivisa: 310000,
    cantidadDivisa: 310000,
    tasa: 150,
    tasaClienteCop: 150,
    ingresoCop: 46500000,
    montoCop: 46500000,
    usdtPorDivisa: 15000,
    montoUsdt: 15000,
    costoUsdtComp: 0.048387,
    precioCompra: 3100,
    compraRelCodigo: "MXN-04-11-26-0014",
    porcentajeComision: 0.03,
    totalRevenue: 1500000,
    totalPagarClienteCop: 46500000,
    numero: 22
  },
  {
    id: "recZ9C4vB6n2m5k8p",
    codigo: "N0023-USDT",
    idNegocio: "N0023-USDT",
    fechaRegistro: "2026-11-04",
    fecha: "2026-11-04",
    clienteCodigo: "C0017-DR-N",
    clienteNombre: "DR N",
    divisaCodigo: "USDT",
    montoDivisa: 22867,
    cantidadDivisa: 22867,
    tasa: 3018.8,
    tasaClienteCop: 3018.8,
    ingresoCop: 69030951.5,
    montoCop: 69030951.5,
    usdtPorDivisa: 22867,
    montoUsdt: 22867,
    costoUsdtComp: 1,
    precioCompra: 3018.8,
    porcentajeComision: 0.056,
    totalRevenue: 4143448.5,
    totalPagarClienteCop: 69030951.5,
    numero: 23
  }
];

export const PAGOS: Pago[] = [
  {
    id: "recL1S5nJ8v9k2x4m",
    codigo: "D0011",
    idDispersion: "D0011",
    clienteCodigo: "C0017-DR-N",
    clienteNombre: "DR N",
    montoCop: 50000000,
    valorTotalDispersion: 50000000,
    estado: "COMPLETADO",
    referencia: "Dispersión Coinsenda Kaupaloki",
    concepto: "Dispersión Coinsenda Kaupaloki",
    origenFondos: "Coinsenda-Kaupaloki",
    medioPagoNombre: "Coinsenda-Kaupaloki",
    fechaCreacion: "2026-11-04",
    fecha: "2026-11-04",
    tieneComprobante: false,
    comprobantes: [],
    numero: 11
  },
  {
    id: "recP8W3xM6q1z4c7v",
    codigo: "D0012",
    idDispersion: "D0012",
    clienteCodigo: "C0017-DR-N",
    clienteNombre: "DR N",
    montoCop: 50000000,
    valorTotalDispersion: 50000000,
    estado: "COMPLETADO",
    referencia: "Dispersión Coinsenda Jero All Solutions",
    concepto: "Dispersión Coinsenda Jero All Solutions",
    origenFondos: "Coinsenda-Jero All Solutions",
    medioPagoNombre: "Coinsenda-Jero All Solutions",
    fechaCreacion: "2026-11-04",
    fecha: "2026-11-04",
    tieneComprobante: false,
    comprobantes: [],
    numero: 12
  },
  {
    id: "recR9Y4zN7w2x5v8b",
    codigo: "D0013",
    idDispersion: "D0013",
    clienteCodigo: "C0017-DR-N",
    clienteNombre: "DR N",
    montoCop: 300000000,
    valorTotalDispersion: 300000000,
    estado: "COMPLETADO",
    referencia: "Entrega Efectivo Dosquebradas",
    concepto: "Entrega Efectivo Dosquebradas",
    origenFondos: "Efectivo-Dosquebradas",
    medioPagoNombre: "Efectivo-Dosquebradas",
    fechaCreacion: "2026-11-04",
    fecha: "2026-11-04",
    tieneComprobante: false,
    comprobantes: [],
    numero: 13
  }
];

export const VENTAS_USDT: VentaUsdt[] = [
  {
    id: "rec10cQvO8X9Y2M7P",
    nombre: "COP-04-11-26-0005",
    idTransaccion: "COP-04-11-26-0005",
    fecha: "2026-11-04",
    concepto: "COINSENDA • CUY WALLET",
    walletOrigen: "CUY WALLET",
    usdtVendido: 70000,
    cantidadUsdt: 70000,
    tasa: 3200,
    tasaVentaCop: 3200,
    impuestos: 0,
    destinoFondosNombre: "Coinsenda-Jero All Solutions",
    cuentaDestinoNombre: "Coinsenda-Jero All Solutions",
    totalCop: 224000000,
    montoNetoRecibidoCop: 224000000
  },
  {
    id: "rec29vBnL5K8W3N1Q",
    nombre: "COP-04-11-26-0006",
    idTransaccion: "COP-04-11-26-0006",
    fecha: "2026-11-04",
    concepto: "EFECTIVO • FRANZ WALLET",
    walletOrigen: "FRANZ WALLET",
    usdtVendido: 97000,
    cantidadUsdt: 97000,
    tasa: 3190,
    tasaVentaCop: 3190,
    impuestos: 0,
    destinoFondosNombre: "Efectivo-Dosquebradas",
    cuentaDestinoNombre: "Efectivo-Dosquebradas",
    totalCop: 309430000,
    montoNetoRecibidoCop: 309430000
  },
  {
    id: "rec38mXzP1J6R4K9T",
    nombre: "COP-04-11-26-0007",
    idTransaccion: "COP-04-11-26-0007",
    fecha: "2026-11-04",
    concepto: "COINSENDA • CUY WALLET",
    walletOrigen: "CUY WALLET",
    usdtVendido: 30000,
    cantidadUsdt: 30000,
    tasa: 3200,
    tasaVentaCop: 3200,
    impuestos: 0,
    destinoFondosNombre: "Coinsenda-Kaupaloki",
    cuentaDestinoNombre: "Coinsenda-Kaupaloki",
    totalCop: 96000000,
    montoNetoRecibidoCop: 96000000
  }
];

export const ACTIVOS_LIQUIDOS: ActivoLiquido[] = [
  {
    id: "recVFLDX1of31gVKN",
    activo: "Coinsenda-Jero All Solutions",
    institucion: "Coinsenda",
    empresa: "Coinsenda-Jero All Solutions",
    titular: "Coinsenda-Jero All Solutions",
    cuenta: "COINSENDA-JERO",
    tarifas: "% FEE $1,000.00 COP",
    saldoDisponible: 174000000,
    saldoTotal: 174000000,
    ingresosCop: 224000000,
    egresosCop: 50000000,
    saldoCop: 174000000,
    movimientos: [
      { fecha: "2026-11-04", origen: "D0012", concepto: "EGRESO / DISPERSIÓN D0012 — DR N", monto: -50000000, balance: 174000000 },
      { fecha: "2026-11-04", origen: "COP-04-11-26-0005", concepto: "ABONO MONETIZACIÓN USDT (70,000.00 USDT @ $3,200.00)", monto: 224000000, balance: 224000000 }
    ]
  },
  {
    id: "recsuypaKGBEA6dae",
    activo: "Coinsenda-Kaupaloki",
    institucion: "Coinsenda",
    empresa: "Coinsenda-Kaupaloki",
    titular: "Coinsenda-Kaupaloki",
    cuenta: "COINSENDA-KAUPALOKI",
    tarifas: "% FEE $1,000.00 COP",
    saldoDisponible: 46000000,
    saldoTotal: 46000000,
    ingresosCop: 96000000,
    egresosCop: 50000000,
    saldoCop: 46000000,
    movimientos: [
      { fecha: "2026-11-04", origen: "D0011", concepto: "EGRESO / DISPERSIÓN D0011 — DR N", monto: -50000000, balance: 46000000 },
      { fecha: "2026-11-04", origen: "COP-04-11-26-0007", concepto: "ABONO MONETIZACIÓN USDT (30,000.00 USDT @ $3,200.00)", monto: 96000000, balance: 96000000 }
    ]
  },
  {
    id: "recdOSGJZMR2xqUFq",
    activo: "Efectivo-Dosquebradas",
    institucion: "Efectivo",
    empresa: "Efectivo-Dosquebradas",
    titular: "Efectivo-Dosquebradas",
    cuenta: "CAJA-DOSQUEBRADAS",
    tarifas: "EXENTO DE FEE",
    saldoDisponible: 9430000,
    saldoTotal: 9430000,
    ingresosCop: 309430000,
    egresosCop: 300000000,
    saldoCop: 9430000,
    movimientos: [
      { fecha: "2026-11-04", origen: "D0013", concepto: "EGRESO / DISPERSIÓN D0013 — DR N", monto: -300000000, balance: 9430000 },
      { fecha: "2026-11-04", origen: "COP-04-11-26-0006", concepto: "ABONO MONETIZACIÓN USDT (97,000.00 USDT @ $3,190.00)", monto: 309430000, balance: 309430000 }
    ]
  }
];

export const ACTIVOS_DIGITALES: ActivoDigital[] = [
  {
    id: "recblQW6ViJ9MxCle",
    activo: "CUY WALLET",
    idWallet: "CUY WALLET",
    wallet: "TJv8B1q7k8Y32a8mN8vX90qLsK3P21qZbA",
    red: "TRON (TRC20)",
    titular: "CUY WALLET",
    tarifas: "RED TRON (TRC20) • 1 USDT",
    ingresoUsdt: 132107,
    ingresosUsdt: 132107,
    egresosUsdt: 100000,
    saldoUsdt: 32107,
    saldoReal: 32107,
    movimientos: [
      { fecha: "2026-11-04", origen: "COP-04-11-26-0007", concepto: "VENTA USDT → Coinsenda-Kaupaloki", monto: -30000, balance: 32107 },
      { fecha: "2026-11-04", origen: "COP-04-11-26-0005", concepto: "VENTA USDT → Coinsenda-Jero All Solutions", monto: -70000, balance: 62107 },
      { fecha: "2026-11-04", origen: "BRL-04-11-26-0011", concepto: "COMPRA USDT (BRL) — N0018-BRL", monto: 107107, balance: 132107 },
      { fecha: "2026-11-04", origen: "ARS-04-11-26-0010", concepto: "COMPRA USDT (ARS) — N0017-ARS", monto: 25000, balance: 25000 }
    ]
  },
  {
    id: "rec4eGPPX60dfrJzK",
    activo: "BETO WALLET",
    idWallet: "BETO WALLET",
    wallet: "TRrENAf4SQbcMXFn44wkfSjaic4dxBdbyb",
    red: "TRON (TRC20)",
    titular: "BETO WALLET",
    tarifas: "RED TRON (TRC20) • 1 USDT",
    ingresoUsdt: 22867,
    ingresosUsdt: 22867,
    egresosUsdt: 0,
    saldoUsdt: 22867,
    saldoReal: 22867,
    movimientos: [
      { fecha: "2026-11-04", origen: "N0023-USDT", concepto: "RECEPCIÓN DIRECTA USDT — N0023-USDT (DR N)", monto: 22867, balance: 22867 }
    ]
  },
  {
    id: "recYN27kO6gqWXqIj",
    activo: "FRANZ WALLET",
    idWallet: "FRANZ WALLET",
    wallet: "TL6bM8q1a5X9zP0vW8yT43qRjK7L12sQeD",
    red: "TRON (TRC20)",
    titular: "FRANZ WALLET",
    tarifas: "RED TRON (TRC20) • 1 USDT",
    ingresoUsdt: 97000,
    ingresosUsdt: 97000,
    egresosUsdt: 97000,
    saldoUsdt: 0,
    saldoReal: 0,
    movimientos: [
      { fecha: "2026-11-04", origen: "COP-04-11-26-0006", concepto: "VENTA USDT → Efectivo-Dosquebradas", monto: -97000, balance: 0 },
      { fecha: "2026-11-04", origen: "MXN-04-11-26-0014", concepto: "COMPRA USDT (MXN) — N0022-MXN", monto: 15000, balance: 97000 },
      { fecha: "2026-11-04", origen: "CLP-04-11-26-0013", concepto: "COMPRA USDT (CLP) — N0020-CLP", monto: 50000, balance: 82000 },
      { fecha: "2026-11-04", origen: "PEN-04-11-26-0012", concepto: "COMPRA USDT (PEN) — N0019-PEN", monto: 32000, balance: 32000 }
    ]
  }
];

export const ADMINS: Admin[] = [
  {
    id: "recL83WqXLLheg5zZ",
    codigo: "USA003-JERO-COL",
    nombre: "JERO ADMIN",
    email: "desarrollor@jeroallsolutions.com",
    pais: "COL",
    rol: "SUPER ADMIN",
    status: "ACTIVO",
    authorized_currencies: ["USD", "USDT", "COP", "BRL", "PEN", "CLP", "ARS", "HNL", "VES"],
    numero: 3
  },
  {
    id: "recVp36XSdciu5Oqe",
    codigo: "UAD001-DAVID-COL",
    nombre: "DAVID LOPEZ",
    email: "david.lopez@kaupaloki.co",
    pais: "COL",
    rol: "ADMINISTRADOR",
    status: "ACTIVO",
    authorized_currencies: ["USD", "USDT", "COP"],
    numero: 1
  },
  {
    id: "recnkRCzxvh8vH9Eu",
    codigo: "UAD002-FRANZ-COL",
    nombre: "FRANZ RUEDA",
    email: "franzruedab@gmail.com",
    pais: "COL",
    rol: "ADMINISTRADOR",
    status: "ACTIVO",
    authorized_currencies: ["USD", "USDT", "COP", "BRL", "PEN", "CLP", "ARS", "HNL", "VES"],
    numero: 2
  },
  {
    id: "recc4RrjOxntSbHZT",
    codigo: "UAD004-DANI-COL",
    nombre: "DANI",
    email: "daniel-r.a.p@hotmail.com",
    pais: "COL",
    rol: "ADMINISTRADOR",
    status: "ACTIVO",
    authorized_currencies: ["USD", "USDT", "COP", "BRL", "PEN", "CLP", "ARS", "HNL", "VES"],
    numero: 4
  }
];

export const USUARIOS_AIRTABLE: UsuarioAirtable[] = ADMINS;

export const CURRENCY_FLAGS: Record<string, string> = {
  'USD': '🇺🇸',
  'USD-EC': '🇺🇸',
  'USD-PY': '🇺🇸',
  'USDT': '🟢',
  'COP': '🇨🇴',
  'BRL': '🇧🇷',
  'PEN': '🇵🇪',
  'CLP': '🇨🇱',
  'ARS': '🇦🇷',
  'HNL': '🇭🇳',
  'VES': '🇻🇪',
  'MXN': '🇲🇽',
  'UYU': '🇺🇾',
  'EUR': '🇪🇺'
};

export function getCurrencyFlag(code: string): string {
  if (!code) return '🌐';
  const clean = code.trim().toUpperCase();
  return CURRENCY_FLAGS[clean] || '🌐';
}

export function formatCurrencyWithFlag(code: string): string {
  if (!code) return '';
  return `${getCurrencyFlag(code)} ${code.toUpperCase()}`;
}

export function getMetricasContables() {
  const totalIngresosCop = NEGOCIOS.reduce((acc, n) => acc + n.ingresoCop, 0);
  const totalPagadoCop = PAGOS.filter(p => p.estado === 'COMPLETADO').reduce((acc, p) => acc + p.montoCop, 0);
  const saldoPendienteNeto = totalIngresosCop - totalPagadoCop;
  const totalUsdtComprado = COMPRAS_USDT.reduce((acc, c) => acc + c.usdtComprado, 0);
  const totalUsdtVendido = VENTAS_USDT.reduce((acc, v) => acc + v.usdtVendido, 0);
  const totalUsdtEnCustodia = ACTIVOS_DIGITALES.reduce((acc, d) => acc + (d.saldoUsdt || 0), 0);
  const totalActivosLiquidosCop = ACTIVOS_LIQUIDOS.reduce((acc, a) => acc + a.saldoCop, 0);
  const totalFaltaLiquidarClientes = CLIENTES.reduce((acc, c) => acc + (c.pendienteCop > 0 ? c.pendienteCop : 0), 0);
  const gananciaEstimadaCop = NEGOCIOS.reduce((acc, n) => acc + (n.totalRevenue || 0), 0);

  return {
    totalIngresosCop,
    totalPagadoCop,
    saldoPendienteNeto,
    totalUsdtComprado,
    totalUsdtVendido,
    totalUsdtEnCustodia,
    totalActivosLiquidosCop,
    totalFaltaLiquidarClientes,
    gananciaEstimadaCop,
    numClientes: CLIENTES.length,
    numNegocios: NEGOCIOS.length,
    numPagosCompletados: PAGOS.filter(p => p.estado === 'COMPLETADO').length,
    numComprasUsdt: COMPRAS_USDT.length,
    numVentasUsdt: VENTAS_USDT.length,
    numActivosLiquidos: ACTIVOS_LIQUIDOS.length
  };
}
