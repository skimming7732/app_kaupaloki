import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-airtable-pat",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BASE_ID = "appncUKgTkDojFj4B";
const TABLES = {
  CLIENTES: "tblfEL6ENM3N5g89d",
  NEGOCIOS: "tblMqIzySkzFJfdWr",
  DISPERSIONES: "tblsPLYPv8jJkmsoU",
  DIVISAS: "tblcyNcDIwEt424Vc",
  COMPRAS_USDT: "tblrqy0dguFLRqjV2",
  VENTAS_USDT: "tblrK8eQPCKuCymo4",
  ACTIVOS_LIQUIDOS: "tblzXaxH5FN1wswWq",
  ACTIVOS_DIGITALES: "tblHWI0ANH7RNYaQD",
  USUARIOS: "tbljfI9AsgpOsfzPb",
};

const DIVISA_CODE_TO_ID: Record<string, string> = {
  "BRL": "rec5f7Xzww3xl88nq",
  "PEN": "rec7tYgRg0cJZunNW",
  "USD-EC": "recDPXxhnRfDFeAlq",
  "HNL": "recQ2kNgwFWmex2PB",
  "VES": "recRmGKl2978gcJC2",
  "USDT": "recX2WcOyLsk8YcJN",
  "USD-PY": "recXQYhhIbCw0xqKt",
  "USD": "recYp1VcNnt28sXvM",
  "ARS": "recdSG05fjNiX8bDs",
  "UYU": "recepkOr8IFlifNdc",
  "CLP": "recjr5hVAnG5bObTV",
  "COP": "recqs25uNy07U35kP",
  "MXN": "recspIsJStEPlOGid",
};

const DIVISA_ID_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(DIVISA_CODE_TO_ID).map(([k, v]) => [v, k])
);

function mapCodesToAirtableDivisaIds(codes: string[]): string[] {
  const ids: string[] = [];
  for (const c of codes || []) {
    const clean = String(c || "").trim().toUpperCase();
    if (DIVISA_CODE_TO_ID[clean]) {
      ids.push(DIVISA_CODE_TO_ID[clean]);
    } else if (clean.startsWith("REC")) {
      ids.push(String(c).trim());
    }
  }
  return Array.from(new Set(ids));
}

function mapAirtableDivisaIdsToCodes(rawIds: any[], divisasById?: Map<string, any>): string[] {
  if (!Array.isArray(rawIds)) return [];
  const codes: string[] = [];
  for (const item of rawIds) {
    const str = String(item || "").trim();
    if (!str) continue;
    const fromMap = DIVISA_ID_TO_CODE[str];
    if (fromMap) {
      codes.push(fromMap);
    } else if (divisasById && divisasById.has(str)) {
      const rec = divisasById.get(str);
      const code = String(rec?.fields?.["DIVISA"] || rec?.fields?.["MONEDA"] || "").trim();
      if (code) codes.push(code);
    } else if (!str.startsWith("rec")) {
      codes.push(str.toUpperCase());
    }
  }
  return Array.from(new Set(codes));
}

async function fetchAirtableTable(tableId: string, pat: string): Promise<any[]> {
  const records: any[] = [];
  let offset = "";
  do {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}${offset ? `?offset=${encodeURIComponent(offset)}` : ""}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${pat}` },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Airtable error (${tableId}): ${res.status} ${txt}`);
    }
    const data = await res.json();
    if (Array.isArray(data.records)) {
      records.push(...data.records);
    }
    offset = data.offset || "";
  } while (offset);
  return records;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch (_) {}
    }

    const urlObj = new URL(req.url);
    let pat =
      body.pat ||
      req.headers.get("x-airtable-pat") ||
      urlObj.searchParams.get("pat");

    if (!pat) {
      const { data: dbSecret } = await supabase
        .from("airtable_sync_state")
        .select("airtable_pat")
        .eq("id", "main")
        .single();
      if (dbSecret?.airtable_pat) {
        pat = dbSecret.airtable_pat;
      }
    }

    if (!pat) {
      pat = Deno.env.get("AIRTABLE_PAT");
    }

    if (body.action === "save_pat" && body.pat) {
      await supabase.from("airtable_sync_state").upsert({
        id: "main",
        base_id: BASE_ID,
        airtable_pat: body.pat,
        updated_at: new Date().toISOString(),
      });
      pat = body.pat;
    }

    // 0A. ACTION: prepare_invited_user
    if (body.action === "prepare_invited_user" && body.email) {
      const cleanEmail = String(body.email).trim().toLowerCase();
      const fullName = String(body.fullName || cleanEmail.split("@")[0]).trim();
      const role = String(body.role || "operador").toLowerCase();
      const pais = String(body.pais || "COL").replace(/[^A-Za-z]/g, "").toUpperCase() || "COL";
      const authorizedCurrencies = Array.isArray(body.authorizedCurrencies) && body.authorizedCurrencies.length > 0
        ? body.authorizedCurrencies.map((c: any) => String(c).trim().toUpperCase())
        : Object.keys(DIVISA_CODE_TO_ID);

      let userId: string = crypto.randomUUID();
      try {
        const { data: usersList } = await supabase.auth.admin.listUsers();
        const existingAuthUser = usersList?.users?.find(
          (u: any) => (u.email || "").toLowerCase() === cleanEmail
        );
        if (existingAuthUser?.id) {
          userId = existingAuthUser.id;
          await supabase.auth.admin.updateUserById(userId, {
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              role,
              pais,
              authorized_currencies: authorizedCurrencies,
              onboarding_completed: false,
            },
          });
        } else {
          const { data: createdAuth } = await supabase.auth.admin.createUser({
            email: cleanEmail,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              role,
              pais,
              authorized_currencies: authorizedCurrencies,
              onboarding_completed: false,
            },
          });
          if (createdAuth?.user?.id) {
            userId = createdAuth.user.id;
          }
        }
      } catch (_) {}

      let airtableRecordId = "";
      let operatorCode = "";

      if (pat) {
        try {
          const divisaRelIds = mapCodesToAirtableDivisaIds(authorizedCurrencies);
          const airtableRole = cleanEmail === "desarrollor@jeroallsolutions.com"
            ? "SUPER ADMIN"
            : role === "administrador"
            ? "ADMINISTRADOR"
            : (role === "client" || role === "cliente")
            ? "CLIENTE"
            : "OPERADOR";

          const sUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLES.USUARIOS}?filterByFormula=LOWER({EMAIL})='${encodeURIComponent(cleanEmail)}'`;
          const sRes = await fetch(sUrl, { headers: { Authorization: `Bearer ${pat}` } });
          if (sRes.ok) {
            const sJson = await sRes.json();
            if (sJson.records?.[0]?.id) {
              airtableRecordId = sJson.records[0].id;
            }
          }

          if (airtableRecordId) {
            const patchRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLES.USUARIOS}/${airtableRecordId}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${pat}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                typecast: true,
                fields: {
                  NOMBRE: fullName.toUpperCase(),
                  PAIS: pais,
                  ESTADO: "ACTIVO",
                  ROL: airtableRole,
                  "DIVISAS RELACIONADAS": divisaRelIds,
                },
              }),
            });
            if (patchRes.ok) {
              const patched = await patchRes.json();
              operatorCode = patched.fields?.["ADMINISTRADOR"] || "";
            }
          } else {
            const createRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLES.USUARIOS}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${pat}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                typecast: true,
                fields: {
                  EMAIL: cleanEmail,
                  NOMBRE: fullName.toUpperCase(),
                  PAIS: pais,
                  ESTADO: "ACTIVO",
                  ROL: airtableRole,
                  "DIVISAS RELACIONADAS": divisaRelIds,
                },
              }),
            });
            if (createRes.ok) {
              const created = await createRes.json();
              airtableRecordId = created.id;
              operatorCode = created.fields?.["ADMINISTRADOR"] || "";
            }
          }
        } catch (atErr) {
          console.warn("Airtable prepare user warning:", atErr);
        }
      }

      await supabase.from("profiles").upsert({
        id: userId,
        email: cleanEmail,
        full_name: fullName,
        role: role,
        pais: pais,
        authorized_currencies: authorizedCurrencies,
        updated_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          ok: true,
          userId,
          airtableRecordId,
          operatorCode,
          email: cleanEmail,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 0B. ACTION: update_user_permissions
    if (body.action === "update_user_permissions" && body.email) {
      const cleanEmail = String(body.email).trim().toLowerCase();
      const role = String(body.role || "operador").toLowerCase();
      const pais = String(body.pais || "COL").replace(/[^A-Za-z]/g, "").toUpperCase() || "COL";
      const authorizedCurrencies = (role === "administrador" || role === "client" || role === "cliente" || cleanEmail === "desarrollor@jeroallsolutions.com")
        ? Object.keys(DIVISA_CODE_TO_ID)
        : Array.isArray(body.authorizedCurrencies)
        ? body.authorizedCurrencies.map((c: any) => String(c).trim().toUpperCase())
        : [];

      let airtableUpdated = false;
      let recordId = body.airtableId || "";

      if (pat) {
        try {
          const divisaRelIds = mapCodesToAirtableDivisaIds(authorizedCurrencies);
          const airtableRole = cleanEmail === "desarrollor@jeroallsolutions.com"
            ? "SUPER ADMIN"
            : role === "administrador"
            ? "ADMINISTRADOR"
            : (role === "client" || role === "cliente")
            ? "CLIENTE"
            : "OPERADOR";

          if (!recordId) {
            const sUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLES.USUARIOS}?filterByFormula=LOWER({EMAIL})='${encodeURIComponent(cleanEmail)}'`;
            const sRes = await fetch(sUrl, { headers: { Authorization: `Bearer ${pat}` } });
            if (sRes.ok) {
              const sJson = await sRes.json();
              if (sJson.records?.[0]?.id) {
                recordId = sJson.records[0].id;
              }
            }
          }

          if (recordId) {
            const patchBody: any = {
              typecast: true,
              fields: {
                ROL: airtableRole,
                PAIS: pais,
                ESTADO: "ACTIVO",
                "DIVISAS RELACIONADAS": divisaRelIds,
              },
            };
            if (body.nombre) {
              patchBody.fields.NOMBRE = String(body.nombre).trim().toUpperCase();
            }

            const patchRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLES.USUARIOS}/${recordId}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${pat}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(patchBody),
            });
            airtableUpdated = patchRes.ok;
          } else {
            const createRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLES.USUARIOS}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${pat}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                typecast: true,
                fields: {
                  EMAIL: cleanEmail,
                  NOMBRE: String(body.nombre || cleanEmail.split("@")[0]).toUpperCase(),
                  PAIS: pais,
                  ESTADO: "ACTIVO",
                  ROL: airtableRole,
                  "DIVISAS RELACIONADAS": divisaRelIds,
                },
              }),
            });
            airtableUpdated = createRes.ok;
          }
        } catch (atErr) {
          console.warn("Airtable update permissions error:", atErr);
        }
      }

      try {
        const { data: usersList } = await supabase.auth.admin.listUsers();
        const found = usersList?.users?.find(
          (u: any) => (u.email || "").toLowerCase() === cleanEmail
        );
        if (found?.id) {
          const updatePayload: any = {
            role,
            pais,
            authorized_currencies: authorizedCurrencies,
          };
          if (body.nombre) updatePayload.full_name = String(body.nombre).trim();

          await supabase.auth.admin.updateUserById(found.id, {
            user_metadata: {
              ...(found.user_metadata || {}),
              ...updatePayload,
            },
          });

          await supabase.from("profiles").upsert({
            id: found.id,
            email: cleanEmail,
            role,
            pais,
            full_name: body.nombre || found.user_metadata?.full_name || cleanEmail.split("@")[0],
            authorized_currencies: authorizedCurrencies,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (sbErr) {
        console.warn("Supabase auth update error:", sbErr);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          email: cleanEmail,
          role,
          pais,
          authorizedCurrencies,
          airtableUpdated,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 0C. ACTION: create_negocio_direct
    if (body.action === "create_negocio_direct" && body.record) {
      if (!pat) {
        return new Response(JSON.stringify({ ok: false, error: "Falta token de Airtable (PAT)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rec = body.record;
      const atUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLES.NEGOCIOS}`;
      const atRes = await fetch(atUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          typecast: true,
          fields: rec.fields,
        }),
      });
      if (!atRes.ok) {
        const errText = await atRes.text();
        return new Response(JSON.stringify({ ok: false, error: `Error Airtable al crear negocio: ${errText}` }), {
          status: atRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const created = await atRes.json();
      return new Response(JSON.stringify({ ok: true, created }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 0D. ACTION: create_cliente_direct
    if (body.action === "create_cliente_direct" && body.record) {
      if (!pat) {
        return new Response(JSON.stringify({ ok: false, error: "Falta token de Airtable (PAT)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rec = body.record;
      const atUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLES.CLIENTES}`;
      const atRes = await fetch(atUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          typecast: true,
          fields: rec.fields,
        }),
      });
      if (!atRes.ok) {
        const errText = await atRes.text();
        return new Response(JSON.stringify({ ok: false, error: `Error Airtable al crear cliente: ${errText}` }), {
          status: atRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const created = await atRes.json();
      return new Response(JSON.stringify({ ok: true, created }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default snapshot sync
    if (!pat) {
      const { data: cached } = await supabase
        .from("airtable_sync_state")
        .select("snapshot, updated_at")
        .eq("id", "main")
        .single();
      if (cached?.snapshot) {
        return new Response(
          JSON.stringify({
            ok: true,
            source: "cache",
            updated_at: cached.updated_at,
            snapshot: cached.snapshot,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No hay Personal Access Token de Airtable configurado",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all tables in parallel
    const [
      rawClientes,
      rawNegocios,
      rawDispersiones,
      rawDivisas,
      rawComprasUsdt,
      rawVentasUsdt,
      rawActivosLiq,
      rawActivosDig,
      rawUsuarios,
    ] = await Promise.all([
      fetchAirtableTable(TABLES.CLIENTES, pat),
      fetchAirtableTable(TABLES.NEGOCIOS, pat),
      fetchAirtableTable(TABLES.DISPERSIONES, pat),
      fetchAirtableTable(TABLES.DIVISAS, pat),
      fetchAirtableTable(TABLES.COMPRAS_USDT, pat),
      fetchAirtableTable(TABLES.VENTAS_USDT, pat),
      fetchAirtableTable(TABLES.ACTIVOS_LIQUIDOS, pat),
      fetchAirtableTable(TABLES.ACTIVOS_DIGITALES, pat),
      fetchAirtableTable(TABLES.USUARIOS, pat),
    ]);

    const divisasById = new Map<string, any>();
    rawDivisas.forEach((d) => divisasById.set(d.id, d));

    // Lookup map for CLIENTES (resolves record ID -> first column {CLIENTE} / {Cliente} and {NOMBRE})
    const clientesById = new Map<string, { id: string; codigo: string; nombre: string }>();
    rawClientes.forEach((r) => {
      const f = r.fields || {};
      const codigo = String(f["CLIENTE"] || f["Cliente"] || f["ID CLIENTE"] || r.id);
      const nombre = String(f["NOMBRE"] || f["CLIENTE"] || codigo);
      clientesById.set(r.id, { id: r.id, codigo, nombre });
    });

    // Lookup map for ACTIVOS LIQUIDOS (resolves record ID -> {ACTIVO}, {EMPRESA}, {INSTITUCIÓN})
    const activosLiqById = new Map<string, { id: string; activo: string; empresa: string; institucion: string }>();
    rawActivosLiq.forEach((r) => {
      const f = r.fields || {};
      const activo = String(f["ACTIVO"] || f["ID CUENTA"] || r.id);
      const empresa = String(f["EMPRESA"] || f["TITULAR"] || activo);
      const institucion = String(f["INSTITUCIÓN"] || f["BANCO"] || "Coinsenda");
      activosLiqById.set(r.id, { id: r.id, activo, empresa, institucion });
    });

    const clientes = rawClientes.map((r, idx) => {
      const f = r.fields || {};
      const codigo = String(f["CLIENTE"] || f["Cliente"] || f["ID CLIENTE"] || r.id);
      const nombre = String(f["NOMBRE"] || f["CLIENTE"] || codigo);
      const ingresosCop = Number(f["INGRESOS"] ?? f["TOTAL INGRESOS"] ?? 0);
      const pagadoCop = Number(f["PAGADO"] ?? f["TOTAL PAGADO"] ?? 0);
      const pendienteCop = Number(f["PENDIENTE"] ?? f["TOTAL PENDIENTE"] ?? 0);
      const saldoCop = Number(f["TOTAL SALDO"] !== undefined ? f["TOTAL SALDO"] : (ingresosCop - pagadoCop));
      const fechaCreacion = String(f["FECHA CREACIÓN"] || f["FECHA"] || new Date().toISOString());
      const numero = Number(f["#"] || idx + 1);
      return {
        id: r.id,
        codigo,
        idCliente: codigo,
        nombre,
        ingresosCop,
        pagadoCop,
        pendienteCop,
        pendientePorPagarCop: pendienteCop,
        saldoCop,
        fechaCreacion,
        numero,
      };
    });

    const negocios = rawNegocios.map((r, idx) => {
      const f = r.fields || {};
      const codigo = String(f["NEGOCIO"] || f["ID NEGOCIO"] || r.id);
      const fechaRegistro = String(f["FECHA REGISTRO"] || f["FECHA"] || new Date().toISOString().slice(0, 10));
      const divisaRaw = Array.isArray(f["DIVISA"]) ? f["DIVISA"][0] : f["DIVISA"];
      const divisaCodigo = DIVISA_ID_TO_CODE[divisaRaw] || String(f["MONEDA"] || divisaRaw || "USD");
      
      const clienteRecordId = Array.isArray(f["CLIENTE"]) ? f["CLIENTE"][0] : f["CLIENTE"];
      const clientObj = clientesById.get(clienteRecordId);
      const clienteCodigo = clientObj ? clientObj.codigo : String(clienteRecordId || "Cliente");
      const clienteNombre = clientObj ? clientObj.nombre : clienteCodigo;

      const montoDivisa = Number(f["MONTO"] ?? f["CANTIDAD DIVISA"] ?? 0);
      const tasa = Number(f["TASA"] || 0);
      const ingresoCop = Number(f["INGRESO (COP)"] ?? f["TOTAL COP"] ?? f["INGRESO COP"] ?? (montoDivisa * tasa));
      const usdtPorDivisa = Number(f["USDT X DIVISA"] ?? f["TOTAL USDT"] ?? f["USDT POR DIVISA"] ?? 0);
      const costoUsdtComp = Number(f["COSTO USDT"] || 0);
      const precioCompra = (f["PRECIO COMPRA"] !== undefined && typeof f["PRECIO COMPRA"] === "number") ? Number(f["PRECIO COMPRA"]) : null;
      const totalRevenue = Number(f["TOTAL REVENUE"] || 0);
      const totalPagarClienteCop = Number(f["TOTAL PAGAR"] || 0);
      const numero = Number(f["#"] || idx + 1);
      return {
        id: r.id,
        codigo,
        idNegocio: codigo,
        fechaRegistro,
        fecha: fechaRegistro,
        clienteCodigo,
        clienteNombre,
        clienteRecordId,
        divisaCodigo,
        montoDivisa,
        cantidadDivisa: montoDivisa,
        tasa,
        tasaClienteCop: tasa,
        ingresoCop,
        montoCop: ingresoCop,
        usdtPorDivisa,
        montoUsdt: usdtPorDivisa,
        costoUsdtComp,
        precioCompra,
        compraRelCodigo: String(f["COMPRA RELACIONADA"] || ""),
        porcentajeComision: Number(f["% COMISIÓN"] || 0),
        totalRevenue,
        totalPagarClienteCop,
        numero,
      };
    });

    const comprasUsdt = rawComprasUsdt.map((r, idx) => {
      const f = r.fields || {};
      const codigo = String(f["COMPRA"] || f["ID COMPRA"] || f["ID TRANSACCION"] || r.id);
      const fechaCompra = String(f["FECHA COMPRA"] || f["FECHA"] || new Date().toISOString().slice(0, 10));
      const divisaRaw = Array.isArray(f["DIVISA"]) ? f["DIVISA"][0] : f["DIVISA"];
      const divisaCodigo = DIVISA_ID_TO_CODE[divisaRaw] || String(divisaRaw || "USD");
      const valorComprado = Number(f["VALOR COMPRADO"] ?? f["MONTO DIVISA"] ?? 0);
      const usdtComprado = Number(f["USDT COMPRADO"] ?? f["TOTAL RECIBIDO USDT"] ?? 0);
      const costo = Number(f["COSTO"] || 0);
      const tasa = Number(f["TASA"] || 0);
      const destinoUsdtIds = Array.isArray(f["DESTINO USDT"]) ? f["DESTINO USDT"] : (f["DESTINO USDT"] ? [f["DESTINO USDT"]] : []);
      const walletDestino = String(f["WALLET DESTINO"] || "");
      const negocioVinculado = String(f["NEGOCIO VINCULADO"] || "");
      const numero = Number(f["#"] || idx + 1);
      return {
        id: r.id,
        codigo,
        idTransaccion: codigo,
        fechaCompra,
        fecha: fechaCompra,
        divisaCodigo,
        divisaNombre: divisaCodigo,
        valorComprado,
        montoDivisa: valorComprado,
        usdtComprado,
        totalRecibidoUsdt: usdtComprado,
        costo,
        tasa,
        tasaUsdt: tasa,
        destinoUsdtIds,
        walletDestino,
        negocioVinculado,
        numero,
      };
    });

    const ventasUsdt = rawVentasUsdt.map((r, idx) => {
      const f = r.fields || {};
      const codigo = String(f["VENTA"] || f["ID VENTA"] || f["ID TRANSACCION"] || r.id);
      const fecha = String(f["FECHA VENTA"] || f["FECHA"] || new Date().toISOString().slice(0, 10));
      const concepto = String(f["CONCEPTO"] || "");
      const usdtVendido = Number(f["USDT VENDIDO"] ?? f["CANTIDAD USDT"] ?? 0);
      const tasa = Number(f["TASA"] || 0);
      const totalCop = Number(f["TOTAL (COP)"] ?? f["TOTAL COP"] ?? (usdtVendido * tasa));
      const destinoFondosIds = Array.isArray(f["DESTINO FONDOS"]) ? f["DESTINO FONDOS"] : (f["DESTINO FONDOS"] ? [f["DESTINO FONDOS"]] : []);
      const origenFondosIds = Array.isArray(f["ORIGEN FONDOS"]) ? f["ORIGEN FONDOS"] : (f["ORIGEN FONDOS"] ? [f["ORIGEN FONDOS"]] : []);
      const destinoFondosNombre = String(f["CUENTA DESTINO"] || "Coinsenda");
      const numero = Number(f["#"] || idx + 1);
      return {
        id: r.id,
        nombre: codigo,
        idTransaccion: codigo,
        codigo,
        fecha,
        concepto,
        usdtVendido,
        cantidadUsdt: usdtVendido,
        tasa,
        tasaVentaCop: tasa,
        impuestos: 0,
        destinoFondosIds,
        origenFondosIds,
        destinoFondosNombre,
        cuentaDestinoNombre: destinoFondosNombre,
        walletOrigen: String(f["WALLET ORIGEN"] || "CUY WALLET"),
        totalCop,
        numero,
      };
    });

    const pagos = rawDispersiones.map((r, idx) => {
      const f = r.fields || {};
      const codigo = String(f["DISPERSION"] || f["ID DISPERSION"] || f["ID PAGO"] || r.id);
      
      const clienteRecordId = Array.isArray(f["CLIENTE"]) ? f["CLIENTE"][0] : f["CLIENTE"];
      const clientObj = clientesById.get(clienteRecordId);
      // FIRST COLUMN IN AIRTABLE: {CLIENTE} (e.g. C0017-DR-N)
      const clienteCodigo = clientObj ? clientObj.codigo : String(clienteRecordId || "Cliente");
      const clienteNombre = clienteCodigo;

      const montoCop = Number(f["MONTO (COP)"] ?? f["VALOR TOTAL DISPERSION"] ?? f["MONTO"] ?? 0);
      const rawEstado = String(f["ESTADO"] || "COMPLETADO").toUpperCase();
      const estado = rawEstado.includes("RECHAZ") ? "RECHAZADO" : "COMPLETADO";
      const numero = Number(f["#"] || idx + 1);
      const fechaCreacion = String(f["FECHA CREACIÓN"] || f["FECHA"] || new Date().toISOString().slice(0, 10));
      const referencia = String(f["REFERENCIA"] || f["CONCEPTO"] || "");
      const origenFondosIds = Array.isArray(f["ORIGEN FONDOS"]) ? f["ORIGEN FONDOS"] : (f["ORIGEN FONDOS"] ? [f["ORIGEN FONDOS"]] : []);
      
      // Resolve Origen Fondos name for internal view
      const origenFondosNames = origenFondosIds.map((id: string) => {
        const act = activosLiqById.get(id);
        return act ? act.activo : id;
      });
      const origenFondos = origenFondosNames.join(", ") || "-";

      const comprobantes: any[] = [];
      const rawComprobantes = f["COMPROBANTES"] || f["COMPROBANTE"];
      if (Array.isArray(rawComprobantes)) {
        rawComprobantes.forEach((c: any) => {
          comprobantes.push({
            id: c.id,
            url: c.url,
            nombre: c.filename || "Comprobante",
            size: c.size,
            thumbnails: c.thumbnails,
          });
        });
      }
      return {
        id: r.id,
        codigo,
        idDispersion: codigo,
        clienteCodigo,
        clienteNombre,
        clienteRecordId,
        montoCop,
        valorTotalDispersion: montoCop,
        estado,
        numero,
        fechaCreacion,
        fecha: fechaCreacion,
        referencia,
        origenFondos,
        origenFondosIds,
        comprobantes,
        comprobanteUrl: comprobantes[0]?.url,
        comprobanteNombre: comprobantes[0]?.nombre,
        tieneComprobante: comprobantes.length > 0,
      };
    });

    const activosLiquidos = rawActivosLiq.map((r) => {
      const f = r.fields || {};
      const idCuenta = String(f["ACTIVO"] || f["ID CUENTA"] || r.id);
      const titular = String(f["EMPRESA"] || f["TITULAR"] || "Coinsenda-Kaupaloki");
      const empresa = String(f["EMPRESA"] || titular);
      const institucion = String(f["INSTITUCIÓN"] || f["BANCO"] || "Coinsenda");
      const cuenta = String(f["CUENTA"] || "Principal");
      const divisa = String(f["DIVISA"] || "COP");
      const ingresosCop = Number(f["INGESOS (COP)"] ?? f["INGRESOS (COP)"] ?? f["TOTAL INGRESOS"] ?? 0);
      const egresosCop = Number(f["EGRESOS (COP)"] ?? f["TOTAL EGRESOS"] ?? 0);
      const saldoCop = Number(f["SALDO (COP)"] ?? f["TOTAL SALDO"] ?? (ingresosCop - egresosCop));
      const saldoReal = Number(f["SALDO REAL"] ?? f["SALDO (COP)"] ?? saldoCop);
      const tarifas = String(f["TARIFAS"] || "");

      const rawMovs: any[] = [];
      // Ingresos vinculados por Venta USDT
      const ventasRel = ventasUsdt.filter((v: any) => v.destinoFondosIds?.includes(r.id) || v.destinoFondosNombre?.toLowerCase().includes(institucion.toLowerCase()));
      ventasRel.forEach((v: any) => {
        rawMovs.push({
          fecha: v.fecha,
          origen: v.codigo,
          concepto: `Venta USDT: ${v.concepto || "Liquidación"}`,
          monto: v.totalCop,
        });
      });

      // Egresos vinculados por Dispersión
      const dispersionesRel = pagos.filter((p: any) => p.origenFondosIds?.includes(r.id) || p.estado === "COMPLETADO");
      dispersionesRel.forEach((p: any) => {
        rawMovs.push({
          fecha: p.fecha,
          origen: p.codigo,
          concepto: `Dispersión - ${p.clienteNombre || "Cliente"} (${p.referencia || "Pago"})`,
          monto: -Math.abs(p.montoCop),
        });
      });

      rawMovs.sort((a, b) => a.fecha.localeCompare(b.fecha));
      let running = 0;
      const movimientos = rawMovs.map((m) => {
        running += m.monto;
        return { ...m, balance: running };
      }).reverse();

      return {
        id: r.id,
        idCuenta,
        activo: idCuenta,
        titular,
        empresa,
        institucion,
        cuenta,
        divisa,
        ingresosCop,
        egresosCop,
        saldoCop,
        saldoReal,
        tarifas,
        ventasIds: Array.isArray(f["VENTA USDT"]) ? f["VENTA USDT"] : (Array.isArray(f["VENTAS-USDT"]) ? f["VENTAS-USDT"] : []),
        dispersionesIds: Array.isArray(f["DISPERSIONES"]) ? f["DISPERSIONES"] : [],
        movimientos,
      };
    });

    const activosDigitales = rawActivosDig.map((r) => {
      const f = r.fields || {};
      const idWallet = String(f["ACTIVO"] || f["ID WALLET"] || r.id);
      const wallet = String(f["WALLET"] || "Tether TRC20");
      const ingresosUsdt = Number(f["INGRESO (USDT)"] ?? f["INGRESOS (USDT)"] ?? f["TOTAL INGRESOS"] ?? 0);
      const egresosUsdt = Number(f["EGRESOS (USDT)"] ?? f["TOTAL EGRESOS"] ?? 0);
      const saldoUsdt = Number(f["SALDO (USDT)"] ?? f["TOTAL SALDO"] ?? (ingresosUsdt - egresosUsdt));
      const saldoReal = Number(f["SALDO REAL"] ?? f["SALDO (USDT)"] ?? saldoUsdt);

      const rawMovs: any[] = [];
      const comprasRel = comprasUsdt.filter((c: any) => c.destinoUsdtIds?.includes(r.id) || (c.walletDestino || "").toLowerCase().includes(wallet.toLowerCase()));
      comprasRel.forEach((c: any) => {
        rawMovs.push({
          fecha: c.fechaCompra,
          origen: c.codigo,
          concepto: `Compra USDT (${c.divisaCodigo})`,
          monto: c.usdtComprado,
        });
      });

      const ventasRel = ventasUsdt.filter((v: any) => v.origenFondosIds?.includes(r.id) || (v.walletOrigen || "").toLowerCase().includes(wallet.toLowerCase()));
      ventasRel.forEach((v: any) => {
        rawMovs.push({
          fecha: v.fecha,
          origen: v.codigo,
          concepto: `${v.concepto || "Venta USDT"} → ${v.destinoFondosNombre}`,
          monto: -Math.abs(v.usdtVendido),
        });
      });

      rawMovs.sort((a, b) => a.fecha.localeCompare(b.fecha));
      let running = 0;
      const movimientos = rawMovs.map((m) => {
        running += m.monto;
        return { ...m, balance: running };
      }).reverse();

      return {
        id: r.id,
        idWallet,
        activo: idWallet,
        wallet,
        red: "TRC20",
        titular: "Coinsenda-Kaupaloki",
        tarifas: "RED TRON • 1 USDT",
        ingresosUsdt,
        egresosUsdt,
        saldoUsdt,
        saldoReal,
        comprasIds: Array.isArray(f["COMPRA-USDT"]) ? f["COMPRA-USDT"] : [],
        ventasIds: Array.isArray(f["VENTA USDT"]) ? f["VENTA USDT"] : (Array.isArray(f["VENTAS-USDT"]) ? f["VENTAS-USDT"] : []),
        movimientos,
      };
    });

    // Normalize DIVISAS
    const divisas = rawDivisas.map((r) => {
      const f = r.fields || {};
      const codigo = String(f["DIVISA"] || f["MONEDA"] || r.id);
      const nombreDivisa = String(f["NOMBRE DIVISA"] || codigo);
      const pais = String(f["PAIS"] || "");
      const totalRecibido = Number(f["TOTAL RECIBIDO"] || 0);
      const totalComprado = Number(f["TOTAL COMPRADO"] || 0);
      const totalPendiente = f["TOTAL PENDIENTE"] !== undefined ? Number(f["TOTAL PENDIENTE"]) : Math.max(0, totalRecibido - totalComprado);
      const att = Array.isArray(f["BANDERA"]) && f["BANDERA"][0] ? f["BANDERA"][0] : null;
      const rawBandera = att?.thumbnails?.large?.url || att?.url || "";
      return {
        id: r.id,
        codigo,
        divisa: codigo,
        nombreDivisa,
        pais,
        banderaUrl: rawBandera,
        totalRecibido,
        totalComprado,
        totalPendiente,
        negociosIds: Array.isArray(f["NEGOCIOS"]) ? f["NEGOCIOS"] : [],
        comprasUsdtIds: Array.isArray(f["COMPRA-USDT"]) ? f["COMPRA-USDT"] : [],
      };
    });

    // Normalize USUARIOS
    const usuarios = rawUsuarios.map((r, idx) => {
      const f = r.fields || {};
      const rawDivLinks = Array.isArray(f["DIVISAS RELACIONADAS"])
        ? f["DIVISAS RELACIONADAS"]
        : Array.isArray(f["DIVISAS AUTORIZADAS"])
        ? f["DIVISAS AUTORIZADAS"]
        : [];
      const divisasAutorizadas = mapAirtableDivisaIdsToCodes(rawDivLinks, divisasById);
      return {
        id: r.id,
        numero: Number(f["#"] || idx + 1),
        codigo: String(f["ADMINISTRADOR"] || r.id),
        nombre: String(f["NOMBRE"] || ""),
        email: String(f["EMAIL"] || "").toLowerCase(),
        pais: String(f["PAIS"] || "COL"),
        estado: String(f["ESTADO"] || "ACTIVO"),
        rol: String(f["ROL"] || "OPERADOR"),
        divisasAutorizadas,
      };
    });

    const snapshot = {
      syncedAt: new Date().toISOString(),
      clientes,
      negocios,
      dispersiones: pagos,
      pagos,
      divisas,
      comprasUsdt,
      ventasUsdt,
      activosLiquidos,
      activosDigitales,
      usuarios,
    };

    await supabase.from("airtable_sync_state").upsert({
      id: "main",
      base_id: BASE_ID,
      airtable_pat: pat,
      snapshot,
      updated_at: snapshot.syncedAt,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        source: "airtable_live",
        updated_at: snapshot.syncedAt,
        snapshot,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
