import React, { useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../contexts/AuthContext";

type Props = {
  open: boolean;
  payment: any | null;
  onClose: () => void;
  onSaved: () => void;
};

const EditPaymentModal: React.FC<Props> = ({
  open,
  payment,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [installmentMonth, setInstallmentMonth] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const canEditDirectly = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    if (payment) {
      setAmount(String(payment.amount || ""));
      setInstallmentMonth(String(payment.installmentMonth || ""));
      setPaymentDate(
        payment.paymentDate
          ? new Date(payment.paymentDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setNotes(payment.notes || "");
    } else {
      setAmount("");
      setInstallmentMonth("");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setNotes("");
    }
  }, [payment]);

  const handleSave = async () => {
    if (!payment) return;
    const a = Number(amount);
    const m = Number(installmentMonth);
    if (Number.isNaN(a) || a <= 0) return setError("Invalid amount");
    if (!Number.isInteger(m) || m <= 0) return setError("Invalid month");
    setSaving(true);
    try {
      if (canEditDirectly) {
        // Admin/Manager can edit directly
        await client.put(`/payments/${payment._id}`, {
          amount: a,
          installmentMonth: m,
          paymentDate,
          notes,
        });
        onSaved();
        onClose();
      } else {
        // Employees must submit a request
        await client.post("/payments/requests", {
          paymentId: payment._id,
          type: "edit",
          changes: {
            amount: a,
            installmentMonth: m,
            paymentDate,
            notes,
          },
          reason: "Requested edit via app",
        });
        alert("Edit request submitted successfully. Admin/Manager will review it.");
        onSaved();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded shadow-lg w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Edit Payment</h3>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <label className="block text-sm text-slate-700">Amount (PKR)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-3"
        />
        <label className="block text-sm text-slate-700">
          Installment Month
        </label>
        <input
          type="number"
          value={installmentMonth}
          onChange={(e) => setInstallmentMonth(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-3"
        />
        <label className="block text-sm text-slate-700">Payment Date</label>
        <input
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-3"
        />
        <label className="block text-sm text-slate-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-4"
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 border rounded bg-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-3 py-2 rounded text-white ${
              saving ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPaymentModal;
