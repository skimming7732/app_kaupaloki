import React from 'react';

export const TableSelectFilter = ({ label, value, onChange, children, className = '' }: {
  label: string; value: string; onChange: (value: string) => void; children: React.ReactNode; className?: string;
}) => (
  <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}
    className={'min-w-0 rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground ' + className}>
    {children}
  </select>
);
