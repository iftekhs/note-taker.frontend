import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { errorMessage } from '../api.js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog.jsx';

export default function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  async function handleConfirm(event) {
    event.preventDefault();
    if (deleting) return;

    setDeleting(true);
    setConfirmError('');
    try {
      const deleted = await onConfirm();
      if (deleted !== false) setOpen(false);
    } catch (err) {
      setConfirmError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (deleting) return;
        setOpen(nextOpen);
        if (nextOpen) setConfirmError('');
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmError && (
          <p role="alert" className="text-sm text-destructive">{confirmError}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            aria-busy={deleting}
            onClick={handleConfirm}
          >
            {deleting && <LoaderCircle className="size-4 animate-spin" />}
            {deleting ? 'Deleting…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
