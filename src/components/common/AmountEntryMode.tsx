import React from 'react';

export type AmountMode = 'initial' | 'final';

export function AmountEntryMode({ mode, onChange }: {
  mode: AmountMode;
  onChange: (mode: AmountMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Calcular desde</span>
      <div role="group" aria-label="Calcular desde" className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
        {([['initial', 'Monto inicial'], ['final', 'Monto final']] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => onChange(value)}
            className="min-h-9 rounded-md px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground aria-pressed:bg-card aria-pressed:text-primary aria-pressed:shadow-sm">
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
