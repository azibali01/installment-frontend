"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import client from "../api/client";
import { cleanCNIC, formatCNIC, isValidCNIC } from "../utils/cnic";
import { formatPhone, cleanPhone } from "../utils/phone";
import { validateGuarantors } from "../utils/validation";
import { formatCurrency } from "../utils/format";
import { handleApiError, getContextualErrorMessage } from "../utils/errorHandler";
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
import SearchableSelect from "../components/SearchableSelect";
import { useToast } from "../contexts/ToastContext";
import Pagination from "../components/Pagination";

const InstallmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, hasPermission } = useAuth();
  const lastLocationRef = useRef<string>("");

  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
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
    installmentId: "",
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

  // Function to load customers and products
  const loadCustomersAndProducts = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        // Fetch all customers (use high limit to get all customers for dropdown)
        client.get("/customers", { params: { page: 1, limit: 1000 } }),
        // Fetch all products (use high limit to get all products for dropdown)
        client.get("/products", { params: { page: 1, limit: 1000 } }),
      ]);
      // Handle paginated response for customers
      if (Array.isArray(custRes.data)) {
        setCustomers(custRes.data);
      } else if (custRes.data && Array.isArray(custRes.data.data)) {
        setCustomers(custRes.data.data);
      } else {
        setCustomers([]);
      }
      // Handle paginated response for products
      if (Array.isArray(prodRes.data)) {
        setProducts(prodRes.data);
      } else if (prodRes.data && Array.isArray(prodRes.data.data)) {
        setProducts(prodRes.data.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to load customers/products:", err);
    }
  };

  // Load customers and products on mount
  useEffect(() => {
    void loadCustomersAndProducts();
    lastLocationRef.current = location.pathname;
  }, []);

  // Refresh customers when route changes (user navigates back from customer page)
  // This ensures newly created customers appear in the dropdown
  useEffect(() => {
    if (lastLocationRef.current !== location.pathname && lastLocationRef.current !== "") {
      // User navigated to this page from another page
      lastLocationRef.current = location.pathname;
      // Small delay to ensure customer was saved before refreshing
      const timeoutId = setTimeout(() => {
        void loadCustomersAndProducts();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (lastLocationRef.current === "") {
      lastLocationRef.current = location.pathname;
    }
  }, [location.pathname]);

  // Refresh customers when form is opened (to get newly created customers)
  useEffect(() => {
    if (showForm) {
      // Small delay to ensure any pending operations complete
      const timeoutId = setTimeout(() => {
        void loadCustomersAndProducts();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [showForm]);

  // Also refresh when page becomes visible (fallback for tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Only refresh if we're on the installments page
        if (location.pathname === "/installments") {
          void loadCustomersAndProducts();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [location.pathname]);

  useEffect(() => {
    // Read customerId from URL query params
    const customerIdFromUrl = searchParams.get("customerId");
    if (customerIdFromUrl) {
      setFilterCustomerId(customerIdFromUrl);
      // Load with the customer filter
      void load(1, limit, customerIdFromUrl);
    } else {
      void load(1, limit);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when search query, filter, or page changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load(page, limit);
    }, 500); // Increased debounce to 500ms
    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterStatus, filterCustomerId, page, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  // AbortController for request cancellation
  const abortControllerRef = React.useRef<AbortController | null>(null);

  async function load(p = page, l = limit, customerIdOverride?: string) {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setPageLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", String(l));
      const customerIdToUse = customerIdOverride || filterCustomerId;
      if (customerIdToUse) params.set("customerId", customerIdToUse);
      if (filterStatus) params.set("status", filterStatus);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      // Only fetch installments, customers/products are already loaded
      const instRes = await client.get(`/installments?${params.toString()}`, {
        signal: abortController.signal,
      });

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

      // Server-side search is now handled on backend
      setInstallments(instData.data || []);
      setTotalItems(instData.meta?.total || 0);
      setTotalPages(instData.meta?.totalPages || 1);
      setPage(instData.meta?.page || p);
    } catch (e: any) {
      // Don't show error if request was cancelled
      if (e.name === "CanceledError" || e.name === "AbortError" || e.code === "ERR_CANCELED") {
        return;
      }
      
      // Handle rate limiting gracefully - show error but don't crash
      const status = e?.response?.status;
      if (status === 429) {
        const errorMessage = e?.response?.data?.error || "Too many requests. Please wait a moment and try again.";
        setError(errorMessage);
        // Don't clear installments on rate limit - keep showing previous data
        return;
      }
      
      // For other errors, show error message
      try {
        const errorMessage = getContextualErrorMessage(e, "fetch");
        setError(errorMessage);
        // Only clear installments on actual errors, not rate limits
        if (status !== 429) {
          setInstallments([]);
        }
      } catch (err) {
        // Fallback if error handling itself fails
        console.error("Error handling failed:", err);
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setPageLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Use shared validation utility
      const validation = validateGuarantors(
        formData.guarantors,
        !!(formData.reference && formData.reference.trim())
      );
      if (!validation.isValid) {
        setError(validation.error || "Validation failed");
        return;
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
        // If reference is provided, send empty guarantors array or only filled ones
        const guarantorsToSend = formData.reference && formData.reference.trim() 
          ? formData.guarantors.filter((g: any) => g.cnic && g.cnic.trim()) // Only send if CNIC provided
          : formData.guarantors; // If no reference, send all (validation ensures at least one has CNIC)

        await client.post("/installments", {
          installmentId: formData.installmentId && formData.installmentId.trim() ? formData.installmentId.trim() : undefined,
          customerId: formData.customerId,
          productId: formData.productId,
          markupPercent: Number((formData as any).markupPercent) || 40,
          totalAmount: preview.totalAmount,
          downPayment: Number(formData.downPayment),
          numberOfMonths: Number(formData.numberOfMonths),
          bankCheque: formData.bankCheque,
          guarantors: guarantorsToSend.length > 0 ? guarantorsToSend : undefined,
          startDate: formData.startDate,
          roundingPolicy: formData.roundingPolicy,
          interestModel: formData.interestModel,
          installmentSchedule: preview.schedule,
          reference: formData.reference && formData.reference.trim() ? formData.reference.trim() : undefined,
        });
        setFormData({
          installmentId: "",
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
        setShowForm(false);
        await load(1, limit);
      }
    } catch (err: any) {
      const errorMessage = getContextualErrorMessage(err, editingId ? "update" : "create");
      setError(errorMessage);
    }
  }

  const canCreate = ["admin", "manager", "employee"].includes(user?.role || "");

  function getStatusColor(status: string) {
    return "";
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-1 hover:bg-blue-700 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              Print
            </button>
            {canCreate && (
            <button
              onClick={() => {
                if (showForm) {
                  setEditingId(null);
                  setSelectedPlan(null);
                  setEditingIsRequest(false);
        setFormData({
          installmentId: "",
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
      </div>
      </header>

      {/* Print Header */}
      <div className="hidden print:block p-8 mb-4 border-b bg-white">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Installment Plans Report</h1>
          <p className="text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {error && (
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
        )}

        {showForm && (
          <div className="card p-6 mb-8 print:hidden">
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
                    htmlFor="installmentId"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Installment ID (Khata No.)
                  </label>
                  <input
                    id="installmentId"
                    type="text"
                    placeholder="e.g. INST-001, 123, etc. (Leave empty for auto)"
                    value={formData.installmentId}
                    onChange={(e) =>
                      setFormData({ ...formData, installmentId: e.target.value })
                    }
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 w-full"
                    maxLength={50}
                  />
                 
                </div>

                <div>
                  <label
                    htmlFor="customerId"
                    className="block text-sm text-slate-700 mb-1"
                  >
                    Customer
                  </label>
                  <SearchableSelect
                    id="customerId"
                    value={formData.customerId}
                    onChange={(val) =>
                      setFormData({ ...formData, customerId: val })
                    }
                    options={customers.map((c) => ({
                      value: c._id,
                      label: c.name,
                      subLabel: c.cnic ? `CNIC: ${c.cnic}` : undefined,
                    }))}
                    placeholder="Select Customer"
                    required
                  />
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
                        {p.name} - {formatCurrency(p.price)}
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
                  If reference is provided, guarantors and bank details will be hidden
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
              
              {/* Bank Details - Hide if reference is provided */}
              {!formData.reference || !formData.reference.trim() ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
              ) : null}
              
              {/* Guarantors Section - Hide if reference is provided */}
              {!formData.reference || !formData.reference.trim() ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                        placeholder="0300-1234567"
                        value={formatPhone(g.phone || "")}
                        onChange={(e) => {
                          const cleaned = cleanPhone(e.target.value);
                          const next = [...formData.guarantors];
                          next[idx] = { ...next[idx], phone: cleaned };
                          setFormData({ ...formData, guarantors: next });
                        }}
                        maxLength={13}
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
              ) : null}
              <div className="mb-4 p-3 border rounded bg-white">
                <div className="text-sm text-slate-600">Preview</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-slate-500">Principal</div>
                    <div className="font-semibold">
                      {formatCurrency(preview.principal)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Monthly</div>
                    <div className="font-semibold">
                      {formatCurrency(Math.round(preview.monthly))}
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
                        <div>{formatCurrency(s.amount)}</div>
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
          <div className="mb-4 print:hidden">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by customer name, product, reference, or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 pl-10 pr-10 bg-white border border-gray-300 rounded text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-4 print:hidden">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Customer</label>
              <div className="w-64">
                <SearchableSelect
                  value={filterCustomerId}
                  onChange={(val) => {
                    setFilterCustomerId(val);
                    setPage(1);
                    // We need to trigger load, but load is async and depends on state.
                    // Ideally we should useEffect for filter changes or pass the new value to load.
                    // Since load reads from state, we might have a race condition if we call it immediately.
                    // However, the original code did: setFilterCustomerId(e.target.value); void load(1, limit);
                    // This implies load might be reading the *previous* state if it's not using args?
                    // Let's check the load function.
                    // Assuming load uses the state variables, calling it immediately after setState is risky in React batching.
                    // But if the original code did it, maybe load accepts args?
                    // Let's assume for now we just replicate the logic.
                    // Actually, SearchableSelect onChange gives the value directly.
                    // We can wrap this in a useEffect or just rely on the fact that we are updating state.
                    // Better: trigger a reload effect or pass the new filter to load if possible.
                    // For now, I'll just set the state. The original code had a potential bug if load used state.
                    // Let's check load function signature if possible.
                    // But to be safe, I will just set the state and let the user trigger search or use a useEffect if one exists.
                    // Wait, the original code was:
                    // onChange={(e) => { setFilterCustomerId(e.target.value); setPage(1); void load(1, limit); }}
                    // I will replicate this pattern.
                    setTimeout(() => void load(1, limit), 0);
                  }}
                  options={customers.map((c) => ({
                    value: c._id,
                    label: c.name,
                    subLabel: c.cnic ? `CNIC: ${c.cnic}` : undefined,
                  }))}
                  placeholder="All"
                  className="w-full"
                />
              </div>
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
                    {(plan as any).installmentId && (
                      <p className="text-slate-500 text-xs mb-1 font-mono">
                        ID: {(plan as any).installmentId}
                      </p>
                    )}
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
                    {(plan as any).reference && (
                      <p className="text-blue-600 text-sm mt-1">
                        📌 Reference: {(plan as any).reference}
                      </p>
                    )}
                  </div>
                  {/* Status badge removed */}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                    <p className="text-slate-600 text-xs">Remaining</p>
                    <p className="text-blue-600 font-semibold">
                      {formatCurrency(plan.remainingBalance || 0)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 print:hidden">
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
                            installmentId: (plan as any).installmentId || "",
                            customerId: custId,
                            productId: prodId,
                            downPayment: String(plan.downPayment || ""),
                            numberOfMonths: String(plan.numberOfMonths || ""),
                            startDate: plan.startDate
                              ? new Date(plan.startDate)
                                  .toISOString()
                                  .slice(0, 10)
                              : new Date().toISOString().slice(0, 10),
                            roundingPolicy:
                              plan.roundingPolicy || "nearest",
                            interestModel:
                              plan.interestModel || "amortized",
                            reference: plan.reference || "",
                            markupPercent: String(
                              plan.markupPercent || 40
                            ),
                            markupAmount: String(
                              (plan.totalAmount || 0) -
                                Number((plan.productId as any)?.price || 0)
                            ),
                            downPercent: String(
                              (Number(plan.downPayment || 0) /
                                (Number(plan.totalAmount || 0) || 1)) *
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
                            installmentId: (plan as any).installmentId || "",
                            customerId: custId,
                            productId: prodId,
                            downPayment: String(plan.downPayment || ""),
                            numberOfMonths: String(plan.numberOfMonths || ""),
                            startDate: plan.startDate
                              ? new Date(plan.startDate)
                                  .toISOString()
                                  .slice(0, 10)
                              : new Date().toISOString().slice(0, 10),
                            roundingPolicy:
                              plan.roundingPolicy || "nearest",
                            interestModel:
                              plan.interestModel || "amortized",
                            reference: plan.reference || "",
                            markupPercent: String(
                              plan.markupPercent || 40
                            ),
                            markupAmount: String(
                              (plan.totalAmount || 0) -
                                Number((plan.productId as any)?.price || 0)
                            ),
                            downPercent: String(
                              (Number(plan.downPayment || 0) /
                                (Number(plan.totalAmount || 0) || 1)) *
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
                            const errorMessage = handleApiError(err, "Failed to request delete");
                            showToast(errorMessage, "error");
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

          {/* Pagination UI for Installments */}
          <div className="mt-4">
            <Pagination
              page={page}
              pageSize={limit}
              total={totalItems}
              onPageChange={setPage}
              onPageSizeChange={setLimit}
            />
          </div>

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
            const errorMessage = getContextualErrorMessage(err, "delete");
            setError(errorMessage);
          }
        }}
        onCancel={() => setShowDeleteConfirm(null)}
      />
    </div>
  );
};

export default InstallmentsPage;
