import React from "react";

type ConfirmModalProps = {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black opacity-40"
        onClick={onCancel}
      />

      <div className="bg-white rounded shadow-lg z-10 w-11/12 max-w-md">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-slate-900">
            {title || "Confirm"}
          </h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-700">{message}</p>
        </div>
        <div className="p-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded bg-white hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
