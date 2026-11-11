import { recordButtonClass } from '../components/modals/RecordDialog';
import { KpiStrip, totalsByCurrency } from '../components/common/KpiStrip';
import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { CurrencyFilterDropdown } from '../components/common/CurrencyFilterDropdown';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { ReceiptThumbnail } from '../components/common/ReceiptThumbnail';
import { ReceiptLightboxModal, type LightboxItem } from '../components/modals/ReceiptLightboxModal';
import { getCategoryIcon, GASTO_CATEGORIES } from '../components/common/CategorySearchSelect';
import { uploadReceipt, receiptAccept } from '../utils/receipts';
import { prepareSuccessSound } from '../utils/confirmationSound';
import { supabase } from '../lib/supabase';
import { AttachExpenseReceipt } from '../components/modals/AttachExpenseReceipt';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useData, type GastoItem } from '../context/DataContext';
import { formatNumber, formatCOP, formatUSD, formatDate } from '../utils/formatters';
import { AddGastoModal } from '../components/modals/AddGastoModal';

interface GastosViewProps {
  onOpenAddGasto?: () => void;
}

export const GastosView: React.FC<GastosViewProps> = ({ onOpenAddGasto }) => {
  const { data, syncData } = useData();
  const [attachingTo, setAttachingTo] = useState<{ id: string; url?: string } | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<GastoItem | null>(null);

  // 9:16 Lightbox Modal State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Direct file upload without popup
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ id: string; currentUrl?: string; append?: boolean } | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const triggerDirectUpload = (id: string, currentUrl?: string, append = false) => {
    setUploadTarget({ id, currentUrl, append });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadTarget) return;

    setUploadingId(uploadTarget.id);
    const finishSound = prepareSuccessSound();

    try {
      const newUrl = await uploadReceipt(file, 'gastos');
      if (!newUrl) throw new Error('No se pudo subir el archivo.');

      const finalUrl = uploadTarget.append && uploadTarget.currentUrl
        ? `${uploadTarget.currentUrl},${newUrl}`
        : newUrl;

      const { error } = await supabase.from('gastos').update({
        comprobante_url: finalUrl,
      }).eq('id', uploadTarget.id);

      if (error) {
        // Fallback to RPC if direct write fails
        await supabase.rpc('adjuntar_comprobante_gasto', {
          p_expense_id: uploadTarget.id,
          p_receipt: finalUrl,
        });
      }

      await syncData();
      finishSound(true);
    } catch (err) {
      console.error('Error al subir comprobante:', err);
      finishSound(false);
      alert('Error al subir comprobante de gasto: ' + (err?.message || 'Inténtalo de nuevo.'));
    } finally {
      setUploadingId(null);
      setUploadTarget(null);
    }
  };

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedDivisa, setSelectedDivisa] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const categorias = useMemo(() => {
    const base = [
      ...GASTO_CATEGORIES.map((c) => c.name),
      ...data.gastos.map((g) => g.categoria).filter(Boolean),
    ];
    return Array.from(new Set(base));
  }, [data.gastos]);

  const filteredGastos = useMemo(() => {
    return data.gastos.filter((g) => {
      const matchSearch =
        g.codigo.toLowerCase().includes(search.toLowerCase()) ||
        g.concepto.toLowerCase().includes(search.toLowerCase()) ||
        g.categoria.toLowerCase().includes(search.toLowerCase());
      const matchCategoria = !selectedCategoria || g.categoria === selectedCategoria;
      const matchDivisa = !selectedDivisa || g.divisa === selectedDivisa;

      const matchFecha = matchesDateRange(g.fecha, fechaDesde, fechaHasta);

      return matchSearch && matchCategoria && matchDivisa && matchFecha;
    });
  }, [data.gastos, search, selectedCategoria, selectedDivisa, fechaDesde, fechaHasta]);

  // Lightbox list for Gastos
  const receiptsList: LightboxItem[] = useMemo(() => {
    const list: LightboxItem[] = [];
    filteredGastos.forEach((g) => {
      if (!g.comprobanteUrl) return;
      const urls = g.comprobanteUrl.split(',').map((u) => u.trim()).filter(Boolean);
      urls.forEach((url, i) => {
        list.push({
          id: `${g.id}-${i}`,
          codigo: urls.length > 1 ? `${g.codigo} (#${i + 1})` : g.codigo,
          clienteNombre: g.concepto,
          monto: g.monto,
          comprobanteUrl: url,
        });
      });
    });
    return list;
  }, [filteredGastos]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <h2 className="text-base font-bold">Gastos</h2>
          <p className="text-xs text-muted-foreground">Registro de egresos y comprobantes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenAddGasto ? onOpenAddGasto : () => setIsAddOpen(true)}
            type="button"
            className={recordButtonClass}
          >
            <i className="ri-add-line text-sm" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar: Rango de fechas, Categoría, Divisa, Búsqueda */}
      <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-6">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por concepto o código..."
              className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Categoría */}
          <div>
            <TableSelectFilter label="Categoría" value={selectedCategoria} onChange={setSelectedCategoria} className="w-full">
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </TableSelectFilter>
          </div>

          <CurrencyFilterDropdown value={selectedDivisa} onChange={setSelectedDivisa} className="w-full" />
          {/* Fecha Desde */}
          <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
          <span>{formatNumber(filteredGastos.length)} de {formatNumber(data.gastos.length)} registros</span>
          {(search || selectedCategoria || selectedDivisa || fechaDesde || fechaHasta) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategoria('');
                setSelectedDivisa('');
                setFechaDesde('');
                setFechaHasta('');
              }}
              type="button" className="text-primary hover:underline font-semibold"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <KpiStrip metrics={([
        ['Gastos', filteredGastos.length],
        ['Total por divisa', totalsByCurrency(filteredGastos, (g) => g.divisa, (g) => g.monto)],
      ] as const).map(([label, value]) => ({ label, value }))} />

      {/* Gastos Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4">Categoría Contable</th>
                <th className="py-3 px-4">Institución / Origen</th>
                <th className="py-3 px-4">Comprobante</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <CreatedByHeader />
                <th scope="col" className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredGastos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No se encontraron gastos registrados
                  </td>
                </tr>
              ) : (
                <PaginatedRows pageSize={100} columns={9} rows={filteredGastos}>{(g) => (
                  <tr key={g.id} className="hover:bg-muted/30 transition-colors h-14">
                    <td className="py-2.5 px-4 font-mono font-medium text-foreground whitespace-nowrap">{g.codigo}</td>
                    <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{formatDate(g.fecha)}</td>
                    <td className="py-2.5 px-4 font-semibold text-foreground max-w-[220px] truncate" title={g.concepto}>{g.concepto}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-muted text-foreground border border-border">
                        <i className={`${getCategoryIcon(g.categoria)} text-primary text-xs`} />
                        <span>{g.categoria}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{g.origenFondos}</td>

                    {/* Uniform 9:16 Receipt Cell with direct file upload and '+' button */}
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      {uploadingId === g.id ? (
                        <div className="flex items-center justify-center gap-1 h-10 text-[11px] text-primary font-medium">
                          <i className="ri-loader-4-line animate-spin text-sm" />
                          <span>Subiendo…</span>
                        </div>
                      ) : g.comprobanteUrl ? (
                        <div className="flex items-center justify-center gap-1.5 h-10">
                          {/* Thumbnails (split by comma if multiple) */}
                          <div className="flex items-center gap-1 max-w-[120px] overflow-x-auto">
                            {g.comprobanteUrl.split(',').map((u) => u.trim()).filter(Boolean).map((singleUrl, rIdx) => (
                              <button
                                key={rIdx}
                                type="button"
                                onClick={() => {
                                  const idx = receiptsList.findIndex((item) => item.comprobanteUrl === singleUrl);
                                  if (idx !== -1) setLightboxIndex(idx);
                                }}
                                title="Ver comprobante en formato 9:16"
                                className="group relative h-10 w-6 shrink-0 overflow-hidden rounded-md border border-border/80 shadow-xs hover:ring-2 hover:ring-primary transition-all bg-muted"
                                style={{ aspectRatio: '9/16' }}
                              >
                                <ReceiptThumbnail receipt={singleUrl} />
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity">
                                  <i className="ri-zoom-in-line" />
                                </div>
                              </button>
                            ))}
                          </div>

                          {/* Direct Edit / Replace icon (opens file picker directly) */}
                          <button
                            type="button"
                            onClick={() => triggerDirectUpload(g.id, undefined, false)}
                            title="Reemplazar comprobante (directo a archivos)"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <i className="ri-pencil-line text-xs" />
                          </button>

                          {/* Direct '+' icon to append another receipt */}
                          <button
                            type="button"
                            onClick={() => triggerDirectUpload(g.id, g.comprobanteUrl, true)}
                            title="Añadir otro comprobante (directo a archivos)"
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <i className="ri-add-line text-xs font-bold" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerDirectUpload(g.id, undefined, false)}
                          title="Subir comprobante (directo a archivos)"
                          className="h-10 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-muted"
                        >
                          <i className="ri-upload-cloud-line text-xs" />
                          <span>Subir</span>
                        </button>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right font-bold text-foreground whitespace-nowrap">
                      {g.divisa === 'COP' ? formatCOP(g.monto) : formatUSD(g.monto)}
                    </td>
                    <CreatedByCell name={g.createdByName} />
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditing(g)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
                      >
                        <i className="ri-edit-line" aria-hidden="true" />
                        <span>Editar</span>
                      </button>
                    </td>
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Hidden file input for direct receipt uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept={receiptAccept}
        onChange={handleFilePicked}
        className="hidden"
        aria-hidden="true"
      />

      {/* Add Gasto Modal */}
      {attachingTo && <AttachExpenseReceipt expenseId={attachingTo.id} currentReceipt={attachingTo.url} onClose={() => setAttachingTo(null)} onSaved={syncData} />}
      {editing && <AddGastoModal isOpen record={editing} onClose={() => setEditing(null)} />}
      <AddGastoModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
};
