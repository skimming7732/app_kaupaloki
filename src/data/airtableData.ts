export interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  ingresosCop: number;
  pagadoCop: number;
  pendienteCop: number;
  fechaCreacion: string;
  numero: number;
}

export interface Divisa {
  id: string;
  codigo: string;
  totalRecibido: number;
  totalComprado: number;
  totalPendiente: number;
}

export interface CompraUSDT {
  id: string;
  codigo: string;
  fechaCompra: string;
  divisaCodigo: string;
  valorComprado: number;
  usdtComprado: number;
  costo: number;
  tasa: number;
  numero: number;
}

export interface Negocio {
  id: string;
  codigo: string;
  fechaRegistro: string;
  clienteCodigo: string;
  clienteNombre: string;
  divisaCodigo: string;
  montoDivisa: number;
  tasa: number;
  ingresoCop: number;
  usdtPorDivisa: number;
  costoUsdtComp: number;
  precioCompra: number | null;
  compraRelCodigo?: string;
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
  clienteCodigo: string;
  clienteNombre: string;
  montoCop: number;
  estado: 'COMPLETADO' | 'RECHAZADO';
  comprobanteUrl?: string;
  comprobanteNombre?: string;
  comprobantes?: ComprobanteItem[];
  numero: number;
  fechaCreacion?: string;
  referencia?: string;
  origenFondos?: string;
}


export interface VentaUsdt {
  id: string;
  nombre: string;
  fecha: string;
  concepto: string;
  usdtVendido: number;
  tasa: number;
  destinoFondosNombre: string;
  totalCop: number;
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
    id: "recmyTWhacoOB2Ae9",
    codigo: "C0001-FRANZ",
    nombre: "FRANZ",
    ingresosCop: 51700000,
    pagadoCop: 40000000,
    pendienteCop: 11700000,
    fechaCreacion: "2026-10-30",
    numero: 1
  },
  {
    id: "recsgjFZRqyoAIzkW",
    codigo: "C0006-DANIEL-LOPEZ",
    nombre: "DANIEL LOPEZ",
    ingresosCop: 0,
    pagadoCop: 0,
    pendienteCop: 0,
    fechaCreacion: "2026-10-30",
    numero: 6
  },
  {
    id: "recAa2lOSmyijCPeS",
    codigo: "C0007-ERNESTO-GAVIRIA",
    nombre: "ERNESTO GAVIRIA",
    ingresosCop: 0,
    pagadoCop: 0,
    pendienteCop: 0,
    fechaCreacion: "2026-10-30",
    numero: 7
  },
  {
    id: "recs0OmJPdlPyXsMF",
    codigo: "C0008-MIGUEL-COLORADO",
    nombre: "MIGUEL COLORADO",
    ingresosCop: 100800000,
    pagadoCop: 15000000,
    pendienteCop: 85800000,
    fechaCreacion: "2026-10-30",
    numero: 8
  },
  {
    id: "receqiObtbXdnLe3d",
    codigo: "C0009-CARLOS-RESTREPO",
    nombre: "CARLOS RESTREPO",
    ingresosCop: 0,
    pagadoCop: 0,
    pendienteCop: 0,
    fechaCreacion: "2026-10-30",
    numero: 9
  },
  {
    id: "reciJfqVVZ7p6HyQI",
    codigo: "C0011-DR-N",
    nombre: "DR N",
    ingresosCop: 37997046,
    pagadoCop: 97574179,
    pendienteCop: -59577133,
    fechaCreacion: "2026-10-30",
    numero: 11
  },
  {
    id: "reck9FHIed6XGDy7D",
    codigo: "C0012-DANNA-PEREZ",
    nombre: "DANNA PEREZ",
    ingresosCop: 95000000,
    pagadoCop: 15000000,
    pendienteCop: 80000000,
    fechaCreacion: "2026-11-03",
    numero: 12
  },
  {
    id: "recxqfHVbftz9LYKm",
    codigo: "C0013-JUAN-JUAN",
    nombre: "juan juan",
    ingresosCop: 0,
    pagadoCop: 0,
    pendienteCop: 0,
    fechaCreacion: "2026-11-03",
    numero: 13
  },
  {
    id: "recP4vDZ5kMvmTJHh",
    codigo: "C0014-TEST-TEST",
    nombre: "TEST test",
    ingresosCop: 0,
    pagadoCop: 0,
    pendienteCop: 0,
    fechaCreacion: "2026-11-03",
    numero: 14
  },
  {
    id: "recuA3l5OLdpH5qTt",
    codigo: "C0015-ALBERTA",
    nombre: "ALBERTA",
    ingresosCop: 0,
    pagadoCop: 0,
    pendienteCop: 0,
    fechaCreacion: "2026-11-03",
    numero: 15
  },
  {
    id: "rec37J0iKAvTIKxIp",
    codigo: "C0016-CLIENTE",
    nombre: "Cliente 16",
    ingresosCop: 0,
    pagadoCop: 0,
    pendienteCop: 0,
    fechaCreacion: "2026-11-03",
    numero: 16
  }
];

export const DIVISAS: Divisa[] = [
  {
    id: "rec5f7Xzww3xl88nq",
    codigo: "BRL",
    totalRecibido: 223000,
    totalComprado: 197000,
    totalPendiente: 26000
  },
  {
    id: "rec7tYgRg0cJZunNW",
    codigo: "PEN",
    totalRecibido: 53162,
    totalComprado: 35000,
    totalPendiente: 18162
  },
  {
    id: "recQ2kNgwFWmex2PB",
    codigo: "HNL",
    totalRecibido: 110000,
    totalComprado: 110000,
    totalPendiente: 0
  },
  {
    id: "recdSG05fjNiX8bDs",
    codigo: "ARS",
    totalRecibido: 4000000,
    totalComprado: 0,
    totalPendiente: 4000000
  },
  {
    id: "recjr5hVAnG5bObTV",
    codigo: "CLP",
    totalRecibido: 500000,
    totalComprado: 400000,
    totalPendiente: 100000
  },
  {
    id: "recqs25uNy07U35kP",
    codigo: "COP",
    totalRecibido: 0,
    totalComprado: 0,
    totalPendiente: 0
  }
];

export const COMPRAS_USDT: CompraUSDT[] = [
  {
    id: "recvK660p6P8GZqPU",
    codigo: "PEN-30-10-26-0001",
    fechaCompra: "2026-10-30",
    divisaCodigo: "PEN",
    valorComprado: 20000,
    usdtComprado: 5772,
    costo: 0.2886,
    tasa: 3.465,
    numero: 1
  },
  {
    id: "rec76EaVZX3QvKfeR",
    codigo: "BRL-30-10-26-0002",
    fechaCompra: "2026-10-30",
    divisaCodigo: "BRL",
    valorComprado: 27000,
    usdtComprado: 4876.29,
    costo: 0.180603,
    tasa: 5.537,
    numero: 2
  },
  {
    id: "recNjXJU3BS5DHkA6",
    codigo: "BRL-30-10-26-0003",
    fechaCompra: "2026-10-30",
    divisaCodigo: "BRL",
    valorComprado: 170000,
    usdtComprado: 30697,
    costo: 0.180571,
    tasa: 5.538,
    numero: 3
  },
  {
    id: "rec8gxd0IEXGTVdl8",
    codigo: "HNL-30-10-26-0004",
    fechaCompra: "2026-10-30",
    divisaCodigo: "HNL",
    valorComprado: 110000,
    usdtComprado: 3815,
    costo: 0.034682,
    tasa: 28.8336,
    numero: 4
  },
  {
    id: "recDOUZBQ88BrErkn",
    codigo: "PEN-30-10-26-0005",
    fechaCompra: "2026-10-30",
    divisaCodigo: "PEN",
    valorComprado: 15000,
    usdtComprado: 4327.76,
    costo: 0.288517,
    tasa: 3.466,
    numero: 5
  },
  {
    id: "rec08aMMyTrv0jWEc",
    codigo: "CLP-03-11-26-0006",
    fechaCompra: "2026-11-03",
    divisaCodigo: "CLP",
    valorComprado: 400000,
    usdtComprado: 980,
    costo: 0.00245,
    tasa: 408.1633,
    numero: 6
  },
  {
    id: "rec2E2GCwWBStJ4Y1",
    codigo: "COP-03-11-26-0007",
    fechaCompra: "2026-11-03",
    divisaCodigo: "COP",
    valorComprado: 0,
    usdtComprado: 0,
    costo: 0,
    tasa: 0,
    numero: 7
  }
];

export const NEGOCIOS: Negocio[] = [
  {
    id: "recvoLRIWCMxxHiRz",
    codigo: "N0001-HNL",
    fechaRegistro: "2026-10-31",
    clienteCodigo: "C0001-FRANZ",
    clienteNombre: "FRANZ",
    divisaCodigo: "HNL",
    montoDivisa: 110000,
    tasa: 106,
    ingresoCop: 11660000,
    usdtPorDivisa: 3815,
    costoUsdtComp: 0.034682,
    precioCompra: 3056.36,
    compraRelCodigo: "HNL-30-10-26-0004",
    numero: 1
  },
  {
    id: "recfUhnHZR863eBUH",
    codigo: "N0002-BRL",
    fechaRegistro: "2026-10-31",
    clienteCodigo: "C0001-FRANZ",
    clienteNombre: "FRANZ",
    divisaCodigo: "BRL",
    montoDivisa: 10000,
    tasa: 560,
    ingresoCop: 5600000,
    usdtPorDivisa: 1806.03,
    costoUsdtComp: 0.180603,
    precioCompra: 3100.72,
    compraRelCodigo: "BRL-30-10-26-0002",
    numero: 2
  },
  {
    id: "recN2h12ug0SF4uJ6",
    codigo: "N0004-BRL",
    fechaRegistro: "2026-10-30",
    clienteCodigo: "C0008-MIGUEL-COLORADO",
    clienteNombre: "MIGUEL COLORADO",
    divisaCodigo: "BRL",
    montoDivisa: 10000,
    tasa: 560,
    ingresoCop: 5600000,
    usdtPorDivisa: 1805.71,
    costoUsdtComp: 0.180571,
    precioCompra: 3101.28,
    compraRelCodigo: "BRL-30-10-26-0003",
    numero: 4
  },
  {
    id: "recY9dI2T91YIp1zT",
    codigo: "N0006-PEN",
    fechaRegistro: "2026-10-30",
    clienteCodigo: "C0001-FRANZ",
    clienteNombre: "FRANZ",
    divisaCodigo: "PEN",
    montoDivisa: 20000,
    tasa: 872,
    ingresoCop: 17440000,
    usdtPorDivisa: 5772,
    costoUsdtComp: 0.2886,
    precioCompra: 3021.48,
    compraRelCodigo: "PEN-30-10-26-0001",
    numero: 6
  },
  {
    id: "recgESdQkrJYpW96S",
    codigo: "N0007-BRL",
    fechaRegistro: "2026-10-30",
    clienteCodigo: "C0001-FRANZ",
    clienteNombre: "FRANZ",
    divisaCodigo: "BRL",
    montoDivisa: 7000,
    tasa: 560,
    ingresoCop: 3920000,
    usdtPorDivisa: 1264.22,
    costoUsdtComp: 0.180603,
    precioCompra: 3100.72,
    compraRelCodigo: "BRL-30-10-26-0002",
    numero: 7
  },
  {
    id: "rec81tTCckEkTvRgW",
    codigo: "N0008-BRL",
    fechaRegistro: "2026-10-31",
    clienteCodigo: "C0008-MIGUEL-COLORADO",
    clienteNombre: "MIGUEL COLORADO",
    divisaCodigo: "BRL",
    montoDivisa: 170000,
    tasa: 560,
    ingresoCop: 95200000,
    usdtPorDivisa: 30697,
    costoUsdtComp: 0.180571,
    precioCompra: 3101.28,
    compraRelCodigo: "BRL-30-10-26-0003",
    numero: 8
  },
  {
    id: "rece5Uma53howSWLa",
    codigo: "N0009-PEN",
    fechaRegistro: "2026-10-30",
    clienteCodigo: "C0001-FRANZ",
    clienteNombre: "FRANZ",
    divisaCodigo: "PEN",
    montoDivisa: 15000,
    tasa: 872,
    ingresoCop: 13080000,
    usdtPorDivisa: 4327.76,
    costoUsdtComp: 0.288517,
    precioCompra: 3022.35,
    compraRelCodigo: "PEN-30-10-26-0005",
    numero: 9
  },
  {
    id: "recd8EbPEsSEVprzo",
    codigo: "N0010-PEN",
    fechaRegistro: "2026-10-30",
    clienteCodigo: "C0011-DR-N",
    clienteNombre: "DR N",
    divisaCodigo: "PEN",
    montoDivisa: 18162,
    tasa: 883,
    ingresoCop: 16037046,
    usdtPorDivisa: 0,
    costoUsdtComp: 0,
    precioCompra: null,
    numero: 10
  },
  {
    id: "recx8JBGnJhXOiDXi",
    codigo: "N0011-BRL",
    fechaRegistro: "2026-10-30",
    clienteCodigo: "C0011-DR-N",
    clienteNombre: "DR N",
    divisaCodigo: "BRL",
    montoDivisa: 26000,
    tasa: 560,
    ingresoCop: 14560000,
    usdtPorDivisa: 0,
    costoUsdtComp: 0,
    precioCompra: null,
    numero: 11
  },
  {
    id: "recu0xJCjqpz1O3Pg",
    codigo: "N0012-ARS",
    fechaRegistro: "2026-10-30",
    clienteCodigo: "C0011-DR-N",
    clienteNombre: "DR N",
    divisaCodigo: "ARS",
    montoDivisa: 4000000,
    tasa: 1.85,
    ingresoCop: 7400000,
    usdtPorDivisa: 0,
    costoUsdtComp: 0,
    precioCompra: null,
    numero: 12
  },
  {
    id: "recEcxbMnvEvhD3vs",
    codigo: "N0015-CLP",
    fechaRegistro: "2026-11-03",
    clienteCodigo: "C0012-DANNA-PEREZ",
    clienteNombre: "DANNA PEREZ",
    divisaCodigo: "CLP",
    montoDivisa: 500000,
    tasa: 190,
    ingresoCop: 95000000,
    usdtPorDivisa: 1225,
    costoUsdtComp: 0.00245,
    precioCompra: 77551.02,
    compraRelCodigo: "CLP-03-11-26-0006",
    numero: 15
  }
];

export const PAGOS: Pago[] = [
  {
    id: "recwB1KUDNpKXm4uh",
    codigo: "D0001",
    clienteCodigo: "C0001-FRANZ",
    clienteNombre: "FRANZ",
    montoCop: 10000000,
    estado: "COMPLETADO",
    referencia: "Maximuelbes SA",
    origenFondos: "—",
    fechaCreacion: "2026-10-30",
    comprobanteUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793736000000/kJlOwy5NtnuiziPQ7Hus6Q/hJsftjQm15wY0SZHDtOHHRiMv6z9EGXAymKchOyLS3RSKa5E2phOSggX0QnxuYQV4MXBx1u9jGvCxAIqmfFvjT9SsmsMIYocvHtd2QPKM8cyn4bfJluONAl1HCLlBTv9NLs5wWcxNSv1FNcfn_Hr6w/RZ-Vi3Y5yLJLR21ZXCheNK2GzbCNdo9wBfGZ940xLO4",
    comprobanteNombre: "image.png",
    comprobantes: [
      {
        id: "attaZsPwcd7b1oMrX",
        url: "https://v5.airtableusercontent.com/v3/u/59/59/1793736000000/kJlOwy5NtnuiziPQ7Hus6Q/hJsftjQm15wY0SZHDtOHHRiMv6z9EGXAymKchOyLS3RSKa5E2phOSggX0QnxuYQV4MXBx1u9jGvCxAIqmfFvjT9SsmsMIYocvHtd2QPKM8cyn4bfJluONAl1HCLlBTv9NLs5wWcxNSv1FNcfn_Hr6w/RZ-Vi3Y5yLJLR21ZXCheNK2GzbCNdo9wBfGZ940xLO4",
        nombre: "image.png"
      }
    ],
    numero: 1
  },
  {
    id: "recd0G5LiPho3qP2b",
    codigo: "D0002",
    clienteCodigo: "C0006-DANIEL-LOPEZ",
    clienteNombre: "DANIEL LOPEZ",
    montoCop: 15000000,
    estado: "RECHAZADO",
    referencia: "—",
    origenFondos: "—",
    fechaCreacion: "2026-10-30",
    comprobantes: [],
    numero: 2
  },
  {
    id: "rechFZhlcwgQe5EeV",
    codigo: "D0003",
    clienteCodigo: "C0011-DR-N",
    clienteNombre: "DR N",
    montoCop: 29920000,
    estado: "COMPLETADO",
    referencia: "—",
    origenFondos: "—",
    fechaCreacion: "2026-10-30",
    comprobantes: [],
    numero: 3
  },
  {
    id: "recQP8aCewBCYVSDA",
    codigo: "D0004",
    clienteCodigo: "C0011-DR-N",
    clienteNombre: "DR N",
    montoCop: 19000000,
    estado: "COMPLETADO",
    referencia: "—",
    origenFondos: "—",
    fechaCreacion: "2026-10-30",
    comprobantes: [],
    numero: 4
  },
  {
    id: "recZIudNCzoxcYgQ0",
    codigo: "D0005",
    clienteCodigo: "C0011-DR-N",
    clienteNombre: "DR N",
    montoCop: 22959878,
    estado: "COMPLETADO",
    referencia: "—",
    origenFondos: "—",
    fechaCreacion: "2026-10-30",
    comprobantes: [],
    numero: 5
  },
  {
    id: "recxJCQt3a3LRFdPq",
    codigo: "D0006",
    clienteCodigo: "C0011-DR-N",
    clienteNombre: "DR N",
    montoCop: 25694301,
    estado: "COMPLETADO",
    referencia: "—",
    origenFondos: "—",
    fechaCreacion: "2026-10-30",
    comprobantes: [],
    numero: 6
  },
  {
    id: "recmAmn9kkFJjg4g8",
    codigo: "D0007",
    clienteCodigo: "C0008-MIGUEL-COLORADO",
    clienteNombre: "MIGUEL COLORADO",
    montoCop: 15000000,
    estado: "COMPLETADO",
    referencia: "—",
    origenFondos: "—",
    fechaCreacion: "2026-11-03",
    comprobanteUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793757600000/YSiQPnzRHG__OiuUf1KD7Q/ciT7WBV2BpcWnCok7KshZJU_z0xSXzOOiyU6RPDR6DfLkYb8TQF4EqwMM3a2fi15Jm_lE7xb9ubep0f1m-2bfT7qGxJMv59qw6BeWu0AJ6tvFfT_jyYV-i61318ra0uU-OL6bapcOsMJ_u6RJUD5ZKbemJCzk3d8s5e7suQz1ts/caTst_YhV08uZ5FRUpwXHaNyuVLawIZwZccwVzSwLt8",
    comprobanteNombre: "Logo Asteana.png",
    comprobantes: [
      {
        id: "attaRNQyRE9uHdSkG",
        url: "https://v5.airtableusercontent.com/v3/u/59/59/1793757600000/YSiQPnzRHG__OiuUf1KD7Q/ciT7WBV2BpcWnCok7KshZJU_z0xSXzOOiyU6RPDR6DfLkYb8TQF4EqwMM3a2fi15Jm_lE7xb9ubep0f1m-2bfT7qGxJMv59qw6BeWu0AJ6tvFfT_jyYV-i61318ra0uU-OL6bapcOsMJ_u6RJUD5ZKbemJCzk3d8s5e7suQz1ts/caTst_YhV08uZ5FRUpwXHaNyuVLawIZwZccwVzSwLt8",
        nombre: "Logo Asteana.png"
      }
    ],
    numero: 7
  },
  {
    id: "recfKJe2s1lBJbRfu",
    codigo: "D0008",
    clienteCodigo: "C0012-DANNA-PEREZ",
    clienteNombre: "DANNA PEREZ",
    montoCop: 15000000,
    estado: "COMPLETADO",
    referencia: "—",
    origenFondos: "Coinsenda-Kaupaloki",
    fechaCreacion: "2026-11-03",
    comprobantes: [],
    numero: 8
  },
  {
    id: "recx3s6EbMHJKbrxd",
    codigo: "D0009",
    clienteCodigo: "C0001-FRANZ",
    clienteNombre: "FRANZ",
    montoCop: 30000000,
    estado: "COMPLETADO",
    referencia: "Constructora SAS",
    origenFondos: "Coinsenda-Jero All Solutions",
    fechaCreacion: "2026-11-03",
    comprobantes: [],
    numero: 9
  },
  {
    id: "recKmJBzwmUPmhKPI",
    codigo: "D0010",
    clienteCodigo: "C0001-FRANZ",
    clienteNombre: "FRANZ",
    montoCop: 10000000,
    estado: "COMPLETADO",
    referencia: "EFECTIVO",
    origenFondos: "Efectivo-Dosquebradas",
    fechaCreacion: "2026-11-03",
    comprobantes: [],
    numero: 10
  }
];


export const VENTAS_USDT: VentaUsdt[] = [
  {
    id: "recHn8RrTIu9Pb4US",
    nombre: "VE-01",
    fecha: "2026-11-03",
    concepto: "COINCENDA",
    usdtVendido: 90000,
    tasa: 3200,
    destinoFondosNombre: "Coinsenda-Kaupaloki",
    totalCop: 288000000
  },
  {
    id: "recjrrnzbxhM1IUpL",
    nombre: "VE-02",
    fecha: "2026-11-03",
    concepto: "GIRALDO",
    usdtVendido: 100000,
    tasa: 3200,
    destinoFondosNombre: "Efectivo-Dosquebradas",
    totalCop: 320000000
  },
  {
    id: "reczqUMGkDp6SQE0y",
    nombre: "VE-03",
    fecha: "2026-11-03",
    concepto: "LINCOIN",
    usdtVendido: 50000,
    tasa: 3200,
    destinoFondosNombre: "Coinsenda-Jero All Solutions",
    totalCop: 160000000
  }
];

export const ACTIVOS_LIQUIDOS: ActivoLiquido[] = [
  {
    id: "recsuypaKGBEA6dae",
    activo: "Coinsenda-Kaupaloki",
    institucion: "Coinsenda",
    empresa: "Kaupaloki",
    titular: "KAUPALOKI SAS",
    cuenta: "N/A",
    tarifas: "% FEE $1000 COP",
    saldoDisponible: 273000000,
    saldoTotal: 273000000,
    ingresosCop: 288000000,
    egresosCop: 15000000,
    saldoCop: 273000000,
    movimientos: [
      { fecha: "4/11/2026 09:30 a.m.", origen: "DSP-2026-8102", concepto: "Dispersión Clientes - Pago Lote #14", monto: -15000000, balance: 273000000 },
      { fecha: "4/11/2026 09:30 a.m.", origen: "DSP-2026-8102", concepto: "Comisión FEE $1000 COP - Dispersión Lote #14", monto: -1000, balance: 288000000 },
      { fecha: "2/11/2026 03:15 p.m.", origen: "ING-2026-041", concepto: "Ingreso Liquidación Venta USDT", monto: 128000000, balance: 288001000 },
      { fecha: "1/11/2026 11:00 a.m.", origen: "ING-2026-038", concepto: "Recarga Cuenta Operativa Coinsenda", monto: 160000000, balance: 160001000 }
    ]
  },
  {
    id: "recVFLDX1of31gVKN",
    activo: "Coinsenda-Jero All Solutions",
    institucion: "COINSENSA",
    empresa: "JERO ALL SOLUTIONS SAS",
    titular: "JERO ALL SOLUTIONS SAS",
    cuenta: "N/A",
    tarifas: "% FEE $1000 COP",
    saldoDisponible: 0,
    saldoTotal: 839,
    ingresosCop: 160000000,
    egresosCop: 30000000,
    saldoCop: 130000000,
    movimientos: [
      { fecha: "3/11/2026 12:16 p.m.", origen: "DSP-2026-7943", concepto: "Dispersión - Envío #1", monto: -738000, balance: 839 },
      { fecha: "3/11/2026 12:16 p.m.", origen: "DSP-2026-7943", concepto: "Comisión FEE $1000 COP - Dispersión Envío #1", monto: -1000, balance: 738839 },
      { fecha: "24/7/2026 07:19 p.m.", origen: "EXP-26-00001", concepto: "Retención en la fuente", monto: -150000, balance: 739839 },
      { fecha: "24/7/2026 07:19 p.m.", origen: "EXP-26-00001", concepto: "FEE $1000 COP", monto: -1000, balance: 889839 },
      { fecha: "24/7/2026 06:45 p.m.", origen: "EXP-1004", concepto: "FEE $1000 COP", monto: -1000, balance: 890839 },
      { fecha: "24/7/2026 06:45 p.m.", origen: "EXP-1004", concepto: "Suscripciones de software", monto: -150000, balance: 891839 },
      { fecha: "10/7/2026 07:33 p.m.", origen: "DSP-2026-5852", concepto: "Comisión FEE $1000 COP - Dispersión Envío #1", monto: -1000, balance: 1041839 },
      { fecha: "10/7/2026 07:33 p.m.", origen: "DSP-2026-5852", concepto: "Dispersión - Envío #1", monto: -17500000, balance: 1042839 }
    ]
  },
  {
    id: "recdOSGJZMR2xqUFq",
    activo: "Efectivo-Dosquebradas",
    institucion: "EFECTIVO / CAJA",
    empresa: "Dosquebradas",
    titular: "DOSQUEBRADAS CAJA EMPRESA",
    cuenta: "CAJA-01",
    tarifas: "EXENTO DE FEE",
    saldoDisponible: 310000000,
    saldoTotal: 310000000,
    ingresosCop: 320000000,
    egresosCop: 10000000,
    saldoCop: 310000000,
    movimientos: [
      { fecha: "3/11/2026 04:20 p.m.", origen: "EGR-26-015", concepto: "Retiro para Pagos en Efectivo", monto: -10000000, balance: 310000000 },
      { fecha: "1/11/2026 10:15 a.m.", origen: "ING-26-092", concepto: "Entrada por Venta Efectivo OTC", monto: 180000000, balance: 320000000 },
      { fecha: "29/10/2026 02:00 p.m.", origen: "ING-26-088", concepto: "Apertura Balance Operativo Efectivo", monto: 140000000, balance: 140000000 }
    ]
  }
];

export const ADMINS: Admin[] = [
  {
    id: "recL83WqXLLheg5zZ",
    codigo: "USA003-ADMINISTRADOR-COL",
    nombre: "ADMINISTRADOR JERO",
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
    id: "rec74079466-ba44-450a",
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

// Métricas de consolidación contable para Panel de Control
export function getMetricasContables() {
  const totalIngresosCop = NEGOCIOS.reduce((acc, n) => acc + n.ingresoCop, 0);
  const totalPagadoCop = PAGOS.filter(p => p.estado === 'COMPLETADO').reduce((acc, p) => acc + p.montoCop, 0);
  const saldoPendienteNeto = totalIngresosCop - totalPagadoCop;
  const totalUsdtComprado = COMPRAS_USDT.reduce((acc, c) => acc + c.usdtComprado, 0);
  const totalUsdtVendido = VENTAS_USDT.reduce((acc, v) => acc + v.usdtVendido, 0);
  const totalUsdtEnCustodia = DIVISAS.reduce((acc, d) => acc + d.saldoEnCustodia, 0);
  const totalActivosLiquidosCop = ACTIVOS_LIQUIDOS.reduce((acc, a) => acc + a.saldoCop, 0);
  const totalFaltaLiquidarClientes = CLIENTES.reduce((acc, c) => acc + (c.pendienteCop > 0 ? c.pendienteCop : 0), 0);
  const gananciaEstimadaCop = Math.round(totalIngresosCop * 0.1904); // Margen comercial sobre volumen

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
