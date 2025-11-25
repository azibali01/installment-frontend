"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { generateSchedule } from "../utils/finance";
import PaymentPreview from "../components/PaymentPreview";
import Pagination from "../components/Pagination";
import EditPaymentModal from "../components/EditPaymentModal";
import ConfirmModal from "../components/ConfirmModal";
import type { Payment, InstallmentPlan } from "../types";
import { useAuth } from "../contexts/AuthContext";

export const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [filterCustomerId, setFilterCustomerId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    installmentPlanId: "",
    installmentMonth: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPayments, setTotalPayments] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize]);

  const fetchData = async () => {
    setError("");
    try {
      const payParams: any = { page: currentPage, pageSize };
      if (filterCustomerId) payParams.customerId = filterCustomerId;
      if (filterStatus) payParams.status = filterStatus;

      const [pay, inst, cust] = await Promise.all([
        client.get("/payments", { params: payParams }),
        client.get("/installments"),
        client.get("/customers"),
      ]);

      if (Array.isArray(pay.data)) {
        setPayments(pay.data || []);
        setTotalPayments(pay.data.length || 0);
      } else {
        setPayments(pay.data.data || pay.data || []);
        setTotalPayments(pay.data.total || 0);
        if (pay.data.page) setCurrentPage(pay.data.page);
        if (pay.data.pageSize) setPageSize(pay.data.pageSize);
      }

      const instList = Array.isArray(inst.data)
        ? inst.data
        : inst.data?.data || [];
      setInstallments(instList.filter((i: any) => i.status === "approved"));
      setCustomers(cust.data || []);
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  const goToPage = (p: number) =>
    setCurrentPage(
      Math.min(Math.max(1, p), Math.max(1, Math.ceil(totalPayments / pageSize)))
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await client.post("/payments", {
        installmentPlanId: formData.installmentPlanId,
        installmentMonth: formData.installmentMonth
          ? Number.parseInt(formData.installmentMonth)
          : undefined,
        amount: Number.parseFloat(formData.amount),
        paymentDate: new Date(formData.paymentDate),
        notes: formData.notes,
      });

      setFormData({
        installmentPlanId: "",
        installmentMonth: "",
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteModalOpen(true);
  };

  const performDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeletingId(deleteTargetId);
      await client.delete(`/payments/${deleteTargetId}`);
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete payment");
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (p: any) => {
    if (!p || !p.installmentMonth || Number(p.installmentMonth) <= 0) {
      setError(
        "Editing auto-allocated payments is not supported via quick editor."
      );
      return;
    }
    setSelectedPayment(p);
    setEditModalOpen(true);
  };

  const canRecord = ["admin", "manager", "employee"].includes(user?.role || "");

  const sortedInstallments = [...installments].sort((a, b) => {
    const ai = a as any;
    const bi = b as any;
    const aCust =
      ai.customerId && typeof ai.customerId === "object"
        ? ai.customerId.name ?? ""
        : String(ai.customerId ?? "");
    const bCust =
      bi.customerId && typeof bi.customerId === "object"
        ? bi.customerId.name ?? ""
        : String(bi.customerId ?? "");
    return aCust.localeCompare(bCust);
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-slate-600 hover:text-slate-900 transition"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              Payment Records
            </h1>
          </div>
          {canRecord && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              {showForm ? "Cancel" : "Record Payment"}
            </button>
          )}
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button onClick={() => setError("")} className="float-right">
              ✕
            </button>
          </div>
        )}

        {showForm && (
          <div className="card p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Record Payment
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={formData.installmentPlanId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      installmentPlanId: e.target.value,
                    })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                >
                  <option value="">Select Installment Plan</option>
                  {sortedInstallments.map((inst) => {
                    const i = inst as any;
                    const cust = i.customerId;
                    const prod = i.productId;
                    const custLabel =
                      cust && typeof cust === "object"
                        ? cust.name ?? String(cust)
                        : String(cust ?? "Customer");
                    const prodLabel =
                      prod && typeof prod === "object"
                        ? prod.name ?? String(prod)
                        : String(prod ?? "Product");
                    const startDate = i.startDate
                      ? new Date(i.startDate).toLocaleDateString()
                      : null;
                    const shortId = i._id ? String(i._id).slice(0, 8) : "";
                    return (
                      <option key={i._id} value={i._id}>
                        {custLabel} - {prodLabel}{" "}
                        {startDate ? `(${startDate})` : ""}{" "}
                        {shortId ? `[${shortId}]` : ""}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={formData.installmentMonth}
                  onChange={(e) => {
                    const monthVal = e.target.value;
                    const plan = installments.find(
                      (p) =>
                        String(p._id) === String(formData.installmentPlanId)
                    );
                    if (monthVal && plan && plan.installmentSchedule) {
                      const m = Number.parseInt(monthVal);
                      const entry = plan.installmentSchedule.find(
                        (s: any) => Number(s.month) === m
                      );
                      if (entry) {
                        const remaining = Math.max(
                          0,
                          Number(entry.amount || 0) -
                            Number(entry.paidAmount || 0)
                        );
                        setFormData({
                          ...formData,
                          installmentMonth: monthVal,
                          amount: String(Number(remaining.toFixed(2))),
                        });
                        return;
                      }
                    }
                    setFormData({ ...formData, installmentMonth: monthVal });
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                >
                  <option value="">Auto allocate (all pending)</option>
                  {!formData.installmentPlanId && (
                    <option value="" disabled>
                      Select a plan first
                    </option>
                  )}
                  {(() => {
                    const plan = installments.find(
                      (p) =>
                        String(p._id) === String(formData.installmentPlanId)
                    );
                    if (!plan || !plan.installmentSchedule) return null;
                    return plan.installmentSchedule
                      .filter(
                        (s: any) =>
                          s.status !== "paid" &&
                          Number(s.amount || 0) - Number(s.paidAmount || 0) > 0
                      )
                      .map((s: any) => {
                        const remaining = Math.max(
                          0,
                          Number(s.amount || 0) - Number(s.paidAmount || 0)
                        );
                        const due = s.dueDate
                          ? new Date(s.dueDate).toLocaleDateString()
                          : "";
                        return (
                          <option key={s.month} value={String(s.month)}>
                            {`Month ${s.month} — ${due} — PKR ${Number(
                              remaining
                            ).toLocaleString()}`}
                          </option>
                        );
                      });
                  })()}
                </select>
                <input
                  type="number"
                  placeholder="Amount (PKR)"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  step="0.01"
                  required
                />
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentDate: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                />
              </div>
              <div className="mb-4 p-3 border rounded bg-white">
                <div className="text-sm text-slate-600">Preview</div>
                <PaymentPreview
                  planId={formData.installmentPlanId}
                  amount={Number.parseFloat(formData.amount || "0")}
                  installments={installments}
                />
              </div>
              <textarea
                placeholder="Notes (optional)"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 placeholder-slate-400"
                rows={2}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full font-medium py-2 px-4 rounded transition ${
                  isSubmitting
                    ? "bg-green-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {isSubmitting ? "Recording…" : "Record Payment"}
              </button>
            </form>
          </div>
        )}

        {/* Filters toolbar - mirror Installments page */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <select
              value={filterCustomerId}
              onChange={(e) => {
                setFilterCustomerId(e.target.value);
                setCurrentPage(1);
                void fetchData();
              }}
              className="px-3 py-2 bg-white border border-gray-300 rounded text-slate-900"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name || c.fullName || String(c._id).slice(0, 8)}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
                void fetchData();
              }}
              className="px-3 py-2 bg-white border border-gray-300 rounded text-slate-900"
            >
              <option value="">All</option>
              <option value="withMonth">With Month</option>
              <option value="auto">Auto allocated</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFilterCustomerId("");
                setFilterStatus("");
                setCurrentPage(1);
                void fetchData();
              }}
              className="px-3 py-2 bg-gray-100 border border-gray-200 rounded text-slate-700"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Recorded By
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 w-36">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-slate-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-slate-500"
                  >
                    No payments recorded
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const p: any = payment as any;
                  const customerName =
                    p.customerName ||
                    (p.customer && p.customer.name) ||
                    (p.customerId &&
                      (p.customerId.name || String(p.customerId))) ||
                    "Unknown";
                  const monthLabel =
                    p.installmentMonth && Number(p.installmentMonth) > 0
                      ? `Month ${p.installmentMonth}`
                      : "Auto";
                  const amount = p.amount || p.breakdown?.total || 0;
                  const date = p.paymentDate
                    ? new Date(p.paymentDate).toLocaleDateString()
                    : "";
                  const recordedBy =
                    p.recordedBy?.name || p.createdBy || p.createdByName || "";
                  return (
                    <tr key={p._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {customerName}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {monthLabel}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        PKR {Number(amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {date}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {recordedBy}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canRecord && (
                          <div className="flex items-center gap-2 justify-end">
                            {Number(p.installmentMonth || 0) > 0 && (
                              <button
                                onClick={() => openEditModal(p)}
                                className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium border bg-white border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white`}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(String(p._id))}
                              disabled={deletingId === String(p._id)}
                              className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium border ${
                                deletingId === String(p._id)
                                  ? "bg-red-300 border-red-300 text-white cursor-not-allowed"
                                  : "bg-white border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                              }`}
                            >
                              {deletingId === String(p._id)
                                ? "Deleting…"
                                : "Delete"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={totalPayments}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(1);
            }}
          />
          <ConfirmModal
            isOpen={deleteModalOpen}
            title="Delete Payment"
            message="Are you sure you want to delete this payment? This will reverse the recorded amount on the plan."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onConfirm={performDelete}
            onCancel={() => {
              setDeleteModalOpen(false);
              setDeleteTargetId(null);
            }}
          />
        </div>
        <EditPaymentModal
          open={editModalOpen}
          payment={selectedPayment}
          onClose={() => setEditModalOpen(false)}
          onSaved={() => fetchData()}
        />
      </main>
    </div>
  );
};
