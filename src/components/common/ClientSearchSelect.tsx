import React, { useState, useRef, useEffect } from 'react';
import { useAirtable } from '../../context/AirtableContext';

interface ClientSearchSelectProps {
  value: string; // client id or code
  onChange: (clientId: string, clientLabel: string) => void;
  placeholder?: string;
  required?: boolean;
  onAddNewClient?: (initialQuery?: string) => void;
  inputClassName?: string;
}

export const ClientSearchSelect: React.FC<ClientSearchSelectProps> = ({
  value,
  onChange,
  placeholder = 'Buscar cliente por nombre o código...',
  required = false,
  onAddNewClient,
  inputClassName = '',
}) => {
  const { data } = useAirtable();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync initial query with current selected value
  useEffect(() => {
    if (value) {
      const found = data.clientes.find((c) => c.id === value || c.codigo === value || c.nombre === value);
      if (found) {
        setQuery(found.codigo ? `${found.codigo} - ${found.nombre}` : found.nombre);
      }
    } else {
      setQuery('');
    }
  }, [value, data.clientes]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClients = data.clientes.filter((c) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.codigo.toLowerCase().includes(q)
    );
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <i className="ri-user-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
        <input
          type="text"
          required={required && !value}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (!e.target.value.trim()) {
              onChange('', '');
            }
          }}
          placeholder={placeholder}
          className={`w-full pl-9 pr-8 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground ${inputClassName}`}
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onChange('', '');
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm p-1 rounded-full hover:bg-muted"
            title="Limpiar selección"
          >
            <i className="ri-close-line" />
          </button>
        ) : (
          <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl p-1.5 backdrop-blur-md">
          {onAddNewClient && (
            <div className="p-1 pb-1.5 border-b border-border mb-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNewClient(query);
                }}
                className="w-full text-left px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <i className="ri-user-add-line text-sm" />
                  <span>+ Agregar Nuevo Cliente</span>
                </span>
                <span className="text-[10px] bg-primary/20 px-2 py-0.5 rounded-full">Rápido</span>
              </button>
            </div>
          )}

          {filteredClients.length === 0 ? (
            <div className="py-4 px-3 text-center text-xs text-muted-foreground space-y-2">
              <p>No se encontraron clientes para &quot;{query}&quot;</p>
              {onAddNewClient && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onAddNewClient(query);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 inline-flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <i className="ri-user-add-line" />
                  <span>Crear cliente &quot;{query}&quot;</span>
                </button>
              )}
            </div>
          ) : (
            filteredClients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id, c.codigo);
                  setQuery(`${c.codigo} - ${c.nombre}`);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between my-0.5 ${
                  value === c.id || value === c.codigo
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-foreground hover:bg-muted/70'
                }`}
              >
                <div className="truncate flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-muted/60 px-1.5 py-0.5 rounded-md border border-border/50 shrink-0">
                    {c.codigo}
                  </span>
                  <span className="truncate font-medium">{c.nombre}</span>
                </div>
                <span className="text-[10px] opacity-80 uppercase font-semibold whitespace-nowrap ml-2 bg-muted/40 px-1.5 py-0.5 rounded">
                  {c.pais || 'COL'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
