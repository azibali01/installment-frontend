"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import type { InstallmentPlan, Customer, Product } from "../types";
import { useAuth } from "../contexts/AuthContext";

export const InstallmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    productId: "",
    downPayment: "",
    interestRate: "",
    numberOfMonths: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inst, cust, prod] = await Promise.all([
        client.get("/installments"),
        client.get("/customers"),
        client.get("/products"),
      ]);
      setInstallments(inst.data);
      setCustomers(cust.data);
      setProducts(prod.data);
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const product = products.find((p) => p._id === formData.productId);
      if (!product) throw new Error("Product not found");

      const totalAmount = product.price;
      await client.post("/installments", {
        customerId: formData.customerId,
        productId: formData.productId,
        totalAmount,
        downPayment: Number.parseFloat(formData.downPayment),
        interestRate: Number.parseFloat(formData.interestRate),
        numberOfMonths: Number.parseInt(formData.numberOfMonths),
      });

      setFormData({
        customerId: "",
        productId: "",
        downPayment: "",
        interestRate: "",
        numberOfMonths: "",
      });
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create installment");
    }
  };

  const canCreate = ["admin", "manager", "employee"].includes(user?.role || "");

  const getStatusColor = (status: string) => {
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
  };

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
              onClick={() => setShowForm(!showForm)}
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
              Create New Installment Plan
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={formData.customerId}
                  onChange={(e) =>
                    setFormData({ ...formData, customerId: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.productId}
                  onChange={(e) =>
                    setFormData({ ...formData, productId: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} - PKR {p.price}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Down Payment (PKR)"
                  value={formData.downPayment}
                  onChange={(e) =>
                    setFormData({ ...formData, downPayment: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  step="0.01"
                  required
                />
                <input
                  type="number"
                  placeholder="Interest Rate (%)"
                  value={formData.interestRate}
                  onChange={(e) =>
                    setFormData({ ...formData, interestRate: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  step="0.01"
                  required
                />
                <input
                  type="number"
                  placeholder="Number of Months"
                  value={formData.numberOfMonths}
                  onChange={(e) =>
                    setFormData({ ...formData, numberOfMonths: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition"
              >
                Create Plan
              </button>
            </form>
          </div>
        )}

        <div className="space-y-4">
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
                      {plan.customerId.name}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {plan.productId.name}
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
                      PKR {plan.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs">Down Payment</p>
                    <p className="text-slate-900 font-semibold">
                      PKR {plan.downPayment.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs">Monthly</p>
                    <p className="text-slate-900 font-semibold">
                      PKR {Math.round(plan.monthlyInstallment).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs">Remaining</p>
                    <p className="text-blue-600 font-semibold">
                      PKR {plan.remainingBalance.toLocaleString()}
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

                  {hasPermission &&
                    hasPermission("approve_installments") &&
                    plan.status === "pending" && (
                      <button
                        onClick={async () => {
                          if (!confirm("Approve this installment plan?"))
                            return;
                          try {
                            await client.put(
                              `/installments/${plan._id}/approve`
                            );
                            await fetchData();
                          } catch (err: any) {
                            setError(
                              err.response?.data?.error ||
                                "Failed to approve plan"
                            );
                          }
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition text-sm"
                      >
                        Approve
                      </button>
                    )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
