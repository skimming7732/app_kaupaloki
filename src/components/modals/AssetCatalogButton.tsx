import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { canDeleteRole } from '../../utils/roles';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';
import { normalizeSearch } from '../../utils/formatters';
import { TYPE_LABELS, type AssetInstitution } from '../../utils/institutions';
import { isTronAddress, isTronNetwork } from '../../utils/tronUsdtBalance';
import { isPolygonAddress, isPolygonNetwork } from '../../utils/polygonUsdtBalance';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import { AssetInstitutionLogo } from '../common/InstitutionLogo';
import { RecordActions, RecordDialog, recordButtonClass, recordFieldClass, recordLabelClass } from './RecordDialog';

type Asset = {
  id: string;
  activo?: string;
  institucion?: string;
  institution?: AssetInstitution | null;
  titular?: string;
  empresa?: string;
  cuenta?: string;
  red?: string;
  wallet?: string;
  tarifas?: string;
};

const assetName = (institution: string, holder: string) => [institution, holder].filter(Boolean).join(' · ');

function InstitutionPicker({ currency, institutions, selected, onChange, onClose }: {
  currency: string;
  institutions: AssetInstitution[];
  selected?: AssetInstitution;
  onChange: (item: AssetInstitution) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const term = normalizeSearch(query.trim());
  const matches = institutions.filter((item) => normalizeSearch(item.name + ' ' + TYPE_LABELS[item.type]).includes(term));
  return (
    <RecordDialog title="Seleccionar institución" description={`Instituciones disponibles en ${currency}`} icon="ri-building-2-line" onClose={onClose}>
      <label className={recordLabelClass}>
        <span>Buscar institución</span>
        <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Buscar por nombre o categoría" className={recordFieldClass} />
      </label>
      <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
        {matches.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onChange(item)}
              className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-2 text-left hover:bg-muted">
              <AssetInstitutionLogo institution={item} sizeClass="size-8" />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold">{item.name}</span>
                <span className="block text-xs text-muted-foreground">{TYPE_LABELS[item.type]} · {item.currency}</span>
              </span>
              {selected?.id === item.id && <i className="ri-check-line text-primary" aria-label="Seleccionada" />}
            </button>
          </li>
        ))}
      </ul>
      {!matches.length && <p className="mt-2 text-sm text-muted-foreground">No se encontraron instituciones.</p>}
    </RecordDialog>
  );
}

export function AssetCatalogButton({ table, asset, allowDelete = false, buttonClassName }: {
  table: 'activos_liquidos' | 'activos_digitales';
  asset?: Asset;
  allowDelete?: boolean;
  buttonClassName?: string;
}) {
  const { profile } = useAuth();
  const { createCatalogRecord, deleteCatalogRecord } = useData();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [catalog, setCatalog] = useState<AssetInstitution[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [institution, setInstitution] = useState<AssetInstitution>();

  const digital = table === 'activos_digitales';
  const currency = digital ? 'USDT' : 'COP';
  const title = asset ? digital ? 'Editar datos de la billetera' : 'Editar datos de la cuenta'
    : digital ? 'Agregar billetera USDT' : 'Agregar activo líquido';
  const icon = digital ? 'ri-wallet-3-line' : 'ri-bank-line';
  const initialHolder = asset?.titular || asset?.empresa || '';
  const legacyInstitution = asset?.institucion || '';

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const { data, error } = await supabase.from('instituciones')
          .select('id,name,type,currency,logo_url,website_url,status')
          .eq('currency', currency).eq('status', 'active').order('name').abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (error) throw error;
        const institutions = (data ?? []) as AssetInstitution[];
        setCatalog(institutions);
        setCatalogStatus('ready');
        if (!asset && digital) {
          const tronLink = institutions.find((item) => normalizeSearch(item.name.trim()) === 'tronlink');
          setInstitution((current) => current ?? tronLink);
        }
      } catch {
        if (!controller.signal.aborted) setCatalogStatus('error');
      }
    })();
    return () => controller.abort();
  }, [open, asset?.id, currency, digital]);

  if (profile?.role !== 'administrador' && profile?.role !== 'super_admin') return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const text = (key: string) => String(values.get(key) ?? '').trim();
    const titular = text('titular');
    if (!asset && !institution) {
      setError('Selecciona una institución del catálogo.');
      return;
    }
    if (!titular) {
      setError('Completa el nombre del titular.');
      return;
    }
    const record: Record<string, string | number> = { titular, tarifas: text('tarifas') };
    const previousName = assetName(asset?.institution?.name || legacyInstitution, initialHolder);
    if (!asset || (institution && asset.activo === previousName)) {
      record.activo = assetName(institution?.name || legacyInstitution, titular);
    }
    if (institution) record.institucion_id = institution.id;

    if (digital) {
      const red = text('red');
      const wallet = text('wallet');
      if (!red) {
        setError('Selecciona la red de la billetera.');
        return;
      }
      if (wallet && isTronNetwork(red) && (wallet !== asset?.wallet || red !== asset?.red) && !isTronAddress(wallet)) {
        setError('Ingresa una dirección pública válida de la red TRON (comienza con T).');
        return;
      }
      if (wallet && isPolygonNetwork(red) && (wallet !== asset?.wallet || red !== asset?.red) && !isPolygonAddress(wallet)) {
        setError('Ingresa una dirección pública válida de la red Polygon (comienza con 0x y 40 caracteres).');
        return;
      }
      record.red = red;
      record.wallet = wallet;
    } else {
      const reference = text('cuenta');
      if (!reference && (!asset || asset.cuenta)) {
        setError('Completa la referencia.');
        return;
      }
      record.cuenta = reference;
      if (institution) record.institucion = institution.name;
    }

    setBusy(true);
    setError('');
    const finishSound = prepareSuccessSound();
    try {
      await createCatalogRecord(table, record, asset?.id);
      finishSound(true);
      setOpen(false);
    } catch (err) {
      finishSound(false);
      setError(err instanceof Error ? err.message : 'No se pudo guardar el activo.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!asset || !window.confirm('¿Estás seguro de que deseas eliminar este activo?')) return;
    setBusy(true);
    setError('');
    try {
      if (await deleteCatalogRecord(table, asset.id)) setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el activo.');
    } finally {
      setBusy(false);
    }
  };

  const institutionLabel = institution?.name || legacyInstitution;
  return (
    <>
      <button type="button" className={buttonClassName ?? (asset ? 'inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-muted' : recordButtonClass)}
        onClick={() => {
          setError('');
          setInstitution(asset?.institution ?? undefined);
          setCatalogStatus('loading');
          setCatalog([]);
          setOpen(true);
        }}>
        <i className={asset ? 'ri-edit-line' : icon} aria-hidden="true" />
        {asset ? 'Editar datos' : title}
      </button>
      {open && (
        <RecordDialog title={title} description={digital ? 'Identifica una billetera de custodia USDT.' : 'Identifica una cuenta operativa en COP.'}
          icon={icon} busy={busy} error={error} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={busy} className="min-w-0 space-y-4">
              <div className="space-y-1.5">
                <p className={recordLabelClass}>Institución</p>
                <button type="button" aria-label={institutionLabel ? 'Cambiar institución: ' + institutionLabel : 'Seleccionar institución'}
                  aria-haspopup="dialog" onClick={() => setPicking(true)} disabled={catalogStatus !== 'ready'}
                  className={recordFieldClass + ' flex min-w-0 items-center gap-2.5 py-1.5 text-left disabled:opacity-60'}>
                  <AssetInstitutionLogo institution={institution} name={legacyInstitution} sizeClass="size-8" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{institutionLabel || (catalogStatus === 'loading' ? 'Consultando catálogo…' : 'Seleccionar institución')}</span>
                    {institution && <span className="block text-[11px] text-muted-foreground">{TYPE_LABELS[institution.type]} · {currency}</span>}
                  </span>
                  <i className="ri-arrow-down-s-line text-muted-foreground" aria-hidden="true" />
                </button>
                {catalogStatus === 'error' && <p role="status" className="text-xs text-destructive">No se pudo consultar el catálogo. Vuelve a abrir el formulario para reintentar.</p>}
              </div>

              {digital && (
                <label className={recordLabelClass}>
                  <span>Red de la billetera</span>
                  <select
                    name="red"
                    defaultValue={isPolygonNetwork(asset?.red) ? 'POLYGON' : 'TRC20'}
                    required
                    className={recordFieldClass + ' cursor-pointer bg-card'}
                  >
                    <option value="TRC20">TRON (TRC20)</option>
                    <option value="POLYGON">Polygon (MATIC / PoS)</option>
                  </select>
                </label>
              )}
              <label className={recordLabelClass}>
                <span>{digital ? 'Titular de la billetera' : 'Titular o empresa'}</span>
                <input name="titular" defaultValue={initialHolder} required className={recordFieldClass} />
              </label>
              {digital ? (
                <label className={recordLabelClass}>
                  <span>Dirección de billetera <small className="text-muted-foreground">(opcional)</small></span>
                  <input name="wallet" defaultValue={asset?.wallet || ''} autoComplete="off" autoCapitalize="none" spellCheck={false}
                    className={recordFieldClass + ' font-mono'} />
                </label>
              ) : (
                <label className={recordLabelClass}><span>Referencia</span>
                  <input name="cuenta" defaultValue={asset?.cuenta || ''} required={!asset || Boolean(asset.cuenta)} className={recordFieldClass} />
                </label>
              )}
              <label className={recordLabelClass}>
                <span>Descripción de tarifas <small className="text-muted-foreground">(opcional)</small></span>
                <input name="tarifas" defaultValue={asset?.tarifas || ''} placeholder={digital ? '$1 USD X TRX' : '$1000 X Dispersión'} className={recordFieldClass} />
              </label>
            </fieldset>
            <RecordActions busy={busy} label={asset ? 'Guardar cambios' : title} onClose={() => setOpen(false)}
              submitDisabled={!asset && !institution} onDelete={asset && canDeleteRole(profile?.role) && allowDelete ? remove : undefined} deleteLabel="Eliminar activo" />
          </form>
        </RecordDialog>
      )}
      {open && picking && <InstitutionPicker currency={currency} institutions={catalog} selected={institution}
        onClose={() => setPicking(false)} onChange={(item) => { setInstitution(item); setError(''); setPicking(false); }} />}
    </>
  );
}
