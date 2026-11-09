import React from 'react';

export const CreatedByHeader = () => <th scope="col" className="whitespace-nowrap px-4 py-3">Creado por</th>;

export const CreatedByCell = ({
  name,
  createdByName,
  createdBy,
}: {
  name?: string | null;
  createdByName?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
}) => (
  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{name || createdByName || createdBy || 'Sin registro'}</td>
);
