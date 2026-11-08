import React, { useId, useRef, useState, type ReactNode } from 'react';
import { DIVISAS, type Divisa } from '../../data/appData';
import { fallbackBanderaUrl, normalizeSearch } from '../../utils/formatters';

const fieldClass = 'w-full min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground';

const currencyName = (currency: Divisa) =>
  currency.nombreDivisa || DIVISAS.find((item) => item.codigo === currency.codigo)?.nombreDivisa || currency.divisa;

const CurrencyLabel = ({ currency, showName = true }: { currency: Divisa; showName?: boolean }) => {
  const catalogCurrency = DIVISAS.find((item) => item.codigo === currency.codigo);
  const flag = currency.fallbackBanderaUrl || catalogCurrency?.fallbackBanderaUrl ||
    fallbackBanderaUrl[currency.codigo] || currency.banderaUrl;
  const name = currencyName(currency);

  return (
    <>
      <span className="relative flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-muted-foreground">
        <i className="ri-money-dollar-circle-line" aria-hidden="true" />
        {flag && (
          <img
            key={flag}
            src={flag}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => { event.currentTarget.hidden = true; }}
          />
        )}
      </span>
      <span className="min-w-14 shrink-0 whitespace-nowrap font-semibold">{currency.codigo}</span>
      {showName && name && name !== currency.codigo && (
        <span className="text-muted-foreground">{name}</span>
      )}
    </>
  );
};

export function CurrencySelect({ currencies, value, onChange, label = 'Divisa', details, align = 'left' }: {
  currencies: Divisa[];
  value: string;
  onChange: (code: string) => void;
  label?: string;
  align?: 'left' | 'right';
  details?: (currency: Divisa) => ReactNode;
}) {
  const id = useId();
  const currencyTrigger = useRef<HTMLButtonElement>(null);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState('');
  const selectedCurrency = currencies.find((currency) => currency.codigo === value);
  const query = normalizeSearch(currencyQuery.trim());
  const matchingCurrencies = currencies.filter((currency) =>
    normalizeSearch([currency.codigo, currencyName(currency), currency.pais].join(' ')).includes(query)
  );
  const selectCurrency = (currency: Divisa) => {
    onChange(currency.codigo);
    setCurrencyOpen(false);
    currencyTrigger.current?.focus();
  };

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setCurrencyOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && currencyOpen) {
          event.preventDefault();
          event.stopPropagation();
          setCurrencyOpen(false);
          currencyTrigger.current?.focus();
        }
      }}
    >
      <span id={id + '-currency-label'} className={labelClass}>{label}</span>
      <button
        id={id + '-currency'}
        ref={currencyTrigger}
        type="button"
        aria-labelledby={id + '-currency-label ' + id + '-currency'}
        aria-expanded={currencyOpen}
        onMouseDown={(event) => {
          if (currencyOpen) event.preventDefault();
        }}
        onClick={() => {
          setCurrencyQuery('');
          setCurrencyOpen(!currencyOpen);
        }}
        className={fieldClass + ' flex items-center justify-between gap-2 text-left'}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedCurrency ? <CurrencyLabel currency={selectedCurrency} showName={false} /> : value || 'Seleccionar divisa'}
        </span>
        <i className="ri-arrow-down-s-line text-muted-foreground" aria-hidden="true" />
      </button>
      {currencyOpen && (
        <div className={'absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-border bg-card p-1.5 shadow-lg sm:w-96 ' + (align === 'right' ? 'sm:left-auto' : 'sm:right-auto')}>
          <input
            autoFocus
            type="search"
            aria-label="Buscar divisa"
            placeholder="Buscar por código, nombre o país"
            value={currencyQuery}
            onChange={(event) => setCurrencyQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              if (matchingCurrencies[0]) selectCurrency(matchingCurrencies[0]);
            }}
            className={fieldClass}
          />
          <div className="mt-1 max-h-44 overflow-y-auto">
            {matchingCurrencies.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">No se encontraron divisas.</p>
            )}
            {matchingCurrencies.map((currency) => (
              <button
                type="button"
                key={currency.codigo}
                aria-pressed={currency.codigo === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectCurrency(currency)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted aria-pressed:bg-primary/10"
              >
                <CurrencyLabel currency={currency} />
                {details && <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{details(currency)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
