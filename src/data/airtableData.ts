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

export interface Pago {
  id: string;
  codigo: string;
  clienteCodigo: string;
  clienteNombre: string;
  montoCop: number;
  estado: 'COMPLETADO' | 'RECHAZADO';
  comprobanteUrl?: string;
  comprobanteNombre?: string;
  numero: number;
}

export interface Admin {
  id: string;
  codigo: string;
  nombre: string;
  pais: string;
  numero: number;
}

export const CLIENTES: Cliente[] = [
  {
    id: "recmyTWhacoOB2Ae9",
    codigo: "C0001-FRANZ",
    nombre: "FRANZ",
    ingresosCop: 51700000,
    pagadoCop: 10000000,
    pendienteCop: 41700000,
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
    pagadoCop: 0,
    pendienteCop: 100800000,
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
    pagadoCop: 0,
    pendienteCop: 95000000,
    fechaCreacion: "2026-11-03",
    numero: 12
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
    codigo: "P0001",
    clienteCodigo: "C0001-FRANZ",
    clienteNombre: "FRANZ",
    montoCop: 10000000,
    estado: "COMPLETADO",
    comprobanteUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793736000000/kJlOwy5NtnuiziPQ7Hus6Q/hJsftjQm15wY0SZHDtOHHRiMv6z9EGXAymKchOyLS3RSKa5E2phOSggX0QnxuYQV4MXBx1u9jGvCxAIqmfFvjT9SsmsMIYocvHtd2QPKM8cyn4bfJluONAl1HCLlBTv9NLs5wWcxNSv1FNcfn_Hr6w/RZ-Vi3Y5yLJLR21ZXCheNK2GzbCNdo9wBfGZ940xLO4",
    comprobanteNombre: "image.png",
    numero: 1
  },
  {
    id: "recd0G5LiPho3qP2b",
    codigo: "P0002",
    clienteCodigo: "C0006-DANIEL-LOPEZ",
    clienteNombre: "DANIEL LOPEZ",
    montoCop: 15000000,
    estado: "RECHAZADO",
    numero: 2
  },
  {
    id: "rechFZhlcwgQe5EeV",
    codigo: "P0003",
    clienteCodigo: "C0011-DR-N",
    clienteNombre: "DR N",
    montoCop: 29920000,
    estado: "COMPLETADO",
    numero: 3
  },
  {
    id: "recQP8aCewBCYVSDA",
    codigo: "P0004",
    clienteCodigo: "C0011-DR-N",
    clienteNombre: "DR N",
    montoCop: 19000000,
    estado: "COMPLETADO",
    numero: 4
  },
  {
    id: "recZIudNCzoxcYgQ0",
    codigo: "P0005",
    clienteCodigo: "C0011-DR-N",
    clienteNombre: "DR N",
    montoCop: 22959878,
    estado: "COMPLETADO",
    numero: 5
  },
  {
    id: "recxJCQt3a3LRFdPq",
    codigo: "P0006",
    clienteCodigo: "C0011-DR-N",
    clienteNombre: "DR N",
    montoCop: 25694301,
    estado: "COMPLETADO",
    numero: 6
  },
  {
    id: "recmAmn9kkFJjg4g8",
    codigo: "P0007",
    clienteCodigo: "C0012-DANNA-PEREZ",
    clienteNombre: "DANNA PEREZ",
    montoCop: 15000000,
    estado: "RECHAZADO",
    comprobanteUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793736000000/wmnSaQOGJicByEgT2JPoqQ/1MsSQFfY34sjp78eIPeIamUVMxeczyp_r1_4J_2JLuLo7raNKA7DRGJmeM-fF-mvX_GRT-Ka7G2Iqr43Pcr5YDwqKo1L1VJ-sKrYLfDzJhUIIkBS65u44J8qybi3wPyzzCToW2eJiuJ7--SxB8BY0y_ViWKOck5V7rwE9QxCIv4/fMqkmCLmOTpYpzEUS6KLsYv074dYpupbWOA3--aPK0s",
    comprobanteNombre: "Logo Asteana.png",
    numero: 7
  }
];

export const ADMINS: Admin[] = [
  {
    id: "recVp36XSdciu5Oqe",
    codigo: "A01-DAVID-COL",
    nombre: "DAVID LOPEZ",
    pais: "COL",
    numero: 1
  }
];

// Métricas de consolidación contable
export function getMetricasContables() {
  const totalIngresosCop = NEGOCIOS.reduce((acc, n) => acc + n.ingresoCop, 0);
  const totalPagadoCop = PAGOS.filter(p => p.estado === 'COMPLETADO').reduce((acc, p) => acc + p.montoCop, 0);
  const saldoPendienteNeto = totalIngresosCop - totalPagadoCop;
  const totalUsdtComprado = COMPRAS_USDT.reduce((acc, c) => acc + c.usdtComprado, 0);

  return {
    totalIngresosCop,
    totalPagadoCop,
    saldoPendienteNeto,
    totalUsdtComprado,
    numClientes: CLIENTES.length,
    numNegocios: NEGOCIOS.length,
    numPagosCompletados: PAGOS.filter(p => p.estado === 'COMPLETADO').length,
    numComprasUsdt: COMPRAS_USDT.length
  };
}
