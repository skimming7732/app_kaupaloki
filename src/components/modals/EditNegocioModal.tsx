import React from 'react';
import { AddNegocioModal, type EditableNegocio } from './AddNegocioModal';

interface EditNegocioModalProps {
  isOpen: boolean;
  negocio: EditableNegocio | null;
  onClose: () => void;
}

export const EditNegocioModal = ({ isOpen, negocio, onClose }: EditNegocioModalProps) =>
  negocio ? <AddNegocioModal isOpen={isOpen} negocio={negocio} onClose={onClose} /> : null;
