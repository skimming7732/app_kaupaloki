import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import { ReceiptInput } from './ReceiptInput';
import { uploadReceipt } from '../../utils/receipts';
import { RecordActions, RecordDialog } from './RecordDialog';

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
      const { error } = await supabase.rpc('guardar_comprobante_dashboard', {
        p_table: dispersion ? 'dispersiones' : 'gastos', p_id: expenseId,
        p_receipt: receipt, p_previous: currentReceipt ?? null,
      });
      if (error) {
        if (error.code === '40001') {
          await onSaved();
          throw new Error('El comprobante cambió mientras editabas. Cierra esta ventana y vuelve a abrir el registro.');
        }
        if (error.code === '42501') throw new Error('Tu perfil no tiene permiso para adjuntar este comprobante.');
        throw new Error('El archivo se subió, pero no se pudo vincular al registro. Puedes volver a intentar.');
      }
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
    <RecordDialog title={currentReceipt ? "Editar comprobante" : "Adjuntar comprobante"} description="Sube una imagen o un PDF de hasta 10 MB." icon="ri-upload-2-line" onClose={onClose} busy={busy} error={error}>
      <form onSubmit={submit} className="space-y-4">
        <ReceiptInput required disabled={busy} />
        <RecordActions busy={busy} label="Guardar comprobante" onClose={onClose} />
      </form>
    </RecordDialog>
  );
};
