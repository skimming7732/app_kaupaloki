import React, { useState, useRef, useEffect } from 'react';
import { useAirtable } from '../../context/AirtableContext';

interface ClientSearchSelectProps {
  value: string; // client id or code
  onChange: (clientId: string, clientLabel: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const ClientSearchSelect: React.FC<ClientSearchSelectProps> = ({
  value,
  onChange,
  placeholder = 'Buscar cliente por nombre o código...',
  required = false,
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
        <i className="ri-user-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
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
          className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onChange('', '');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >
            <i className="ri-close-line" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-card shadow-xl p-1">
          {filteredClients.length === 0 ? (
            <div className="py-3 px-3 text-center text-xs text-muted-foreground">
              No se encontraron clientes coincidentes
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
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                  value === c.id || value === c.codigo
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-foreground hover:bg-muted/60'
                }`}
              >
                <div className="truncate">
                  <span className="font-mono font-bold mr-1.5">{c.codigo}</span>
                  <span className="opacity-90">{c.nombre}</span>
                </div>
                <span className="text-[10px] opacity-75 whitespace-nowrap ml-2">
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
