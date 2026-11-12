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

    const groqApiKey = Deno.env.get('GROQ_API_KEY') || '';

    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: 'Falta configurar GROQ_API_KEY en Supabase.' }),
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

    // Compact records in screen (max 20 items to stay safely below Groq 8000 TPM limit)
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

    // Only last 4 messages to save tokens
    const conversationMessages = (history || []).slice(-4).map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    const messagesPayload = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages,
      { role: 'user', content: prompt },
    ];

    const callGroq = async (model: string, maxTokens: number = 600) => {
      return await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: messagesPayload,
          temperature: 0.2,
          max_tokens: maxTokens,
        }),
      });
    };

    // Model cascading: 120b -> qwen 27b -> 20b
    let groqRes = await callGroq('openai/gpt-oss-120b', 600);

    if (!groqRes.ok) {
      console.warn('Fallback a qwen3.8-27b...');
      groqRes = await callGroq('qwen/qwen3.8-27b', 600);
    }

    if (!groqRes.ok) {
      console.warn('Fallback a openai/gpt-oss-20b...');
      groqRes = await callGroq('openai/gpt-oss-20b', 500);
    }

    if (!groqRes.ok) {
      const errJson = await groqRes.json().catch(() => ({}));
      const errCode = errJson?.error?.code || '';
      const errMsg = errJson?.error?.message || '';

      if (errCode === 'rate_limit_exceeded' || errMsg.includes('tokens per minute')) {
        return new Response(
          JSON.stringify({
            reply: '⚠️ **Límite de velocidad de Groq alcanzado:** Se ha superado temporalmente la cuota de tokens por minuto. Por favor espera **10 segundos** y vuelve a enviar tu pregunta.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Error en el servicio de IA (${groqRes.status}): ${errMsg || 'Servicio no disponible'}`);
    }

    const data = await groqRes.json();
    let content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || '';
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

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
