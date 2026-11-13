import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, history, context } = await req.json();

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Falta configurar GEMINI_API_KEY en Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pathname, tabTitle, metrics, recordsSummary, globalSnapshot } = context || {};

    const metricsString = metrics
      ? `MÉTRICAS GLOBALES:
Activos Líquidos: COP ${Number(metrics.totalActivosLiquidos || 0).toLocaleString('es-CO')} | Activos Digitales: USDT ${Number(metrics.totalActivosDigitales || 0).toLocaleString('es-CO')}
Tasa USDT/COP: ${Number(metrics.rateUsdtCop || 0).toLocaleString('es-CO')} | Liquidez Esperada: COP ${Number(metrics.liquidezEsperada || 0).toLocaleString('es-CO')}
Total Negocios: COP ${Number(metrics.totalNegocioCOP || 0).toLocaleString('es-CO')} | Total Ventas USDT: COP ${Number(metrics.totalVentasUSDT || 0).toLocaleString('es-CO')}
Total Gastos: COP ${Number(metrics.totalGastosCOP || 0).toLocaleString('es-CO')} | Saldo Pendiente Clientes: COP ${Number(metrics.saldoPendienteClientes || 0).toLocaleString('es-CO')}
GANANCIA ESPERADA: COP ${Number(metrics.gananciaEsperada || 0).toLocaleString('es-CO')}`
      : 'Métricas no disponibles.';

    // Keep screen context compact to reduce latency and quota usage
    let recordsString = '';
    if (recordsSummary && recordsSummary.length > 0) {
      const sample = recordsSummary.slice(0, 20);
      recordsString = `\nREGISTROS EN PANTALLA (${tabTitle || 'Actual'}, ${sample.length} registros):\n` +
        JSON.stringify(sample);
    }

    // Compact global data
    let globalDataString = '';
    if (globalSnapshot) {
      if (globalSnapshot.clientes && globalSnapshot.clientes.length > 0) {
        // Prioritize clients with active balances or debt
        const relevantClients = globalSnapshot.clientes
          .filter((c: any) => (c.porCobrarCOP > 0) || (c.porPagarCOP > 0) || (c.ingresosCOP > 0))
          .slice(0, 25)
          .map((c: any) => ({
            cod: c.codigo || c.id,
            nom: c.nombre,
            porCobrar: c.porCobrarCOP || 0,
            porPagar: c.porPagarCOP || 0,
            ingresos: c.ingresosCOP || 0,
            est: c.estado
          }));

        globalDataString += `\nCLIENTES Y SALDOS (${relevantClients.length} relevantes):\n` +
          JSON.stringify(relevantClients);
      }
      if (globalSnapshot.ultimosNegocios && globalSnapshot.ultimosNegocios.length > 0) {
        const sampleNeg = globalSnapshot.ultimosNegocios.slice(0, 8).map((n: any) => ({
          cli: n.cliente,
          cop: n.ingresoCOP,
          usdt: n.montoDivisa,
          fec: n.fecha
        }));
        globalDataString += `\nÚLTIMOS NEGOCIOS:\n` + JSON.stringify(sampleNeg);
      }
      if (globalSnapshot.ultimosGastos && globalSnapshot.ultimosGastos.length > 0) {
        const sampleGastos = globalSnapshot.ultimosGastos.slice(0, 8).map((g: any) => ({
          con: g.concepto,
          monto: g.monto,
          div: g.divisa,
          fec: g.fecha
        }));
        globalDataString += `\nÚLTIMOS GASTOS:\n` + JSON.stringify(sampleGastos);
      }
      if (globalSnapshot.ultimasDispersiones && globalSnapshot.ultimasDispersiones.length > 0) {
        const sampleDisp = globalSnapshot.ultimasDispersiones.slice(0, 8).map((d: any) => ({
          cli: d.cliente,
          monto: d.monto,
          fec: d.fecha
        }));
        globalDataString += `\nÚLTIMAS DISPERSIONES:\n` + JSON.stringify(sampleDisp);
      }
    }

    const systemPrompt = `Eres el Auditor Financiero y Asistente Analítico Inteligente de Kaupaloki (mesa OTC de divisas y USDT).
ESTADO DE PERMISOS: Solo lectura, exclusivo para Administradores y Super Administradores.
RESPUESTAS CONCISAS: Sé directo y breve. Usa tablas Markdown para listados.

FILOSOFÍA DE AUDITORÍA CRÍTICA:
- Eres crítico y riguroso. NUNCA justifiques números incoherentes inventando fondos no asignados u operaciones futuras.
- Si las transacciones individuales no cuadran con los acumulados del dashboard, alerta de inmediato un DESCUADRE/ERROR EN DASHBOARD.

DISTINCIÓN VITAL EN CUENTAS DE CLIENTES:
1. "¿QUÉ CLIENTES NOS DEBEN?" / "¿QUIÉN NOS DEBE?" / "¿CUÁL ES LA DEUDA POR COBRAR?":
   - Columna "Por cobrar" (campo 'porCobrar' > 0 o estado "DEBE"). Es dinero que el cliente debe a Kaupaloki.
   - El cliente que más debe es el que tenga el mayor valor en 'porCobrar' (por ejemplo C0101-TEST).
   - Muestra siempre una tabla Markdown con: Código | Nombre del cliente | Por cobrar (COP).
2. "¿A QUÉ CLIENTES LE DEBEMOS?" / "¿QUÉ TENEMOS PENDIENTE POR PAGAR?":
   - Columna "Por pagar" (campo 'porPagar' > 0 o estado "PENDIENTE"). Saldo a favor del cliente pendiente por dispersar.
3. "¿CUÁL ES EL CLIENTE QUE MÁS FACTURA O MÁS RENTABLE?":
   - Revisa 'ingresos' y señala al cliente con mayor monto acumulado.

FÓRMULA DE LIQUIDACIÓN:
- Ganancia Esperada = (Total Ventas USDT [COP] + Liquidez Esperada [COP]) - Total Negocios [COP] - Total Gastos [COP]
- Donde Liquidez Esperada = Total Activos Digitales (USDT) * Tasa USDT/COP

CONTEXTO ACTUAL:
Pestaña: "${tabTitle || 'General'}" (${pathname || '/'})
${metricsString}
${recordsString}
${globalDataString}
`;

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return new Response(JSON.stringify({ error: 'Escribe una pregunta para el asistente.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // The UI includes the current question in history; send it exactly once.
    const recentHistory = (Array.isArray(history) ? history : [])
      .filter((m: any) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string');
    if (recentHistory.at(-1)?.role === 'user' && recentHistory.at(-1)?.content === prompt) {
      recentHistory.pop();
    }
    const contents = recentHistory.slice(-8).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': geminiApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
        }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!geminiRes.ok) {
      // Do not return provider diagnostics, which may contain sensitive data.
      const status = geminiRes.status === 429 ? 429 : 502;
      const error = status === 429
        ? 'Se alcanzó el límite de consultas o la cuota de Gemini. Intenta más tarde; si persiste, revisa la cuota en Google AI Studio.'
        : 'Gemini no pudo responder. Revisa la clave, el modelo y su disponibilidad en Google AI Studio.';
      return new Response(JSON.stringify({ error }), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await geminiRes.json();
    const content = (data.candidates?.[0]?.content?.parts || [])
      .filter((part: any) => !part.thought && typeof part.text === 'string')
      .map((part: any) => part.text).join('').trim();
    if (!content) {
      return new Response(JSON.stringify({ error: 'Gemini no generó una respuesta. Reformula la pregunta e inténtalo de nuevo.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ reply: content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
