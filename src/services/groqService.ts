// Groq AI Service for Kaupaloki Admin Assistant via Supabase Edge Function
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

export async function askGroqAssistant(
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
    throw new Error(errJson?.error || `Error del servidor IA (${res.status})`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data.reply || 'Sin respuesta del asistente.';
}
