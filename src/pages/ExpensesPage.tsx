"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import Pagination from "../components/Pagination";
import ConfirmModal from "../components/ConfirmModal";
import type { Expense as ExpenseType, User } from "../types";
import { useAuth } from "../contexts/AuthContext";

export const ExpensesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterUser, setFilterUser] = useState<string>("");

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
    void fetchData();
  }, [currentPage, pageSize, filterCategory, filterUser]);

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: any = { page: currentPage, pageSize };
      if (filterCategory) params.category = filterCategory;
      if (filterUser) params.relatedUser = filterUser;

      const [res, usersRes] = await Promise.all([
        client.get("/expenses", { params }),
        client.get("/users"),
      ]);

      if (Array.isArray(res.data)) {
        setExpenses(res.data || []);
        setTotalExpenses(res.data.length || 0);
      } else {
        setExpenses(res.data.data || res.data || []);
        setTotalExpenses(res.data.total || 0);
        if (res.data.page) setCurrentPage(res.data.page);
        if (res.data.pageSize) setPageSize(res.data.pageSize);
      }

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
      const payload = {
        title: formData.title,
        amount: Number.parseFloat(formData.amount),
        date: new Date(formData.date),
        category: formData.category,
        description: formData.notes,
        relatedUser: formData.relatedUser || undefined,
      };

      if (editingId) {
        await client.put(`/expenses/${editingId}`, payload);
      } else {
        await client.post("/expenses", payload);
      }

      setFormData({
        title: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "",
        notes: "",
        relatedUser: "",
      });
      setShowForm(false);
      setEditingId(null);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to record expense");
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
      await client.delete(`/expenses/${deleteTargetId}`);
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
      await fetchData();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e: any = err;
      console.error("Delete expense error:", e);
      setError(e?.response?.data?.error || "Failed to delete expense");
    } finally {
      setDeletingId(null);
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
              onClick={() => {
                if (showForm) {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    title: "",
                    amount: "",
                    date: new Date().toISOString().split("T")[0],
                    category: "",
                    notes: "",
                    relatedUser: "",
                  });
                } else {
                  setShowForm(true);
                  setEditingId(null);
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              {showForm
                ? editingId
                  ? "Cancel Edit"
                  : "Cancel"
                : "Record Expense"}
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
              {editingId ? "Edit Expense" : "Record Expense"}
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
                {editingId ? "Save Changes" : "Save Expense"}
              </button>
            </form>
          </div>
        )}

        {/* Filters toolbar */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-gray-300 rounded text-slate-900"
            >
              <option value="">All Categories</option>
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

            <select
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-gray-300 rounded text-slate-900"
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFilterCategory("");
                setFilterUser("");
                setCurrentPage(1);
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
                      <div className="flex items-center gap-3">
                        {(["admin", "manager"].includes(user?.role || "") ||
                          hasPermission("manage_expenses")) && (
                          <button
                            onClick={() => {
                              // open edit form with prefilled data
                              setEditingId(exp._id);
                              setFormData({
                                title: exp.description || exp.category || "",
                                amount: String(exp.amount || ""),
                                date: new Date(exp.date)
                                  .toISOString()
                                  .slice(0, 10),
                                category: exp.category || "",
                                notes: exp.description || "",
                                relatedUser:
                                  (exp.relatedUser &&
                                    (typeof exp.relatedUser === "string"
                                      ? exp.relatedUser
                                      : exp.relatedUser.id ||
                                        (exp.relatedUser as any)._id)) ||
                                  "",
                              });
                              setShowForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                        )}
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={totalExpenses}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(1);
            }}
          />
          <ConfirmModal
            isOpen={deleteModalOpen}
            title="Delete Expense"
            message="Are you sure you want to delete this expense? This action cannot be undone."
            confirmLabel={
              deletingId === deleteTargetId ? "Deleting…" : "Delete"
            }
            cancelLabel="Cancel"
            onConfirm={performDelete}
            onCancel={() => {
              setDeleteModalOpen(false);
              setDeleteTargetId(null);
            }}
          />
        </div>
      </main>
    </div>
  );
};
