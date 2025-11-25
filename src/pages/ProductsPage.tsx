"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import type { Product } from "../types";
import { useAuth } from "../contexts/AuthContext";

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    quantity: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await client.get("/products");
      setProducts(data);
    } catch (err) {
      setError("Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await client.post("/products", {
        name: formData.name,
        price: Number.parseFloat(formData.price),
        description: formData.description || undefined,
        quantity: formData.quantity
          ? Number.parseInt(formData.quantity)
          : undefined,
      });
      setFormData({ name: "", price: "", description: "", quantity: "" });
      setShowForm(false);
      await fetchProducts();
    } catch (err) {
      setError("Failed to create product");
    }
  };

  const canEdit = ["admin", "manager"].includes(user?.role || "");

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
            <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              {showForm ? "Cancel" : "Add Product"}
            </button>
          )}
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {showForm && (
          <div className="card p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Add New Product
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 placeholder-slate-400"
                  required
                />
                <input
                  type="number"
                  placeholder="Price (PKR)"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 placeholder-slate-400"
                  step="0.01"
                  required
                />

                <input
                  type="number"
                  placeholder="Quantity"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 placeholder-slate-400"
                  min={0}
                />
                <textarea
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-slate-900 placeholder-slate-400"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition"
              >
                Create Product
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="text-center text-slate-500 col-span-full">
              Loading...
            </div>
          ) : products.length === 0 ? (
            <div className="text-center text-slate-500 col-span-full">
              No products found
            </div>
          ) : (
            products.map((product) => (
              <div key={product._id} className="card p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {product.name}
                </h3>
                <p className="text-2xl font-bold text-blue-600 mb-4">
                  PKR {product.price.toLocaleString()}
                </p>
                <button
                  onClick={() => navigate(`/product/${product._id}`)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                >
                  View Details
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
