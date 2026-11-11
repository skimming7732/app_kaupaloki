import { useWriteAccess } from '../utils/useWriteAccess';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { InstitutionLogo, buildAutoLogoUrl, extractDomain } from '../components/common/InstitutionLogo';
import { TYPE_LABELS, type InstitucionRecord, type InstitutionStatus, type InstitutionType } from '../utils/institutions';
import { useData } from '../context/DataContext';
import { KpiStrip } from '../components/common/KpiStrip';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import { CurrencyFilterDropdown } from '../components/common/CurrencyFilterDropdown';
import {
  RecordDialog,
  RecordActions,
  recordFieldClass,
  recordLabelClass,
} from '../components/modals/RecordDialog';
import { fallbackBanderaUrl, formatNumber } from '../utils/formatters';

const TYPE_BADGE_CLASSES: Record<InstitutionType, string> = {
  bank: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  exchange: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  wallet: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  otc: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  psp: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  fintech: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  payment_system: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

const DEFAULT_CURRENCY_COUNTRIES: Record<string, string> = {
  COP: 'Colombia',
  MXN: 'México',
  BRL: 'Brasil',
  PEN: 'Perú',
  CLP: 'Chile',
  ARS: 'Argentina',
  UYU: 'Uruguay',
  VES: 'Venezuela',
  HNL: 'Honduras',
  USD: 'Estados Unidos',
  'USD-EC': 'Ecuador',
  'USD-PY': 'Paraguay',
  USDT: 'Global',
};

const cleanCountryFromDivisa = (pais?: string, codigo?: string): string => {
  if (codigo && DEFAULT_CURRENCY_COUNTRIES[codigo.toUpperCase()]) {
    return DEFAULT_CURRENCY_COUNTRIES[codigo.toUpperCase()];
  }
  if (!pais) return 'Colombia';
  return pais.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Colombia';
};

export const InstitucionesView: React.FC = () => {
  const canWrite = useWriteAccess('admin');
  const { data, syncData } = useData();
  const [institutions, setInstitutions] = useState<InstitucionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const latestFetch = useRef(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstitucionRecord | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<InstitutionType>('bank');
  const [formCurrency, setFormCurrency] = useState('COP');
  const [formCountry, setFormCountry] = useState('Colombia');
  const [formWebsite, setFormWebsite] = useState('');
  const [formStatus, setFormStatus] = useState<InstitutionStatus>('active');
  const [logoMode, setLogoMode] = useState<'auto' | 'url' | 'upload'>('auto');
  const [manualLogoUrl, setManualLogoUrl] = useState('');
  const [modalBusy, setModalBusy] = useState(false);
  const [modalDeleting, setModalDeleting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const activeDivisas = useMemo(() => {
    return [...data.divisas].sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [data.divisas]);

  const divisaMap = useMemo(() => {
    const map = new Map<string, (typeof data.divisas)[number]>();
    for (const d of data.divisas) {
      map.set(d.codigo.toUpperCase(), d);
    }
    return map;
  }, [data.divisas]);

  const fetchInstitutions = useCallback(async () => {
    const request = ++latestFetch.current;
    setLoading(true);
    setErrorMessage(null);
    const { data: rows, error } = await supabase
      .from('instituciones')
      .select('*')
      .order('name', { ascending: true });

    if (request !== latestFetch.current) return;
    if (error) {
      setErrorMessage(error.message);
    } else {
      setInstitutions((rows || []) as InstitucionRecord[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  const countsByCurrency = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const inst of institutions) {
      const code = (inst.currency || '').toUpperCase();
      counts[code] = (counts[code] || 0) + 1;
    }
    return counts;
  }, [institutions]);

  const filteredInstitutions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return institutions.filter((inst) => {
      if (currencyFilter !== 'ALL' && inst.currency.toUpperCase() !== currencyFilter.toUpperCase()) {
        return false;
      }
      if (typeFilter !== 'ALL' && inst.type !== typeFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && inst.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        inst.name.toLowerCase().includes(q) ||
        inst.currency.toLowerCase().includes(q) ||
        (inst.country || '').toLowerCase().includes(q) ||
        (inst.website_url || '').toLowerCase().includes(q) ||
        (TYPE_LABELS[inst.type] || '').toLowerCase().includes(q)
      );
    });
  }, [institutions, currencyFilter, typeFilter, statusFilter, search]);

  const handleCurrencyChangeInModal = (newCode: string) => {
    const code = newCode.toUpperCase();
    setFormCurrency(code);
    const matchedDivisa = divisaMap.get(code);
    setFormCountry(cleanCountryFromDivisa(matchedDivisa?.pais, code));
  };

  const openCreateModal = (presetCurrency?: string) => {
    const defaultCurr =
      presetCurrency && presetCurrency !== 'ALL'
        ? presetCurrency.toUpperCase()
        : currencyFilter !== 'ALL'
        ? currencyFilter.toUpperCase()
        : activeDivisas[0]?.codigo || 'COP';
    const matchedDivisa = divisaMap.get(defaultCurr);

    setEditing(null);
    setFormName('');
    setFormType(defaultCurr === 'USDT' ? 'wallet' : 'bank');
    setFormCurrency(defaultCurr);
    setFormCountry(cleanCountryFromDivisa(matchedDivisa?.pais, defaultCurr));
    setFormWebsite('');
    setFormStatus('active');
    setLogoMode('auto');
    setManualLogoUrl('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (inst: InstitucionRecord) => {
    setEditing(inst);
    setFormName(inst.name);
    setFormType(inst.type);
    setFormCurrency(inst.currency.toUpperCase());
    setFormCountry(inst.country || cleanCountryFromDivisa(divisaMap.get(inst.currency.toUpperCase())?.pais, inst.currency));
    setFormWebsite(inst.website_url || '');
    setFormStatus(inst.status);

    const autoUrl = buildAutoLogoUrl(inst.website_url);
    if (!inst.logo_url || inst.logo_url === autoUrl) {
      setLogoMode('auto');
      setManualLogoUrl(inst.logo_url || '');
    } else if (inst.logo_url.startsWith('data:image/')) {
      setLogoMode('upload');
      setManualLogoUrl(inst.logo_url);
    } else {
      setLogoMode('url');
      setManualLogoUrl(inst.logo_url);
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setModalError('El archivo de imagen no debe superar 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setManualLogoUrl(reader.result);
        setModalError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const resolvedModalLogoPreview = useMemo(() => {
    if (logoMode === 'auto') {
      return buildAutoLogoUrl(formWebsite);
    }
    return manualLogoUrl.trim();
  }, [logoMode, formWebsite, manualLogoUrl]);

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setModalError('El nombre de la institución es obligatorio.');
      return;
    }

    setModalBusy(true);
    setModalError(null);

    const matchedDivisa = divisaMap.get(formCurrency.toUpperCase());
    const finalLogoUrl =
      logoMode === 'auto'
        ? buildAutoLogoUrl(formWebsite) || editing?.logo_url || null
        : manualLogoUrl.trim() || null;

    const payload = {
      name: trimmedName,
      type: formType,
      currency: formCurrency.toUpperCase(),
      divisa_id: matchedDivisa?.id || null,
      country: formCountry.trim() || cleanCountryFromDivisa(matchedDivisa?.pais, formCurrency),
      website_url: formWebsite.trim() || null,
      logo_url: finalLogoUrl,
      status: formStatus,
    };

    try {
      if (editing) {
        const { data: updated, error } = await supabase
          .from('instituciones')
          .update(payload)
          .eq('id', editing.id)
          .select('*').single();
        if (error) throw error;
        latestFetch.current++;
        setLoading(false);
        setInstitutions((current) => current.map((row) => row.id === updated.id ? updated as InstitucionRecord : row));
      } else {
        const { data: inserted, error } = await supabase.from('instituciones').insert(payload).select('*').single();
        if (error) throw error;
        latestFetch.current++;
        setLoading(false);
        setInstitutions((current) => [inserted as InstitucionRecord, ...current]
          .sort((left, right) => left.name.localeCompare(right.name)));
      }
      void syncData();
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err?.message || 'No se pudo guardar la institución.');
    } finally {
      setModalBusy(false);
    }
  };

  const handleDeleteModal = async () => {
    if (!editing) return;
    if (!window.confirm(`¿Eliminar la institución "${editing.name}" (${editing.currency})?`)) {
      return;
    }
    setModalDeleting(true);
    setModalError(null);
    try {
      const { error } = await supabase.from('instituciones').delete().eq('id', editing.id).select('id').single();
      if (error) throw error;
      latestFetch.current++;
      setLoading(false);
      setInstitutions((current) => current.filter((row) => row.id !== editing.id));
      void syncData();
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err?.message || 'No se pudo eliminar la institución.');
    } finally {
      setModalDeleting(false);
    }
  };

  const handleInlineStatusChange = async (id: string, newStatus: InstitutionStatus) => {
    setInstitutions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    const { error } = await supabase
      .from('instituciones')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) {
      setErrorMessage(error.message);
      await fetchInstitutions();
    }
  };

  const handleExportCsv = () => {
    const headers = ['Nombre', 'Tipo', 'Divisa', 'País', 'Sitio Web', 'Estado'];
    const rows = filteredInstitutions.map((i) => [
      `"${(i.name || '').replace(/"/g, '""')}"`,
      `"${TYPE_LABELS[i.type] || i.type}"`,
      `"${i.currency}"`,
      `"${(i.country || '').replace(/"/g, '""')}"`,
      `"${(i.website_url || '').replace(/"/g, '""')}"`,
      `"${i.status}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instituciones_${currencyFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeCount = useMemo(
    () => filteredInstitutions.filter((i) => i.status === 'active').length,
    [filteredInstitutions]
  );

  const currenciesWithInstitutionsCount = useMemo(() => {
    const set = new Set(institutions.map((i) => i.currency.toUpperCase()));
    return set.size;
  }, [institutions]);

  const selectedCurrencyObj =
    currencyFilter !== 'ALL' ? divisaMap.get(currencyFilter.toUpperCase()) : undefined;
  const selectedCurrencyFlag =
    currencyFilter !== 'ALL'
      ? fallbackBanderaUrl[currencyFilter.toUpperCase()] || selectedCurrencyObj?.banderaUrl
      : undefined;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Info Banner & Actions */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary">
              <i className="ri-bank-line text-lg" />
            </span>
            <h2 className="text-base font-bold text-foreground">
              Catálogo de Instituciones por Divisa
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              Vinculado a Divisas Activas
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Bancos, billeteras, exchanges, OTC y sistemas de pago sincronizados automáticamente con las divisas activas de Kaupaloki.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground inline-flex items-center gap-1.5 transition-colors"
          >
            <i className="ri-download-2-line text-sm" />
            <span>Exportar CSV</span>
          </button>
          {canWrite && (<button
            type="button"
            onClick={() => openCreateModal()}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-opacity"
          >
            <i className="ri-add-line text-sm" />
            <span>
              {currencyFilter !== 'ALL'
                ? `Nueva Institución (${currencyFilter})`
                : 'Nueva Institución'}
            </span>
          </button>)}
        </div>
      </div>

      {/* KPI Strip */}
      <KpiStrip
        metrics={[
          { label: 'Instituciones visibles', value: formatNumber(filteredInstitutions.length) },
          { label: 'Activas en vista', value: formatNumber(activeCount) },
          {
            label: 'Divisas activas en plataforma',
            value: `${formatNumber(activeDivisas.length)} (${formatNumber(currenciesWithInstitutionsCount)} con instituciones)`,
          },
          {
            label: 'Filtro de divisa actual',
            value: currencyFilter === 'ALL' ? 'Todas las divisas' : currencyFilter,
          },
        ]}
      />

      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-3"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Search & Filters Toolbar (with Styled Active Currencies Dropdown) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por institución, divisa, país o dominio web..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CurrencyFilterDropdown
            value={currencyFilter === 'ALL' ? '' : currencyFilter}
            onChange={(val) => setCurrencyFilter(val || 'ALL')}
            className="w-48"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filtrar por tipo"
            className="h-9 px-3 rounded-xl border border-input bg-background text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="ALL">Todos los tipos</option>
            {(Object.keys(TYPE_LABELS) as InstitutionType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por estado"
            className="h-9 px-3 rounded-xl border border-input bg-background text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="ALL">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
            <option value="review">En revisión</option>
          </select>

          {(search || currencyFilter !== 'ALL' || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCurrencyFilter('ALL');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Institución</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Divisa Vinculada</th>
                <th className="py-3 px-4">País / Región</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <CreatedByHeader className="py-3 px-4" />
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Cargando catálogo de instituciones...
                  </td>
                </tr>
              ) : filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground space-y-2">
                    <p>No se encontraron instituciones para los filtros seleccionados.</p>
                    {currencyFilter !== 'ALL' && (
                      canWrite && (<button
                        type="button"
                        onClick={() => openCreateModal(currencyFilter)}
                        className="mt-2 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <i className="ri-add-line" />
                        <span>Crear primera institución en {currencyFilter}</span>
                      </button>)
                    )}
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={7} rows={filteredInstitutions}>
                  {(inst) => {
                    const code = inst.currency.toUpperCase();
                    const linkedDivisa = divisaMap.get(code);
                    const flagUrl = fallbackBanderaUrl[code] || linkedDivisa?.banderaUrl;
                    const domain = extractDomain(inst.website_url);
                    const externalHref = inst.website_url
                      ? /^https?:\/\//i.test(inst.website_url)
                        ? inst.website_url
                        : `https://${inst.website_url}`
                      : null;

                    return (
                      <tr key={inst.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <InstitutionLogo
                              name={inst.name}
                              logoUrl={inst.logo_url}
                              websiteUrl={inst.website_url}
                              sizeClass="w-8 h-8"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-foreground truncate">{inst.name}</div>
                              {domain && (
                                <div className="text-[11px] text-muted-foreground font-mono truncate">
                                  {domain}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              TYPE_BADGE_CLASSES[inst.type] ||
                              'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {TYPE_LABELS[inst.type] || inst.type}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold">
                            {flagUrl && (
                              <img
                                src={flagUrl}
                                alt=""
                                className="w-4 h-3 rounded-xs object-cover"
                                onError={(e) => {
                                  e.currentTarget.hidden = true;
                                }}
                              />
                            )}
                            <span>{code}</span>
                            {linkedDivisa ? (
                              <i
                                className="ri-links-line text-[11px] text-emerald-500"
                                title={`Sincronizada con ${linkedDivisa.nombre}`}
                              />
                            ) : (
                              <i
                                className="ri-time-line text-[11px] text-amber-500"
                                title="Divisa pendiente de activar"
                              />
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {inst.country || '—'}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <select
                            disabled={!canWrite}
                            value={inst.status}
                            onChange={(e) =>
                              handleInlineStatusChange(
                                inst.id,
                                e.target.value as InstitutionStatus
                              )
                            }
                            aria-label={`Estado de ${inst.name}`}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border outline-none cursor-pointer transition-colors ${
                              inst.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : inst.status === 'review'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            }`}
                          >
                            <option value="active">Activa</option>
                            <option value="inactive">Inactiva</option>
                            <option value="review">Revisión</option>
                          </select>
                        </td>

                        <CreatedByCell
                          record={{
                            createdByName: inst.created_by_name || 'Catálogo Base',
                            fechaCreacion: inst.created_at_audit || inst.created_at,
                          }}
                          className="py-3 px-4"
                        />

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {externalHref && (
                              <a
                                href={externalHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Abrir ${domain || inst.website_url}`}
                                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <i className="ri-external-link-line text-sm" />
                              </a>
                            )}
                            {canWrite && (<button
                              type="button"
                              onClick={() => openEditModal(inst)}
                              className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-foreground inline-flex items-center gap-1 transition-colors"
                            >
                              <i className="ri-edit-line text-xs" />
                              <span>Editar</span>
                            </button>)}
                          </div>
                        </td>
                      </tr>
                    );
                  }}
                </PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <RecordDialog
          title={editing ? `Editar ${editing.name}` : 'Nueva Institución Financiera'}
          description="Configura la institución vinculada a una divisa activa y su logotipo automático por dominio."
          icon="ri-bank-line"
          busy={modalBusy || modalDeleting}
          error={modalError}
          onClose={() => setIsModalOpen(false)}
        >
          <form onSubmit={handleSaveModal} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label className={recordLabelClass}>
                <span>Divisa Activa *</span>
                <select
                  value={formCurrency}
                  onChange={(e) => handleCurrencyChangeInModal(e.target.value)}
                  className={recordFieldClass}
                  required
                >
                  {activeDivisas.map((d) => (
                    <option key={d.id} value={d.codigo.toUpperCase()}>
                      {d.codigo.toUpperCase()} — {d.nombre}
                    </option>
                  ))}
                  {!divisaMap.has(formCurrency.toUpperCase()) && (
                    <option value={formCurrency.toUpperCase()}>
                      {formCurrency.toUpperCase()} (Divisa externa)
                    </option>
                  )}
                </select>
              </label>

              <label className={recordLabelClass}>
                <span>Tipo de Institución *</span>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as InstitutionType)}
                  className={recordFieldClass}
                  required
                >
                  {(Object.keys(TYPE_LABELS) as InstitutionType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label className={recordLabelClass}>
                <span>Nombre de la Institución *</span>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Bancolombia, BBVA, Nequi..."
                  className={recordFieldClass}
                  required
                />
              </label>

              <label className={recordLabelClass}>
                <span>País / Región *</span>
                <input
                  type="text"
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value)}
                  placeholder="Ej. Colombia, México, Brasil..."
                  className={recordFieldClass}
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label className={recordLabelClass}>
                <span>Sitio Web (Dominio)</span>
                <input
                  type="text"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="Ej. bancolombia.com"
                  className={recordFieldClass}
                />
              </label>

              <label className={recordLabelClass}>
                <span>Estado</span>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as InstitutionStatus)}
                  className={recordFieldClass}
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                  <option value="review">En revisión</option>
                </select>
              </label>
            </div>

            {/* Logo Configuration */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-foreground">Logotipo de la Institución</div>
                  <div className="text-[11px] text-muted-foreground">
                    Se detecta automáticamente desde el dominio web o puedes cargarlo manualmente.
                  </div>
                </div>
                <InstitutionLogo
                  name={formName || 'Logo'}
                  logoUrl={resolvedModalLogoPreview}
                  websiteUrl={formWebsite}
                  sizeClass="w-11 h-11"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['auto', 'Automático (por web)'],
                    ['url', 'URL de imagen'],
                    ['upload', 'Subir archivo'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLogoMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      logoMode === mode
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {logoMode === 'auto' && (
                <div className="text-[11px] text-muted-foreground font-mono truncate">
                  {extractDomain(formWebsite)
                    ? `Fuente automática: https://icon.horse/icon/${extractDomain(formWebsite)}`
                    : 'Ingresa un dominio en "Sitio Web" para obtener el ícono automáticamente.'}
                </div>
              )}

              {logoMode === 'url' && (
                <input
                  type="url"
                  value={manualLogoUrl}
                  onChange={(e) => setManualLogoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/logo.png"
                  className={recordFieldClass}
                />
              )}

              {logoMode === 'upload' && (
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              )}
            </div>

            <RecordActions
              busy={modalBusy}
              label={editing ? 'Guardar Cambios' : 'Crear Institución'}
              onClose={() => setIsModalOpen(false)}
              onDelete={editing ? handleDeleteModal : undefined}
              isDeleting={modalDeleting}
            />
          </form>
        </RecordDialog>
      )}
    </div>
  );
};
