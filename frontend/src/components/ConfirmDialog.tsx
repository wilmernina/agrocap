import { AlertTriangle } from 'lucide-react';
import { Button, Modal } from './ui';

export function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, loading = false, confirmLabel = 'Confirmar', tone = 'danger' }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; onConfirm: () => void; loading?: boolean; confirmLabel?: string; tone?: 'danger'|'primary' }) {
  return <Modal open={open} onOpenChange={onOpenChange} title={title} size="sm">
    <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><AlertTriangle className="mt-0.5 shrink-0" size={20} />{description}</div>
    <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant={tone} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></div>
  </Modal>;
}
