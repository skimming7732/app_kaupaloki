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
  nombreDivisa?: string;
  pais?: string;
  banderaUrl?: string;
  fallbackBanderaUrl?: string;
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
  { id: "recX2WcOyLsk8YcJN", codigo: "USDT", divisa: "USDT", nombreDivisa: "Tether USDT", pais: "Cripto / Global (USDT)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/jLj5_BlNKnYevfOFziTcqg/7LKW_Eh2B3g1Xb0SgLea3wemXW99B9ATk12dHAYRVBZbomoxMl-UEFjRIG1rDspwH6haqKG0W8VyAD4J0XCySZZH20aSWdApJGxrHOJ_KAi58P9dcZu7UvepWPNDLFrZPpJHcuMJEFeahlQadPRtUQ/Anzn--bPDpGjV2udlgrXZetodJ6RAZnWqAQaQ7vRYqc", fallbackBanderaUrl: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%2326A17B'/%3E%3Cpath fill='%23FFF' d='M35.8 27.6v-4.8h11V15H17.2v7.8h11v4.8c-8.9.4-15.6 2.1-15.6 4.2s6.7 3.8 15.6 4.2v15h7.6V36c8.9-.4 15.6-2.1 15.6-4.2s-6.7-3.8-15.6-4.2zm0 7.1v-.1c-.6 0-2.5.1-3.8.1-1.6 0-3.2-.1-3.8-.1v.1c-7.5-.3-13.1-1.6-13.1-3.1s5.6-2.8 13.1-3.1v4.9c.6 0 2.3.1 3.9.1 1.4 0 3.2-.1 3.7-.1v-4.9c7.5.3 13.1 1.6 13.1 3.1s-5.6 2.8-13.1 3.1z'/%3E%3C/svg%3E", totalRecibido: 97000, totalComprado: 97000, totalPendiente: 0, ingresoEnDivisa: 97000, egresoEnDivisa: 97000, saldo: 0, saldoEnCustodia: 0 },
  { id: "rec5f7Xzww3xl88nq", codigo: "BRL", divisa: "BRL", nombreDivisa: "Real Brasileño", pais: "Brasil (BRA)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/bk0FSfdXN_7YUr3SqEoLiw/qZKZRhzwiVCNuQ0bzcHlrE8n2XuA6nhIIvxd_Jr8ULB61pmtRUeYcCYxoW2AjxRITGQN9h7GcmqdEfiYlvJHAhpfcTHl0DAU7plJrphe7nYQqMfCI_vw5wG0YK0pX6OtVN-8KR4GDZMYArMV8_ih-Q/DLauIWVMs1U1Xv6VsRE2GbZu0DhnhM_4L9YPNlNuKYc", fallbackBanderaUrl: "https://flagcdn.com/w80/br.png", totalRecibido: 44544, totalComprado: 44544, totalPendiente: 0, ingresoEnDivisa: 44544, egresoEnDivisa: 44544, saldo: 0, saldoEnCustodia: 0 },
  { id: "rec7tYgRg0cJZunNW", codigo: "PEN", divisa: "PEN", nombreDivisa: "Sol Peruano", pais: "Perú (PER)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/2exJDnXPByffSOkCF3mpWg/B-fDAhmD3hntKlDyr1rRkDrofLBFJpyLcBibwJFU1KUaBmbQCqbbLYuBZ5GtLAidzf9WKME_0w-x5y-N4Fp_-BifAVlary7r3qLvtaw2q1RtLdGiTfEry7-4HFvEsCyqWyFKMerN5sRcAeGu09wWlg/x8W5kkosXpeSNHaw2Rv_1l9fqG7KIcA0Er_AZru4Hz4", fallbackBanderaUrl: "https://flagcdn.com/w80/pe.png", totalRecibido: 24000, totalComprado: 0, totalPendiente: 24000, ingresoEnDivisa: 24000, egresoEnDivisa: 0, saldo: 24000, saldoEnCustodia: 24000 },
  { id: "recdSG05fjNiX8bDs", codigo: "ARS", divisa: "ARS", nombreDivisa: "Peso Argentino", pais: "Argentina (ARG)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/gW85vZf6BmPsIcAnfUWhng/PfwLBoYKhneaLqxmznttXnJHWV8bP1WC2dHXZhrZX4cUkwGq5wFBbLmhB7tDU_EedG3eTumw4VpS13py0oXmayCjEFqsphj48-2OVd9lWgE2sDazjJqa8TrcBq3BU9ISGxHO367M3C7i6fFBeP36PA/VSF4Dv4eWAJRR8DWeQHbKayTe64St2fXLZSGor0WhD4", fallbackBanderaUrl: "https://flagcdn.com/w80/ar.png", totalRecibido: 20681790, totalComprado: 20681790, totalPendiente: 0, ingresoEnDivisa: 20681790, egresoEnDivisa: 20681790, saldo: 0, saldoEnCustodia: 0 },
  { id: "recjr5hVAnG5bObTV", codigo: "CLP", divisa: "CLP", nombreDivisa: "Peso Chileno", pais: "Chile (CHL)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/oB5I5OFMlPcJxrGFCQX19A/KzQwjqyLpUllIm5oYNb9DoKYjT1qwDzdVNuMpCzeTaAYNLVTd9WVqAJVN507Nwrzrmgott0MKkK8XNjPG9l_QHP4OcpotVK96Sv1Qs--2-bT1cgMpzib7rFsqCtXu6729SGYUpc6uPWACJyIeYnsgg/Vjqz0Jkuq2RxcHr2vzFJQlQIpxu5R9-LOEn5lZGip2o", fallbackBanderaUrl: "https://flagcdn.com/w80/cl.png", totalRecibido: 0, totalComprado: 0, totalPendiente: 0, ingresoEnDivisa: 0, egresoEnDivisa: 0, saldo: 0, saldoEnCustodia: 0 },
  { id: "recspIsJStEPlOGid", codigo: "MXN", divisa: "MXN", nombreDivisa: "Peso Mexicano", pais: "México (MEX)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/GLQfIJm-Y4w2R315qXw70A/3XXnWlXY_14bUyNTXT3XWyFMn85xLs_Josa7OWMTDgBSkJvydoLi4a0MJ7P_nBP4CTFHiz6i4xqYRoraYCk2c0cceBTjU0nfaWuLkzPyIUrwh0gWiPnMaNoL_Y4oYhpmqL8letzT2cuVdVMkdaWORg/jNbWBYydm4G_efJDp2qpG6GteEUgBZr393QuD4hSwUY", fallbackBanderaUrl: "https://flagcdn.com/w80/mx.png", totalRecibido: 2363500, totalComprado: 2363500, totalPendiente: 0, ingresoEnDivisa: 2363500, egresoEnDivisa: 2363500, saldo: 0, saldoEnCustodia: 0 },
  { id: "recepkOr8IFlifNdc", codigo: "UYU", divisa: "UYU", nombreDivisa: "Peso Uruguayo", pais: "Uruguay (URY)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/luKZaXj77PZbW7LRDVnNOA/cPi04nqW6ee9IIHYJ9nnQInopUfOO9FufvjrHV8ZMQLNURbQ2P3F4X2pCtCI16srG1vms0FjtSxEVVgGJ-OQsBymUZlewX-HmHKxvl1KSRf73KvyJ82oovwzuFmYzAs375REfPOYhvnhtkr4s4Ehjw/Ye1KrqgSmzDm2wuyk5yvyHwkbqG9LZkiOkf2AbsXUcc", fallbackBanderaUrl: "https://flagcdn.com/w80/uy.png", totalRecibido: 450000, totalComprado: 450000, totalPendiente: 0, ingresoEnDivisa: 450000, egresoEnDivisa: 450000, saldo: 0, saldoEnCustodia: 0 },
  { id: "recQ2kNgwFWmex2PB", codigo: "HNL", divisa: "HNL", nombreDivisa: "Lempira Hondureño", pais: "Honduras (HND)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/aYUSi1zpSmcwFYBHJylUqQ/0DT-WV-Gx_Uo65fnoZj4khucBek_dIw5siKgqJ2BEPbabV1SukWuGJlU6YSWfQJq6CTQzfZAotyitjGH99Kj0vPTP58eH-yBtGA9ANpPEl_YDJpJlGEVRXTOxE2kiUM9iNAUHrgjMveVhIqvFVEc6Q/fESk-3ALKl-MdnNBa4UhnuYKVH5wV2sbaFmjlWdcxxc", fallbackBanderaUrl: "https://flagcdn.com/w80/hn.png", totalRecibido: 325000, totalComprado: 0, totalPendiente: 325000, ingresoEnDivisa: 325000, egresoEnDivisa: 0, saldo: 325000, saldoEnCustodia: 325000 },
  { id: "recqs25uNy07U35kP", codigo: "COP", divisa: "COP", nombreDivisa: "Peso Colombiano", pais: "Colombia (COL)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/Xoy4OMNbr66nbQflYW5Cdg/O8mWAIixm0KO1kdUTHQEmzck0zQGRToFyzcYZdlXIdnV4J5TtGmzYvcH6V6JShyk13tAwgGfqFxL5A42fzDphd_rAz4jQEQn9Lm3PIPv8V9L0f42Lds248r_mXWRzaeWFC_UD3UXJCrSSfeEuxpFog/Jn5uHR5knBKWWF3hKV0eKaGqzktPQXcukPJ8-TUtu6w", fallbackBanderaUrl: "https://flagcdn.com/w80/co.png", totalRecibido: 0, totalComprado: 0, totalPendiente: 0, ingresoEnDivisa: 0, egresoEnDivisa: 0, saldo: 0, saldoEnCustodia: 0 },
  { id: "recYp1VcNnt28sXvM", codigo: "USD", divisa: "USD", nombreDivisa: "Dólar Estadounidense", pais: "Estados Unidos (USA)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/1FKGhvqfCzPkLIjMCUbo4w/6xifOwYWTPJEAMf2Uni5dZ88hZi1AO1Lyqum0wlxLhXeFqh46vkDXuObTMzQsKv5-IuYY70JQEahYXT6JjdBU2h-NW5cAB4WbuUrP1xUZ0sDIsvP7gM9SXl_5oP9WS8-_S8Xff71wRkurZ00UbnMJQ/z9AMQukLP9_1d1MbDH3AzDrX7_5co2X8kZyRABPnSos", fallbackBanderaUrl: "https://flagcdn.com/w80/us.png", totalRecibido: 0, totalComprado: 0, totalPendiente: 0, ingresoEnDivisa: 0, egresoEnDivisa: 0, saldo: 0, saldoEnCustodia: 0 },
  { id: "recRmGKl2978gcJC2", codigo: "VES", divisa: "VES", nombreDivisa: "Bolívar Venezolano", pais: "Venezuela (VEN)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/eCqRRnJW6X_0VFSbUqEw9A/PwwakpnRxXwN0HKD2nE7k8YwvUj1QJXHYLKCWMkIGUYUnSyEephCJyJoZlTr92wtD0Uu0KI--aWKfUF0V9v3Psr4wcQqt2WE9zrJ1R-cPVnTSpapNRrjrMQszB-7fQdrZYYDxwi0gfTHM-haB2zaFg/X5R4sdaDsEqnx-0aQZmMK98ZiwhATw_8PQDN3hHChKU", fallbackBanderaUrl: "https://flagcdn.com/w80/ve.png", totalRecibido: 0, totalComprado: 0, totalPendiente: 0, ingresoEnDivisa: 0, egresoEnDivisa: 0, saldo: 0, saldoEnCustodia: 0 },
  { id: "recDPXxhnRfDFeAlq", codigo: "USD-EC", divisa: "USD-EC", nombreDivisa: "Dólar Estadounidense (Ecuador)", pais: "Ecuador (ECU)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/_VthV3FLZ6lBouqvsdlQHw/ayvRjWQz1ECLps-w3n0c5_Vl7KRQwXCnH4jMOKvGfERPMms9tdq0zHAN1btfHU2FHVv7N-e-Li9EMa9GB8a5hq1DZssMzUJOVQyBnT70BCixume_1WxPMFr6WBWus_2eRxFMPSeQkGa5e3Yn8YV8_w/Gtk7Smjte7sVF1N1D_QtaDh56Y38IULOIVDX80gEw4g", fallbackBanderaUrl: "https://flagcdn.com/w80/ec.png", totalRecibido: 0, totalComprado: 0, totalPendiente: 0, ingresoEnDivisa: 0, egresoEnDivisa: 0, saldo: 0, saldoEnCustodia: 0 },
  { id: "recXQYhhIbCw0xqKt", codigo: "USD-PY", divisa: "USD-PY", nombreDivisa: "Dólar Estadounidense (Panamá)", pais: "Panamá (PAN)", banderaUrl: "https://v5.airtableusercontent.com/v3/u/59/59/1793844000000/iasijrZP2RMQIIsG463k4Q/zS0yvjQNyVkHF7gFZ4Ao0Z0uAIOl1DFlMJbV3x3qJUzFNAuEEOv3VpblC3LYuKt8nYYODxpoIuqIGf5nk8tDX5UuKrix8erCf6b-DVlXAsTdvfUZn0Nu485LUW5VuHGmaKX1TMk2N2E2vjMxvurQEw/8wvNSsNGj2a83pVq6JqHj4jHq3K0BHojDKCdbYO33fQ", fallbackBanderaUrl: "https://flagcdn.com/w80/pa.png", totalRecibido: 0, totalComprado: 0, totalPendiente: 0, ingresoEnDivisa: 0, egresoEnDivisa: 0, saldo: 0, saldoEnCustodia: 0 }
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
