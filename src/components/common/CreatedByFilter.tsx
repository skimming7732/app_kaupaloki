import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatAuthorName } from './CreatedByCell';

interface CreatedByFilterProps {
  value: string;
  onChange: (value: string) => void;
  records: Array<{ createdBy?: string | null; createdByName?: string | null }>;
  className?: string;
  label?: string;
}

export const CreatedByFilter: React.FC<CreatedByFilterProps> = ({
  value,
  onChange,
  records,
  className = 'w-full',
  label = 'Creado por',
}) => {
  const { data } = useData();

  const creators = useMemo(() => {
    const names = new Set<string>();
    records.forEach((r) => {
      const name = formatAuthorName(r.createdByName, r.createdBy, data.usuarios);
      if (name && name !== 'Sin registro') {
        names.add(name);
      }
    });

    // Also include any staff users from data.usuarios who may have registered records
    (data.usuarios || []).forEach((u) => {
      if (u.nombre && u.nombre !== 'Usuario') {
        names.add(u.nombre);
      }
    });

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [records, data.usuarios]);

  return (
    <div className={`min-w-0 ${className}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        <option value="">Todos los creadores</option>
        {creators.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
};
