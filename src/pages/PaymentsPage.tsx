"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import type { Payment, InstallmentPlan } from "../types";
import { useAuth } from "../contexts/AuthContext";

export const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pay, inst] = await Promise.all([
        client.get("/payments"),
        client.get("/installments"),
      ]);
      setPayments(pay.data);
      setInstallments(inst.data.filter((i: any) => i.status === "approved"));
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await client.post("/payments", {
        installmentPlanId: formData.installmentPlanId,
        installmentMonth: Number.parseInt(formData.installmentMonth),
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
    }
  };

  const canRecord = ["admin", "manager", "employee"].includes(user?.role || "");

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
                  {installments.map((inst) => (
                    <option key={inst._id} value={inst._id}>
                      {inst.customerId.name} - {inst.productId.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Month Number"
                  value={formData.installmentMonth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      installmentMonth: e.target.value,
                    })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  min="1"
                  required
                />
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
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition"
              >
                Record Payment
              </button>
            </form>
          </div>
        )}

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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-slate-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-slate-500"
                  >
                    No payments recorded
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-slate-900">
                      {payment.installmentPlanId.customerId.name}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      Month {payment.installmentMonth}
                    </td>
                    <td className="px-6 py-4 text-green-600 font-semibold">
                      PKR {payment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {payment.recordedBy.name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
