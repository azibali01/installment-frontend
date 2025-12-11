"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { cleanCNIC, formatCNIC, isValidCNIC } from "../utils/cnic";
import {
  amortizedMonthlyPayment,
  generateSchedule,
  type ScheduleItem,
  type RoundingPolicy,
  type InterestModel,
} from "../utils/finance";
import type { InstallmentPlan, Customer, Product } from "../types";
import { useAuth } from "../contexts/AuthContext";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../contexts/ToastContext";
const InstallmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pageLoading, setPageLoading] = useState<boolean>(false);

  const [filterCustomerId, setFilterCustomerId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const [showForm, setShowForm] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [requestLoading, setRequestLoading] = useState<boolean>(false);
  const [requestMessage, setRequestMessage] = useState<string>("");
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(
    null
  );
  const [editingIsRequest, setEditingIsRequest] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    customerId: "",
    productId: "",
    markupPercent: "40",
    markupAmount: "",
    downPayment: "",
    downPercent: "10",
    numberOfMonths: "",
    startDate: new Date().toISOString().slice(0, 10),
    roundingPolicy: "nearest" as RoundingPolicy,
    interestModel: "equal" as InterestModel,
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

  const [error, setError] = useState<string>("");

  const preview = useMemo(() => {
    const product = products.find((x) => x._id === formData.productId);
    const basePrice = Number(product?.price || 0);
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
    return {
      totalAmount,
      principal,
      monthly,
      schedule,
      markupAmount: Number(markupAmountNum),
      markupPercent: Number(markupPercentNum),
      downPercent: Number(downPercentNum),
    };
  }, [formData, products]);

  useEffect(() => {
    void load(1, limit);
  }, []);

  async function load(p = page, l = limit) {
    setPageLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", String(l));
      if (filterCustomerId) params.set("customerId", filterCustomerId);
      if (filterStatus) params.set("status", filterStatus);

      const [instRes, custRes, prodRes] = await Promise.all([
        client.get(`/installments?${params.toString()}`),
        client.get("/customers"),
        client.get("/products"),
      ]);

      const instData = Array.isArray(instRes.data)
        ? {
            data: instRes.data,
            meta: {
              total: instRes.data.length,
              page: p,
              limit: l,
              totalPages: 1,
            },
          }
        : instRes.data || {
            data: [],
            meta: { total: 0, page: p, limit: l, totalPages: 1 },
          };

      setInstallments(instData.data || []);
      setTotalItems(instData.meta?.total || 0);
      setTotalPages(instData.meta?.totalPages || 1);
      setPage(instData.meta?.page || p);

      setCustomers(custRes.data || []);
      setProducts(prodRes.data || []);
    } catch (e) {
      setError("Failed to fetch data");
    } finally {
      setIsLoading(false);
      setPageLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      for (const g of formData.guarantors) {
        if (!isValidCNIC(g.cnic)) {
          setError("Each guarantor CNIC must be 13 digits");
          return;
        }
      }
      setError("");
      const product = products.find((x) => x._id === formData.productId);
      if (!product) throw new Error("Product not found");

      if (editingId) {
        if (editingIsRequest) {
          const changes: Record<string, any> = {};
          if (selectedPlan) {
            if (
              Number(formData.downPayment) !== Number(selectedPlan.downPayment)
            )
              changes.downPayment = Number(formData.downPayment);
            if (
              Number((formData as any).markupPercent) !==
              Number((selectedPlan as any).markupPercent)
            )
              changes.markupPercent = Number((formData as any).markupPercent);
            if (
              Number(formData.numberOfMonths) !==
              Number(selectedPlan.numberOfMonths)
            )
              changes.numberOfMonths = Number(formData.numberOfMonths);
            if (
              formData.productId !==
              (typeof selectedPlan.productId === "string"
                ? selectedPlan.productId
                : selectedPlan.productId?._id)
            )
              changes.productId = formData.productId;
            if (
              formData.customerId !==
              (typeof selectedPlan.customerId === "string"
                ? selectedPlan.customerId
                : selectedPlan.customerId?._id)
            )
              changes.customerId = formData.customerId;
          }
          if (
            Object.keys(changes).some((k) =>
              ["downPayment", "markupPercent", "numberOfMonths"].includes(k)
            )
          ) {
            changes.installmentSchedule = preview.schedule;
          }
          await client.post("/installment-requests", {
            installmentId: editingId,
            type: "edit",
            changes,
            reason: "Requested edit via app",
          });
          showToast("Edit request submitted", "success");
        } else {
          await client.put(`/installments/${editingId}`, {
            customerId: formData.customerId,
            productId: formData.productId,
            downPayment: Number(formData.downPayment),
            markupPercent: Number((formData as any).markupPercent) || 0,
            numberOfMonths: Number(formData.numberOfMonths),
            installmentSchedule: preview.schedule,
            startDate: formData.startDate,
            roundingPolicy: formData.roundingPolicy,
          });
          await load(page, limit);
        }
        setEditingId(null);
        setSelectedPlan(null);
        setEditingIsRequest(false);
        setShowForm(false);
      } else {
        await client.post("/installments", {
          customerId: formData.customerId,
          productId: formData.productId,
          markupPercent: Number((formData as any).markupPercent) || 40,
          totalAmount: preview.totalAmount,
          downPayment: Number(formData.downPayment),
          numberOfMonths: Number(formData.numberOfMonths),
          bankCheque: formData.bankCheque,
          guarantors: formData.guarantors,
          startDate: formData.startDate,
          roundingPolicy: formData.roundingPolicy,
          installmentSchedule: preview.schedule,
        });
        setFormData({
          customerId: "",
          productId: "",
          markupPercent: "40",
          markupAmount: "",
          downPayment: "",
          downPercent: "10",
          numberOfMonths: "",
          startDate: new Date().toISOString().slice(0, 10),
          roundingPolicy: "nearest",
          interestModel: "equal",
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
        setShowForm(false);
        await load(1, limit);
      }
    } catch (err: any) {
      // Prefer server-provided validation messages when available
      const resp = err?.response?.data
      if (resp) {
        if (resp.message) setError(String(resp.message))
        else if (Array.isArray(resp.errors) && resp.errors.length) setError(String(resp.errors[0].msg || resp.errors[0].message || 'Validation error'))
        else setError(String(resp.error || resp.message || JSON.stringify(resp)))
      } else {
        setError(String(err) || "Failed to create")
      }
    }
  }

  const canCreate = ["admin", "manager", "employee"].includes(user?.role || "");

  function getStatusColor(status: string) {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-slate-800";
    }
  }

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
              Installment Plans
            </h1>
          </div>
          {canCreate && (
            <button
              onClick={() => {
                if (showForm) {
                  setEditingId(null);
                  setSelectedPlan(null);
                  setEditingIsRequest(false);
                  setFormData({
                    customerId: "",
                    productId: "",
                    markupPercent: "40",
                    markupAmount: "",
                    downPayment: "",
                    downPercent: "10",
                    numberOfMonths: "",
                    startDate: new Date().toISOString().slice(0, 10),
                    roundingPolicy: "nearest",
                    interestModel: "equal",
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
                  setShowForm(false);
                } else {
                  setShowForm(true);
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              {showForm ? "Cancel" : "New Plan"}
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
              {editingId
                ? editingIsRequest
                  ? "Request Edit Installment Plan"
                  : "Edit Installment Plan"
                : "Create New Installment Plan"}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="customerId"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Customer
                  </label>
                  <select
                    id="customerId"
                    value={formData.customerId}
                    onChange={(e) =>
                      setFormData({ ...formData, customerId: e.target.value })
                    }
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="productId"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Product
                  </label>
                  <select
                    id="productId"
                    value={formData.productId}
                    onChange={(e) => {
                      const prodId = e.target.value;
                      const prod = products.find((p) => p._id === prodId);
                      const base = Number(prod?.price || 0);
                      const pct = Number((formData as any).markupPercent) || 0;
                      const markupAmt = base
                        ? Number(((base * pct) / 100).toFixed(2))
                        : 0;
                      const total = base + markupAmt;
                      const downPct =
                        Number((formData as any).downPercent) || 0;
                      const downPayment = downPct
                        ? String(Number(((total * downPct) / 100).toFixed(2)))
                        : formData.downPayment;
                      setFormData({
                        ...formData,
                        productId: prodId,
                        markupAmount: markupAmt ? String(markupAmt) : "",
                        downPayment,
                      });
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} - PKR {p.price}
                      </option>
                    ))}
                  </select>
                </div>

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
                      const prod = products.find(
                        (p) => p._id === formData.productId
                      );
                      const base = Number(prod?.price || 0);
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
                      const prod = products.find(
                        (p) => p._id === formData.productId
                      );
                      const base = Number(prod?.price || 0);
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
                      const prod = products.find(
                        (p) => p._id === formData.productId
                      );
                      const base = Number(prod?.price || 0);
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
                      const prod = products.find(
                        (p) => p._id === formData.productId
                      );
                      const base = Number(prod?.price || 0);
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
                <div>
                  <label
                    htmlFor="bankName"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Bank Name
                  </label>
                  <input
                    id="bankName"
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
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                    
                  />
                </div>
                <div>
                  <label
                    htmlFor="accountNumber"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Account Number
                  </label>
                  <input
                    id="accountNumber"
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
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                    
                  />
                </div>
                <div>
                  <label
                    htmlFor="branch"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Branch
                  </label>
                  <input
                    id="branch"
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
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                  />
                </div>
                <div>
                  <label
                    htmlFor="chequeNumber"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Cheque Number
                  </label>
                  <input
                    id="chequeNumber"
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
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.guarantors.map((g, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <div className="text-sm font-semibold mb-2">
                      Guarantor {idx + 1}
                    </div>
                    <div className="mb-2">
                      <label
                        htmlFor={`guar-name-${idx}`}
                        className="block text-sm text-slate-700 mb-1"
                      >
                        Name
                      </label>
                      <input
                        id={`guar-name-${idx}`}
                        type="text"
                        placeholder="Name"
                        value={g.name}
                        onChange={(e) => {
                          const next = [...formData.guarantors];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setFormData({ ...formData, guarantors: next });
                        }}
                        className="px-3 py-2 bg-white border border-gray-300 rounded w-full"
                        required
                      />
                    </div>
                    <div className="mb-2">
                      <label
                        htmlFor={`guar-rel-${idx}`}
                        className="block text-sm text-slate-700 mb-1"
                      >
                        Relation
                      </label>
                      <input
                        id={`guar-rel-${idx}`}
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
                        className="px-3 py-2 bg-white border border-gray-300 rounded w-full"
                      />
                    </div>
                    <div className="mb-2">
                      <label
                        htmlFor={`guar-phone-${idx}`}
                        className="block text-sm text-slate-700 mb-1"
                      >
                        Phone
                      </label>
                      <input
                        id={`guar-phone-${idx}`}
                        type="tel"
                        placeholder="Phone"
                        value={g.phone}
                        onChange={(e) => {
                          const next = [...formData.guarantors];
                          next[idx] = { ...next[idx], phone: e.target.value };
                          setFormData({ ...formData, guarantors: next });
                        }}
                        className="px-3 py-2 bg-white border border-gray-300 rounded w-full"
                      />
                    </div>
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
                          className="px-3 py-2 bg-white border border-gray-300 rounded w-full"
                        />
                      </div>
                    <div>
                      <label
                        htmlFor={`guar-cnic-${idx}`}
                        className="block text-sm text-slate-700 mb-1"
                      >
                        CNIC (13 digits)
                      </label>
                      <input
                        id={`guar-cnic-${idx}`}
                        type="text"
                        placeholder="CNIC (13 digits)"
                        value={formatCNIC(g.cnic)}
                        onChange={(e) => {
                          const next = [...formData.guarantors];
                          const cleaned = cleanCNIC(e.target.value);
                          next[idx] = { ...next[idx], cnic: cleaned };
                          setFormData({ ...formData, guarantors: next });
                        }}
                        className="px-3 py-2 bg-white border border-gray-300 rounded w-full"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mb-4 p-3 border rounded bg-white">
                <div className="text-sm text-slate-600">Preview</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-slate-500">Principal</div>
                    <div className="font-semibold">
                      PKR {preview.principal.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Monthly</div>
                    <div className="font-semibold">
                      PKR {Math.round(preview.monthly).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm text-slate-600 mb-2">Schedule</div>
                  <div className="space-y-2">
                    {preview.schedule.map((s: ScheduleItem) => (
                      <div
                        key={s.month}
                        className="flex justify-between text-sm"
                      >
                        <div>
                          Month {s.month} •{" "}
                          {new Date(s.dueDate).toLocaleDateString()}
                        </div>
                        <div>PKR {Number(s.amount).toLocaleString()}</div>
                      </div>
                    ))}
                    {preview.schedule.length === 0 && (
                      <div className="text-slate-500">No schedule yet</div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition"
              >
                {editingId
                  ? editingIsRequest
                    ? "Submit Edit Request"
                    : "Save Changes"
                  : "Create Plan"}
              </button>
            </form>
          </div>
        )}

        <div className="space-y-4">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Customer</label>
              <select
                className="px-3 py-1 border rounded"
                value={filterCustomerId}
                onChange={(e) => {
                  setFilterCustomerId(e.target.value);
                  setPage(1);
                  void load(1, limit);
                }}
              >
                <option value="">All</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Status</label>
              <select
                className="px-3 py-1 border rounded"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                  void load(1, limit);
                }}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <label className="text-sm text-slate-600">Page size</label>
              <select
                className="px-3 py-1 border rounded"
                value={limit}
                onChange={(e) => {
                  const l = Number(e.target.value) || 20;
                  setLimit(l);
                  setPage(1);
                  void load(1, l);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-slate-400">Loading...</div>
          ) : installments.length === 0 ? (
            <div className="text-center text-slate-400">
              No installment plans found
            </div>
          ) : (
            installments.map((plan) => (
              <div key={plan._id} className="card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {typeof plan.customerId === "string"
                        ? plan.customerId
                        : plan.customerId?.name || "—"}
                    </h3>
                    <div className="text-slate-500 text-sm">
                      {plan.startDate
                        ? new Date((plan as any).startDate).toLocaleDateString()
                        : ""}
                      {plan.endDate
                        ? ` • ${new Date(
                            (plan as any).endDate
                          ).toLocaleDateString()}`
                        : ""}
                    </div>
                    <p className="text-slate-600 text-sm">
                      {typeof plan.productId === "string"
                        ? plan.productId
                        : plan.productId?.name || "—"}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-sm font-medium capitalize ${getStatusColor(
                      plan.status
                    )}`}
                  >
                    {plan.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-slate-600 text-xs">Total Amount</p>
                    <p className="text-slate-900 font-semibold">
                      PKR {Number(plan.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs">Down Payment</p>
                    <p className="text-slate-900 font-semibold">
                      PKR {Number(plan.downPayment || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs">Monthly</p>
                    <p className="text-slate-900 font-semibold">
                      PKR{" "}
                      {plan.monthlyInstallment
                        ? Math.round(plan.monthlyInstallment).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs">Remaining</p>
                    <p className="text-blue-600 font-semibold">
                      PKR {Number(plan.remainingBalance || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/installment/${plan._id}`)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-sm"
                  >
                    View Details
                  </button>
                  {hasPermission && hasPermission("manage_installments") ? (
                    <>
                      <button
                        onClick={() => {
                          const custId =
                            typeof plan.customerId === "string"
                              ? plan.customerId
                              : plan.customerId?._id || "";
                          const prodId =
                            typeof plan.productId === "string"
                              ? plan.productId
                              : plan.productId?._id || "";
                          setFormData({
                            customerId: custId,
                            productId: prodId,
                            downPayment: String(plan.downPayment || ""),
                            numberOfMonths: String(plan.numberOfMonths || ""),
                            startDate: (plan as any).startDate
                              ? new Date((plan as any).startDate)
                                  .toISOString()
                                  .slice(0, 10)
                              : new Date().toISOString().slice(0, 10),
                            roundingPolicy:
                              (plan as any).roundingPolicy || "nearest",
                            interestModel:
                              (plan as any).interestModel || "amortized",
                            markupPercent: String(
                              (plan as any).markupPercent || 40
                            ),
                            markupAmount: String(
                              ((plan as any).totalAmount || 0) -
                                Number((plan as any).productId?.price || 0)
                            ),
                            downPercent: String(
                              (Number((plan as any).downPayment || 0) /
                                (Number((plan as any).totalAmount || 0) || 1)) *
                                100
                            ),
                            bankCheque: {
                              bankName: plan.bankCheque?.bankName || "",
                              branch: plan.bankCheque?.branch || "",
                              accountNumber:
                                plan.bankCheque?.accountNumber || "",
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
                                    cnic:
                                      g.cnic ||
                                      (g.cnicMasked
                                        ? cleanCNIC(String(g.cnicMasked))
                                        : ""),
                                    address: g.address || "",
                                  }))
                                : [
                                    {
                                      name: "",
                                      relation: "",
                                      phone: "",
                                      cnic: "",
                                      address: "",
                                    },
                                    {
                                      name: "",
                                      relation: "",
                                      phone: "",
                                      cnic: "",
                                      address: "",
                                    },
                                  ],
                          });
                          setEditingId(plan._id);
                          setSelectedPlan(plan);
                          setEditingIsRequest(false);
                          setShowForm(true);
                        }}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(plan._id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition text-sm"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          const custId =
                            typeof plan.customerId === "string"
                              ? plan.customerId
                              : plan.customerId?._id || "";
                          const prodId =
                            typeof plan.productId === "string"
                              ? plan.productId
                              : plan.productId?._id || "";
                          setFormData({
                            customerId: custId,
                            productId: prodId,
                            downPayment: String(plan.downPayment || ""),
                            numberOfMonths: String(plan.numberOfMonths || ""),
                            startDate: (plan as any).startDate
                              ? new Date((plan as any).startDate)
                                  .toISOString()
                                  .slice(0, 10)
                              : new Date().toISOString().slice(0, 10),
                            roundingPolicy:
                              (plan as any).roundingPolicy || "nearest",
                            interestModel:
                              (plan as any).interestModel || "amortized",
                            markupPercent: String(
                              (plan as any).markupPercent || 40
                            ),
                            markupAmount: String(
                              ((plan as any).totalAmount || 0) -
                                Number((plan as any).productId?.price || 0)
                            ),
                            downPercent: String(
                              (Number((plan as any).downPayment || 0) /
                                (Number((plan as any).totalAmount || 0) || 1)) *
                                100
                            ),
                            bankCheque: {
                              bankName: plan.bankCheque?.bankName || "",
                              branch: plan.bankCheque?.branch || "",
                              accountNumber:
                                plan.bankCheque?.accountNumber || "",
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
                                    cnic:
                                      g.cnic ||
                                      (g.cnicMasked
                                        ? cleanCNIC(String(g.cnicMasked))
                                        : ""),
                                    address: g.address || "",
                                  }))
                                : [
                                    {
                                      name: "",
                                      relation: "",
                                      phone: "",
                                      cnic: "",
                                      address: "",
                                    },
                                    {
                                      name: "",
                                      relation: "",
                                      phone: "",
                                      cnic: "",
                                      address: "",
                                    },
                                  ],
                          });
                          setEditingId(plan._id);
                          setSelectedPlan(plan);
                          setEditingIsRequest(true);
                          setShowForm(true);
                        }}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition text-sm"
                      >
                        Request Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (requestLoading) return;
                          setRequestLoading(true);
                          try {
                            await client.post("/installment-requests", {
                              installmentId: plan._id,
                              type: "delete",
                              reason: "Requested via app",
                            });
                            showToast("Delete request submitted", "success");
                          } catch (err: any) {
                            showToast(
                              err?.response?.data?.error ||
                                "Failed to request delete",
                              "error"
                            );
                          } finally {
                            setRequestLoading(false);
                          }
                        }}
                        disabled={requestLoading}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition text-sm"
                      >
                        {requestLoading ? "Requesting..." : "Request Delete"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing page {page} of {totalPages} — {totalItems} plans
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (page <= 1) return;
                  const next = page - 1;
                  setPage(next);
                  void load(next, limit);
                }}
                disabled={page <= 1 || pageLoading}
                className={`px-3 py-1 rounded ${
                  page <= 1 ? "bg-gray-200 text-gray-500" : "bg-white border"
                }`}
              >
                Prev
              </button>

              {totalPages > 0 &&
                Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pn) => (
                    <button
                      key={pn}
                      onClick={() => {
                        if (pn === page) return;
                        setPage(pn);
                        void load(pn, limit);
                      }}
                      disabled={pageLoading}
                      className={`px-3 py-1 rounded ${
                        pn === page
                          ? "bg-blue-600 text-white"
                          : "bg-white border"
                      }`}
                    >
                      {pn}
                    </button>
                  )
                )}

              <button
                onClick={() => {
                  if (page >= totalPages) return;
                  const next = page + 1;
                  setPage(next);
                  void load(next, limit);
                }}
                disabled={page >= totalPages || pageLoading}
                className={`px-3 py-1 rounded ${
                  page >= totalPages
                    ? "bg-gray-200 text-gray-500"
                    : "bg-white border"
                }`}
              >
                Next
              </button>

              {pageLoading && (
                <span className="ml-3 text-sm text-slate-500">Loading...</span>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Approve flow removed — managers/admins should review requests in Requests page */}

      <ConfirmModal
        isOpen={!!showDeleteConfirm}
        title="Delete Installment"
        message="Are you sure you want to delete this installment plan? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={async () => {
          const id = showDeleteConfirm;
          setShowDeleteConfirm(null);
          if (!id) return;
          try {
            await client.delete(`/installments/${id}`);
            await load(page, limit);
          } catch (err: any) {
            setError(
              err?.response?.data?.error || "Failed to delete installment"
            );
          }
        }}
        onCancel={() => setShowDeleteConfirm(null)}
      />
    </div>
  );
};

export default InstallmentsPage;
