"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../api/client";
import type { Product } from "../types";
import { useAuth } from "../contexts/AuthContext";
import ConfirmModal from "../components/ConfirmModal";
import { formatCurrency } from "../utils/format";

const ProductDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    description: "",
    quantity: "",
  });
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const res = await client.get(`/products/${id}`);
        setProduct(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.error || "Failed to load product");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchProduct();
  }, [id]);

  const handleDelete = () => {
    setShowConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!id) return;
    setShowConfirm(false);
    try {
      await client.delete(`/products/${id}`);
      navigate("/products");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to delete product");
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  if (!product)
    return (
      <div className="min-h-screen p-6">
        <div className="text-slate-600">Product not found</div>
        <button className="mt-4 btn" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="text-slate-600 mr-4"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <div className="text-sm text-slate-500">
              {formatCurrency(product.price || 0)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasPermission && hasPermission("manage_products") && (
              <>
                <button
                  onClick={() => {
                    if (!product) return;
                    setEditForm({
                      name: product.name || "",
                      price: String(product.price || 0),
                      description: product.description || "",
                      quantity: String(product.quantity ?? 0),
                    });
                    setEditMode(true);
                  }}
                  className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Product Details</h2>
          {!editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-slate-600 text-sm">Description</p>
                <p className="text-slate-800 mt-2">
                  {product.description || "No description provided."}
                </p>
              </div>

              <div>
                <p className="text-slate-600 text-sm">Quantity</p>
                <p className="text-slate-800 mt-2">{product.quantity ?? 0}</p>

                <p className="text-slate-600 text-sm mt-4">Created</p>
                <p className="text-slate-800 mt-2">
                  {product &&
                    new Date((product as any).createdAt).toLocaleString()}
                </p>

                <p className="text-slate-600 text-sm mt-4">Updated</p>
                <p className="text-slate-800 mt-2">
                  {product &&
                    new Date((product as any).updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <form
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!id) return;
                try {
                  setIsLoading(true);
                  const payload = {
                    name: editForm.name,
                    price: Number.parseFloat(editForm.price || "0"),
                    description: editForm.description || undefined,
                    quantity: editForm.quantity
                      ? Number.parseInt(editForm.quantity)
                      : undefined,
                  };
                  const res = await client.put(`/products/${id}`, payload);
                  setProduct(res.data);
                  setEditMode(false);
                } catch (err: any) {
                  setError(
                    err?.response?.data?.error || "Failed to save product"
                  );
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              <div>
                <p className="text-slate-600 text-sm">Name</p>
                <input
                  className="mt-2 w-full px-3 py-2 border rounded"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                />

                <p className="text-slate-600 text-sm mt-4">Description</p>
                <textarea
                  className="mt-2 w-full px-3 py-2 border rounded"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                />
              </div>

              <div>
                <p className="text-slate-600 text-sm">Price</p>
                <input
                  type="number"
                  className="mt-2 w-full px-3 py-2 border rounded"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm({ ...editForm, price: e.target.value })
                  }
                  step="0.01"
                  required
                />

                <p className="text-slate-600 text-sm mt-4">Quantity</p>
                <input
                  type="number"
                  className="mt-2 w-full px-3 py-2 border rounded"
                  value={editForm.quantity}
                  onChange={(e) =>
                    setEditForm({ ...editForm, quantity: e.target.value })
                  }
                  min={0}
                />

                <div className="flex gap-2 mt-6">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 bg-gray-200 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>
      <ConfirmModal
        isOpen={showConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};

export default ProductDetailPage;
