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

    const { pathname, tabTitle, metrics, recordsSummary } = context || {};

    const metricsString = metrics
      ? `
MÉTRICAS GLOBALES ACTUALES DE KAUPALOKI:
- Total Activos Líquidos (Bancos/Caja): COP ${Number(metrics.totalActivosLiquidos || 0).toLocaleString('es-CO')}
- Total Activos Digitales: USDT ${Number(metrics.totalActivosDigitales || 0).toLocaleString('es-CO')}
- Tasa USDT/COP Referencia: ${Number(metrics.rateUsdtCop || 0).toLocaleString('es-CO')}
- Liquidez Esperada en COP (Digitales * Tasa): COP ${Number(metrics.liquidezEsperada || 0).toLocaleString('es-CO')}
- Total Negocios COP: COP ${Number(metrics.totalNegocioCOP || 0).toLocaleString('es-CO')}
- Total Ventas USDT en COP: COP ${Number(metrics.totalVentasUSDT || 0).toLocaleString('es-CO')}
- Total Gastos COP: COP ${Number(metrics.totalGastosCOP || 0).toLocaleString('es-CO')}
- Saldo Pendiente Clientes: COP ${Number(metrics.saldoPendienteClientes || 0).toLocaleString('es-CO')}
- GANANCIA ESPERADA ACTUAL: COP ${Number(metrics.gananciaEsperada || 0).toLocaleString('es-CO')}
`
      : 'Métricas no disponibles.';

    let recordsString = '';
    if (recordsSummary && recordsSummary.length > 0) {
      const sample = recordsSummary.slice(0, 70);
      recordsString = `
REGISTROS EN PANTALLA (Pestaña ${tabTitle}, ${sample.length} registros cargados):
${JSON.stringify(sample, null, 2)}
`;
    }

    const systemPrompt = `Eres el Auditor Financiero y Asistente Analítico Inteligente de Kaupaloki, la plataforma de operaciones financieras y mesa OTC (divisas y USDT).

ESTADO DE PERMISOS Y SEGURIDAD:
1. MODO ESTRICTO DE SOLO LECTURA: NO tienes autorización ni capacidad para alterar, editar, eliminar o insertar datos en Supabase.
2. Eres un asesor exclusivo para Administradores y Super Administradores de Kaupaloki.
3. Tus opiniones, sumas, análisis y auditorías deben ser matemáticamente rigurosos, transparentes y comprensibles.

CONTEXTO ACTUAL DEL USUARIO:
- Ruta actual: ${pathname || 'general'}
- Pestaña que está viendo el usuario: "${tabTitle || 'General'}"
${metricsString}
${recordsString}

FÓRMULA CRÍTICA DE LIQUIDACIÓN DE KAUPALOKI:
- Ganancia Esperada = (Total Ventas USDT [COP] + Liquidez Esperada [COP]) - Total Negocios [COP] - Total Gastos [COP]
- Donde Liquidez Esperada = Total Activos Digitales (USDT) * Tasa USDT/COP
- Si el usuario te pregunta por qué da un valor o por qué no da la ganancia esperada, desglosa la fórmula paso a paso con los números reales listados arriba.

CAPACIDAD DE AUDITORÍA Y DETECCIÓN DE DUPLICADOS:
- Revisa montos iguales en la misma fecha, mismos clientes o referencias repetidas.

FORMATO Y REGLAS DE RESPUESTA:
- RESPUESTAS CONCISAS Y DIRECTAS: Sé breve, conciso y ve directo al grano. Sin introducciones ni despedidas largas.
- ESTRICTA PROHIBICIÓN DE EDICIÓN: Si el usuario te pide editar o cambiar cualquier dato o saldo, responde de forma tajante que eres un asistente de SOLO LECTURA y no puedes modificar la base de datos.
- FILTRADOS Y SUMAS POR FECHA: Suma únicamente los registros solicitados y muestra el resultado exacto.
- Formatea siempre las sumas en moneda con separadores de miles (ej. COP $10.500.000 o 5.000 USDT).
`;

    const conversationMessages = (history || []).slice(-8).map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    const messagesPayload = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages,
      { role: 'user', content: prompt },
    ];

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: messagesPayload,
        temperature: 0.2,
        max_tokens: 1800,
      }),
    });

    if (!groqRes.ok) {
      const fallbackRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: messagesPayload,
          temperature: 0.2,
          max_tokens: 1800,
        }),
      });

      if (!fallbackRes.ok) {
        throw new Error(`Error en Groq API`);
      }

      const fbData = await fallbackRes.json();
      let content = fbData.choices?.[0]?.message?.content || fbData.choices?.[0]?.message?.reasoning || '';
      content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      return new Response(JSON.stringify({ reply: content }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
