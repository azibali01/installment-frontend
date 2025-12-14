"use client";

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import type { Customer } from "../types";
import ConfirmModal from "../components/ConfirmModal";
import { formatCNIC, cleanCNIC } from "../utils/cnic";
import { formatPhone, cleanPhone } from "../utils/phone";

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    cnic: "",
    address: "",
    so: "",
    cast: "",
  });

  useEffect(() => {
    if (!id) return;
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const { data } = await client.get(`/customers/${id}`);
      setCustomer(data);
      setForm({
        name: data.name || "",
        phone: cleanPhone(data.phone || ""),
        cnic: cleanCNIC(data.cnic || ""),
        address: data.address || "",
        so: (data as any).so || "",
        cast: (data as any).cast || "",
      });
    } catch (err) {
      setError("Failed to fetch customer");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      await client.put(`/customers/${id}`, form);
      await fetchCustomer();
    } catch (err) {
      setError("Failed to save customer");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = () => {
    // show confirmation modal
    setShowConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!id) return;
    setShowConfirm(false);
    setSaving(true);
    try {
      await client.delete(`/customers/${id}`);
      navigate("/customers");
    } catch (err) {
      setError("Failed to delete customer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!customer) return <div className="p-8">Customer not found</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <button onClick={() => navigate(-1)} className="text-slate-600">
          ← Back
        </button>
      </div>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="text-red-600 mb-4">{error}</div>}

        <div className="mb-4">
          <button
            onClick={() => navigate(`/installments?customerId=${id}`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            View Customer's Installments
          </button>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Edit Customer</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  required
                  className="px-4 py-2 border rounded w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  S/O (Father's Name)
                </label>
                <input
                  value={form.so}
                  onChange={(e) => setForm({ ...form, so: e.target.value })}
                  placeholder="S/O (Father's Name)"
                  className="px-4 py-2 border rounded w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  CNIC
                </label>
                <input
                  value={formatCNIC(form.cnic)}
                  onChange={(e) => {
                    const cleaned = cleanCNIC(e.target.value);
                    setForm({ ...form, cnic: cleaned });
                  }}
                  placeholder="12345-1234567-1"
                  maxLength={15}
                  className="px-4 py-2 border rounded w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <input
                  value={formatPhone(form.phone)}
                  onChange={(e) => {
                    const cleaned = cleanPhone(e.target.value);
                    setForm({ ...form, phone: cleaned });
                  }}
                  placeholder="0300-1234567"
                  maxLength={13}
                  className="px-4 py-2 border rounded w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Cast
                </label>
                <input
                  value={form.cast}
                  onChange={(e) => setForm({ ...form, cast: e.target.value })}
                  placeholder="Cast"
                  className="px-4 py-2 border rounded w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Address
                </label>
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  placeholder="Address"
                  className="px-4 py-2 border rounded w-full"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded ml-2"
                disabled={saving}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
      <ConfirmModal
        isOpen={showConfirm}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};

export default CustomerDetailPage;
