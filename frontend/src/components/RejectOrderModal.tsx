import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { inputClass, labelClass } from "./ui/formStyles";

const MAX_REASON_LENGTH = 500;

interface RejectOrderModalProps {
  employeeLabel: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  submitting?: boolean;
  error?: string | null;
}

export function RejectOrderModal({ employeeLabel, onConfirm, onClose, submitting, error }: RejectOrderModalProps) {
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError("Ablehnungsgrund darf nicht leer sein.");
      return;
    }
    if (trimmed.length > MAX_REASON_LENGTH) {
      setValidationError(`Ablehnungsgrund darf maximal ${MAX_REASON_LENGTH} Zeichen lang sein.`);
      return;
    }
    setValidationError(null);
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-primary-500">Bestellung ablehnen</h2>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="shrink-0 text-2xl leading-none text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">Bestellung von {employeeLabel}</p>

        <div className="mt-4">
          <label className={labelClass}>Ablehnungsgrund</label>
          <textarea
            className={inputClass}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="z.B. Größe aktuell nicht lieferbar"
            maxLength={MAX_REASON_LENGTH}
            autoFocus
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {reason.length}/{MAX_REASON_LENGTH}
          </p>
        </div>

        {(validationError || error) && <p className="mt-2 text-sm text-red-600">{validationError ?? error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="neutral" onClick={onClose} disabled={submitting}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Wird abgelehnt..." : "Ablehnen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
