import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import { receiptAccept, uploadReceipt } from '../../utils/receipts';
import { RecordActions, RecordDialog, recordFieldClass, recordLabelClass } from './RecordDialog';

export const AttachExpenseReceipt = ({ expenseId, onClose, onSaved, dispersion = false, currentReceipt }: {
  expenseId: string; dispersion?: boolean; currentReceipt?: string; onClose: () => void; onSaved: () => Promise<void>;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState<{ file: File; receipt: string }>();
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const file = new FormData(event.currentTarget).get('comprobante');
    if (!(file instanceof File)) return;
    setBusy(true);
    setError('');
    const finish = prepareSuccessSound();
    try {
      const receipt = uploaded?.file.name === file.name && uploaded.file.lastModified === file.lastModified && uploaded.file.size === file.size
        ? uploaded.receipt : await uploadReceipt(file, dispersion ? 'dispersiones' : 'gastos');
      if (!receipt) throw new Error('Selecciona un comprobante.');
      setUploaded({ file, receipt });
      const { data, error } = dispersion
        ? await supabase.rpc('guardar_comprobante_dispersion', { p_id: expenseId, p_receipt: receipt, p_previous: currentReceipt ?? null })
        : await supabase.rpc('adjuntar_comprobante_gasto', { p_id: expenseId, p_receipt: receipt });
      if (error || !data) throw new Error('No se pudo adjuntar el comprobante. Actualiza la lista si el gasto ya tiene uno.');
      finish(true);
      await onSaved();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar el comprobante.');
    } finally {
      finish(false);
      setBusy(false);
    }
  };
  return (
    <RecordDialog title={currentReceipt ? "Editar comprobante" : "Adjuntar comprobante"} description="Sube una imagen o un PDF de hasta 10 MB." icon="ri-attachment-2-line" onClose={onClose} busy={busy} error={error}>
      <form onSubmit={submit} className="space-y-4">
        <label className={recordLabelClass}>
          Archivo
          <input type="file" name="comprobante" required disabled={busy} accept={receiptAccept} className={recordFieldClass} />
        </label>
        <RecordActions busy={busy} label="Guardar comprobante" onClose={onClose} />
      </form>
    </RecordDialog>
  );
};
