"use client";

import type React from "react";
import { useState, useEffect } from "react";
interface EditUserData {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  phone?: string;
  salary?: number;
  isActive?: boolean;
}
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import client from "../api/client";
import { formatPhone, cleanPhone } from "../utils/phone";
import { formatCurrency } from "../utils/format";

interface UserData {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: "admin" | "manager" | "employee";
  phone?: string;
  salary?: number;
}

export const UsersPage: React.FC = () => {
      // Delete user handler
      const handleDelete = async (userId: string) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
          try {
            await client.delete(`/users/${userId}`);
            await fetchUsers();
          } catch (err) {
            setError("Failed to delete user");
          }
        }
      };
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<EditUserData | null>(null);
    const [editForm, setEditForm] = useState<EditUserData & { password?: string } | null>(null);
    const [editError, setEditError] = useState("");
    const [editShowPassword, setEditShowPassword] = useState(false);

    const openEditModal = (user: EditUserData) => {
      setEditUser(user);
      setEditForm({ ...user, password: "" });
      setEditError("");
      setEditModalOpen(true);
    };

    const closeEditModal = () => {
      setEditModalOpen(false);
      setEditUser(null);
      setEditForm(null);
      setEditError("");
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (!editForm) return;
      const { name, value, type } = e.target;
      if (name === "salary") {
        setEditForm({ ...editForm, salary: Number(value) });
      } else if (name === "password") {
        setEditForm({ ...editForm, password: value });
      } else if (type === "checkbox") {
        setEditForm({ ...editForm, [name]: (e.target as HTMLInputElement).checked });
      } else {
        setEditForm({ ...editForm, [name]: value });
      }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editForm) return;
      try {
        // Only send password if filled
        const payload: any = {
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          phone: editForm.phone,
          salary: editForm.salary,
          isActive: editForm.isActive,
        };
        if (editForm.password && editForm.password.length > 0) {
          payload.password = editForm.password;
        }
        await client.put(`/users/${editForm._id}`, payload);
        closeEditModal();
        await fetchUsers();
      } catch (err: any) {
        setEditError(err.response?.data?.error || "Failed to update user");
      }
    };
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserData>({
    name: "",
    email: "",
    password: "",
    role: "employee",
    phone: "",
    salary: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (currentUser?.role !== "admin") {
      navigate("/dashboard");
      return;
    }
    fetchUsers();
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const { data } = await client.get("/users");
      setUsers(data);
    } catch (err) {
      setError("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await client.post("/users", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone,
        salary: formData.salary,
      });
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "employee",
        phone: "",
        salary: 0,
      });
      setShowForm(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create user");
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
              User Management
            </h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            {showForm ? "Cancel" : "Add User"}
          </button>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            {error}
            <button onClick={() => setError("")} className="float-right">
              ✕
            </button>
          </div>
        )}

        {showForm && (
          <div className="card p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Create New User
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ...existing code... */}
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                />
                {/* ...existing code... */}
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                />
                {/* ...existing code... */}
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-4 py-2 pr-10 bg-white border border-gray-300 rounded text-slate-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    tabIndex={-1}
                  >
                    {/* ...existing code... */}
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* ...existing code... */}
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as any })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
                {/* ...existing code... */}
                <input
                  type="tel"
                  placeholder="0300-1234567"
                  value={formatPhone(formData.phone || "")}
                  onChange={(e) => {
                    const cleaned = cleanPhone(e.target.value);
                    setFormData({ ...formData, phone: cleaned });
                  }}
                  maxLength={13}
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                />
                {/* ...existing code... */}
                <input
                  type="number"
                  placeholder="Salary (PKR)"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salary: e.target.value
                        ? Number.parseFloat(e.target.value)
                        : 0,
                    })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  step="0.01"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition"
              >
                Create User
              </button>
            </form>
          </div>
        )}

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                  Salary
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
                    className="px-6 py-4 text-center text-slate-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-slate-400"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-slate-900">{u.name}</td>
                    <td className="px-6 py-4 text-slate-900">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium capitalize">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {u.salary ? formatCurrency(u.salary) : "—"}
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => openEditModal(u)}
                        className="text-blue-600 hover:text-blue-500 transition text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(u._id)}
                        className="text-red-600 hover:text-red-500 transition text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Edit User Modal (rendered once, outside the table) */}
        {editModalOpen && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
                onClick={closeEditModal}
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-lg font-semibold mb-4">Edit User</h2>
              {editError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3">
                  {editError}
                </div>
              )}
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={editForm.email}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  required
                />
                <select
                  name="role"
                  value={editForm.role}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
                <input
                  type="tel"
                  name="phone"
                  placeholder="0300-1234567"
                  value={formatPhone(editForm.phone || "")}
                  onChange={handleEditChange}
                  maxLength={13}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                />
                <input
                  type="number"
                  name="salary"
                  placeholder="Salary (PKR)"
                  value={editForm.salary || ""}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                  step="0.01"
                />
                {/* Password field for admin only */}
                {currentUser?.role === "admin" && (
                  <div className="relative">
                    <input
                      type={editShowPassword ? "text" : "password"}
                      name="password"
                      placeholder="New Password (leave blank to keep unchanged)"
                      value={editForm.password || ""}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2 pr-10 bg-white border border-gray-300 rounded text-slate-900"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setEditShowPassword(!editShowPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      tabIndex={-1}
                    >
                      {editShowPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={editForm.isActive !== false}
                    onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label htmlFor="isActive" className="text-sm text-slate-700">Active</label>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
                >
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}