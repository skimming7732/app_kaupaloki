import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import { ReceiptInput } from './ReceiptInput';
import { uploadReceipt } from '../../utils/receipts';
import { RecordActions, RecordDialog } from './RecordDialog';

export const AttachExpenseReceipt = ({ expenseId, onClose, onSaved, dispersion = false, currentReceipt, append = false }: {
  expenseId: string; dispersion?: boolean; currentReceipt?: string; append?: boolean; onClose: () => void; onSaved: () => Promise<void>;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState<{ file: File; receipt: string }>();
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const file = new FormData(event.currentTarget).get('comprobante');
    if (!(file instanceof File) || !file.size) return;
    setBusy(true);
    setError('');
    const finish = prepareSuccessSound();
    try {
      const receipt = uploaded?.file.name === file.name && uploaded.file.lastModified === file.lastModified && uploaded.file.size === file.size
        ? uploaded.receipt : await uploadReceipt(file, dispersion ? 'dispersiones' : 'gastos');
      if (!receipt) throw new Error('Selecciona un comprobante.');
      setUploaded({ file, receipt });
      const finalReceipt = append && currentReceipt ? currentReceipt + ',' + receipt : receipt;
      const { error } = await supabase.rpc('guardar_comprobante_dashboard', {
        p_table: dispersion ? 'dispersiones' : 'gastos', p_id: expenseId,
        p_receipt: finalReceipt, p_previous: currentReceipt ?? null,
      });
      if (error) {
        if (error.code === '40001') {
          await onSaved();
          throw new Error('El comprobante cambió mientras editabas. Cierra esta ventana y vuelve a abrir el registro.');
        }
        if (error.code === '42501') throw new Error('Tu perfil no tiene permiso para adjuntar este comprobante.');
        if (error.code === 'P0002' || error.code === '22P02') throw new Error('El registro ya no está disponible. Actualiza la tabla.');
        if (error.code === '22023') {
          setUploaded(undefined);
          throw new Error('No se pudo verificar el archivo subido. Selecciona el comprobante y vuelve a guardarlo.');
        }
        throw new Error('No se pudo vincular el comprobante. Vuelve a pulsar Guardar para reintentar sin subir el archivo de nuevo. Código: ' + (error.code || 'sin código') + '.');
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
    <RecordDialog title={append ? "Agregar otro comprobante" : currentReceipt ? "Reemplazar comprobante" : "Adjuntar comprobante"} description="Arrastra, pega o elige una imagen o PDF de hasta 10 MB." icon="ri-upload-2-line" onClose={onClose} busy={busy} error={error}>
      <form onSubmit={submit} className="space-y-4">
        <ReceiptInput required disabled={busy} />
        <RecordActions busy={busy} label="Guardar comprobante" onClose={onClose} />
      </form>
    </RecordDialog>
  );
};
