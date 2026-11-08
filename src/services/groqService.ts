// Groq AI Service for Kaupaloki Admin Assistant
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  tabOrigin?: string;
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY =
  (import.meta as any).env?.VITE_GROQ_API_KEY || '';

export interface ViewContextData {
  pathname: string;
  tabTitle: string;
  metrics?: Record<string, any>;
  recordsSummary?: any[];
  extraContext?: string;
}

export function buildSystemPrompt(context: ViewContextData): string {
  const { pathname, tabTitle, metrics, recordsSummary } = context;

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
    : 'Métricas no disponibles en este momento.';

  let recordsString = '';
  if (recordsSummary && recordsSummary.length > 0) {
    const sample = recordsSummary.slice(0, 70); // send up to 70 records for precise auditing
    recordsString = `
REGISTROS EN PANTALLA (Pestaña ${tabTitle}, ${sample.length} registros cargados):
${JSON.stringify(sample, null, 2)}
`;
  }

  return `Eres el Auditor Financiero y Asistente Analítico Inteligente de Kaupaloki, la plataforma de operaciones financieras y mesa OTC (divisas y USDT).

ESTADO DE PERMISOS Y SEGURIDAD:
1. MODO ESTRICTO DE SOLO LECTURA: NO tienes autorización ni capacidad para alterar, editar, eliminar o insertar datos en Supabase.
2. Eres un asesor exclusivo para Administradores y Super Administradores de Kaupaloki.
3. Tus opiniones, sumas, análisis y auditorías deben ser matemáticamente rigurosos, transparentes y comprensibles.

CONTEXTO ACTUAL DEL USUARIO:
- Ruta actual: ${pathname}
- Pestaña que está viendo el usuario: "${tabTitle}"
${metricsString}
${recordsString}

FÓRMULA CRÍTICA DE LIQUIDACIÓN DE KAUPALOKI:
- Ganancia Esperada = (Total Ventas USDT [COP] + Liquidez Esperada [COP]) - Total Negocios [COP] - Total Gastos [COP]
- Donde Liquidez Esperada = Total Activos Digitales (USDT) * Tasa USDT/COP
- Si el usuario te pregunta "¿Por qué no me da esta ganancia estimada?" o "¿Por qué la ganancia esperada es X?", desglosa la fórmula paso a paso con los números reales listados arriba e indica cuál factor está afectando el resultado (por ejemplo, si hubo un incremento en gastos, si la tasa de liquidación cambió, si hay saldo pendiente o si faltan ventas de USDT por monetizar).

CAPACIDAD DE AUDITORÍA Y DETECCIÓN DE DUPLICADOS:
- Cuando el usuario te pida detectar duplicados, analiza minuciosamente los registros en pantalla: busca montos iguales en la misma fecha, mismos clientes, códigos repetidos, referencias bancarias idénticas o conceptos iguales que puedan ser un doble registro accidental.
- Si encuentras posibles duplicados o inconsistencias, indícalos con viñetas claras (menciona código, cliente, monto y fecha).
- Si todo cuadra y no hay duplicados, dilo con tranquilidad y seguridad.

FORMATO Y REGLAS DE RESPUESTA:
- RESPUESTAS CONCISAS Y DIRECTAS: Sé breve, conciso y ve directo al grano. Evita introducciones y despedidas largas.
- ESTRICTA PROHIBICIÓN DE EDICIÓN: Si el usuario te pide editar, modificar, borrar o cambiar cualquier dato o saldo, responde de forma tajante y concisa que eres un asistente de SOLO LECTURA y no puedes hacer modificaciones en la base de datos.
- FILTRADOS Y SUMAS POR FECHA: Cuando te pidan sumar registros de una fecha o cliente específico (ej. "solo suma las dispersiones del 30 de octubre"), identifica con precisión matemática solo esos registros, suma sus valores y da el resultado exacto de inmediato.
- Formatea siempre las sumas en moneda con separadores de miles (ej. COP $10.500.000 o 5.000 USDT).
`;
}

export async function askGroqAssistant(
  prompt: string,
  history: ChatMessage[],
  context: ViewContextData
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error(
      'Falta la clave VITE_GROQ_API_KEY en las variables de entorno (.env). Por favor agrégala.'
    );
  }

  const systemPrompt = buildSystemPrompt(context);

  // Send conversation history (last 8 messages to keep prompt focused)
  const conversationMessages = history.slice(-8).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const messagesPayload = [
    { role: 'system', content: systemPrompt },
    ...conversationMessages,
    { role: 'user', content: prompt },
  ];

  const primaryModel = 'openai/gpt-oss-120b';
  const fallbackModel = 'qwen/qwen3.8-27b';

  const sendRequest = async (model: string) => {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: messagesPayload,
        temperature: 0.2, // Low temperature for high precision and financial accuracy
        max_tokens: 1800,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Error HTTP ${res.status}`);
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || '';

    // If model outputs reasoning tags or empty content with reasoning field
    if (!content && data.choices?.[0]?.message?.reasoning) {
      content = data.choices[0].message.reasoning;
    }

    // Clean any residual reasoning blocks if present in string
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return content;
  };

  try {
    return await sendRequest(primaryModel);
  } catch (err: any) {
    console.warn(`[Groq AI] Error con ${primaryModel}, intentando con fallback ${fallbackModel}:`, err);
    try {
      return await sendRequest(fallbackModel);
    } catch (fallbackErr: any) {
      console.error('[Groq AI] Error fatal:', fallbackErr);
      throw new Error(
        fallbackErr?.message ||
          'No se pudo conectar con el servicio de IA de Groq en este momento.'
      );
    }
  }
}
