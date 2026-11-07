import React from 'react';
import { receiptAccept } from '../../utils/receipts';
import { recordLabelClass } from './RecordDialog';

export const ReceiptInput = ({ required = false, disabled = false }: { required?: boolean; disabled?: boolean }) => (
  <label className={recordLabelClass}>
    <span className="flex items-center gap-2">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-primary">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4" />
      </svg>
      {required ? 'Archivo del comprobante' : 'Subir comprobante (opcional)'}
    </span>
    <input type="file" name="comprobante" required={required} disabled={disabled} accept={receiptAccept}
      className="block w-full rounded-xl border border-dashed border-input bg-background p-2 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:font-semibold file:text-primary" />
  </label>
);
