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
  estado?: 'PENDIENTE' | 'PAGADO' | 'DEBE' | string;
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
  rateFinal?: number;
  liquidezEsperadaCop?: number;
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

export interface MovimientoEfectivo {
  id: string;
  codigo: string;
  tipo: 'INGRESO' | 'PAGO';
  montoCop: number;
  clienteId?: string;
  clienteCodigo?: string;
  clienteNombre?: string;
  origenFondosId?: string;
  origenFondosNombre?: string;
  referencia: string;
  balance?: string;
  createdTime?: string;
}

export const CLIENTES: Cliente[] = [
  {
    id: "recg4j8GuJAxEBQsF",
    codigo: "C0017-DR-N",
    idCliente: "C0017-DR-N",
    nombre: "DR N",
    ingresosCop: 841980951.5,
    pagadoCop: 508212628,
    pendienteCop: 333768323.5,
    pendientePorPagarCop: 333768323.5,
    saldoCop: 333768323.5,
    estado: "PENDIENTE",
    fechaCreacion: "2026-11-04",
    numero: 17
  },
  {
    id: "recP0sFXmzy0YzFvB",
    codigo: "C0024-JAIRO",
    idCliente: "C0024-JAIRO",
    nombre: "JAIRO",
    ingresosCop: 0,
    pagadoCop: 390000000,
    pendienteCop: 151000000,
    pendientePorPagarCop: 151000000,
    saldoCop: -390000000,
    estado: "PENDIENTE",
    fechaCreacion: "2026-11-05",
    numero: 24
  },
  {
    id: "recyTbYkyo0gStzQa",
    codigo: "C0025-CONVENIO",
    idCliente: "C0025-CONVENIO",
    nombre: "CONVENIO",
    ingresosCop: 380400000,
    pagadoCop: 380400000,
    pendienteCop: 0,
    pendientePorPagarCop: 0,
    saldoCop: 0,
    estado: "PAGADO",
    fechaCreacion: "2026-11-05",
    numero: 25
  },
  {
    id: "recWhO5uf0qnhsv8H",
    codigo: "C0026-ALONSO-GOMEZ",
    idCliente: "C0026-ALONSO-GOMEZ",
    nombre: "ALONSO GOMEZ",
    ingresosCop: 268000,
    pagadoCop: 30000000,
    pendienteCop: 37148000,
    pendientePorPagarCop: 37148000,
    saldoCop: -29732000,
    estado: "PENDIENTE",
    fechaCreacion: "2026-11-05",
    numero: 26
  },
  {
    id: "recOOFVUSF9AEXoYL",
    codigo: "C0027-DANIEL-RAMIREZ",
    idCliente: "C0027-DANIEL-RAMIREZ",
    nombre: "DANIEL RAMIREZ",
    ingresosCop: 10000000,
    pagadoCop: 10000000,
    pendienteCop: 0,
    pendientePorPagarCop: 0,
    saldoCop: 0,
    estado: "PAGADO",
    fechaCreacion: "2026-11-05",
    numero: 27
  },
  {
    id: "recRiIk7Psw3283aZ",
    codigo: "C0028-MARIO-CIFUENTES",
    idCliente: "C0028-MARIO-CIFUENTES",
    nombre: "MARIO CIFUENTES",
    ingresosCop: 0,
    pagadoCop: 0,
    pendienteCop: 4209904.7575,
    pendientePorPagarCop: 4209904.7575,
    saldoCop: 0,
    estado: "PENDIENTE",
    fechaCreacion: "2026-11-05",
    numero: 28
  },
  {
    id: "recynCn2hqakDb5cH",
    codigo: "C0029-MIGUEL-COLORADO",
    idCliente: "C0029-MIGUEL-COLORADO",
    nombre: "MIGUEL COLORADO",
    ingresosCop: 56000000,
    pagadoCop: 56000000,
    pendienteCop: 280000,
    pendientePorPagarCop: 280000,
    saldoCop: 0,
    estado: "PENDIENTE",
    fechaCreacion: "2026-11-05",
    numero: 29
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
    estado: "PAGADO",
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
    estado: "PAGADO",
    fechaCreacion: "2026-11-04",
    numero: 19
  }
];

export const DIVISAS: Divisa[] = [
  {
    "id": "rec5f7Xzww3xl88nq",
    "codigo": "BRL",
    "divisa": "BRL",
    "nombreDivisa": "Real Brasileño",
    "pais": "Brasil",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/WMUWqvR04cXI_4SHkqlnqQ/ICoQd6MzWJl2Pf_5O_7uEYBKKeaZlwwvcrWGIFXax_KjaY1gBZ0LBjhJcnYXxZxevHP5xvwkBT1Khceq7Y6gz-t0KyU4GuTMcKyOWZjjgK0Qv9hfO1SR6Z4NrEmNTIHtBtCwZjSa4s_juQ4ELVroA6UBu0IaCkcnN1ld_YXdkkJlpb8X5Z2f0lz6pyb_CNW5/v_BU8lkAeebfjShQSrAM-JC6l6zpbnBpaSUpT4bhhd4",
    "fallbackBanderaUrl": "https://flagcdn.com/w80/br.png",
    "totalRecibido": 44544,
    "totalComprado": 44544,
    "totalPendiente": 0,
    "ingresoEnDivisa": 44544,
    "egresoEnDivisa": 44544,
    "saldo": 0,
    "saldoEnCustodia": 0
  },
  {
    "id": "rec7tYgRg0cJZunNW",
    "codigo": "PEN",
    "divisa": "PEN",
    "nombreDivisa": "Sol Peruano",
    "pais": "Perú",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/DsoW7haL0iu1aQR38iZ-7g/ix-k_PfhEn1lW386j0iwc8oBDo4L1buavZmSVb5X7NbHExCUOTx1-yoMue-s7zAQ6NgA-58WzB-UtMWFhNhFQ_J3_bjiuAaFpdLwGIcZ5qI9tRLgsUZ5fXtyP_kywafxrR9tffOEKl0s7jpXBURsQBTLNdMbWPKfjcQbWerHirQ/J3LfKEnGFhKBGIxBVabHITyYToKD-9i5A3fiGvYgU8Q",
    "fallbackBanderaUrl": "https://flagcdn.com/w80/pe.png",
    "totalRecibido": 24000,
    "totalComprado": 0,
    "totalPendiente": 24000,
    "ingresoEnDivisa": 24000,
    "egresoEnDivisa": 0,
    "saldo": 24000,
    "saldoEnCustodia": 24000
  },
  {
    "id": "recDPXxhnRfDFeAlq",
    "codigo": "USD-EC",
    "divisa": "USD-EC",
    "nombreDivisa": "Dólar Estadounidense (Ecuador)",
    "pais": "Ecuador",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/q5pTy-vZxuWYI6Y2EWHXDg/wkxR3kSYFHRo73JKpdd-l5QiSDpUb9c3I3JQenlihA5II5eVeQcbbccPB_Rk-D7VeHtJjlzT8CX9GukfwgL7SsuI76LNSzQifzYd-tuB0zVv0DVYr6d3fzBQHIqCtJQ8-wLrVqqV5ROlVDtJNfN6TPpi1w-KFaV9cejdYi3nGBsfjlLnpcC64i6baA7AXCTJ/kr64_HqwWGy0Limtm13cm-CLHyddpeVC9MZ3BbuRyr4",
    "fallbackBanderaUrl": "https://flagcdn.com/w80/ec.png",
    "totalRecibido": 0,
    "totalComprado": 0,
    "totalPendiente": 0,
    "ingresoEnDivisa": 0,
    "egresoEnDivisa": 0,
    "saldo": 0,
    "saldoEnCustodia": 0
  },
  {
    "id": "recQ2kNgwFWmex2PB",
    "codigo": "HNL",
    "divisa": "HNL",
    "nombreDivisa": "Lempira Hondureño",
    "pais": "Honduras",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/JyW3CjE6v_D6VQf1jW3tgQ/GRtLg6nxWf-ESnjMUqprhd2lNI6qhjKAtO4EgYJljZaRRnxRPXSg9jWT1bqa6XWN40WbkRH5qHT2WDHpPkszpfWXQ2dwCiK03NHlyH3kXla7crOTt3BSFID_wQND6nYBf0u-poyKRYfeZvXk65s1w-luCQGNTyfmAys_Dt8P3FBavP4UqdoWZgtLZznyi81W/DB-yj8CJh34qSh0SqhFHSnZo_bmOIZMu7mqUzqRsCLE",
    "fallbackBanderaUrl": "https://flagcdn.com/w80/hn.png",
    "totalRecibido": 325000,
    "totalComprado": 0,
    "totalPendiente": 325000,
    "ingresoEnDivisa": 325000,
    "egresoEnDivisa": 0,
    "saldo": 325000,
    "saldoEnCustodia": 325000
  },
  {
    "id": "recRmGKl2978gcJC2",
    "codigo": "VES",
    "divisa": "VES",
    "nombreDivisa": "Bolívar Venezolano",
    "pais": "Venezuela",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/zrNXgFOuNOwVy_DK82H1Hw/ffMMlmo7z_q5tpo8fIOyycoreeBj0J9aQZaWCWqGF0lwch0sjznkDWBylH856NehuT7BEcLqqiEAzxsIOgGawXkOQvsZtCWMeY5SGBmdNw7hE3zuyBdbL2S_4pWgJvWBptc2Vr0DRjt-Z2Ik96vl2UGLZ3UdLyygEmaX75GtyGGsswu3VoXu1lk6tjF09CUc/szGG4gAEEdHM9Ts1UKsY7cMG8ceeq2HuECeEBHIHaao",
    "fallbackBanderaUrl": "https://flagcdn.com/w80/ve.png",
    "totalRecibido": 0,
    "totalComprado": 0,
    "totalPendiente": 0,
    "ingresoEnDivisa": 0,
    "egresoEnDivisa": 0,
    "saldo": 0,
    "saldoEnCustodia": 0
  },
  {
    "id": "recX2WcOyLsk8YcJN",
    "codigo": "USDT",
    "divisa": "USDT",
    "nombreDivisa": "Tether USDT",
    "pais": "Cripto / Global",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/CsAnEs1yvnofL2SFQR2hJw/eN_JTSnAek2wxw5pnxivjLcvtuUKcNXCure1TacZ6ou6RwLqStuXZ9CzIU0nfCeScT8-Vi1MDgIhCb9zisCs9ttyM-cwAf0y2A3cKuJR7ff-rE13Vw1gPw55PiE0FYSz6n1ixajAR1oRwZFtTt9BOD1pw2V5MypFI_nXcmyVxc0/ObtuaB9siPgfl8MhU_OmRcaLkYuGPZnqCWJvENBEjFE",
    "fallbackBanderaUrl": "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%2326A17B'/%3E%3Cpath fill='%23FFF' d='M35.8 27.6v-4.8h11V15H17.2v7.8h11v4.8c-8.9.4-15.6 2.1-15.6 4.2s6.7 3.8 15.6 4.2v15h7.6V36c8.9-.4 15.6-2.1 15.6-4.2s-6.7-3.8-15.6-4.2zm0 7.1v-.1c-.6 0-2.5.1-3.8.1-1.6 0-3.2-.1-3.8-.1v.1c-7.5-.3-13.1-1.6-13.1-3.1s5.6-2.8 13.1-3.1v4.9c.6 0 2.3.1 3.9.1 1.4 0 3.2-.1 3.7-.1v-4.9c7.5.3 13.1 1.6 13.1 3.1s-5.6 2.8-13.1 3.1z'/%3E%3C/svg%3E",
    "totalRecibido": 97000,
    "totalComprado": 97000,
    "totalPendiente": 0,
    "ingresoEnDivisa": 97000,
    "egresoEnDivisa": 97000,
    "saldo": 0,
    "saldoEnCustodia": 0
  },
  {
    "id": "recXQYhhIbCw0xqKt",
    "codigo": "USD-PY",
    "divisa": "USD-PY",
    "nombreDivisa": "Dólar Estadounidense (Panamá)",
    "pais": "Panamá",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/FN_0deYgIMAgc3Qipxbl1w/t8ORbE68_aFp3c4uD2Y1GGC3vGQTkd5P46D_Fc9ZLzYnqX6UGpJEK3yOwlebyEggHEI0Os07o5TuPtkMeujCQBkAg2zloCDYdQpId-hKe-E3rQEgsLUyD07cJ7HKvmRomjw-cyIkbqufb-NJBUoMpayDnOQntebvY0r_7sOhBbqgzwREskMKD-sFapOhzs5n/bSzxoKE0CcDKf7F9ToauHwwuAza2qSee7a-GW7DEYW0",
    "fallbackBanderaUrl": "https://flagcdn.com/w80/pa.png",
    "totalRecibido": 0,
    "totalComprado": 0,
    "totalPendiente": 0,
    "ingresoEnDivisa": 0,
    "egresoEnDivisa": 0,
    "saldo": 0,
    "saldoEnCustodia": 0
  },
  {
    "id": "recYp1VcNnt28sXvM",
    "codigo": "USD",
    "divisa": "USD",
    "nombreDivisa": "Dólar Estadounidense",
    "pais": "Estados Unidos (USA)",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/-E1Xe9QdVtd3AfnW5xoKzw/1QxLvaPuc2UZaEnwfbAd7wmLJuy3Y8Hjqpvz6o5nPiCnlGp-loRYbThg-p5Ihlxk2iwsUSKGdQwFITRW3404DoQ9TInfyuE9BFW2D7rijHuaGoyjELVASLSxlYAe1MDiperYXBq4sKIVC6KoiYLjN3T7p_WMOID7RQG8MraIC_4woSsJQ5cbEu1TWcDyvVkF/nkwJxQovRqemNu9uwop-Ngl41t2etM-UKHj9VlO1PNM",
    "fallbackBanderaUrl": "https://flagcdn.com/w80/us.png",
    "totalRecibido": 0,
    "totalComprado": 0,
    "totalPendiente": 0,
    "ingresoEnDivisa": 0,
    "egresoEnDivisa": 0,
    "saldo": 0,
    "saldoEnCustodia": 0
  },
  {
    "id": "recdSG05fjNiX8bDs",
    "codigo": "ARS",
    "divisa": "ARS",
    "nombreDivisa": "Peso Argentino",
    "pais": "Argentina (ARG)",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/iOp-gXjkyZ0_VA9bADCG4A/-V-FoLtT5XgopDzea4ClIZNKTSNRIOSYbjHsXyNI6aQCKmdrAKqSjYq71LQQDbaFg0R7PCZhmeFwtkRtWGf8PUCG79J310XXZvgge-AXK3pgGJj2v1xF2HwYR6BoXAAMx1RZDFBlm_mi73GEn7_WipwdxkV7CQeosmi52euyYqn7AZsmuZkukXZZkAyasqYc/QkfQ_DMvB1mdIcQaCkTKshOqV61eVKAPPJFA819kTs0",
    "fallbackBanderaUrl": "https://flagcdn.com/w80/ar.png",
    "totalRecibido": 20681790,
    "totalComprado": 20681790,
    "totalPendiente": 0,
    "ingresoEnDivisa": 20681790,
    "egresoEnDivisa": 20681790,
    "saldo": 0,
    "saldoEnCustodia": 0
  },
  {
    "id": "recepkOr8IFlifNdc",
    "codigo": "UYU",
    "divisa": "UYU",
    "nombreDivisa": "Peso Uruguayo",
    "pais": "Uruguay (URY)",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/L71ca0EWAlgMikh6m2KiQg/GEh3FjMPdQeUtxcov9qjfsXfrCsjB8vewrZLkU0LhO2szXhyzUfUBmeiBBiUSJlaM5bbLBBgFkY8qAq9vgq9zoY2XAm1UNZyxzfb7Gd_ByoB_oYdZEYJ5rQ8p7pEL4n9rXNw_h8aU-e8xSFoyox8GvFfZRfF7ebvQkP_PGuwEgDZzjXKSS9m-yjfxuI-W7OF/H_JcMfJ9XQaNTU3lhDAqpc-5mIJxTFnT3XNreiodKOo",
    "fallbackBanderaUrl": "https://flagcdn.com/w80/uy.png",
    "totalRecibido": 450000,
    "totalComprado": 450000,
    "totalPendiente": 0,
    "ingresoEnDivisa": 450000,
    "egresoEnDivisa": 450000,
    "saldo": 0,
    "saldoEnCustodia": 0
  },
  {
    "id": "recjr5hVAnG5bObTV",
    "codigo": "CLP",
    "divisa": "CLP",
    "nombreDivisa": "Peso Chileno",
    "pais": "Chile (CHL)",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/T78Zp-SQ2288QtffnjonBw/ZzmFdzycXokClGefE9Ane8BgyUS5NEr_sWiz2cH-dthfzxkGnXZbgmOOCI8CGEj98AdkEjOtaKD0qf8sfZ1NZUS-Jh0pBksDOUoXf7qc6PXTWULMadTTtptW6ZZvZZU4E-w0AcZLnlV3IXgZCDinSuc_kt8MzsemvNVbNUOTqCxzf83rtbRVQREfNPLVensy/bCoYUh249P_n2EUZXEV2bsa77eE8Qu4lj8QLzJXBZtw",
    "fallbackBanderaUrl": "https://flagcdn.com/w80/cl.png",
    "totalRecibido": 0,
    "totalComprado": 0,
    "totalPendiente": 0,
    "ingresoEnDivisa": 0,
    "egresoEnDivisa": 0,
    "saldo": 0,
    "saldoEnCustodia": 0
  },
  {
    "id": "recqs25uNy07U35kP",
    "codigo": "COP",
    "divisa": "COP",
    "nombreDivisa": "Peso Colombiano",
    "pais": "Colombia (COL)",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/sErw84yRlv_HJx6_l5-tjw/pg4sFdL8xfsuQUSXY_yW9U648PfYhz7kBYvtQQaiJh8VLooWlqYqg41L1cwSikkkQ5czu6JHBfA33bnfETTfX45XY4o0OuDEdpw8Kt6RgkkS5HlPVZzWvlI_srDLI_emSNqqDPNcPfhYAQdynveuu-OYF6fPp0gpm7BxatGNldR0wlwaIljM5Zrji0Yjlsz3/EDomuF1zfu63scBRQUxRxoX-bV4tj12mno2w90vL3fk",
    "fallbackBanderaUrl": "https://flagcdn.com/w80/co.png",
    "totalRecibido": 0,
    "totalComprado": 0,
    "totalPendiente": 0,
    "ingresoEnDivisa": 0,
    "egresoEnDivisa": 0,
    "saldo": 0,
    "saldoEnCustodia": 0
  },
  {
    "id": "recspIsJStEPlOGid",
    "codigo": "MXN",
    "divisa": "MXN",
    "nombreDivisa": "Peso Mexicano",
    "pais": "México (MEX)",
    "banderaUrl": "https://v5.airtableusercontent.com/v3/u/59/59/1793851200000/Pi1CY7sm8YhvG1hoCHbbuQ/QZEqLCfINim7zI4awJAEnoYhV7pLWuwZ56v07_7nmEbuO3sDjpq4oHOSw5RE7tbE9Lg44-N9uTywb0hQa_I9BuXeNwKTUbl51eLFOlPSNknCfXR0NCgDus2eNRxLsHT96N1E1MN8nkhycLlyFmVu4ep6XuPueAQcTRglZuFZOgPKy01VZ19uQ_tYdkRe-P2D/WtHH01gUIAIsdBii_xLEesRSeeJEyjknC_KorJyG-fg",
    "fallbackBanderaUrl": "https://flagcdn.com/w80/mx.png",
    "totalRecibido": 2363500,
    "totalComprado": 2363500,
    "totalPendiente": 0,
    "ingresoEnDivisa": 2363500,
    "egresoEnDivisa": 2363500,
    "saldo": 0,
    "saldoEnCustodia": 0
  }
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
  },
  {
    id: "recohjfAcs5mzpldm",
    nombre: "COP-05-11-26-0008",
    idTransaccion: "COP-05-11-26-0008",
    fecha: "2026-11-05",
    concepto: "FRANZ",
    walletOrigen: "CUY WALLET",
    usdtVendido: 32107,
    cantidadUsdt: 32107,
    tasa: 3190,
    tasaVentaCop: 3190,
    impuestos: 0,
    destinoFondosNombre: "Efectivo-Dosquebradas",
    cuentaDestinoNombre: "Efectivo-Dosquebradas",
    totalCop: 102421330,
    montoNetoRecibidoCop: 102421330
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
    saldoDisponible: 151000000,
    saldoTotal: 151000000,
    ingresosCop: 224000000,
    egresosCop: 73000000,
    saldoCop: 151000000,
    movimientos: [
      { fecha: "2026-11-04", origen: "D0012", concepto: "EGRESO / DISPERSIÓN D0012 — DR N", monto: -73000000, balance: 151000000 },
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
    saldoDisponible: 21742323,
    saldoTotal: 21742323,
    ingresosCop: 96000000,
    egresosCop: 74257677,
    saldoCop: 21742323,
    movimientos: [
      { fecha: "2026-11-04", origen: "D0011", concepto: "EGRESO / DISPERSIÓN D0011 — DR N", monto: -74257677, balance: 21742323 },
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
    saldoDisponible: 22330,
    saldoTotal: 22330,
    ingresosCop: 411851330,
    egresosCop: 411829000,
    saldoCop: 22330,
    movimientos: [
      { fecha: "2026-11-04", origen: "D0013", concepto: "EGRESO / DISPERSIÓN D0013 — DR N", monto: -411829000, balance: 22330 },
      { fecha: "2026-11-04", origen: "COP-04-11-26-0006", concepto: "ABONO MONETIZACIÓN USDT (97,000.00 USDT @ $3,190.00)", monto: 309430000, balance: 309430000 }
    ]
  }
];

export const EFECTIVO_MOVIMIENTOS: MovimientoEfectivo[] = [
  {
    id: "recxhRrNTECEWOy1d",
    codigo: "EF-01",
    tipo: "INGRESO",
    montoCop: 541000000,
    origenFondosId: "recdOSGJZMR2xqUFq",
    origenFondosNombre: "EFECTIVO-Dosquebradas",
    referencia: "HERMAN",
  },
  {
    id: "recmPpuGUIFIPlWTL",
    codigo: "EF-02",
    tipo: "PAGO",
    montoCop: 380400000,
    clienteId: "recyTbYkyo0gStzQa",
    clienteCodigo: "C-0017",
    clienteNombre: "DR-N",
    origenFondosId: "recdOSGJZMR2xqUFq",
    origenFondosNombre: "EFECTIVO-Dosquebradas",
    referencia: "PAGO USDT",
  },
  {
    id: "recmEpHV5LJtSIMmI",
    codigo: "EF-03",
    tipo: "PAGO",
    montoCop: 300000000,
    clienteId: "recg4j8GuJAxEBQsF",
    clienteCodigo: "C-0019",
    clienteNombre: "CLIENTE PRUEBA VERIFICADO",
    origenFondosId: "recdOSGJZMR2xqUFq",
    origenFondosNombre: "EFECTIVO-Dosquebradas",
    referencia: "ALEJANDRO",
  },
  {
    id: "rec2Vq1pIzi54DrhO",
    codigo: "EF-04",
    tipo: "PAGO",
    montoCop: 25000000,
    clienteId: "recg4j8GuJAxEBQsF",
    clienteCodigo: "C-0019",
    clienteNombre: "CLIENTE PRUEBA VERIFICADO",
    origenFondosId: "recdOSGJZMR2xqUFq",
    origenFondosNombre: "EFECTIVO-Dosquebradas",
    referencia: "ALEJANDRO",
  },
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
    egresosUsdt: 132107,
    saldoUsdt: 0,
    saldoReal: 0,
    rateFinal: 3200,
    liquidezEsperadaCop: 0,
    movimientos: [
      { fecha: "2026-11-05", origen: "COP-05-11-26-0008", concepto: "VENTA USDT → Efectivo-Dosquebradas", monto: -32107, balance: 0 },
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
    ingresoUsdt: 29743,
    ingresosUsdt: 29743,
    egresosUsdt: 0,
    saldoUsdt: 29743,
    saldoReal: 29743,
    rateFinal: 3200,
    liquidezEsperadaCop: 95177600,
    movimientos: [
      { fecha: "2026-11-04", origen: "N0023-USDT", concepto: "RECEPCIÓN DIRECTA USDT — N0023-USDT (DR N)", monto: 29743, balance: 29743 }
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
    ingresoUsdt: 108304,
    ingresosUsdt: 108304,
    egresosUsdt: 97000,
    saldoUsdt: 11304,
    saldoReal: 11304,
    rateFinal: 3200,
    liquidezEsperadaCop: 36172800,
    movimientos: [
      { fecha: "2026-11-04", origen: "COP-04-11-26-0006", concepto: "VENTA USDT → Efectivo-Dosquebradas", monto: -97000, balance: 11304 }
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
    codigo: "UOP008-FRANZ-COL",
    nombre: "FRANZ RUEDA",
    email: "franzruedab@gmail.com",
    pais: "COL",
    rol: "OPERADOR",
    status: "ACTIVO",
    authorized_currencies: ["MXN"],
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
  'USD': 'USD',
  'USD-EC': 'USD-EC',
  'USD-PY': 'USD-PY',
  'USDT': 'USDT',
  'COP': 'COP',
  'BRL': 'BRL',
  'PEN': 'PEN',
  'CLP': 'CLP',
  'ARS': 'ARS',
  'HNL': 'HNL',
  'VES': 'VES',
  'MXN': 'MXN',
  'UYU': 'UYU',
  'EUR': 'EUR'
};

export function getCurrencyFlag(code: string): string {
  if (!code) return '';
  return code.trim().toUpperCase();
}

export function formatCurrencyWithFlag(code: string): string {
  if (!code) return '';
  return code.trim().toUpperCase();
}

export function getMetricasContables() {
  const totalIngresosCop = NEGOCIOS.reduce((acc, n) => acc + (n.ingresoCop || 0), 0);
  const totalPagadoCop = PAGOS.filter(p => p.estado === 'COMPLETADO').reduce((acc, p) => acc + (p.montoCop || 0), 0);
  const saldoPendienteNeto = totalIngresosCop - totalPagadoCop;
  const totalUsdtComprado = COMPRAS_USDT.reduce((acc, c) => acc + (c.usdtComprado || 0), 0);
  const totalUsdtVendido = VENTAS_USDT.reduce((acc, v) => acc + (v.usdtVendido || 0), 0);
  
  // Dashboard Simplified Metrics
  const totalActivosDigitalesUsdt = ACTIVOS_DIGITALES.reduce((acc, d) => acc + (d.saldoUsdt || 0), 0);
  const totalUsdtEnCustodia = totalActivosDigitalesUsdt;
  const totalActivosLiquidosCop = ACTIVOS_LIQUIDOS.reduce((acc, a) => acc + (a.saldoCop || 0), 0);
  const totalSaldoPendienteClientesCop = CLIENTES.reduce((acc, c) => acc + (c.pendienteCop > 0 ? c.pendienteCop : 0), 0);
  const totalFaltaLiquidarClientes = totalSaldoPendienteClientesCop;
  
  // Liquidación Section Exact Formula
  const totalNegocioCop = totalIngresosCop;
  const totalVentasUsdtCop = VENTAS_USDT.reduce((acc, v) => acc + (v.totalCop || 0), 0);
  const totalLiquidezEsperadaCop = ACTIVOS_DIGITALES.reduce((acc, a) => acc + (a.liquidezEsperadaCop ?? ((a.rateFinal ?? 3200) * (a.saldoUsdt || 0))), 0);
  const gananciaEsperadaCop = (totalVentasUsdtCop + totalLiquidezEsperadaCop) - totalNegocioCop;
  const gananciaEstimadaCop = gananciaEsperadaCop;

  return {
    totalIngresosCop,
    totalPagadoCop,
    saldoPendienteNeto,
    totalUsdtComprado,
    totalUsdtVendido,
    totalUsdtEnCustodia,
    totalActivosDigitalesUsdt,
    totalActivosLiquidosCop,
    totalSaldoPendienteClientesCop,
    totalFaltaLiquidarClientes,
    totalNegocioCop,
    totalVentasUsdtCop,
    totalLiquidezEsperadaCop,
    gananciaEsperadaCop,
    gananciaEstimadaCop,
    numClientes: CLIENTES.length,
    numNegocios: NEGOCIOS.length,
    numPagosCompletados: PAGOS.filter(p => p.estado === 'COMPLETADO').length,
    numComprasUsdt: COMPRAS_USDT.length,
    numVentasUsdt: VENTAS_USDT.length,
    numActivosLiquidos: ACTIVOS_LIQUIDOS.length,
    totalIngresosEfectivoCop: EFECTIVO_MOVIMIENTOS.filter(m => m.tipo === 'INGRESO').reduce((acc, m) => acc + (m.montoCop || 0), 0),
    totalPagosEfectivoCop: EFECTIVO_MOVIMIENTOS.filter(m => m.tipo === 'PAGO').reduce((acc, m) => acc + (m.montoCop || 0), 0),
    saldoEfectivoCop: ACTIVOS_LIQUIDOS.find(a => a.activo.toLowerCase().includes('efectivo'))?.saldoCop || 279351330,
    numMovimientosEfectivo: EFECTIVO_MOVIMIENTOS.length,
  };
}
