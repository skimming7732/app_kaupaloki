import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { AccountSelect, accountLabel, type Account } from '../components/modals/AccountSelect';
import { RecordActions, RecordDialog, recordButtonClass, recordFieldClass, recordLabelClass } from '../components/modals/RecordDialog';
import { KpiStrip } from '../components/common/KpiStrip';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { compareChronologicalDesc, formatCOP, formatDate, formatCurrency, formatRate, normalizeSearch } from '../utils/formatters';
import { formatAmountField, parseAmountInput } from '../utils/amountInput';
import { prepareSuccessSound } from '../utils/confirmationSound';
import { capitalAmounts, capitalLabels, loadCapitalRows, summarizeCapital, type CapitalKind, type CapitalMethod, type CapitalMovement, type CapitalPerson } from '../utils/capitalSocios';

type CapitalChange = { person: CapitalPerson } | { movement: CapitalMovement } | { deletedMovementId: string };

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
  const latestReload = useRef(0);
  const [selected, setSelected] = useState('');
  const [kindFilter, setKindFilter] = useState<CapitalKind | ''>('');
  const [search, setSearch] = useState('');
  const showDirectory = directory && !personId;
  const [action, setAction] = useState<Action>();
  const [detail, setDetail] = useState<CapitalMovement>();
  const [editingMovement, setEditingMovement] = useState<CapitalMovement>();

  const reload = useCallback(async () => {
    const request = ++latestReload.current;
    setLoading(true);
    setError('');
    try {
      const [people, movements] = await Promise.all([
        loadCapitalRows<CapitalPerson>('capital_socios'),
        loadCapitalRows<CapitalMovement>('capital_movimientos'),
      ]);
      if (request !== latestReload.current) return;
      setPeople(people);
      setMovements(movements);
    } catch {
      if (request === latestReload.current) setError('No se pudieron cargar los registros.');
    } finally {
      if (request === latestReload.current) setLoading(false);
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const currentPerson = personId ? people.find((person) => person.id === personId) : undefined;
  const activePerson = personId || selected;
  const rows = movements.filter((row) => (!activePerson || row.socio_id === activePerson) && (!kindFilter || row.tipo === kindFilter));
  const totals = summarizeCapital(rows);
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const saved = (change: CapitalChange) => {
    latestReload.current++;
    setLoading(false);
    setError('');
    if ('person' in change) {
      setPeople((current) => [change.person, ...current.filter((person) => person.id !== change.person.id)]
        .sort((left, right) => left.nombre.localeCompare(right.nombre)));
    } else if ('movement' in change) {
      setMovements((current) => [change.movement, ...current.filter((row) => row.id !== change.movement.id)]
        .sort(compareChronologicalDesc));
    } else {
      setMovements((current) => current.filter((row) => row.id !== change.deletedMovementId));
    }
    setAction(undefined);
    setEditingMovement(undefined);
    setDetail(undefined);
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
    const dirTotals = summarizeCapital(movements, people);
    return (
      <div className="space-y-4">
        <KpiStrip metrics={[
          { label: 'Total capital aportado', value: formatCOP(dirTotals.capital), featured: true },
          { label: 'Dividendos a socios', value: formatCOP(dirTotals.dividends) },
          { label: 'Adelantos a socios', value: formatCOP(dirTotals.advances) },
          { label: 'Saldo por liquidar a socios', value: <span className={dirTotals.balanceSocios > 0 ? 'text-primary font-bold' : ''}>{formatCOP(dirTotals.balanceSocios)}</span> },
          { label: 'Intereses a inversionistas', value: formatCOP(dirTotals.interest) },
        ]} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <input type="search" aria-label="Buscar por nombre" placeholder="Buscar por nombre"
            value={search} onChange={(event) => setSearch(event.target.value)} className={recordFieldClass + ' max-w-xs'} />
          <button type="button" onClick={() => setAction('persona')} className={recordButtonClass}>{actionLabels.persona}</button>
        </div>
        {loadError}
        {visiblePeople.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visiblePeople.map((person) => {
              const personMovements = movementsByPerson.get(person.id) || [];
              const summary = summarizeCapital(personMovements);
              const contractsWithComments = personMovements.filter((row) => row.tipo === 'CONTRATO' && row.condiciones?.trim());
              const isPartner = person.tipo === 'SOCIO';
              const figures = isPartner ? [
                { label: 'Capital aportado', amount: summary.capital },
                { label: 'Dividendos asignados', amount: summary.dividends },
                { label: 'Adelantos entregados', amount: summary.advances },
                { label: 'Saldo por liquidar', amount: summary.balance },
              ] : [
                { label: 'Capital invertido', amount: summary.capital },
                { label: 'Intereses generados', amount: summary.interest },
                { label: 'Saldo por liquidar', amount: summary.balance },
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
                      {figures.map(({ label, amount }) => {
                        const isBalance = label === 'Saldo por liquidar';
                        const badge = isPartner && isBalance ? (
                          amount > 0 ? <span className="block text-[10px] font-semibold text-primary">Por pagar</span>
                            : amount < 0 ? <span className="block text-[10px] font-semibold text-amber-600 dark:text-amber-400">Adelanto vigente</span>
                            : <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Al día</span>
                        ) : null;
                        return (
                          <div key={label} className="min-w-0 rounded-xl bg-muted/60 px-2.5 py-2">
                            <dt className="text-[11px] text-muted-foreground">{label}</dt>
                            <dd className={`mt-1 break-words text-xs font-bold tabular-nums ${amount < 0 ? 'text-destructive' : ''}`}>{formatCOP(amount)}</dd>
                            {badge}
                          </div>
                        );
                      })}
                    </dl>
                    {contractsWithComments.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        <h3 className="flex items-center gap-1.5 text-xs font-semibold">
                          <i className="ri-file-text-line text-[var(--brand-primary)]" aria-hidden="true" />
                          Comentarios de contratos
                        </h3>
                        <ul className="space-y-2">
                          {contractsWithComments.map((contract) => (
                            <li key={contract.id} className="rounded-xl bg-muted/60 px-2.5 py-2">
                              <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
                                {contract.codigo ? contract.codigo + ' · ' : ''}{formatDate(contract.fecha)}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed">{contract.condiciones?.trim()}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
      <KpiStrip metrics={currentPerson?.tipo === 'SOCIO' ? [
        { label: 'Capital aportado', value: formatCOP(totals.capital), featured: true },
        { label: 'Dividendos asignados', value: formatCOP(totals.dividends) },
        { label: 'Adelantos entregados', value: formatCOP(totals.advances) },
        { label: 'Saldo por liquidar', value: formatCOP(totals.balance), featured: true },
      ] : currentPerson?.tipo === 'INVERSIONISTA' ? [
        { label: 'Capital invertido', value: formatCOP(totals.capital), featured: true },
        { label: 'Intereses generados', value: formatCOP(totals.interest) },
        { label: 'Intereses pagados', value: formatCOP(totals.interestPaid) },
        { label: 'Saldo por pagar', value: formatCOP(totals.balance), featured: true },
      ] : [
        { label: 'Total capital', value: formatCOP(totals.capital), featured: true },
        { label: 'Dividendos a socios', value: formatCOP(totals.dividends) },
        { label: 'Adelantos a socios', value: formatCOP(totals.advances) },
        { label: 'Saldo por liquidar a socios', value: formatCOP(totals.balanceSocios), featured: true },
        { label: 'Intereses a inversionistas', value: formatCOP(totals.interest) },
      ]} />

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>{headings.map((name, index) => <th key={name} scope="col" className={'whitespace-nowrap px-3 py-3 font-semibold ' + (index > 3 && index < 11 ? 'text-right' : '')}>{name}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            <PaginatedRows pageSize={100} rows={rows} columns={headings.length} resetKey={activePerson + ':' + kindFilter}>{(row) => {
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
  action: Action; editMovement?: CapitalMovement; initialPerson: string; people: CapitalPerson[]; movements: CapitalMovement[]; onClose: () => void; onSaved: (change: CapitalChange) => void;
}) {
  const { data, metrics } = useData();
  const [id] = useState(() => editMovement?.id || crypto.randomUUID());
  const selectablePeople = action === 'adelanto' ? (people.some((p) => p.tipo === 'SOCIO') ? people.filter((p) => p.tipo === 'SOCIO') : people) : people;
  const [personId, setPersonId] = useState(editMovement?.socio_id || initialPerson || selectablePeople[0]?.id || people[0]?.id || '');
  const initialPersonObj = people.find((row) => row.id === personId);
  const [kind, setKind] = useState<CapitalKind>(
    editMovement ? editMovement.tipo : (action === 'contrato' ? 'CONTRATO' : action === 'adelanto' ? 'ADELANTO' : action === 'liquidar' ? 'LIQUIDACION' : (initialPersonObj?.tipo === 'SOCIO' ? 'DIVIDENDO' : 'INTERES'))
  );
  const [payInterest, setPayInterest] = useState(editMovement ? Boolean(editMovement.tipo === 'INTERES' && editMovement.medio) : false);
  const [method, setMethod] = useState<CapitalMethod>(editMovement?.medio || 'EFECTIVO');
  const [account, setAccount] = useState(editMovement?.cuenta_liquida_id || editMovement?.cuenta_digital_id || '');
  const [contract, setContract] = useState(editMovement?.contrato_id || '');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const manualRate = metrics.rateUsdtCop || 3950;
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
      const { error } = await supabase.from('capital_movimientos').delete().eq('id', editMovement.id).select('id').single();
      if (error) throw error;
      onSaved({ deletedMovementId: editMovement.id });
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
    const rate = needsAccount && method === 'USDT' ? (kind === 'CONTRATO' ? manualRate : (parseAmountInput(field('tasa')) || manualRate)) : null;
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
      let change: CapitalChange;
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
        const { data: row, error } = await supabase.from('capital_movimientos').update(updatePayload).eq('id', editMovement.id).select('*').single();
        if (error) throw error;
        change = { movement: row as CapitalMovement };
      } else {
        const table = action === 'persona' ? 'capital_socios' : 'capital_movimientos';
        const record: Record<string, string | number | null> = action === 'persona'
          ? { id, nombre: field('nombre'), tipo: field('tipo') }
          : { id, socio_id: personId, fecha: field('fecha'), tipo: kind, monto: amount, tasa: rate,
              medio: needsAccount ? method : null,
              cuenta_liquida_id: needsAccount && method !== 'USDT' ? account : null,
              cuenta_digital_id: needsAccount && method === 'USDT' ? account : null,
              contrato_id: needsContract ? contract : null, condiciones: kind === 'CONTRATO' ? field('condiciones') : null };
        const { data: inserted, error } = await supabase.from(table).insert(record).select('*').single();
        let row = inserted;
        if (error) {
          if (error.code !== '23505') throw error;
          const previous = await supabase.from(table).select('*').eq('id', id).maybeSingle();
          if (!previous.data) throw new Error('Ya existe un socio o inversionista con ese nombre.');
          row = previous.data;
        }
        change = table === 'capital_socios' ? { person: row as CapitalPerson } : { movement: row as CapitalMovement };
      }
      finish(true);
      onSaved(change);
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
          <label className={recordLabelClass}>{action === 'adelanto' ? 'Socio' : 'Socio o inversionista'}
            <select required value={personId} className={recordFieldClass} onChange={(event) => {
              const next = event.target.value;
              setPersonId(next); setContract('');
              const nextPerson = people.find((item) => item.id === next);
              if (action === 'rendimiento') {
                setKind(nextPerson?.tipo === 'SOCIO' ? 'DIVIDENDO' : 'INTERES');
              } else if (kind === 'DIVIDENDO' && nextPerson?.tipo !== 'SOCIO') {
                setKind('INTERES');
              }
            }}>
              {selectablePeople.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.tipo === 'SOCIO' ? ' (Socio)' : ' (Inversionista)'}</option>)}
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
              </> : action === 'liquidar' ? <><option value="LIQUIDACION">Pagar saldo</option><option value="RETIRO">Retirar capital</option>{person?.tipo !== 'SOCIO' && <option value="INTERES">Liquidar interés</option>}</>
                : <>{person?.tipo === 'SOCIO' && <option value="DIVIDENDO">Dividendo</option>}<option value="INTERES">Interés</option></>}
            </select>
          </label>}
          {(() => {
            const personSummary = summarizeCapital(movements.filter((row) => row.socio_id === personId && row.id !== editMovement?.id));
            if (kind === 'ADELANTO') {
              return (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-foreground space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                    <i className="ri-hand-coin-line text-base" />
                    <span>Anticipo de utilidades al socio</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    El dinero se debitará de la cuenta de origen. No reduce la ganancia estimada neta de la empresa y se cruzará automáticamente contra futuros dividendos.
                  </p>
                </div>
              );
            }
            if (kind === 'DIVIDENDO') {
              return (
                <div className="rounded-xl border border-teal-500/25 bg-teal-500/10 p-3 text-xs text-foreground space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-teal-700 dark:text-teal-400">
                    <i className="ri-pie-chart-line text-base" />
                    <span>Decreto de dividendos</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Asigna utilidades oficiales al socio (no extrae fondos bancarios). Los adelantos previos se descontarán automáticamente al momento de liquidar el saldo.
                  </p>
                  {personSummary.advances > 0 && (
                    <p className="text-xs font-semibold text-foreground pt-1 border-t border-border/50">
                      Adelantos previos por cruzar: <span className="font-mono text-amber-600 dark:text-amber-400">{formatCOP(personSummary.advances)}</span>
                    </p>
                  )}
                </div>
              );
            }
            if (kind === 'LIQUIDACION') {
              return (
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs text-foreground space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-primary">
                      <i className="ri-wallet-3-line text-base" />
                      <span>Liquidación de utilidades</span>
                    </span>
                  </div>
                  {person?.tipo === 'SOCIO' ? (
                    personSummary.balance > 0 ? (
                      <div className="text-muted-foreground leading-relaxed">
                        Saldo pendiente a pagar: <strong className="text-foreground">{formatCOP(personSummary.balance)}</strong>
                        <span className="block text-[11px] mt-0.5">
                          (Dividendos decretados: {formatCOP(personSummary.dividends)} − Adelantos descontados: {formatCOP(personSummary.advances)} − Pagos previos: {formatCOP(personSummary.liquidaciones)})
                        </span>
                      </div>
                    ) : personSummary.balance < 0 ? (
                      <div className="text-amber-600 dark:text-amber-400">
                        El socio tiene un saldo de adelantos no cubiertos de <strong>{formatCOP(Math.abs(personSummary.balance))}</strong>. No hay saldo a favor para liquidar.
                      </div>
                    ) : (
                      <div className="text-emerald-600 dark:text-emerald-400">
                        El socio se encuentra completamente al día (saldo $0).
                      </div>
                    )
                  ) : (
                    <div className="text-muted-foreground leading-relaxed">
                      Saldo pendiente: <strong className="text-foreground">{formatCOP(personSummary.balance)}</strong>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
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
              <input name="monto" inputMode="decimal" defaultValue={editMovement ? String(editMovement.monto) : (action === 'liquidar' ? (() => { const pSum = summarizeCapital(movements.filter((r) => r.socio_id === personId)); return pSum.balance > 0 ? String(pSum.balance) : ''; })() : '')} onChange={(event) => formatAmountField(event.currentTarget)} required className={recordFieldClass} />
            </label>
          </div>
          {needsAccount && method === 'USDT' && (
            kind === 'CONTRATO' ? (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <i className="ri-exchange-dollar-line text-blue-500 text-base" />
                  <span>Tasa USDT / COP (manual de tesorería):</span>
                </span>
                <span className="font-mono font-bold text-foreground bg-background px-2.5 py-1 rounded-lg border border-border">
                  ${formatRate(manualRate)} COP
                </span>
              </div>
            ) : (
              <label className={recordLabelClass}>Tasa del día (COP por USDT)
                <input name="tasa" inputMode="decimal" defaultValue={editMovement?.tasa != null ? String(editMovement.tasa) : String(manualRate)} onChange={(event) => formatAmountField(event.currentTarget)} required className={recordFieldClass} />
              </label>
            )
          )}
          {kind === 'CONTRATO' && <label className={recordLabelClass}>Condiciones
            <textarea name="condiciones" defaultValue={editMovement?.condiciones || ''} placeholder="Tasa acordada, plazo y condiciones de retiro" maxLength={4000} rows={3} required className={recordFieldClass} />
          </label>}
        </>}
      </fieldset>
      <RecordActions busy={busy} isDeleting={deleting} onDelete={editMovement ? handleDelete : undefined} label={editMovement ? 'Actualizar' : 'Guardar'} onClose={onClose} />
    </form>
  </RecordDialog>;
}
