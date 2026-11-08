import React, { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export type DetailOption = { id: string; label: string; search: string; details: ReactNode };

type Props = {
  id?: string;
  name?: string;
  options: DetailOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  emptyMessage: string;
  required?: boolean;
  compact?: boolean;
  showSelectedDetails?: boolean;
  inputClassName?: string;
  onAdd?: (query: string) => void;
};

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const DetailSearchSelect = ({
  id, name, options, value, onChange, placeholder, emptyMessage, required, compact, showSelectedDetails = true, inputClassName, onAdd,
}: Props) => {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const selected = options.find((option) => option.id === value);
  const filtered = options.filter((option) => normalize(option.search).includes(normalize(query.trim())));
  const activeId = open && filtered[active] ? listId + '-' + active : undefined;

  useEffect(() => {
    input.current?.setCustomValidity(required && !selected && query ? 'Elige una opción de la lista.' : '');
  }, [required, selected, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setActive(-1);
  };

  const select = (option: DetailOption) => {
    onChange(option.id);
    input.current?.focus();
    close();
  };

  return (
    <div className="relative min-w-0 w-full" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) close();
    }}>
      {name && <input type="hidden" name={name} value={selected?.id || ''} />}
      <div className="relative">
        <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          ref={input}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-label={id ? undefined : placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={activeId}
          required={required}
          placeholder={placeholder}
          value={query || selected?.label || ''}
          onFocus={(event) => { event.currentTarget.select(); setOpen(true); }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(-1);
            setOpen(true);
            if (value) onChange('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && open) {
              event.preventDefault();
              event.stopPropagation();
              close();
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              if (!filtered.length) return;
              const next = active < 0 ? (event.key === 'ArrowDown' ? 0 : filtered.length - 1)
                : (active + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length;
              setActive(next);
              requestAnimationFrame(() => document.getElementById(listId + '-' + next)?.scrollIntoView({ block: 'nearest' }));
            } else if (event.key === 'Enter' && open) {
              event.preventDefault();
              const option = filtered[active] ?? (filtered.length === 1 ? filtered[0] : undefined);
              if (option) select(option);
            }
          }}
          className={'w-full min-w-0 rounded-xl border border-input bg-background pl-8 pr-8 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ' +
            (compact ? 'h-8 text-xs ' : 'min-h-11 text-sm ') + (inputClassName || '')}
        />
        {value ? (
          <button type="button" aria-label="Limpiar selección"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
            onClick={() => { onChange(''); setQuery(''); setActive(-1); input.current?.focus(); setOpen(true); }}>
            <i className="ri-close-line" aria-hidden="true" />
          </button>
        ) : <i className="ri-arrow-down-s-line pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />}
      </div>
      {open && (
        <div className={'mt-1.5 rounded-xl border border-border bg-card p-1.5 shadow-lg ' +
          (compact ? 'absolute left-0 right-0 z-30 sm:right-auto sm:w-80' : '')}>
          {onAdd && (
            <button type="button" className="mb-1 w-full rounded-lg bg-primary/10 px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/20"
              onClick={() => { onAdd(query.trim()); close(); }}>
              <i className="ri-user-add-line mr-1.5" aria-hidden="true" />Agregar nuevo cliente
            </button>
          )}
          <div id={listId} role="listbox" aria-label={placeholder} className="max-h-60 space-y-1 overflow-y-auto">
            {filtered.map((option, index) => (
              <button key={option.id} id={listId + '-' + index} type="button" role="option" tabIndex={-1}
                aria-selected={option.id === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(option)}
                className={'block w-full rounded-lg border px-3 py-2 text-left hover:bg-muted ' +
                  (index === active || option.id === value ? 'border-primary/30 bg-primary/10' : 'border-transparent')}>
                {option.details}
              </button>
            ))}
          </div>
          {!filtered.length && <p className="px-3 py-2 text-xs text-muted-foreground">{emptyMessage}</p>}
        </div>
      )}
      {selected && !open && !compact && showSelectedDetails && (
        <div className="mt-2 rounded-xl border border-border bg-muted/30 px-3 py-2">{selected.details}</div>
      )}
    </div>
  );
};
