import type { UsdtOperationSummary } from './aiOperationSummary';

// Gemini AI Service for Kaupaloki Admin Assistant via Supabase Edge Function
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

export interface ViewContextData {
  pathname: string;
  tabTitle: string;
  capitalByPerson?: { nombre: string; tipo: string; aportadoCOP: number; retiradoCOP: number; capitalCOP: number }[] | null;
  usdtOperations?: {
    source: 'loaded_snapshot';
    syncedAt?: string;
    loading: boolean;
    compras: UsdtOperationSummary;
    ventas: UsdtOperationSummary;
  };
  metrics?: Record<string, any>;
  recordsSummary?: any[];
  globalSnapshot?: {
    clientes?: any[];
    ultimosNegocios?: any[];
    ultimosGastos?: any[];
    ultimasDispersiones?: any[];
  };
  extraContext?: string;
}

const EDGE_AI_URL = 'https://tjuqludeduydarwzhbor.supabase.co/functions/v1/ai-assistant';

export async function askGeminiAssistant(
  prompt: string,
  history: ChatMessage[],
  context: ViewContextData
): Promise<string> {
  const conversationMessages = (history || []).slice(-8).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const res = await fetch(EDGE_AI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      history: conversationMessages,
      context,
    }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const errMsg = errJson?.error || '';
    if (res.status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error(errMsg || 'Se alcanzó el límite de consultas o la cuota de Gemini. Intenta más tarde; si persiste, revisa la cuota en Google AI Studio.');
    }
    throw new Error(errMsg || `Error del servidor IA (${res.status})`);
  }

  const data = await res.json();
  if (data.error) {
    if (data.error.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Se alcanzó el límite de consultas o la cuota de Gemini. Intenta más tarde; si persiste, revisa la cuota en Google AI Studio.');
    }
    throw new Error(data.error);
  }

  return data.reply || 'Sin respuesta del asistente.';
}
