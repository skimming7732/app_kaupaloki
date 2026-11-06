import React from 'react';

export const CreatedByHeader = () => <th scope="col" className="whitespace-nowrap px-4 py-3">Creado por</th>;

export const CreatedByCell = ({ name }: { name?: string | null }) => (
  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{name || 'Sin registro'}</td>
);
