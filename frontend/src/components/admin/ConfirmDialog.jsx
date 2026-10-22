
import { useEffect, useRef } from "react";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message = "This action may affect existing records.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function closeDialog() {
    if (!loading) onCancel?.();
  }

  async function confirm() {
    if (loading) return;
    await onConfirm?.();
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
    >
      <div className="confirm-dialog-content">
        <div className={`confirm-dialog-icon ${danger ? "danger" : "normal"}`}>
          {danger ? "!" : "?"}
        </div>

        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="btn"
            disabled={loading}
            onClick={closeDialog}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={danger ? "btn btn-danger" : "btn btn-primary"}
            disabled={loading}
            onClick={confirm}
          >
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
}
