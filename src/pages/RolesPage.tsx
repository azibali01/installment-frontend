"use client";

import React, { useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const ALL_PERMISSIONS = [
  "view_dashboard",
  "view_customers",
  "manage_customers",
  "view_products",
  "manage_products",
  "view_installments",
  "manage_installments",
  "approve_installments",
  "view_payments",
  "manage_payments",
  "view_expenses",
  "manage_expenses",
  "view_reports",
  "manage_users",
  "manage_roles",
];

export const RolesPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("manager");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    if (!hasPermission("manage_roles") && user.role !== "admin") {
      navigate("/dashboard");
      return;
    }
    fetchRole();
  }, [user, role]);

  const fetchRole = async () => {
    setLoading(true);
    try {
      const res = await client.get(`/roles/${role}`);
      setPermissions(res.data.permissions || []);
    } catch (err) {
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (p: string) => {
    setPermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const save = async () => {
    setLoading(true);
    try {
      await client.put(`/roles/${role}`, { permissions });
      alert("Saved");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Role Permissions
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-6 mb-6">
          <label className="block text-sm text-slate-700 mb-2">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-300 rounded"
          >
            <option value="admin">admin</option>
            <option value="manager">manager</option>
            <option value="employee">employee</option>
          </select>
        </div>

        {error && <div className="mb-4 text-red-600">{error}</div>}

        <div className="card p-6">
          <h2 className="text-lg font-medium mb-4">Permissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ALL_PERMISSIONS.map((p) => (
              <label key={p} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={permissions.includes(p)}
                  onChange={() => toggle(p)}
                />
                <span className="text-sm text-slate-700">{p}</span>
              </label>
            ))}
          </div>
          <div className="mt-4">
            <button
              onClick={save}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Save
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RolesPage;
