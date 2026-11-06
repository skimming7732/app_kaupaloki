import React from 'react';
import { ReceiptPreview } from '../common/ReceiptPreview';

interface ReceiptModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, imageUrl, title, onClose }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative max-w-3xl max-h-[90vh] bg-card rounded-2xl border border-border p-4 shadow-2xl flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex items-center justify-between pb-3 border-b border-border mb-3">
          <span className="text-sm font-semibold text-foreground">{title || 'Comprobante de Pago'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
            >
              <i className="ri-close-line" />
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[75vh] flex items-center justify-center rounded-xl bg-black/20 p-2">
          <ReceiptPreview receipt={imageUrl} />
        </div>
      </div>
    </div>
  );
};
