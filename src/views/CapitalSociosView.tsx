import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { AccountSelect, accountLabel, type Account } from '../components/modals/AccountSelect';
import { RecordActions, RecordDialog, recordButtonClass, recordFieldClass, recordLabelClass } from '../components/modals/RecordDialog';
import { KpiStrip } from '../components/common/KpiStrip';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { formatCOP, formatDate, formatCurrency, formatRate, normalizeSearch } from '../utils/formatters';
import { formatAmountField, parseAmountInput } from '../utils/amountInput';
import { prepareSuccessSound } from '../utils/confirmationSound';
import { capitalAmounts, capitalLabels, loadCapitalRows, summarizeCapital, type CapitalKind, type CapitalMethod, type CapitalMovement, type CapitalPerson } from '../utils/capitalSocios';

type Action = 'persona' | 'contrato' | 'liquidar' | 'adelanto' | 'rendimiento';
const actionLabels: Record<Action, string> = {
  persona: 'Agregar socio o inversionista', contrato: 'Nuevo contrato', liquidar: 'Liquidar',
  adelanto: 'Adelantar', rendimiento: 'Registrar rendimiento',
};
const headings = ['Fecha', 'Nombre', 'Tipo', 'Movimiento', 'Capital aportado', 'Ingreso por dividendo', 'Ingreso por interés', 'Egreso', 'Retiro de capital', 'Total capital', 'Total saldo', 'Creado por', 'Acciones'];
const kindBadgeClasses: Record<CapitalKind, string> = {
  CONTRATO: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  DIVIDENDO: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  INTERES: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  LIQUIDACION: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  ADELANTO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  RETIRO: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
};
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' }).format(new Date());
const isCash = (account: Account) => account.institucion?.toUpperCase() === 'EFECTIVO' || (account.activo || '').toUpperCase().includes('EFECTIVO');

const directoryPath = '/socios-inversionistas';

function personInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return Array.from(parts[0] || '').slice(0, 2).join('').toUpperCase();
  return (Array.from(parts[0])[0] + Array.from(parts[parts.length - 1])[0]).toUpperCase();
}

export function SociosInversionistasView() {
  const { socioId } = useParams();
  return <CapitalSociosView key={socioId || 'directory'} directory personId={socioId} />;
}

export function CapitalSociosView({ directory = false, personId }: { directory?: boolean; personId?: string } = {}) {
  const { data, syncData } = useData();
  const [people, setPeople] = useState<CapitalPerson[]>([]);
  const [movements, setMovements] = useState<CapitalMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [kindFilter, setKindFilter] = useState<CapitalKind | ''>('');
  const [search, setSearch] = useState('');
  const showDirectory = directory && !personId;
  const [action, setAction] = useState<Action>();
  const [detail, setDetail] = useState<CapitalMovement>();
  const [editingMovement, setEditingMovement] = useState<CapitalMovement>();

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [people, movements] = await Promise.all([
        loadCapitalRows<CapitalPerson>('capital_socios'),
        loadCapitalRows<CapitalMovement>('capital_movimientos'),
      ]);
      setPeople(people);
      setMovements(movements);
    } catch {
      setError('No se pudieron cargar los registros.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const currentPerson = personId ? people.find((person) => person.id === personId) : undefined;
  const activePerson = personId || selected;
  const rows = movements.filter((row) => (!activePerson || row.socio_id === activePerson) && (!kindFilter || row.tipo === kindFilter));
  const totals = summarizeCapital(rows);
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const saved = () => {
    setAction(undefined);
    setEditingMovement(undefined);
    setDetail(undefined);
    void reload();
    void syncData();
  };

  const loadError = error && (
    <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
      {error} <button type="button" onClick={() => void reload()} className="underline">Reintentar</button>
    </p>
  );
  const backLink = <Link to={directoryPath} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
    <i className="ri-arrow-left-line" aria-hidden="true" /> Volver a socios e inversionistas
  </Link>;

  if (showDirectory) {
    const movementsByPerson = new Map<string, CapitalMovement[]>();
    for (const movement of movements) {
      const list = movementsByPerson.get(movement.socio_id);
      if (list) list.push(movement);
      else movementsByPerson.set(movement.socio_id, [movement]);
    }
    const query = normalizeSearch(search.trim());
    const visiblePeople = people.filter((person) => normalizeSearch(person.nombre).includes(query));
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input type="search" aria-label="Buscar por nombre" placeholder="Buscar por nombre"
            value={search} onChange={(event) => setSearch(event.target.value)} className={recordFieldClass + ' max-w-xs'} />
          <button type="button" onClick={() => setAction('persona')} className={recordButtonClass}>{actionLabels.persona}</button>
        </div>
        {loadError}
        {visiblePeople.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visiblePeople.map((person) => {
              const summary = summarizeCapital(movementsByPerson.get(person.id) || []);
              const isPartner = person.tipo === 'SOCIO';
              const figures = [
                { label: 'Capital', amount: summary.capital },
                { label: 'Saldo por liquidar', amount: summary.balance },
                { label: 'Intereses', amount: summary.interest },
                ...(isPartner ? [{ label: 'Dividendos', amount: summary.dividends }] : []),
              ];
              return (
                <li key={person.id} className="min-w-0">
                  <Link to={directoryPath + '/' + person.id}
                    className="group flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold ${isPartner ? 'bg-primary/10 text-[var(--brand-primary)]' : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'}`}>
                        {personInitials(person.nombre)}
                      </span>
                      <div className="min-w-0">
                        <h2 className="break-words text-sm font-bold">{person.nombre}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">{isPartner ? 'Socio' : 'Inversionista'}</p>
                      </div>
                    </div>
                    <dl className="mt-4 grid flex-1 grid-cols-2 gap-2">
                      {figures.map(({ label, amount }) => (
                        <div key={label} className="min-w-0 rounded-xl bg-muted/60 px-2.5 py-2">
                          <dt className="text-[11px] text-muted-foreground">{label}</dt>
                          <dd className={`mt-1 break-words text-xs font-bold tabular-nums ${amount < 0 ? 'text-destructive' : ''}`}>{formatCOP(amount)}</dd>
                        </div>
                      ))}
                    </dl>
                    <span className="mt-3 inline-flex items-center gap-1 self-end text-xs font-semibold text-[var(--brand-primary)]">
                      Ver ficha <i className="ri-arrow-right-line transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : !error && <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {loading ? 'Cargando socios e inversionistas…' : search ? 'No hay coincidencias.' : 'Aún no hay socios ni inversionistas registrados.'}
        </p>}
        {action === 'persona' && <CapitalForm action="persona" initialPerson="" people={people} movements={[]}
          onClose={() => setAction(undefined)} onSaved={saved} />}
      </div>
    );
  }

  if (personId && !currentPerson) {
    return <div className="space-y-4">
      {backLink}
      {loadError || <p className="text-sm text-muted-foreground">{loading ? 'Cargando ficha…' : 'No se encontró esta ficha.'}</p>}
    </div>;
  }

  return (
    <div className="space-y-4">
      {currentPerson && backLink}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {currentPerson ? <div className="min-w-0 mr-2">
            <h2 className="break-words text-base font-semibold">{currentPerson.nombre}</h2>
            <p className="text-xs text-muted-foreground">{currentPerson.tipo === 'SOCIO' ? 'Socio' : 'Inversionista'}</p>
          </div> : <>
            <label htmlFor="capital-person-filter" className="sr-only">Socio o inversionista</label>
            <select id="capital-person-filter" className={recordFieldClass + ' w-auto'} value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value="">Todos los socios e inversionistas</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.nombre}</option>)}
            </select>
          </>}
          <label htmlFor="capital-kind-filter" className="sr-only">Tipo de movimiento</label>
          <select id="capital-kind-filter" className={recordFieldClass + ' w-auto'} value={kindFilter} onChange={(event) => setKindFilter(event.target.value as CapitalKind | '')}>
            <option value="">Todos los movimientos</option>
            {(Object.keys(capitalLabels) as CapitalKind[]).map((k) => (
              <option key={k} value={k}>{capitalLabels[k]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(actionLabels) as Action[]).filter((key) => !currentPerson || key !== 'persona').map((key) => (
            <button type="button" key={key} onClick={() => setAction(key)} disabled={loading || (key !== 'persona' && !people.length)}
              className={key === 'persona' ? recordButtonClass : 'min-h-10 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50'}>
              {actionLabels[key]}
            </button>
          ))}
        </div>
      </section>

      {loadError}
      <KpiStrip metrics={[
        { label: 'Total capital', value: formatCOP(totals.capital), featured: true },
        { label: 'Total saldo', value: formatCOP(totals.balance) },
        { label: 'Intereses pagados', value: <span title="Intereses liquidados, incluidos los acreditados al saldo">{formatCOP(totals.interest)}</span> },
      ]} />

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>{headings.map((name, index) => <th key={name} scope="col" className={'whitespace-nowrap px-3 py-3 font-semibold ' + (index > 3 && index < 11 ? 'text-right' : '')}>{name}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            <PaginatedRows rows={rows} columns={headings.length} resetKey={activePerson + ':' + kindFilter}>{(row) => {
              const person = peopleById.get(row.socio_id);
              const a = capitalAmounts(row);
              const kindLabel = row.tipo === 'INTERES'
                ? (row.medio ? 'Interés (Pagado)' : 'Interés (Al saldo)')
                : capitalLabels[row.tipo];
              return (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-2">{formatDate(row.fecha)}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => setDetail(row)} className="whitespace-nowrap font-semibold text-primary hover:underline"
                      aria-label={'Ver detalle de ' + capitalLabels[row.tipo] + ' de ' + (person?.nombre || 'socio')}>
                      {person?.nombre || '—'}
                    </button>
                  </td>
                  <td className="px-3 py-2">{person?.tipo === 'SOCIO' ? 'Socio' : 'Inversionista'}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className={'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ' + (kindBadgeClasses[row.tipo] || 'bg-muted text-foreground border-border')}>
                      {kindLabel}
                    </span>
                  </td>
                  {[a.contribution, a.dividends, a.interest, a.outflow, a.withdrawal, a.capital, a.balance].map((value, index) =>
                    <td key={index} className={'whitespace-nowrap px-3 py-2 text-right font-mono ' + (index > 4 ? 'font-semibold ' : '') + (value < 0 ? 'text-destructive' : '')}>
                      {value || index > 4 ? formatCOP(value) : '—'}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{row.created_by_name || 'Sin registro'}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setEditingMovement(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:bg-muted transition-colors"
                    >
                      <i className="ri-edit-line" aria-hidden="true" /> Editar
                    </button>
                  </td>
                </tr>
              );
            }}</PaginatedRows>
            {!rows.length && <tr><td colSpan={headings.length} className="p-7 text-center text-muted-foreground">
              {loading ? 'Cargando movimientos…' : 'Todavía no hay movimientos registrados.'}
            </td></tr>}
          </tbody>
        </table>
      </div>

      {action && <CapitalForm action={action} initialPerson={activePerson} people={currentPerson ? [currentPerson] : people} movements={movements} onClose={() => setAction(undefined)} onSaved={saved} />}
      {editingMovement && (
        <CapitalForm
          action="contrato"
          editMovement={editingMovement}
          initialPerson={editingMovement.socio_id}
          people={people}
          movements={movements}
          onClose={() => setEditingMovement(undefined)}
          onSaved={saved}
        />
      )}
      {detail && <RecordDialog title={capitalLabels[detail.tipo]} description={peopleById.get(detail.socio_id)?.nombre || ''} icon="ri-safe-line" onClose={() => setDetail(undefined)}>
        <dl className="space-y-2 text-sm">
          <div><dt className="font-semibold">Código</dt><dd className="font-mono">{detail.codigo}</dd></div>
          <div><dt className="font-semibold">Movimiento</dt><dd>{detail.tipo === 'INTERES' ? (detail.medio ? 'Interés (Pagado)' : 'Interés (Acreditado al saldo)') : capitalLabels[detail.tipo]}</dd></div>
          <div><dt className="font-semibold">Fecha</dt><dd>{formatDate(detail.fecha)}</dd></div>
          <div><dt className="font-semibold">Monto</dt><dd>{formatCurrency(detail.monto, detail.medio === 'USDT' ? 'USDT' : 'COP')}</dd></div>
          {detail.tasa != null && <div><dt className="font-semibold">Tasa del día</dt><dd>{formatRate(detail.tasa)} COP / USDT · {formatCOP(detail.monto_cop)}</dd></div>}
          {detail.medio && <div><dt className="font-semibold">{detail.tipo === 'CONTRATO' ? 'Destino del aporte' : 'Cuenta de origen'}</dt><dd>
            {[...data.activosLiquidos, ...data.activosDigitales].filter((account) => account.id === (detail.cuenta_liquida_id || detail.cuenta_digital_id)).map(accountLabel)[0] || 'Cuenta no disponible'}
          </dd></div>}
          {detail.condiciones && <div><dt className="font-semibold">Condiciones</dt><dd className="whitespace-pre-wrap break-words">{detail.condiciones}</dd></div>}
          {detail.contrato_id && <div><dt className="font-semibold">Contrato</dt><dd>
            {formatDate(movements.find((row) => row.id === detail.contrato_id)?.fecha)}
          </dd></div>}
          <div><dt className="font-semibold">Creado por</dt><dd>{detail.created_by_name || 'Sin registro'}</dd></div>
        </dl>
        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => {
              const target = detail;
              setDetail(undefined);
              setEditingMovement(target);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors"
          >
            <i className="ri-edit-line" aria-hidden="true" /> Editar o eliminar movimiento
          </button>
        </div>
      </RecordDialog>}
    </div>
  );
}

function CapitalForm({ action, editMovement, initialPerson, people, movements, onClose, onSaved }: {
  action: Action; editMovement?: CapitalMovement; initialPerson: string; people: CapitalPerson[]; movements: CapitalMovement[]; onClose: () => void; onSaved: () => void;
}) {
  const { data } = useData();
  const [id] = useState(() => editMovement?.id || crypto.randomUUID());
  const [personId, setPersonId] = useState(editMovement?.socio_id || initialPerson || people[0]?.id || '');
  const [kind, setKind] = useState<CapitalKind>(
    editMovement ? editMovement.tipo : (action === 'contrato' ? 'CONTRATO' : action === 'adelanto' ? 'ADELANTO' : action === 'liquidar' ? 'LIQUIDACION' : 'INTERES')
  );
  const [payInterest, setPayInterest] = useState(editMovement ? Boolean(editMovement.tipo === 'INTERES' && editMovement.medio) : false);
  const [method, setMethod] = useState<CapitalMethod>(editMovement?.medio || 'EFECTIVO');
  const [account, setAccount] = useState(editMovement?.cuenta_liquida_id || editMovement?.cuenta_digital_id || '');
  const [contract, setContract] = useState(editMovement?.contrato_id || '');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const person = people.find((row) => row.id === personId);
  const contracts = movements.filter((row) => row.socio_id === personId && row.tipo === 'CONTRATO' && row.id !== editMovement?.id);
  const needsAccount = !['DIVIDENDO', 'INTERES'].includes(kind) || (kind === 'INTERES' && payInterest);
  const needsContract = kind === 'RETIRO' || kind === 'INTERES';
  const accounts: Account[] = (method === 'USDT' ? data.activosDigitales : data.activosLiquidos.filter((item) =>
    (item.divisa || 'COP') === 'COP' && Boolean(isCash(item)) === (method === 'EFECTIVO')
  )).map((item) => ({ ...item, saldoReal: null }));

  const handleDelete = async () => {
    if (!editMovement || busy || deleting) return;
    if (!window.confirm(`¿Eliminar el movimiento ${editMovement.codigo} (${capitalLabels[editMovement.tipo]})? Se revertirá automáticamente en las cuentas vinculadas.`)) return;
    setDeleting(true);
    setError('');
    try {
      const { error } = await supabase.from('capital_movimientos').delete().eq('id', editMovement.id);
      if (error) throw error;
      onSaved();
    } catch (err) {
      const issue = err as { code?: string; message?: string };
      setError(issue.code === '42501' ? 'Tu perfil no tiene permiso para eliminar esta operación.'
        : issue.code === '23503' ? 'No se puede eliminar este contrato porque tiene movimientos asociados.'
        : issue.message || 'No se pudo eliminar el movimiento.');
    } finally {
      setDeleting(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || deleting) return;
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) || '').trim();
    const amount = parseAmountInput(field('monto'));
    const rate = needsAccount && method === 'USDT' ? parseAmountInput(field('tasa')) : null;
    if (action === 'persona' && !editMovement ? !field('nombre')
      : !personId || !Number.isFinite(amount) || amount <= 0 || (rate !== null && (!Number.isFinite(rate) || rate <= 0))
        || (needsAccount && !accounts.some((item) => item.id === account)) || (needsContract && !contracts.some((item) => item.id === contract))) {
      setError('Completa los datos y verifica que el monto y la tasa sean mayores que cero.');
      return;
    }
    setBusy(true);
    setError('');
    const finish = prepareSuccessSound();
    try {
      if (editMovement) {
        const updatePayload: Record<string, string | number | null> = {
          socio_id: personId,
          fecha: field('fecha'),
          tipo: kind,
          monto: amount,
          tasa: rate,
          medio: needsAccount ? method : null,
          cuenta_liquida_id: needsAccount && method !== 'USDT' ? account : null,
          cuenta_digital_id: needsAccount && method === 'USDT' ? account : null,
          contrato_id: needsContract ? contract : null,
          condiciones: kind === 'CONTRATO' ? field('condiciones') : null,
        };
        const { error } = await supabase.from('capital_movimientos').update(updatePayload).eq('id', editMovement.id);
        if (error) throw error;
      } else {
        const table = action === 'persona' ? 'capital_socios' : 'capital_movimientos';
        const record: Record<string, string | number | null> = action === 'persona'
          ? { id, nombre: field('nombre'), tipo: field('tipo') }
          : { id, socio_id: personId, fecha: field('fecha'), tipo: kind, monto: amount, tasa: rate,
              medio: needsAccount ? method : null,
              cuenta_liquida_id: needsAccount && method !== 'USDT' ? account : null,
              cuenta_digital_id: needsAccount && method === 'USDT' ? account : null,
              contrato_id: needsContract ? contract : null, condiciones: kind === 'CONTRATO' ? field('condiciones') : null };
        const { error } = await supabase.from(table).insert(record);
        if (error) {
          if (error.code !== '23505') throw error;
          const previous = await supabase.from(table).select('id').eq('id', id).maybeSingle();
          if (!previous.data) throw new Error('Ya existe un socio o inversionista con ese nombre.');
        }
      }
      finish(true);
      onSaved();
    } catch (error) {
      const issue = error as { code?: string; message?: string };
      setError(issue.code === '42501' ? 'Tu perfil no tiene permiso para guardar esta operación.'
        : issue.code === '23514' ? 'Revisa el monto, la cuenta y las condiciones del movimiento.'
        : issue.message || 'No se pudo guardar la operación.');
    } finally {
      finish(false);
      setBusy(false);
    }
  };

  return <RecordDialog title={editMovement ? `Editar ${editMovement.codigo}` : actionLabels[action]} description={action === 'persona' && !editMovement ? 'Elige el tipo de participación.' : 'El saldo se expresa en pesos colombianos.'}
    icon="ri-safe-line" onClose={onClose} busy={busy || deleting} error={error}>
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={busy || deleting} className="space-y-3">
        {action === 'persona' && !editMovement ? <>
          <label className={recordLabelClass}>Nombre<input name="nombre" required maxLength={150} className={recordFieldClass} /></label>
          <label className={recordLabelClass}>Tipo<select name="tipo" className={recordFieldClass}>
            <option value="SOCIO">Socio</option><option value="INVERSIONISTA">Inversionista</option>
          </select></label>
        </> : <>
          <label className={recordLabelClass}>Socio o inversionista
            <select required value={personId} className={recordFieldClass} onChange={(event) => {
              const next = event.target.value;
              setPersonId(next); setContract('');
              if (kind === 'DIVIDENDO' && people.find((item) => item.id === next)?.tipo !== 'SOCIO') setKind('INTERES');
            }}>
              {people.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </label>
          {(editMovement || action === 'liquidar' || action === 'rendimiento') && <label className={recordLabelClass}>Concepto
            <select value={kind} className={recordFieldClass} onChange={(event) => {
              const next = event.target.value as CapitalKind;
              setKind(next);
              setContract('');
              if (next === 'INTERES') setPayInterest(action === 'liquidar');
            }}>
              {editMovement ? <>
                <option value="CONTRATO">{capitalLabels.CONTRATO}</option>
                <option value="ADELANTO">{capitalLabels.ADELANTO}</option>
                <option value="LIQUIDACION">{capitalLabels.LIQUIDACION}</option>
                <option value="INTERES">{capitalLabels.INTERES}</option>
                {person?.tipo === 'SOCIO' && <option value="DIVIDENDO">{capitalLabels.DIVIDENDO}</option>}
                <option value="RETIRO">{capitalLabels.RETIRO}</option>
              </> : action === 'liquidar' ? <><option value="LIQUIDACION">Pagar saldo</option><option value="RETIRO">Retirar capital</option><option value="INTERES">Liquidar interés</option></>
                : <><option value="INTERES">Interés</option>{person?.tipo === 'SOCIO' && <option value="DIVIDENDO">Dividendo</option>}</>}
            </select>
          </label>}
          {needsContract && <label className={recordLabelClass}>Contrato
            <select value={contract} required className={recordFieldClass} onChange={(event) => setContract(event.target.value)}>
              <option value="">{contracts.length ? 'Elige un contrato' : 'Esta persona aún no tiene contratos'}</option>
              {contracts.map((item) => <option key={item.id} value={item.id}>{formatDate(item.fecha)} · {formatCOP(item.monto_cop)} · {item.condiciones?.slice(0, 45)}</option>)}
            </select>
          </label>}
          {kind === 'INTERES' && <label className={recordLabelClass}>Liquidación del interés
            <select value={payInterest ? 'pagar' : 'saldo'} className={recordFieldClass} onChange={(event) => setPayInterest(event.target.value === 'pagar')}>
              <option value="saldo">Acreditar al saldo del socio</option><option value="pagar">Pagar ahora</option>
            </select>
          </label>}
          {needsAccount && <>
            <label className={recordLabelClass}>{kind === 'CONTRATO' ? 'Medio del aporte' : 'Medio de pago'}
              <select value={method} className={recordFieldClass} onChange={(event) => { setMethod(event.target.value as CapitalMethod); setAccount(''); }}>
                <option value="EFECTIVO">Efectivo</option><option value="CUENTA">Cuenta bancaria</option><option value="USDT">Activo digital (USDT)</option>
              </select>
            </label>
            <AccountSelect label={kind === 'CONTRATO' ? 'Destino del dinero' : 'Cuenta de origen'} accounts={accounts} value={account} onChange={setAccount} />
          </>}
          <div className="grid grid-cols-2 gap-2">
            <label className={recordLabelClass}>Fecha<input name="fecha" type="date" defaultValue={editMovement?.fecha || today()} required className={recordFieldClass} /></label>
            <label className={recordLabelClass}>Monto ({needsAccount && method === 'USDT' ? 'USDT' : 'COP'})
              <input name="monto" inputMode="decimal" defaultValue={editMovement ? String(editMovement.monto) : ''} onChange={(event) => formatAmountField(event.currentTarget)} required className={recordFieldClass} />
            </label>
          </div>
          {needsAccount && method === 'USDT' && <label className={recordLabelClass}>Tasa del día (COP por USDT)
            <input name="tasa" inputMode="decimal" defaultValue={editMovement?.tasa != null ? String(editMovement.tasa) : ''} onChange={(event) => formatAmountField(event.currentTarget)} required className={recordFieldClass} />
          </label>}
          {kind === 'CONTRATO' && <label className={recordLabelClass}>Condiciones
            <textarea name="condiciones" defaultValue={editMovement?.condiciones || ''} placeholder="Tasa acordada, plazo y condiciones de retiro" maxLength={4000} rows={3} required className={recordFieldClass} />
          </label>}
        </>}
      </fieldset>
      <RecordActions busy={busy} isDeleting={deleting} onDelete={editMovement ? handleDelete : undefined} label={editMovement ? 'Actualizar' : 'Guardar'} onClose={onClose} />
    </form>
  </RecordDialog>;
}
