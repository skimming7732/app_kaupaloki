import React from 'react';
import { useData } from '../../context/DataContext';

export const CreatedByHeader = ({ className = 'whitespace-nowrap px-4 py-3' }: { className?: string }) => (
  <th scope="col" className={className}>Creado por</th>
);

export const formatAuthorName = (
  rawName?: string | null,
  rawId?: string | null,
  usuarios?: Array<{ id: string; nombre?: string; codigo?: string; correo?: string }>
): string => {
  const isUuid = (val?: string | null) =>
    !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

  // 1. If rawName is already a valid human readable name (not a UUID)
  if (rawName && !isUuid(rawName)) {
    return rawName.trim();
  }

  // 2. Identify candidate UUID to look up in usuarios
  const candidateId = isUuid(rawName)
    ? rawName!.trim()
    : (rawId && isUuid(rawId) ? rawId.trim() : null);

  if (candidateId && usuarios?.length) {
    const found = usuarios.find((u) => u.id?.toLowerCase() === candidateId.toLowerCase());
    if (found?.nombre) return found.nombre;
    if (found?.codigo) return found.codigo;
    if (found?.correo) return found.correo;
  }

  // 3. Fallbacks
  if (rawName && rawName.trim() && !isUuid(rawName)) return rawName.trim();
  if (rawId && rawId.trim() && !isUuid(rawId)) return rawId.trim();

  // If still only UUID is available and not found in usuarios, return the raw value
  if (rawName && rawName.trim()) return rawName.trim();
  if (rawId && rawId.trim()) return rawId.trim();

  return 'Sin registro';
};

export const CreatedByCell = ({
  name,
  createdByName,
  createdBy,
  className = 'whitespace-nowrap px-4 py-3 text-muted-foreground',
}: {
  name?: string | null;
  createdByName?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  className?: string;
}) => {
  const dataContext = useData();
  const usuarios = dataContext?.data?.usuarios;
  const displayName = formatAuthorName(name || createdByName, createdBy, usuarios);

  return <td className={className}>{displayName}</td>;
};
