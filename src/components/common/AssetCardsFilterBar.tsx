import React, { useState, useRef, useEffect } from 'react';
import { InstitutionLogo } from './InstitutionLogo';

export interface InstitutionOption {
  name: string;
  count: number;
  logoUrl?: string | null;
  icon?: string;
}

export interface AssetCardsFilterBarProps {
  saldoFilter: 'todos' | 'con_saldo' | 'sin_saldo';
  setSaldoFilter: (mode: 'todos' | 'con_saldo' | 'sin_saldo') => void;
  selectedInstitutions: string[];
  setSelectedInstitutions: (names: string[] | ((prev: string[]) => string[])) => void;
  institutionOptions: InstitutionOption[];
  totalCount: number;
  conSaldoCount: number;
  sinSaldoCount: number;
  filteredCount: number;
  itemLabel?: string;
}

export const AssetCardsFilterBar: React.FC<AssetCardsFilterBarProps> = ({
  saldoFilter,
  setSaldoFilter,
  selectedInstitutions,
  setSelectedInstitutions,
  institutionOptions,
  totalCount,
  conSaldoCount,
  sinSaldoCount,
  filteredCount,
  itemLabel = 'tarjetas',
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dropdownOpen]);

  const filteredOptions = institutionOptions.filter((opt) =>
    opt.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const toggleInstitution = (name: string) => {
    setSelectedInstitutions((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  const selectAll = () => {
    setSelectedInstitutions(institutionOptions.map((o) => o.name));
  };

  const clearInstitutions = () => {
    setSelectedInstitutions([]);
  };

  const hasActiveFilters = saldoFilter !== 'todos' || selectedInstitutions.length > 0;

  return (
    <div className="space-y-2 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left side: Saldo Tabs + Institution Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Saldo filter pill buttons */}
          <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border text-xs font-medium">
            <button
              type="button"
              onClick={() => setSaldoFilter('todos')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                saldoFilter === 'todos'
                  ? 'bg-background text-foreground font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Todos</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSaldoFilter('con_saldo')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                saldoFilter === 'con_saldo'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Con saldo</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 font-mono">
                {conSaldoCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSaldoFilter('sin_saldo')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                saldoFilter === 'sin_saldo'
                  ? 'bg-slate-500/20 text-slate-700 dark:text-slate-300 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Sin saldo</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
                {sinSaldoCount}
              </span>
            </button>
          </div>

          {/* Multi-select Institutions Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                selectedInstitutions.length > 0
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-card border-border hover:bg-muted text-foreground'
              }`}
            >
              <i className="ri-building-2-line text-sm" />
              <span>
                {selectedInstitutions.length === 0
                  ? 'Todas las instituciones'
                  : selectedInstitutions.length === 1
                  ? selectedInstitutions[0]
                  : `${selectedInstitutions.length} instituciones`}
              </span>
              <i className={`ri-arrow-down-s-line transition-transform text-xs ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-72 rounded-2xl bg-card border border-border shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-bold text-foreground">Filtrar Instituciones</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-primary hover:underline font-medium"
                    >
                      Todas
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={clearInstitutions}
                      className="text-muted-foreground hover:text-foreground font-medium"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* Search inside institutions */}
                {institutionOptions.length > 5 && (
                  <div className="relative">
                    <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar institución..."
                      className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Options list with checkboxes */}
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredOptions.length === 0 ? (
                    <div className="text-center py-3 text-xs text-muted-foreground">
                      No se encontraron instituciones
                    </div>
                  ) : (
                    filteredOptions.map((opt) => {
                      const isSelected = selectedInstitutions.includes(opt.name);
                      return (
                        <label
                          key={opt.name}
                          className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors text-xs select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleInstitution(opt.name)}
                              className="rounded border-border text-primary focus:ring-primary size-3.5"
                            />
                            <InstitutionLogo
                              name={opt.name}
                              logoUrl={opt.logoUrl}
                              fallbackIcon={opt.icon || 'ri-building-line'}
                              sizeClass="size-4 shrink-0"
                            />
                            <span className="truncate font-medium text-foreground">{opt.name}</span>
                          </div>
                          <span className="text-[10px] font-mono font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                            {opt.count}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reset button if active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSaldoFilter('todos');
                setSelectedInstitutions([]);
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors"
              title="Restablecer filtros de tarjetas"
            >
              <i className="ri-close-circle-line text-sm" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        {/* Right side: Count counter */}
        <div className="text-xs font-mono text-muted-foreground">
          Mostrando <span className="font-bold text-foreground">{filteredCount}</span> de {totalCount} {itemLabel}
        </div>
      </div>

      {/* Selected institution chips */}
      {selectedInstitutions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-muted-foreground mr-1">Filtrado por:</span>
          {selectedInstitutions.map((inst) => (
            <span
              key={inst}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
            >
              <span>{inst}</span>
              <button
                type="button"
                onClick={() => toggleInstitution(inst)}
                className="hover:text-primary-foreground hover:bg-primary/40 rounded-full size-3.5 inline-flex items-center justify-center transition-colors"
                aria-label={`Quitar filtro ${inst}`}
              >
                <i className="ri-close-line text-[10px]" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
