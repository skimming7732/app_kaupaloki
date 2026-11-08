import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  askGroqAssistant,
  ChatMessage,
  ChatSession,
  ViewContextData,
} from '../../services/groqService';

const MAX_SESSIONS = 10;

// Custom Markdown Formatter Component
const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  // Clean raw LaTeX blocks if present
  const cleaned = content
    .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
    .replace(/\\begin\{aligned\}([\s\S]*?)\\end\{aligned\}/g, '$1')
    .replace(/\\mathbf\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\;/g, ' ')
    .replace(/&/g, '')
    .trim();

  const parseInline = (text: string): React.ReactNode => {
    // Splits by **bold**, `code`, or *italic*
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={index} className="font-bold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 rounded bg-muted/80 text-foreground font-mono text-[11px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={index} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  const lines = cleaned.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-5 my-1.5 space-y-1">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {parseInline(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal pl-5 my-1.5 space-y-1">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {parseInline(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Bullet items: - or * or •
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered list items: 1. or 2)
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numMatch[2]);
      continue;
    }

    flushList();

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h5
          key={`h5-${i}`}
          className="font-bold text-xs uppercase tracking-wide text-foreground mt-2 mb-1"
        >
          {parseInline(trimmed.slice(4))}
        </h5>
      );
      continue;
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="font-bold text-sm text-foreground mt-2.5 mb-1">
          {parseInline(trimmed.replace(/^#+\s*/, ''))}
        </h4>
      );
      continue;
    }

    // Markdown Table block detection
    if (trimmed.startsWith('|') && trimmed.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--; // Adjust because for loop will increment i

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) => {
          const cells = rowStr.split('|');
          if (cells.length > 0 && cells[0].trim() === '') cells.shift();
          if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();
          return cells.map((c) => c.trim());
        };

        const headers = parseRow(tableLines[0]);
        // Check if second line is markdown table divider (e.g. | --- | :--- |)
        const isDivider = tableLines[1].replace(/[\s|:-]/g, '') === '';
        const bodyLines = isDivider ? tableLines.slice(2) : tableLines.slice(1);
        const rows = bodyLines.map(parseRow);

        elements.push(
          <div
            key={`table-${i}`}
            className="overflow-x-auto my-2 rounded-xl border border-border shadow-xs max-w-full"
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted text-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 border-b border-border font-bold">
                      {parseInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card/60">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-foreground/90 whitespace-nowrap">
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1 leading-relaxed">
        {parseInline(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className="text-xs space-y-1">{elements}</div>;
};

export const AiAssistantBubble: React.FC = () => {
  const { profile, user } = useAuth();
  const { data, metrics } = useData();
  const location = useLocation();

  // Role Protection: Only super_admin and administrador
  const role = (profile?.role || '').toLowerCase();
  const isAdmin = role === 'super_admin' || role === 'administrador' || role === 'admin';

  if (!isAdmin || !user) {
    return null;
  }

  const storageKey = `kaupaloki_ai_sessions_${user.id || profile?.id}`;

  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error al cargar sesiones de IA:', e);
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    if (sessions.length > 0) return sessions[0].id;
    return null;
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
    } catch (e) {
      console.error('Error al guardar sesiones de IA:', e);
    }
  }, [sessions, storageKey]);

  // Current active session
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === currentSessionId) || null;
  }, [sessions, currentSessionId]);

  // Determine current view details & records
  const currentViewDetails = useMemo((): { title: string; records: any[] } => {
    const p = location.pathname;

    if (p === '/' || p === '/inicio') {
      return {
        title: 'Inicio / Resumen Operativo',
        records: (data.clientes || []).map((c) => ({
          cliente: c.nombre,
          saldoPendienteCOP: c.saldoPendienteCOP,
          totalIngresosCOP: c.totalIngresosCOP,
          totalDispersadoCOP: c.totalDispersadoCOP,
          totalNegocios: c.totalNegocios,
          estado: c.estado,
        })),
      };
    }

    if (p.includes('/panel-control') || p.includes('/dashboard')) {
      return {
        title: 'Panel de Control / Liquidación',
        records: [
          {
            resumenLiquidacion: {
              gananciaEsperada: metrics.gananciaEsperada,
              liquidezEsperada: metrics.liquidezEsperada,
              totalNegocioCOP: metrics.totalNegocioCOP,
              totalVentasUSDT: metrics.totalVentasUSDT,
              totalGastosCOP: metrics.totalGastosCOP,
              totalActivosLiquidos: metrics.totalActivosLiquidos,
              totalActivosDigitales: metrics.totalActivosDigitales,
              tasaUsdtCop: metrics.rateUsdtCop,
              saldoPendienteClientes: metrics.saldoPendienteClientes,
            },
          },
        ],
      };
    }

    if (p.includes('/gastos')) {
      return {
        title: 'Gastos Operativos',
        records: (data.gastos || []).map((g) => ({
          codigo: g.codigo,
          concepto: g.concepto,
          categoria: g.categoria,
          divisa: g.divisa,
          monto: g.monto,
          origen: g.origenFondos,
          fecha: g.fecha,
        })),
      };
    }

    if (p.includes('/negocios')) {
      return {
        title: 'Negocios',
        records: (data.negocios || []).map((n) => ({
          codigo: n.codigo,
          cliente: n.clienteNombre,
          divisa: n.divisaCodigo,
          montoDivisa: n.montoDivisa,
          tasa: n.tasaCambio,
          ingresoCOP: n.ingresoCOP,
          fecha: n.fecha,
          estado: n.estado,
        })),
      };
    }

    if (p.includes('/clientes')) {
      return {
        title: 'Clientes',
        records: (data.clientes || []).map((c) => ({
          codigo: c.codigo,
          nombre: c.nombre,
          pais: c.pais,
          totalNegocios: c.totalNegocios,
          totalIngresosCOP: c.totalIngresosCOP,
          totalDispersadoCOP: c.totalDispersadoCOP,
          saldoPendienteCOP: c.saldoPendienteCOP,
          estado: c.estado,
        })),
      };
    }

    if (p.includes('/dispersiones')) {
      return {
        title: 'Dispersiones',
        records: (data.dispersiones || []).map((d) => ({
          codigo: d.codigo,
          cliente: d.clienteNombre,
          monto: d.monto,
          origenFondos: d.origenFondos,
          referencia: d.referencia,
          fecha: d.fecha,
          estado: d.estado,
        })),
      };
    }

    if (p.includes('/efectivo')) {
      return {
        title: 'Efectivo Dosquebradas',
        records: (data.efectivo || []).map((e) => ({
          codigo: e.codigo,
          tipo: e.tipo,
          cliente: e.clienteNombre,
          monto: e.monto,
          origenFondos: e.origenFondos,
          referencia: e.referencia,
          fecha: e.fecha,
        })),
      };
    }

    if (p.includes('/ventas-usdt')) {
      return {
        title: 'Ventas USDT',
        records: (data.ventasUsdt || []).map((v) => ({
          codigo: v.codigo,
          concepto: v.concepto,
          usdtVendido: v.usdtVendido,
          tasa: v.tasa,
          totalCOP: v.totalCOP,
          fecha: v.fecha,
        })),
      };
    }

    if (p.includes('/compras-usdt')) {
      return {
        title: 'Compras USDT',
        records: (data.comprasUsdt || []).map((c) => ({
          codigo: c.codigo,
          divisa: c.divisaCodigo,
          valorComprado: c.valorComprado,
          usdtComprado: c.usdtComprado,
          tasa: c.tasa,
          costo: c.costo,
          fecha: c.fecha,
        })),
      };
    }

    if (p.includes('/activos-digitales')) {
      return {
        title: 'Activos Digitales',
        records: data.activosDigitales || [],
      };
    }

    if (p.includes('/activos-liquidos') || p.includes('/activos')) {
      return {
        title: 'Activos Líquidos',
        records: data.activosLiquidos || [],
      };
    }

    if (p.includes('/divisas')) {
      return {
        title: 'Divisas',
        records: (data.divisas || []).map((d) => ({
          codigo: d.codigo,
          nombre: d.nombre,
          totalRecibido: d.totalRecibido,
          totalComprado: d.totalComprado,
          totalPendiente: d.totalPendiente,
        })),
      };
    }

    if (p.includes('/comisionistas')) {
      return {
        title: 'Comisionistas',
        records: (data.comisionistas || []).map((cm) => ({
          codigo: cm.codigo,
          comisionista: cm.comisionistaNombre,
          porcentaje: cm.porcentajeComision,
          ingresosCOP: cm.ingresosCOP,
          comisionesCOP: cm.comisionesCOP,
        })),
      };
    }

    return {
      title: 'General Kaupaloki',
      records: (data.clientes || []).map((c) => ({
        cliente: c.nombre,
        saldoPendienteCOP: c.saldoPendienteCOP,
        ingresosCOP: c.totalIngresosCOP,
      })),
    };
  }, [location.pathname, data, metrics]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Start new chat
  const handleStartNewChat = () => {
    const newSession: ChatSession = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: `Consulta en ${currentViewDetails.title}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          id: `msg_welcome_${Date.now()}`,
          role: 'assistant',
          content: `Hola **${profile?.nombre || profile?.full_name || 'Administrador'}**. Soy el **Auditor Financiero IA** de Kaupaloki.\n\nTengo acceso en tiempo real a tus clientes, métricas de liquidación y registros de **${currentViewDetails.title}**.\n\nMi acceso es **estrictamente de solo lectura**. ¿Qué consulta o auditoría deseas realizar?`,
          timestamp: Date.now(),
        },
      ],
      tabOrigin: currentViewDetails.title,
    };

    setSessions((prev) => [newSession, ...prev].slice(0, MAX_SESSIONS));
    setCurrentSessionId(newSession.id);
    setShowHistory(false);
  };

  // Delete chat
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setInputMessage('');

    let session = activeSession;
    let isBrandNew = false;

    // Create session if none active
    if (!session) {
      isBrandNew = true;
      session = {
        id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: text.length > 35 ? text.substring(0, 32) + '...' : text,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        tabOrigin: currentViewDetails.title,
      };
    }

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...session.messages, userMsg];

    // Auto title if first user message
    const updatedTitle =
      session.messages.filter((m) => m.role === 'user').length === 0
        ? text.length > 35
          ? text.substring(0, 32) + '...'
          : text
        : session.title;

    const updatedSession: ChatSession = {
      ...session,
      title: updatedTitle,
      updatedAt: Date.now(),
      messages: updatedMessages,
    };

    if (isBrandNew) {
      setSessions((prev) => [updatedSession, ...prev].slice(0, MAX_SESSIONS));
      setCurrentSessionId(updatedSession.id);
    } else {
      setSessions((prev) =>
        prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
      );
    }

    setIsLoading(true);

    try {
      const contextData: ViewContextData = {
        pathname: location.pathname,
        tabTitle: currentViewDetails.title,
        metrics: {
          gananciaEsperada: metrics.gananciaEsperada,
          liquidezEsperada: metrics.liquidezEsperada,
          totalNegocioCOP: metrics.totalNegocioCOP,
          totalVentasUSDT: metrics.totalVentasUSDT,
          totalGastosCOP: metrics.totalGastosCOP,
          totalActivosLiquidos: metrics.totalActivosLiquidos,
          totalActivosDigitales: metrics.totalActivosDigitales,
          rateUsdtCop: metrics.rateUsdtCop,
          saldoPendienteClientes: metrics.saldoPendienteClientes,
        },
        recordsSummary: currentViewDetails.records,
        globalSnapshot: {
          clientes: (data.clientes || []).map((c) => ({
            nombre: c.nombre,
            ingresosCOP: c.totalIngresosCOP,
            dispersadoCOP: c.totalDispersadoCOP,
            saldoPendienteCOP: c.saldoPendienteCOP,
            totalNegocios: c.totalNegocios,
            estado: c.estado,
          })),
          ultimosNegocios: (data.negocios || []).slice(0, 30).map((n) => ({
            cliente: n.clienteNombre,
            ingresoCOP: n.ingresoCOP,
            montoDivisa: n.montoDivisa,
            divisa: n.divisaCodigo,
            tasa: n.tasaCambio,
            fecha: n.fecha,
          })),
          ultimosGastos: (data.gastos || []).slice(0, 30).map((g) => ({
            concepto: g.concepto,
            categoria: g.categoria,
            monto: g.monto,
            divisa: g.divisa,
            fecha: g.fecha,
          })),
          ultimasDispersiones: (data.dispersiones || []).slice(0, 30).map((d) => ({
            cliente: d.clienteNombre,
            monto: d.monto,
            fecha: d.fecha,
            origen: d.origenFondos,
          })),
        },
      };

      const aiResponse = await askGroqAssistant(text, updatedMessages, contextData);

      const aiMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === updatedSession.id
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: [...s.messages, aiMsg],
              }
            : s
        )
      );
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Ocurrió un error al procesar tu consulta:** ${
          err?.message || 'Error de conexión con el motor de IA.'
        }\n\nPor favor intenta nuevamente en unos momentos.`,
        timestamp: Date.now(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === updatedSession.id
            ? { ...s, messages: [...s.messages, errorMsg] }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quick prompt presets
  const quickPrompts = [
    {
      label: '💰 ¿A qué clientes le debo?',
      query: '¿A qué clientes le debo dinero actualmente? Revisa los saldos pendientes y muéstrame la lista con los valores exactos.',
    },
    {
      label: '🏆 Cliente más rentable',
      query: '¿Cuál es el cliente que más ha facturado o que tiene mayor volumen de ingresos acumulado?',
    },
    {
      label: '🔍 Detectar duplicados',
      query: `Revisa minuciosamente los registros de esta pestaña ("${currentViewDetails.title}") y busca si hay registros duplicados o sospechosos (mismo cliente, monto idéntico en fecha cercana o referencias repetidas).`,
    },
    {
      label: '📊 Explicar Ganancia Esperada',
      query: 'Explícame paso a paso con la fórmula oficial de Kaupaloki cómo se calcula la Ganancia Esperada con los números actuales.',
    },
  ];

  return (
    <>
      {/* Minimalist Floating Action Icon (PC & Mobile) */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              if (!activeSession) {
                handleStartNewChat();
              }
            }}
            className="group relative w-12 h-12 rounded-full bg-slate-900/95 hover:bg-slate-800 text-white flex items-center justify-center shadow-lg shadow-black/40 hover:shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all duration-200 border border-emerald-500/30 hover:border-emerald-400/70 backdrop-blur-md"
            title="Auditor Financiero IA"
            aria-label="Auditor Financiero IA"
          >
            {/* Subtle Green Active Status Dot */}
            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-slate-900"></span>
            </span>

            {/* Minimalist AI Sparkles Icon */}
            <svg
              className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </button>
        )}
      </div>

      {/* Chat Window / Drawer: FULL SCREEN ON MOBILE, FLOATING CARD ON DESKTOP */}
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-50 w-full h-full md:w-[480px] md:h-[85vh] md:max-h-[720px] bg-card text-card-foreground md:rounded-2xl shadow-2xl border-0 md:border md:border-border flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-border flex items-center justify-between gap-2 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-inner flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm leading-tight text-white truncate">
                    IA Auditora Kaupaloki
                  </h3>
                  <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-semibold text-emerald-300 bg-emerald-950/80 rounded border border-emerald-500/40">
                    Solo Lectura
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate">
                  Groq LLM • Privado ({profile?.role === 'super_admin' ? 'Super Admin' : 'Admin'})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* History Toggle Button */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 md:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ${
                  showHistory ? 'bg-white/15 text-white' : ''
                }`}
                title="Historial de chats (hasta 10)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {/* New Chat Button */}
              <button
                onClick={handleStartNewChat}
                className="p-2 md:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Empezar nuevo chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>

              {/* Close Button: prominent for mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 md:p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Cerrar chat"
              >
                <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Context Banner: Active Tab Pill */}
          <div className="px-3.5 py-1.5 bg-muted/60 border-b border-border/70 flex items-center justify-between text-[11px] text-muted-foreground flex-shrink-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium text-foreground">Contexto:</span>
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold truncate">
                {currentViewDetails.title}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap pl-2 font-mono">
              {data.clientes?.length || 0} clientes cargados
            </span>
          </div>

          {/* Body: History Panel or Chat Messages */}
          <div className="relative flex-1 overflow-hidden flex flex-col bg-background">
            {/* History Slide-down Drawer */}
            {showHistory && (
              <div className="absolute inset-0 z-20 bg-background/98 backdrop-blur-sm p-4 flex flex-col border-b border-border animate-in fade-in duration-150">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Historial de Consultas ({sessions.length}/{MAX_SESSIONS})
                  </h4>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 rounded hover:bg-muted"
                  >
                    Volver al chat
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {sessions.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      No hay conversaciones guardadas aún.
                    </div>
                  ) : (
                    sessions.map((sess) => (
                      <div
                        key={sess.id}
                        onClick={() => {
                          setCurrentSessionId(sess.id);
                          setShowHistory(false);
                        }}
                        className={`group p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          sess.id === currentSessionId
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'bg-card hover:bg-muted border-border text-foreground'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate leading-tight">
                            {sess.title || 'Consulta sin título'}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span>{new Date(sess.updatedAt).toLocaleDateString('es-CO')}</span>
                            <span>•</span>
                            <span>{sess.messages.length} mensajes</span>
                            {sess.tabOrigin && (
                              <span className="truncate max-w-[120px] bg-muted px-1 rounded text-[9px]">
                                {sess.tabOrigin}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeleteSession(sess.id, e)}
                          className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all"
                          title="Eliminar chat"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={handleStartNewChat}
                  className="mt-3 w-full py-2.5 px-3 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5 shadow hover:opacity-90 transition-opacity"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Iniciar Nueva Consulta
                </button>
              </div>
            )}

            {/* Chat Messages Scrollable */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {(!activeSession || activeSession.messages.length === 0) && (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h4 className="font-bold text-sm text-foreground">
                    Auditor Financiero Listo
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Pregunta sobre sumas, clientes adeudados, fórmulas de liquidación o
                    discrepancias en <strong>{currentViewDetails.title}</strong>.
                  </p>
                </div>
              )}

              {activeSession?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-xs'
                        : 'bg-muted/80 text-foreground border border-border/80 rounded-bl-xs'
                    }`}
                  >
                    {/* Formatted Markdown Message */}
                    <FormattedMessage content={msg.content} />

                    <div
                      className={`flex items-center justify-between gap-3 mt-1.5 text-[9px] pt-1 border-t ${
                        msg.role === 'user'
                          ? 'border-primary-foreground/20 text-primary-foreground/70'
                          : 'border-border/60 text-muted-foreground'
                      }`}
                    >
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="hover:underline flex items-center gap-1 font-mono cursor-pointer"
                        >
                          {copiedId === msg.id ? '✓ Copiado' : 'Copiar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-2">
                  <div className="bg-muted/90 border border-border rounded-2xl rounded-bl-xs px-3.5 py-2.5 text-xs text-muted-foreground flex items-center gap-2 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Analizando clientes, registros y fórmulas...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Chips */}
            <div className="p-2 bg-card/60 border-t border-border/60 flex-shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qp.query)}
                    disabled={isLoading}
                    className="whitespace-nowrap flex-shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-full bg-muted/90 hover:bg-muted border border-border text-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Box */}
            <div className="p-3 bg-card border-t border-border flex items-end gap-2 flex-shrink-0 pb-safe">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre clientes, deudas, ventas o fórmulas..."
                rows={1}
                disabled={isLoading}
                className="flex-1 max-h-24 min-h-[40px] resize-none px-3.5 py-2.5 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground placeholder:text-muted-foreground disabled:opacity-50"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="h-[40px] w-[40px] flex-shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary/20 cursor-pointer"
                title="Enviar mensaje"
              >
                {isLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 transform rotate-90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
