"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import type { Expense as ExpenseType, User } from "../types";
import { useAuth } from "../contexts/AuthContext";

export const ExpensesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "",
    notes: "",
    relatedUser: "",
  });

  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [res, usersRes] = await Promise.all([
        client.get("/expenses"),
        client.get("/users"),
      ]);
      setExpenses(res.data || []);

      const normalizedUsers: User[] = (usersRes.data || []).map((u: any) => ({
        ...u,
        id: u._id ?? u.id,
      }));
      setUsers(normalizedUsers);
    } catch (err) {
      setError("Failed to fetch expenses");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await client.post("/expenses", {
        title: formData.title,
        amount: Number.parseFloat(formData.amount),
        date: new Date(formData.date),
        category: formData.category,
        description: formData.notes,
        relatedUser: formData.relatedUser || undefined,
      });

      setFormData({
        title: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "",
        notes: "",
        relatedUser: "",
      });
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to record expense");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await client.delete(`/expenses/${id}`);
      await fetchData();
    } catch (err) {
      // show server-provided error when available to help debugging
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e: any = err;
      console.error("Delete expense error:", e);
      setError(e?.response?.data?.error || "Failed to delete expense");
    }
  };

  const canCreate = ["admin", "manager"].includes(user?.role || "");
  const canDelete = user?.role === "admin" || hasPermission("manage_expenses");

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
            <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              {showForm ? "Cancel" : "Record Expense"}
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
              Record Expense
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                />
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="salary">Salary</option>
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities</option>
                  <option value="inventory_purchase">Inventory Purchase</option>
                  <option value="supplies">Supplies</option>
                  <option value="marketing">Marketing</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="logistics">Logistics / Shipping</option>
                  <option value="taxes">Taxes / Fees</option>
                  <option value="other">Other</option>
                </select>
                {formData.category === "salary" && (
                  <select
                    value={formData.relatedUser}
                    onChange={(e) =>
                      setFormData({ ...formData, relatedUser: e.target.value })
                    }
                    className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                    required
                  >
                    <option value="">Select Employee</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                placeholder="Notes"
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
                Save Expense
              </button>
            </form>
          </div>
        )}

        <div className="card overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Date
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
                    colSpan={5}
                    className="px-6 py-4 text-center text-slate-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-slate-500"
                  >
                    No expenses recorded
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-slate-900">
                      {exp.relatedUser
                        ? `${exp.relatedUser.name} — ${exp.description || ""}`
                        : exp.description || exp.category}
                    </td>
                    <td className="px-6 py-4 text-slate-900">{exp.category}</td>
                    <td className="px-6 py-4 text-amber-600 font-semibold">
                      PKR {exp.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {canDelete ? (
                        <button
                          onClick={() => handleDelete(exp._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
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
