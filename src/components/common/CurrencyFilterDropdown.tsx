import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { fallbackBanderaUrl } from '../../utils/formatters';

const DEFAULT_CURRENCY_COUNTRIES: Record<string, string> = {
  COP: 'Colombia',
  MXN: 'México',
  BRL: 'Brasil',
  PEN: 'Perú',
  CLP: 'Chile',
  ARS: 'Argentina',
  UYU: 'Uruguay',
  VES: 'Venezuela',
  HNL: 'Honduras',
  USD: 'Estados Unidos',
  'USD-EC': 'Ecuador',
  'USD-PY': 'Paraguay',
  USDT: 'Global',
};

const cleanCountryName = (pais?: string, codigo?: string): string => {
  if (codigo && DEFAULT_CURRENCY_COUNTRIES[codigo.toUpperCase()]) {
    return DEFAULT_CURRENCY_COUNTRIES[codigo.toUpperCase()];
  }
  if (!pais) return '';
  return pais.replace(/\s*\([^)]*\)\s*$/, '').trim();
};

interface CurrencyFilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional list of allowed currency codes; defaults to all active divisas in DataContext */
  currencies?: string[];
  placeholder?: string;
  className?: string;
}

export const CurrencyFilterDropdown: React.FC<CurrencyFilterDropdownProps> = ({
  value,
  onChange,
  currencies,
  placeholder = 'Todas las divisas',
  className = '',
}) => {
  const { data } = useData();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const items = useMemo(() => {
    const map = new Map<string, { codigo: string; pais: string; banderaUrl?: string }>();
    for (const d of data.divisas) {
      const code = d.codigo.toUpperCase();
      map.set(code, {
        codigo: code,
        pais: cleanCountryName(d.pais, code) || d.nombre || '',
        banderaUrl: fallbackBanderaUrl[code] || d.banderaUrl,
      });
    }

    if (map.size === 0) {
      for (const [code, pais] of Object.entries(DEFAULT_CURRENCY_COUNTRIES)) {
        map.set(code, {
          codigo: code,
          pais,
          banderaUrl: fallbackBanderaUrl[code],
        });
      }
    }

    if (currencies && currencies.length > 0) {
      return currencies
        .map((raw) => raw.toUpperCase())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((code) => {
          const existing = map.get(code);
          return (
            existing || {
              codigo: code,
              pais: cleanCountryName(undefined, code),
              banderaUrl: fallbackBanderaUrl[code],
            }
          );
        });
    }

    return Array.from(map.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [data.divisas, currencies]);

  const normalizedValue = value ? value.toUpperCase() : '';
  const selectedItem = normalizedValue
    ? items.find((i) => i.codigo === normalizedValue) || {
        codigo: normalizedValue,
        pais: cleanCountryName(undefined, normalizedValue),
        banderaUrl: fallbackBanderaUrl[normalizedValue],
      }
    : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`h-8 w-full px-3 rounded-lg text-xs font-bold whitespace-nowrap inline-flex items-center justify-between gap-2 border transition-all ${
          selectedItem
            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
            : 'bg-background text-foreground border-input hover:bg-muted/50 font-medium'
        }`}
      >
        <span className="inline-flex items-center gap-2 min-w-0 truncate">
          {selectedItem ? (
            <>
              {selectedItem.banderaUrl && (
                <img
                  src={selectedItem.banderaUrl}
                  alt=""
                  className="w-4 h-3 rounded-xs object-cover shrink-0"
                  onError={(ev) => {
                    ev.currentTarget.hidden = true;
                  }}
                />
              )}
              <span className="font-mono font-bold">{selectedItem.codigo}</span>
              {selectedItem.pais && (
                <span className="text-[11px] font-normal text-white/85 truncate">
                  · {selectedItem.pais}
                </span>
              )}
            </>
          ) : (
            <>
              <i className="ri-global-line text-primary text-xs shrink-0" />
              <span className="truncate">{placeholder}</span>
            </>
          )}
        </span>
        <i
          className={`ri-arrow-down-s-line text-sm shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 mt-1.5 w-60 max-h-72 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl z-40 space-y-0.5 animate-fade-in"
        >
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              !selectedItem
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted/60'
            }`}
          >
            <i
              className={`ri-global-line text-sm ${
                !selectedItem ? 'text-white' : 'text-primary'
              }`}
            />
            <span>{placeholder}</span>
          </button>

          {items.map((item) => {
            const isSelected = selectedItem?.codigo === item.codigo;
            return (
              <button
                key={item.codigo}
                type="button"
                onClick={() => {
                  onChange(item.codigo);
                  setOpen(false);
                }}
                className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.banderaUrl && (
                    <img
                      src={item.banderaUrl}
                      alt=""
                      className="w-4 h-3 rounded-xs object-cover shrink-0"
                      onError={(ev) => {
                        ev.currentTarget.hidden = true;
                      }}
                    />
                  )}
                  <span className="font-mono">{item.codigo}</span>
                </div>
                {item.pais && (
                  <span
                    className={`text-[11px] font-normal truncate ${
                      isSelected ? 'text-white/80' : 'text-muted-foreground'
                    }`}
                  >
                    {item.pais}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
