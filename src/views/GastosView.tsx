import { useWriteAccess } from '../utils/useWriteAccess';
import { recordButtonClass } from '../components/modals/RecordDialog';
import { KpiStrip } from '../components/common/KpiStrip';
import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { CurrencyFilterDropdown } from '../components/common/CurrencyFilterDropdown';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { ReceiptThumbnail } from '../components/common/ReceiptThumbnail';
import { ReceiptLightboxModal, type LightboxItem } from '../components/modals/ReceiptLightboxModal';
import { getCategoryIcon, GASTO_CATEGORIES } from '../components/common/CategorySearchSelect';
import { AttachExpenseReceipt } from '../components/modals/AttachExpenseReceipt';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useData, type GastoItem } from '../context/DataContext';
import { formatNumber, formatCOP, formatUSD, formatDate, formatRate } from '../utils/formatters';
import { AddGastoModal } from '../components/modals/AddGastoModal';

interface GastosViewProps {
  onOpenAddGasto?: () => void;
}

export const GastosView: React.FC<GastosViewProps> = ({ onOpenAddGasto }) => {
  const canWrite = useWriteAccess('admin');
  const { data, metrics, syncData } = useData();
  const tasaUsdtCop = metrics?.rateUsdtCop || 3950;
  const [attachingTo, setAttachingTo] = useState<{ id: string; url?: string; append?: boolean } | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<GastoItem | null>(null);

  // 9:16 Lightbox Modal State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openReceiptDialog = (id: string, currentUrl?: string, append = false) => {
    if (!canWrite) return;
    const row = data.gastos.find((record) => record.id === id);
    setAttachingTo({ id, url: currentUrl ?? row?.comprobanteUrl, append });
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

  const divisasUsadas = useMemo(() => {
    const set = new Set<string>();
    data.gastos.forEach((g) => {
      if (g.divisa) set.add(g.divisa.toUpperCase());
    });
    if (set.size === 0) {
      set.add('COP');
      set.add('USDT');
    }
    return Array.from(set).sort();
  }, [data.gastos]);

  const { totalGastosCOP, totalGastosUSDT, totalGastosConsolidadosCOP } = useMemo(() => {
    let cop = 0;
    let usdt = 0;
    filteredGastos.forEach((g) => {
      const divisa = (g.divisa || 'COP').toUpperCase();
      const monto = Number(g.monto) || 0;
      if (divisa === 'USDT') {
        usdt += monto;
      } else {
        cop += monto;
      }
    });
    const consolidado = cop + (usdt * tasaUsdtCop);
    return {
      totalGastosCOP: cop,
      totalGastosUSDT: usdt,
      totalGastosConsolidadosCOP: consolidado,
    };
  }, [filteredGastos, tasaUsdtCop]);

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
          {canWrite && (<button
            onClick={onOpenAddGasto ? onOpenAddGasto : () => setIsAddOpen(true)}
            type="button"
            className={recordButtonClass}
          >
            <i className="ri-add-line text-sm" />
            <span>Registrar Gasto</span>
          </button>)}
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

          <CurrencyFilterDropdown value={selectedDivisa} onChange={setSelectedDivisa} currencies={divisasUsadas} className="w-full" />
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

      <KpiStrip
        metrics={[
          {
            label: '# Gastos',
            value: formatNumber(filteredGastos.length),
            icon: 'ri-file-list-3-line',
          },
          {
            label: 'Gastos COP',
            value: formatCOP(totalGastosCOP),
            icon: 'ri-money-dollar-circle-line',
          },
          {
            label: 'Gastos USDT',
            value: `${formatNumber(totalGastosUSDT, 2, 2)} USDT`,
            icon: 'ri-copper-coin-line',
          },
          {
            label: 'Total Gastos COP',
            value: (
              <div className="flex flex-col">
                <span>{formatCOP(totalGastosConsolidadosCOP)}</span>
                {totalGastosUSDT > 0 && (
                  <span className="text-[11px] font-normal text-muted-foreground mt-0.5">
                    Tasa: {formatRate(tasaUsdtCop)} COP
                  </span>
                )}
              </div>
            ),
            icon: 'ri-calculator-line',
            featured: true,
          },
        ]}
      />

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

                    {/* Receipt previews and '+' button */}
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      {g.comprobanteUrl ? (
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

                          {/* Replace receipt */}
                          {canWrite && (<button
                            type="button"
                            onClick={() => openReceiptDialog(g.id, undefined, false)}
                            title="Reemplazar comprobante"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <i className="ri-pencil-line text-xs" />
                          </button>)}

                          {/* Append another receipt */}
                          {canWrite && (<button
                            type="button"
                            onClick={() => openReceiptDialog(g.id, g.comprobanteUrl, true)}
                            title="Añadir otro comprobante"
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <i className="ri-add-line text-xs font-bold" />
                          </button>)}
                        </div>
                      ) : (
                        canWrite && (<button
                          type="button"
                          onClick={() => openReceiptDialog(g.id, undefined, false)}
                          title="Subir comprobante"
                          className="h-10 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-muted"
                        >
                          <i className="ri-upload-cloud-line text-xs" />
                          <span>Subir</span>
                        </button>)
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right font-bold text-foreground whitespace-nowrap">
                      {g.divisa === 'COP' ? formatCOP(g.monto) : formatUSD(g.monto)}
                    </td>
                    <CreatedByCell name={g.createdByName} />
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {canWrite && (<button
                        type="button"
                        onClick={() => setEditing(g)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
                      >
                        <i className="ri-edit-line" aria-hidden="true" />
                        <span>Editar</span>
                      </button>)}
                    </td>
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Gasto Modal */}
      {attachingTo && <AttachExpenseReceipt expenseId={attachingTo.id} currentReceipt={attachingTo.url} append={attachingTo.append} onClose={() => setAttachingTo(null)} onSaved={syncData} />}
      {editing && <AddGastoModal isOpen record={editing} onClose={() => setEditing(null)} />}
      <AddGastoModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
};
