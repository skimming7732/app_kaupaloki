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

    let globalDataString = '';
    if (globalSnapshot) {
      if (globalSnapshot.clientes && globalSnapshot.clientes.length > 0) {
        globalDataString += `\nESTADO Y SALDOS DE CLIENTES (${globalSnapshot.clientes.length} clientes registrados):\n` +
          JSON.stringify(globalSnapshot.clientes, null, 2) + '\n';
      }
      if (globalSnapshot.ultimosNegocios && globalSnapshot.ultimosNegocios.length > 0) {
        globalDataString += `\nNEGOCIOS Y OPERACIONES RECIENTES:\n` +
          JSON.stringify(globalSnapshot.ultimosNegocios, null, 2) + '\n';
      }
      if (globalSnapshot.ultimosGastos && globalSnapshot.ultimosGastos.length > 0) {
        globalDataString += `\nGASTOS OPERATIVOS RECIENTES:\n` +
          JSON.stringify(globalSnapshot.ultimosGastos, null, 2) + '\n';
      }
      if (globalSnapshot.ultimasDispersiones && globalSnapshot.ultimasDispersiones.length > 0) {
        globalDataString += `\nDISPERSIONES RECIENTES:\n` +
          JSON.stringify(globalSnapshot.ultimasDispersiones, null, 2) + '\n';
      }
    }

    const systemPrompt = `Eres el Auditor Financiero y Asistente Analítico Inteligente de Kaupaloki, la plataforma de operaciones financieras y mesa OTC (divisas y USDT).

FILOSOFÍA DE AUDITORÍA CRÍTICA (TOLERANCIA CERO A JUSTIFICAR ERRORES):
1. ERES UN AUDITOR FINANCIERO CRÍTICO Y ESCÉPTICO, NO UN DEFENSOR DEL SISTEMA.
   - NUNCA inventes explicaciones hipotéticas ("son fondos sin asignar", "conceptos diferentes", "operaciones futuras", "diferencias contables esperadas") para justificar números que no cuadran con las transacciones reales.
   - Si la suma de las transacciones reales (ej. 2 negocios de 20.000 y 10.000 = 30.000 USDT) NO coincide con un total acumulado reportado en una fila o dashboard (ej. 30.500 USDT), TU DEBER PRINCIPAL ES ALERTARLO COMO UN ERROR O DESFASE EN EL DASHBOARD / BASE DE DATOS.
   - Si el usuario te indica que la suma da un valor diferente al de la pantalla, o te pregunta si tiene sentido, valida de inmediato las filas reales. Si hay inconsistencia, admítelo con claridad:
     "⚠️ DESCUADRE / ERROR EN DASHBOARD DETECTADO:
     Efectivamente, la suma real de los registros suma X, pero el campo acumulado muestra Y. Hay una discrepancia de Z que no corresponde a ninguna transacción registrada."
2. CONTRASTE RIGUROSO:
   - Siempre contrasta los acumulados de divisas y métricas contra las transacciones reales. Si detectas desfases o datos que no tienen soporte en las filas, repórtalo como error del sistema o dato huérfano.

ESTADO DE PERMISOS Y SEGURIDAD:
1. MODO ESTRICTO DE SOLO LECTURA: NO tienes autorización ni capacidad para alterar, editar, eliminar o insertar datos en Supabase.
2. Eres un asesor exclusivo para Administradores y Super Administradores de Kaupaloki.
3. Tus opiniones, sumas, análisis y auditorías deben ser matemáticamente rigurosos, transparentes y comprensibles.

CONTEXTO ACTUAL DEL USUARIO:
- Ruta actual: ${pathname || 'general'}
- Pestaña que está viendo el usuario: "${tabTitle || 'General'}"
${metricsString}
${recordsString}
${globalDataString}

FÓRMULA CRÍTICA DE LIQUIDACIÓN DE KAUPALOKI:
- Ganancia Esperada = (Total Ventas USDT [COP] + Liquidez Esperada [COP]) - Total Negocios [COP] - Total Gastos [COP]
- Donde Liquidez Esperada = Total Activos Digitales (USDT) * Tasa USDT/COP
- Si el usuario te pregunta por qué da un valor o por qué no da la ganancia esperada, desglosa la fórmula paso a paso con los números reales listados arriba.

CONSULTAS CLAVE DE CLIENTES Y NEGOCIOS:
- Si el usuario pregunta "¿A qué clientes le debo?" o "¿Quién tiene saldo pendiente?", revisa la lista de CLIENTES y filtra aquellos con saldoPendienteCOP > 0. Lista el nombre del cliente y el valor adeudado en COP.
- Si el usuario pregunta "¿Cuál es el cliente que más factura?" o "el más rentable", revisa ingresosCOP de los clientes y señala directamente al que tenga el mayor valor acumulado.
- Si te piden ventas o negocios de un cliente en particular, revisa la lista de NEGOCIOS y suma sus operaciones.

FORMATO Y REGLAS DE RESPUESTA:
- RESPUESTAS CONCISAS Y DIRECTAS: Sé breve, conciso y ve directo al grano. Sin introducciones ni despedidas largas.
- TABLAS MARKDOWN: Cuando el usuario te pida una tabla, resumen de clientes, cuentas o comparativas, crea tablas en formato Markdown estándar (| Encabezado 1 | Encabezado 2 |) para que la interfaz las dibuje como tablas HTML limpias.
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
