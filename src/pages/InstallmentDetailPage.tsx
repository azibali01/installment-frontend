"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../api/client";
import { cleanCNIC, formatCNIC, isValidCNIC } from "../utils/cnic";
import { formatPhone, cleanPhone } from "../utils/phone";
import { validateGuarantors } from "../utils/validation";
import { handleApiError, getContextualErrorMessage } from "../utils/errorHandler";
import {
  amortizedMonthlyPayment,
  generateSchedule,
  type ScheduleItem,
  type RoundingPolicy,
  type InterestModel,
} from "../utils/finance";
import type { InstallmentPlan } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import Pagination from "../components/Pagination";
import { formatCurrency } from "../utils/format";

const InstallmentDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<InstallmentPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { user, hasPermission } = useAuth();

  const [showForm, setShowForm] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    downPayment: "",
    downPercent: "10",
    markupPercent: "",
    markupAmount: "",
    numberOfMonths: "",
    startDate: new Date().toISOString().slice(0, 10),
    roundingPolicy: "nearest" as RoundingPolicy,
    interestModel: "equal" as InterestModel,
    reference: "",
    bankCheque: {
      bankName: "",
      branch: "",
      accountNumber: "",
      chequeNumber: "",
    },
    guarantors: [
      { name: "", relation: "", phone: "", cnic: "", address: "" },
      { name: "", relation: "", phone: "", cnic: "", address: "" },
    ],
  });
  const [requestLoading, setRequestLoading] = useState<boolean>(false);
  const [requestMessage, setRequestMessage] = useState<string>("");
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );

  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [selectedScheduleIndex, setSelectedScheduleIndex] = useState<
    number | null
  >(null);
  const [logForm, setLogForm] = useState({
    response: "",
    contactMethod: "phone",
    nextContactDate: "",
    notes: "",
  });
  const [logLoading, setLogLoading] = useState(false);
  const [contactLogs, setContactLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(10);
  const [logsTotal, setLogsTotal] = useState(0);
  const [showAllLogsModal, setShowAllLogsModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchPlan = async () => {
      try {
        setIsLoading(true);
        const res = await client.get(`/installments/${id}`);
        setPlan(res.data);
      } catch (err: any) {
        const errorMessage = getContextualErrorMessage(err, "fetch");
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchPlan();
  }, [id]);

  useEffect(() => {
    if (!plan) return;
    void fetchContactLogs();
  }, [plan?._id]);

  const preview = React.useMemo(() => {
    const basePrice = Number((plan as any)?.productId?.price || 0);
    let markupAmountNum = Number((formData as any).markupAmount) || 0;
    let markupPercentNum = Number((formData as any).markupPercent) || 0;
    if (!markupAmountNum && markupPercentNum)
      markupAmountNum = (basePrice * markupPercentNum) / 100;
    if (!markupPercentNum && markupAmountNum && basePrice > 0)
      markupPercentNum = (markupAmountNum / basePrice) * 100;
    const totalAmount =
      basePrice + (Number.isNaN(markupAmountNum) ? 0 : markupAmountNum);
    let down = Number(formData.downPayment) || 0;
    let downPercentNum = Number((formData as any).downPercent) || 0;
    if (!down && downPercentNum && totalAmount > 0)
      down = (totalAmount * downPercentNum) / 100;
    if (!downPercentNum && down && totalAmount > 0)
      downPercentNum = (down / totalAmount) * 100;
    const months = Number(formData.numberOfMonths) || 0;
    const rate = markupPercentNum || 0;
    const principal = Math.max(0, totalAmount - down);
    const model = (formData.interestModel as InterestModel) || "equal";
    const monthly =
      model === "equal"
        ? months > 0
          ? principal / months
          : 0
        : amortizedMonthlyPayment(principal, rate, months);
    const schedule = generateSchedule(
      principal,
      rate,
      months,
      formData.startDate || undefined,
      (formData.roundingPolicy as RoundingPolicy) || "nearest",
      model
    );
    return { totalAmount, principal, monthly, schedule };
  }, [formData, plan]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded mb-6 flex items-start gap-3 shadow-sm">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button 
            onClick={() => setError("")} 
            className="flex-shrink-0 text-red-600 hover:text-red-800 transition"
            aria-label="Close error"
          >
            ✕
          </button>
        </div>
        {showForm && (
          <div className="card p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">
              {user?.role === "admin" || user?.role === "manager"
                ? "Edit Installment"
                : "Request Edit"}
            </h2>
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="markupPercent"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Markup %
                  </label>
                  <input
                    id="markupPercent"
                    type="number"
                    placeholder="e.g. 10"
                    value={(formData as any).markupPercent}
                    onChange={(e) => {
                      const pctStr = e.target.value;
                      const pct = Number(pctStr) || 0;
                      const base = Number((plan as any)?.productId?.price || 0);
                      const amt = base
                        ? Number(((base * pct) / 100).toFixed(2))
                        : 0;
                      setFormData({
                        ...formData,
                        markupPercent: pctStr,
                        markupAmount: amt ? String(amt) : "",
                      });
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                    step="0.01"
                  />
                </div>
                <div>
                  <label
                    htmlFor="markupAmount"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Markup Amount (PKR)
                  </label>
                  <input
                    id="markupAmount"
                    type="number"
                    placeholder="PKR"
                    value={(formData as any).markupAmount}
                    onChange={(e) => {
                      const amtStr = e.target.value;
                      const amt = Number(amtStr) || 0;
                      const base = Number((plan as any)?.productId?.price || 0);
                      const pct =
                        base > 0 ? Number(((amt / base) * 100).toFixed(2)) : 0;
                      setFormData({
                        ...formData,
                        markupAmount: amtStr,
                        markupPercent: String(pct),
                      });
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                    step="0.01"
                  />
                </div>

                <div>
                  <label
                    htmlFor="downPercent"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Down %
                  </label>
                  <input
                    id="downPercent"
                    type="number"
                    placeholder="e.g. 10"
                    value={(formData as any).downPercent}
                    onChange={(e) => {
                      const pctStr = e.target.value;
                      const pct = Number(pctStr) || 0;
                      const base = Number((plan as any)?.productId?.price || 0);
                      const markupAmt =
                        Number((formData as any).markupAmount) ||
                        (base *
                          (Number((formData as any).markupPercent) || 0)) /
                          100;
                      const total =
                        base + (Number.isNaN(markupAmt) ? 0 : markupAmt);
                      const downAmt =
                        total > 0
                          ? String(Number(((total * pct) / 100).toFixed(2)))
                          : "";
                      setFormData({
                        ...formData,
                        downPercent: pctStr,
                        downPayment: downAmt,
                      });
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                    step="0.01"
                  />
                </div>

                <div>
                  <label
                    htmlFor="downPayment"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Down Payment (PKR)
                  </label>
                  <input
                    id="downPayment"
                    type="number"
                    placeholder="PKR"
                    value={formData.downPayment}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      const valNum = Number(valStr) || 0;
                      const base = Number((plan as any)?.productId?.price || 0);
                      const markupAmt =
                        Number((formData as any).markupAmount) ||
                        (base *
                          (Number((formData as any).markupPercent) || 0)) /
                          100;
                      const total =
                        base + (Number.isNaN(markupAmt) ? 0 : markupAmt);
                      const pct =
                        total > 0
                          ? String(Number(((valNum / total) * 100).toFixed(2)))
                          : "";
                      setFormData({
                        ...formData,
                        downPayment: valStr,
                        downPercent: pct,
                      });
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="numberOfMonths"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Number of Months
                  </label>
                  <input
                    id="numberOfMonths"
                    type="number"
                    placeholder="e.g. 12"
                    value={formData.numberOfMonths}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        numberOfMonths: e.target.value,
                      })
                    }
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reference"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Reference (Optional)
                  </label>
                  <input
                    id="reference"
                    type="text"
                    placeholder="e.g. Customer name, Phone number, etc."
                    value={formData.reference}
                    onChange={(e) =>
                      setFormData({ ...formData, reference: e.target.value })
                    }
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                    maxLength={200}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Reference se aane wali installment ke liye - Agar reference hai toh guarantors ki zarurat nahi
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="roundingPolicy"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Rounding Policy
                  </label>
                  <select
                    id="roundingPolicy"
                    value={formData.roundingPolicy}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        roundingPolicy: e.target.value as RoundingPolicy,
                      })
                    }
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                  >
                    <option value="nearest">Nearest</option>
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  {user?.role === "admin" || user?.role === "manager"
                    ? "Save"
                    : "Submit Request"}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 border rounded"
                  onClick={() => {
                    setShowForm(false);
                    setRequestMessage("");
                  }}
                >
                  Cancel
                </button>
                {requestMessage && (
                  <div className="text-sm text-slate-600 ml-4">
                    {requestMessage}
                  </div>
                )}
              </div>
              <div className="mt-4 p-3 border rounded bg-white">
                <div className="text-sm text-slate-600">Schedule preview</div>
                <div className="mt-2">
                  {preview.schedule.map((s: ScheduleItem) => (
                    <div key={s.month} className="flex justify-between text-sm">
                      <div>
                        Month {s.month} •{" "}
                        {new Date(s.dueDate).toLocaleDateString()}
                      </div>
                      <div>{formatCurrency(s.amount)}</div>
                    </div>
                  ))}
                  {preview.schedule.length === 0 && (
                    <div className="text-slate-500">No schedule</div>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        <ConfirmModal
          isOpen={!!showDeleteConfirm}
          title="Delete Installment"
          message="Are you sure you want to delete this installment plan?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={async () => {
            const id = showDeleteConfirm;
            setShowDeleteConfirm(null);
            if (!id) return;
            await handleDelete();
          }}
          onCancel={() => setShowDeleteConfirm(null)}
        />
        <button className="btn" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen p-6">
        <div className="text-slate-600">Installment not found</div>
        <button className="mt-4 btn" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    );
  }

  const customerName =
    typeof plan.customerId === "string"
      ? plan.customerId
      : plan.customerId?.name || "—";
  const productName =
    typeof plan.productId === "string"
      ? plan.productId
      : plan.productId?.name || "—";

  function openEdit(isRequest: boolean) {
    setFormData({
      downPayment: String(plan.downPayment || ""),
      downPercent: String(
        (Number(plan.downPayment || 0) / (Number(plan.totalAmount || 0) || 1)) *
          100
      ),
      markupPercent: String((plan as any).markupPercent || ""),
      markupAmount: String(
        ((plan as any).totalAmount || 0) -
          Number((plan as any).productId?.price || 0)
      ),
      numberOfMonths: String(plan.numberOfMonths || ""),
      startDate:
        (plan as any).startDate || new Date().toISOString().slice(0, 10),
      roundingPolicy: (plan as any).roundingPolicy || "nearest",
      interestModel: (plan as any).interestModel || "amortized",
      reference: (plan as any).reference || "",
      bankCheque: {
        bankName: plan.bankCheque?.bankName || "",
        branch: plan.bankCheque?.branch || "",
        accountNumber: plan.bankCheque?.accountNumber || "",
        chequeNumber: plan.bankCheque?.chequeNumber || "",
      },
      guarantors:
        plan.guarantors &&
        Array.isArray(plan.guarantors) &&
        plan.guarantors.length
          ? plan.guarantors.map((g: any) => ({
              name: g.name || "",
              relation: g.relation || "",
              phone: g.phone || "",
              cnic: "",
              address: g.address || "",
            }))
          : [
              { name: "", relation: "", phone: "", cnic: "", address: "" },
              { name: "", relation: "", phone: "", cnic: "", address: "" },
            ],
    });
    setRequestMessage("");
    setShowForm(true);

    // no-op timeout placeholder
    setTimeout(() => {}, 0);
  }

  async function handleSubmitEdit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Use shared validation utility
      const validation = validateGuarantors(
        formData.guarantors,
        !!(formData.reference && formData.reference.trim())
      );
      if (!validation.isValid) {
        showToast(validation.error || "Validation failed", "error");
        return;
      }

      const payload: any = {
        downPayment: Number(formData.downPayment),
        downPercent: Number((formData as any).downPercent) || undefined,
        markupPercent: Number((formData as any).markupPercent) || 0,
        numberOfMonths: Number(formData.numberOfMonths),
        startDate: formData.startDate,
        roundingPolicy: formData.roundingPolicy,
        reference: formData.reference || undefined,
      };

      // include cheque + guarantors for privileged edits
      payload.bankCheque = { ...formData.bankCheque };
      // If reference is provided, send only guarantors with CNIC, otherwise send all
      const guarantorsToSend = formData.reference && formData.reference.trim() 
        ? formData.guarantors.filter((g: any) => g.cnic && String(g.cnic).trim()) // Only send if CNIC provided
        : formData.guarantors; // If no reference, send all (validation ensures at least one has CNIC)
      
      payload.guarantors = guarantorsToSend.length > 0 
        ? guarantorsToSend.map((g: any) => ({
            name: g.name,
            relation: g.relation,
            phone: g.phone,
            cnic: String(g.cnic || ""),
            address: g.address || undefined,
          }))
        : undefined;

      // attach the preview schedule (server should still validate/recalc)
      payload.installmentSchedule = preview.schedule;

      const isPrivileged = user?.role === "admin" || user?.role === "manager";

      if (isPrivileged) {
        await client.put(`/installments/${plan._id}`, payload);
        const res = await client.get(`/installments/${plan._id}`);
        setPlan(res.data);
        setShowForm(false);
      } else {
        const changes: Record<string, any> = {};
        if (Number(formData.downPayment) !== Number(plan.downPayment))
          changes.downPayment = Number(formData.downPayment);
        if (
          Number((formData as any).markupPercent) !==
          Number((plan as any).markupPercent)
        )
          changes.markupPercent = Number((formData as any).markupPercent);
        if (Number(formData.numberOfMonths) !== Number(plan.numberOfMonths))
          changes.numberOfMonths = Number(formData.numberOfMonths);

        const planCheque = plan.bankCheque || {};
        if (
          payload.bankCheque.bankName !== (planCheque as any).bankName ||
          payload.bankCheque.branch !== (planCheque as any).branch ||
          payload.bankCheque.accountNumber !==
            (planCheque as any).accountNumber ||
          payload.bankCheque.chequeNumber !== (planCheque as any).chequeNumber
        ) {
          changes.bankCheque = payload.bankCheque;
        }

        const planG = (plan.guarantors || []).map((g: any) => ({
          name: g.name || "",
          relation: g.relation || "",
          phone: g.phone || "",
          cnic: g.cnic || "",
          address: g.address || "",
        }));
        const newG = payload.guarantors.map((g: any) => ({
          name: g.name || "",
          relation: g.relation || "",
          phone: g.phone || "",
          cnic: g.cnic || "",
          address: g.address || "",
        }));
        if (JSON.stringify(planG) !== JSON.stringify(newG)) {
          changes.guarantors = payload.guarantors;
        }

        if (
          Object.keys(changes).some((k) =>
            ["downPayment", "numberOfMonths"].includes(k)
          )
        ) {
          changes.installmentSchedule = preview.schedule;
        }

        await client.post("/installment-requests", {
          installmentId: plan._id,
          type: "edit",
          changes,
          reason: "Requested edit from detail page",
        });
        showToast("Edit request submitted", "success");
      }
    } catch (err: any) {
      const errorMessage = getContextualErrorMessage(err, "update");
      showToast(errorMessage, "error");
    }
  }

  async function handleDelete() {
    try {
      const isPrivileged = user?.role === "admin" || user?.role === "manager";
      if (isPrivileged) {
        await client.delete(`/installments/${plan._id}`);
        navigate("/installments");
      } else {
        await client.post("/installment-requests", {
          installmentId: plan._id,
          type: "delete",
          reason: "Requested delete from detail page",
        });
        showToast("Delete request submitted", "success");
      }
    } catch (err: any) {
      showToast(
        getContextualErrorMessage(err, "delete"),
        "error"
      );
    }
  }

  async function handleSubmitLog(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setLogLoading(true);
    try {
      const payload: any = {
        planId: plan._id,
        scheduleIndex:
          typeof selectedScheduleIndex === "number"
            ? selectedScheduleIndex
            : undefined,
        response: logForm.response || undefined,
        contactMethod: logForm.contactMethod || undefined,
        nextContactDate: logForm.nextContactDate || undefined,
        notes: logForm.notes || undefined,
      };

      await client.post("/contacts", payload);
      setShowLogModal(false);
      showToast("Contact logged", "success");
      const res = await client.get(`/installments/${plan._id}`);
      setPlan(res.data);
      // refresh contact logs after logging
      await fetchContactLogs();
    } catch (err: any) {
      const errorMessage = getContextualErrorMessage(err, "create");
      showToast(errorMessage, "error");
    } finally {
      setLogLoading(false);
    }
  }

  async function fetchContactLogs(page = 1, pageSize = 10) {
    if (!plan?._id) return;
    setLogsLoading(true);
    try {
      const res = await client.get("/contacts", {
        params: { planId: plan._id, page, pageSize },
      });
      setContactLogs(res.data?.logs || []);
      setLogsTotal(res.data?.total || 0);
      setLogsPage(res.data?.page || page);
      setLogsPageSize(res.data?.pageSize || pageSize);
    } catch (err) {
      console.error("Failed to load contact logs", err);
    } finally {
      setLogsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="text-slate-600 mr-4"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold">Installment Details</h1>
            <div className="text-sm text-slate-500">
              {(plan as any).installmentId && (
                <div className="text-slate-600 text-xs mb-1 font-mono">
                  ID: {(plan as any).installmentId}
                </div>
              )}
              {customerName} • {productName}
              {(plan as any).reference && (
                <div className="text-blue-600 text-sm mt-1">
                  📌 Reference: {(plan as any).reference}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" ||
            user?.role === "manager" ||
            (hasPermission && hasPermission("manage_installments")) ? (
              <>
                <button
                  onClick={() => openEdit(false)}
                  className="px-3 py-1 bg-yellow-600 text-white rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(plan._id)}
                  className="px-3 py-1 bg-red-600 text-white rounded"
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => openEdit(true)}
                  className="px-3 py-1 bg-orange-500 text-white rounded"
                >
                  Request Edit
                </button>
                <button
                  onClick={async () => await handleDelete()}
                  className="px-3 py-1 bg-orange-500 text-white rounded"
                >
                  Request Delete
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-slate-600 text-xs">Total Amount</p>
              <p className="text-slate-900 font-semibold">
                {formatCurrency(plan.totalAmount || 0)}
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-xs">Down Payment</p>
              <p className="text-slate-900 font-semibold">
                {formatCurrency(plan.downPayment || 0)}
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-xs">Monthly</p>
              <p className="text-slate-900 font-semibold">
                {plan.monthlyInstallment
                  ? formatCurrency(Math.round(plan.monthlyInstallment))
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-600 text-xs">Status</p>
              <p className="text-slate-900 font-semibold capitalize">
                {plan.status}
              </p>
            </div>
          </div>

          {(plan as any).reference && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800 text-sm font-medium">
                📌 Reference: {(plan as any).reference}
              </p>
            </div>
          )}

          {(plan.bankCheque ||
            (plan.guarantors && plan.guarantors.length > 0)) && (
            <div className="card p-6 mb-6">
              <h3 className="text-lg font-semibold mb-3">Documentation</h3>
              {plan.bankCheque && (
                <div className="mb-4">
                  <p className="text-sm text-slate-600">Bank Cheque</p>
                  <div className="text-slate-900">
                    <div>
                      <strong>Bank:</strong> {plan.bankCheque.bankName || "-"}
                    </div>
                    <div>
                      <strong>Account:</strong>{" "}
                      {plan.bankCheque.accountNumber || "-"}
                    </div>
                    <div>
                      <strong>Branch:</strong> {plan.bankCheque.branch || "-"}
                    </div>
                    <div>
                      <strong>Cheque #:</strong>{" "}
                      {plan.bankCheque.chequeNumber || "-"}
                    </div>
                  </div>
                </div>
              )}

              {plan.guarantors && plan.guarantors.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 mb-2">Guarantors</p>
                  <div className="space-y-2">
                    {plan.guarantors.map((g: any, i: number) => (
                      <div key={i} className="p-3 border rounded bg-white">
                        <div className="font-medium">
                          {g.name || `Guarantor ${i + 1}`}
                        </div>
                        <div className="text-sm text-slate-600">
                          Relation: {g.relation || "-"}
                        </div>
                        <div className="text-sm text-slate-600">
                          Phone: {formatPhone(g.phone || "") || "-"}
                        </div>
                        <div className="text-sm text-slate-600">
                          CNIC:{" "}
                          {g.cnic
                            ? formatCNIC(String(g.cnic))
                            : g.cnicMasked
                            ? formatCNIC(cleanCNIC(String(g.cnicMasked)))
                            : "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <h3 className="text-lg font-semibold mb-2">Schedule</h3>
          <div className="space-y-2">
            {plan.installmentSchedule?.length ? (
              plan.installmentSchedule.map((sch, idx) => (
                <div
                  key={sch.month}
                  className="p-3 border rounded bg-white flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">Month {sch.month}</div>
                    <div className="text-sm text-slate-500">
                      Due: {new Date(sch.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="font-semibold">
                        {formatCurrency(sch.amount || 0)}
                      </div>
                      <div className="text-sm text-slate-500">{sch.status}</div>
                    </div>
                    <div>
                      <button
                        onClick={() => {
                          setSelectedScheduleIndex(idx);
                          setLogForm({
                            response: "",
                            contactMethod: "phone",
                            nextContactDate: "",
                            notes: "",
                          });
                          setShowLogModal(true);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded"
                      >
                        Log Call
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500">No schedule available</div>
            )}
          </div>
        </div>
        <div className="card p-6 mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Recent Calls</h3>
            <div>
              <button
                onClick={() => {
                  setShowAllLogsModal(true);
                  void fetchContactLogs(1, logsPageSize);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                View all
              </button>
            </div>
          </div>
          {logsLoading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : contactLogs.length === 0 ? (
            <div className="text-sm text-slate-500">No calls logged</div>
          ) : (
            <div className="space-y-2">
              {contactLogs.slice(0, 5).map((log: any) => (
                <div key={log._id} className="p-3 border rounded bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {log.response
                          ? String(log.response).replace("_", " ")
                          : "Outcome"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {log.contactedBy?.name || log.contactedBy || "Agent"} •{" "}
                        {new Date(
                          log.contactDate || log.createdAt || Date.now()
                        ).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-slate-600 text-right">
                      <div>{log.contactMethod || "-"}</div>
                      {log.nextContactDate && (
                        <div className="text-xs text-slate-500">
                          Next:{" "}
                          {new Date(log.nextContactDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  {log.notes && (
                    <div className="mt-2 text-sm text-slate-700">
                      {log.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {showAllLogsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black opacity-40"
              onClick={() => setShowAllLogsModal(false)}
            />
            <div className="bg-white rounded shadow-lg z-10 w-11/12 max-w-3xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">All Contact Logs</h3>
                <button
                  onClick={() => setShowAllLogsModal(false)}
                  className="px-2 py-1"
                >
                  Close
                </button>
              </div>
              <div className="mb-3">
                {logsLoading ? (
                  <div className="text-sm text-slate-600">Loading...</div>
                ) : contactLogs.length === 0 ? (
                  <div className="text-sm text-slate-500">No calls logged</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {contactLogs.map((log: any) => (
                      <div
                        key={log._id}
                        className="p-3 border rounded bg-white"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              {log.response
                                ? String(log.response).replace("_", " ")
                                : "Outcome"}
                            </div>
                            <div className="text-sm text-slate-500">
                              {log.contactedBy?.name ||
                                log.contactedBy ||
                                "Agent"}{" "}
                              •{" "}
                              {new Date(
                                log.contactDate || log.createdAt || Date.now()
                              ).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-sm text-slate-600 text-right">
                            <div>{log.contactMethod || "-"}</div>
                            {log.nextContactDate && (
                              <div className="text-xs text-slate-500">
                                Next:{" "}
                                {new Date(
                                  log.nextContactDate
                                ).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        {log.notes && (
                          <div className="mt-2 text-sm text-slate-700">
                            {log.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Pagination
                  page={logsPage}
                  pageSize={logsPageSize}
                  total={logsTotal}
                  onPageChange={(p) => void fetchContactLogs(p, logsPageSize)}
                  onPageSizeChange={(s) => void fetchContactLogs(1, s)}
                />
              </div>
            </div>
          </div>
        )}
        {/* Edit modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black opacity-40"
              onClick={() => setShowForm(false)}
            />
            <div className="bg-white rounded shadow-lg z-10 w-11/12 max-w-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">
                  {user?.role === "admin" || user?.role === "manager"
                    ? "Edit Installment"
                    : "Request Edit"}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-2 py-1"
                >
                  Close
                </button>
              </div>
              <form onSubmit={handleSubmitEdit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* interestRate removed; use markupPercent field below */}

                  <input
                    type="number"
                    placeholder="Down Payment (PKR)"
                    value={formData.downPayment}
                    onChange={(e) =>
                      setFormData({ ...formData, downPayment: e.target.value })
                    }
                    className="px-3 py-2 border rounded"
                    required
                  />

                  <input
                    type="number"
                    placeholder="Number of Months"
                    value={formData.numberOfMonths}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        numberOfMonths: e.target.value,
                      })
                    }
                    className="px-3 py-2 border rounded"
                    required
                  />
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="px-3 py-2 border rounded"
                  />
                  <select
                    value={formData.roundingPolicy}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        roundingPolicy: e.target.value as RoundingPolicy,
                      })
                    }
                    className="px-3 py-2 border rounded"
                  >
                    <option value="nearest">Round: Nearest</option>
                    <option value="up">Round: Up</option>
                    <option value="down">Round: Down</option>
                  </select>
                </div>

                <div>
                  <h4 className="font-semibold">Bank Cheque</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Bank Name"
                      value={formData.bankCheque.bankName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankCheque: {
                            ...formData.bankCheque,
                            bankName: e.target.value,
                          },
                        })
                      }
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={formData.bankCheque.accountNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankCheque: {
                            ...formData.bankCheque,
                            accountNumber: e.target.value,
                          },
                        })
                      }
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      type="text"
                      placeholder="Branch"
                      value={formData.bankCheque.branch}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankCheque: {
                            ...formData.bankCheque,
                            branch: e.target.value,
                          },
                        })
                      }
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      type="text"
                      placeholder="Cheque Number"
                      value={formData.bankCheque.chequeNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankCheque: {
                            ...formData.bankCheque,
                            chequeNumber: e.target.value,
                          },
                        })
                      }
                      className="px-3 py-2 border rounded"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold">
                    Guarantors {formData.reference && formData.reference.trim() ? "(Optional - Reference provided)" : "(Required - No reference)"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {formData.guarantors.map((g: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded">
                        <input
                          type="text"
                          placeholder="Name"
                          value={g.name}
                          onChange={(e) => {
                            const next = [...formData.guarantors];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setFormData({ ...formData, guarantors: next });
                          }}
                          className="px-3 py-2 border rounded w-full mb-2"
                        />
                        <input
                          type="text"
                          placeholder="Relation"
                          value={g.relation}
                          onChange={(e) => {
                            const next = [...formData.guarantors];
                            next[idx] = {
                              ...next[idx],
                              relation: e.target.value,
                            };
                            setFormData({ ...formData, guarantors: next });
                          }}
                          className="px-3 py-2 border rounded w-full mb-2"
                        />
                        <input
                          type="tel"
                          placeholder="0300-1234567"
                          value={formatPhone(g.phone || "")}
                          onChange={(e) => {
                            const cleaned = cleanPhone(e.target.value);
                            const next = [...formData.guarantors];
                            next[idx] = { ...next[idx], phone: cleaned };
                            setFormData({ ...formData, guarantors: next });
                          }}
                          maxLength={13}
                          className="px-3 py-2 border rounded w-full mb-2"
                        />
                        <div className="mb-2">
                          <label
                            htmlFor={`guar-addr-${idx}`}
                            className="block text-sm text-slate-700 mb-1"
                          >
                            Address
                          </label>
                          <input
                            id={`guar-addr-${idx}`}
                            type="text"
                            placeholder="Address"
                            value={g.address}
                            onChange={(e) => {
                              const next = [...formData.guarantors];
                              next[idx] = { ...next[idx], address: e.target.value };
                              setFormData({ ...formData, guarantors: next });
                            }}
                            className="px-3 py-2 border rounded w-full mb-2"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="CNIC (13 digits)"
                          value={formatCNIC(g.cnic)}
                          onChange={(e) => {
                            const next = [...formData.guarantors];
                            next[idx] = {
                              ...next[idx],
                              cnic: cleanCNIC(e.target.value),
                            };
                            setFormData({ ...formData, guarantors: next });
                          }}
                          className="px-3 py-2 border rounded w-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 p-3 border rounded bg-white">
                  <div className="text-sm text-slate-600">Schedule preview</div>
                  <div className="mt-2">
                    {preview.schedule.map((s: ScheduleItem) => (
                      <div
                        key={s.month}
                        className="flex justify-between text-sm"
                      >
                        <div>
                          Month {s.month} •{" "}
                          {new Date(s.dueDate).toLocaleDateString()}
                        </div>
                        <div>{formatCurrency(s.amount)}</div>
                      </div>
                    ))}
                    {preview.schedule.length === 0 && (
                      <div className="text-slate-500">No schedule</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="submit"
                    className="px-3 py-1 bg-green-600 text-white rounded"
                  >
                    {user?.role === "admin" || user?.role === "manager"
                      ? "Save"
                      : "Submit Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-3 py-1 border rounded"
                  >
                    Cancel
                  </button>
                  {requestMessage && (
                    <div className="text-sm text-slate-600 ml-2">
                      {requestMessage}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black opacity-40"
              onClick={() => setShowLogModal(false)}
            />
            <div className="bg-white rounded shadow-lg z-10 w-11/12 max-w-md p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Log Call / Reschedule</h3>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="px-2 py-1"
                >
                  Close
                </button>
              </div>
              <form onSubmit={handleSubmitLog} className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Schedule
                  </label>
                  <div className="text-sm text-slate-600">
                    {selectedScheduleIndex !== null && plan?.installmentSchedule
                      ? `Month ${plan.installmentSchedule[selectedScheduleIndex].month}`
                      : "—"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Response
                  </label>
                  <select
                    value={logForm.response}
                    onChange={(e) =>
                      setLogForm({ ...logForm, response: e.target.value })
                    }
                    className="px-3 py-2 border rounded w-full"
                  >
                    <option value="">Select outcome</option>
                    <option value="contacted">Contacted</option>
                    <option value="no_answer">No Answer</option>
                    <option value="wrong_number">Wrong Number</option>
                    <option value="reschedule">Reschedule</option>
                    <option value="not_interested">Not Interested</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Contact Method
                  </label>
                  <select
                    value={logForm.contactMethod}
                    onChange={(e) =>
                      setLogForm({ ...logForm, contactMethod: e.target.value })
                    }
                    className="px-3 py-2 border rounded w-full"
                  >
                    <option value="phone">Phone</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="in_person">In Person</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Next Contact Date
                  </label>
                  <input
                    type="date"
                    value={logForm.nextContactDate}
                    onChange={(e) =>
                      setLogForm({
                        ...logForm,
                        nextContactDate: e.target.value,
                      })
                    }
                    className="px-3 py-2 border rounded w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={logForm.notes}
                    onChange={(e) =>
                      setLogForm({ ...logForm, notes: e.target.value })
                    }
                    className="px-3 py-2 border rounded w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={logLoading}
                    className="px-3 py-1 bg-blue-600 text-white rounded"
                  >
                    {logLoading ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-3 py-1 border rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default InstallmentDetailPage;
