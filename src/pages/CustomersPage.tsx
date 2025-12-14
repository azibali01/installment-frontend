"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import client from "../api/client";
import type { Customer } from "../types";
import { formatCNIC, cleanCNIC } from "../utils/cnic";
import { formatPhone, cleanPhone } from "../utils/phone";
import { handleApiError, getContextualErrorMessage } from "../utils/errorHandler";

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, isLoading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cnic: "",
    address: "",
    so: "",
    cast: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading) fetchCustomers();
  }, [authLoading]);

  const fetchCustomers = async () => {
    try {
      const { data } = await client.get("/customers");
      setCustomers(data);
    } catch (err) {
      const resData = (err as any)?.response?.data;
      const msg =
        resData?.error || (err as any)?.message || "Failed to fetch customers";
      setError(msg);
      console.error("fetchCustomers error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await client.post("/customers", formData);
      setFormData({
        name: "",
        phone: "",
        cnic: "",
        address: "",
        so: "",
        cast: "",
      });
      setShowForm(false);
      await fetchCustomers();
    } catch (err) {
      const resData = (err as any)?.response?.data;
      if (resData?.errors && Array.isArray(resData.errors)) {
        const map: Record<string, string> = {};
        const msgs: string[] = [];
        resData.errors.forEach((e: any) => {
          const key = e.param || e.path || "_form";
          if (!map[key]) map[key] = e.msg || e.message || "Invalid";
          msgs.push(e.msg || e.message);
        });
        setFieldErrors(map);
        setError(msgs.join("; ") || "Validation failed");
      } else {
        const errorMessage = getContextualErrorMessage(err, "create");
        setError(errorMessage);
      }
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
            <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            {showForm ? "Cancel" : "Add Customer"}
          </button>
        </div>
      </header>

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
          <div className="card p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Add New Customer
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      setFieldErrors((p) => {
                        const c = { ...p };
                        delete c.name;
                        return c;
                      });
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-full"
                    required
                  />
                  {fieldErrors.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    S/O (Father's Name)
                  </label>
                  <input
                    type="text"
                    placeholder="S/O (Father's Name)"
                    value={(formData as any).so || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, so: e.target.value });
                      setFieldErrors((p) => {
                        const c = { ...p };
                        delete c.so;
                        return c;
                      });
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-full"
                  />
                  {fieldErrors.so && (
                    <p className="text-sm text-red-600 mt-1">
                      {fieldErrors.so}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    CNIC
                  </label>
                  <input
                    type="text"
                    placeholder="12345-1234567-1"
                    value={formatCNIC(formData.cnic)}
                    onChange={(e) => {
                      const cleaned = cleanCNIC(e.target.value);
                      setFormData({ ...formData, cnic: cleaned });
                      setFieldErrors((p) => {
                        const c = { ...p };
                        delete c.cnic;
                        return c;
                      });
                    }}
                    maxLength={15}
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-full"
                    required
                  />
                  {fieldErrors.cnic && (
                    <p className="text-sm text-red-600 mt-1">
                      {fieldErrors.cnic}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="0300-1234567"
                    value={formatPhone(formData.phone)}
                    onChange={(e) => {
                      const cleaned = cleanPhone(e.target.value);
                      setFormData({ ...formData, phone: cleaned });
                      setFieldErrors((p) => {
                        const c = { ...p };
                        delete c.phone;
                        return c;
                      });
                    }}
                    maxLength={13}
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-full"
                    required
                  />
                  {fieldErrors.phone && (
                    <p className="text-sm text-red-600 mt-1">
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Cast
                  </label>
                  <input
                    type="text"
                    placeholder="Cast"
                    value={(formData as any).cast || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, cast: e.target.value });
                      setFieldErrors((p) => {
                        const c = { ...p };
                        delete c.cast;
                        return c;
                      });
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-full"
                  />
                  {fieldErrors.cast && (
                    <p className="text-sm text-red-600 mt-1">
                      {fieldErrors.cast}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="Address"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value });
                      setFieldErrors((p) => {
                        const c = { ...p };
                        delete c.address;
                        return c;
                      });
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-full"
                    required
                  />
                  {fieldErrors.address && (
                    <p className="text-sm text-red-600 mt-1">
                      {fieldErrors.address}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition"
              >
                Create Customer
              </button>
            </form>
          </div>
        )}

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  S/O
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Cast
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  CNIC
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-4 text-center text-slate-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-4 text-center text-slate-400"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer._id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 text-slate-600 text-sm font-semibold">
                      {customer.customerId || customer._id.slice(-8)}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {formatPhone(customer.phone)}
                    </td>
                    <td className="px-6 py-4 text-slate-900">{customer.so}</td>
                    <td className="px-6 py-4 text-slate-900">
                      {customer.cast}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {formatCNIC(customer.cnic)}
                    </td>
                    <td className="px-6 py-4 text-slate-900 truncate">
                      {customer.address}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/customer/${customer._id}`)}
                        className="text-blue-600 hover:text-blue-500 transition text-sm font-medium"
                      >
                        View
                      </button>
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
