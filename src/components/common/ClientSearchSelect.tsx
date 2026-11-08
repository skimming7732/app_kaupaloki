import React from 'react';
import { useData, type NormalizedData } from '../../context/DataContext';
import { formatCOP, formatNumber } from '../../utils/formatters';
import { DetailSearchSelect } from './DetailSearchSelect';

export const ClientDetails = ({ client }: { client: NormalizedData['clientes'][number] }) => (
  <span className="block min-w-0 text-xs">
    <span className="block break-words font-semibold text-foreground">{client.nombre}</span>
    <span className="mt-0.5 block text-muted-foreground">
      Código cliente <span className="break-all font-mono font-semibold text-foreground">{client.codigo}</span>
    </span>
    <span className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1">
      <span><span className="block text-[10px] text-muted-foreground">Total negocios</span><strong>{formatNumber(client.totalNegocios ?? 0)}</strong></span>
      <span><span className="block text-[10px] text-muted-foreground">Total pagado</span><strong className="break-words">{formatCOP(client.totalDispersadoCOP)}</strong></span>
      <span><span className="block text-[10px] text-muted-foreground">Total pendiente</span><strong className="break-words">{formatCOP(client.saldoPendienteCOP)}</strong></span>
    </span>
  </span>
);

type Props = {
  id?: string;
  value: string;
  onChange: (clientId: string, clientLabel: string) => void;
  placeholder?: string;
  required?: boolean;
  compact?: boolean;
  inputClassName?: string;
  excludeIds?: string[];
  onAddNewClient?: (initialQuery?: string) => void;
};

export const ClientSearchSelect = ({
  id, value, onChange, placeholder = 'Buscar cliente por nombre o código', required, compact,
  inputClassName, excludeIds, onAddNewClient,
}: Props) => {
  const { data } = useData();
  const clients = data.clientes.filter((client) => !excludeIds?.includes(client.id));
  const selected = clients.find((client) => client.id === value || client.codigo === value || client.nombre === value);

  return <DetailSearchSelect
    id={id}
    value={selected?.id || ''}
    options={clients.map((client) => ({
      id: client.id,
      label: client.codigo ? client.codigo + ' · ' + client.nombre : client.nombre,
      search: client.codigo + ' ' + client.nombre,
      details: <ClientDetails client={client} />,
    }))}
    onChange={(id) => onChange(id, clients.find((client) => client.id === id)?.codigo || '')}
    placeholder={placeholder}
    emptyMessage="No se encontraron clientes."
    required={required}
    compact={compact}
    inputClassName={inputClassName}
    onAdd={onAddNewClient}
  />;
};
