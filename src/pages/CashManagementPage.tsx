"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { getContextualErrorMessage } from "../utils/errorHandler";
import type { User, CashTransfer } from "../types";
import { formatCurrency } from "../utils/format";

export const CashManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [balance, setBalance] = useState<number>(0);
  const [allBalances, setAllBalances] = useState<User[]>([]);
  const [transfers, setTransfers] = useState<CashTransfer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState("");

  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    toUserId: "",
    amount: "",
    notes: "",
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [transferType, setTransferType] = useState<"sent" | "received" | "all">("all");

  useEffect(() => {
    loadData();
  }, [page, transferType]);

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Load own balance
      const balanceRes = await client.get("/cash/balance");
      setBalance(balanceRes.data.balance || 0);

      // Load all users' balances (admin only)
      if (user?.role === "admin") {
        try {
          const balancesRes = await client.get("/cash/balances");
          setAllBalances(balancesRes.data || []);
        } catch (err) {
          // Ignore if not authorized
        }
      }

      // Load users for transfer dropdown
      const usersRes = await client.get("/users");
      const allUsers = usersRes.data || [];
      
      // Filter users based on role rules
      let availableUsers = allUsers.filter((u: any) => {
        const userId = u._id || u.id;
        return userId !== user?.id && (u.isActive !== false && u.isActive !== undefined);
      });
      
      if (user?.role === "employee") {
        // Employee can only transfer to manager or admin
        availableUsers = availableUsers.filter((u: any) => u.role === "manager" || u.role === "admin");
      } else if (user?.role === "manager") {
        // Manager can only transfer to admin
        availableUsers = availableUsers.filter((u: any) => u.role === "admin");
      }
      // Admin can transfer to anyone (no filter)

      setUsers(availableUsers);

      // Load transfer history
      const transfersRes = await client.get("/cash/transfers", {
        params: { type: transferType, page, limit: 20 },
      });
      setTransfers(transfersRes.data.data || []);
      setTotalPages(transfersRes.data.meta?.totalPages || 1);
    } catch (err: any) {
      const errorMessage = getContextualErrorMessage(err, "fetch");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!transferForm.toUserId) {
      setError("Please select a recipient");
      return;
    }

    const amount = parseFloat(transferForm.amount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (amount > balance) {
      setError("Insufficient balance");
      return;
    }

    setIsTransferring(true);
    try {
      await client.post("/cash/transfer", {
        toUserId: transferForm.toUserId,
        amount,
        notes: transferForm.notes || undefined,
      });

      showToast("Cash transferred successfully", "success");
      setTransferForm({ toUserId: "", amount: "", notes: "" });
      await loadData(); // Reload data
    } catch (err: any) {
      const errorMessage = getContextualErrorMessage(err, "create");
      setError(errorMessage);
    } finally {
      setIsTransferring(false);
    }
  };

  // Using formatCurrency from utils/format

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            <h1 className="text-2xl font-bold text-slate-900">Cash Management</h1>
          </div>
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-600">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Balance Card */}
            <div className="card p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <p className="text-blue-100 text-sm font-medium mb-2">Your Cash Balance</p>
              <p className="text-4xl font-bold">{formatCurrency(balance)}</p>
            </div>

            {/* All Users Balances (Admin Only) */}
            {user?.role === "admin" && allBalances.length > 0 && (
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">All Users' Balances</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Role</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allBalances.map((u) => (
                        <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-slate-900">{u.name}</td>
                          <td className="py-3 px-4 text-sm text-slate-600 capitalize">{u.role}</td>
                          <td className="py-3 px-4 text-sm text-slate-900 font-medium text-right">
                            {formatCurrency(u.cashBalance || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transfer Form */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Transfer Cash</h2>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <label htmlFor="toUser" className="block text-sm font-medium text-slate-700 mb-2">
                    Transfer To
                  </label>
                  <select
                    id="toUser"
                    value={transferForm.toUserId}
                    onChange={(e) => setTransferForm({ ...transferForm, toUserId: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                    required
                  >
                    <option value="">Select user...</option>
                    {users.map((u: any) => {
                      const userId = u._id || u.id;
                      return (
                        <option key={userId} value={userId}>
                          {u.name} ({u.role})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-2">
                    Amount
                  </label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance}
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Available: {formatCurrency(balance)}
                  </p>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
                    rows={3}
                    maxLength={500}
                    placeholder="Add any notes about this transfer..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isTransferring || !transferForm.toUserId || !transferForm.amount}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded transition"
                >
                  {isTransferring ? "Transferring..." : "Transfer Cash"}
                </button>
              </form>
            </div>

            {/* Transfer History */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Transfer History</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setTransferType("all");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded text-sm ${
                      transferType === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-slate-700 hover:bg-gray-300"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setTransferType("sent");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded text-sm ${
                      transferType === "sent"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-slate-700 hover:bg-gray-300"
                    }`}
                  >
                    Sent
                  </button>
                  <button
                    onClick={() => {
                      setTransferType("received");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded text-sm ${
                      transferType === "received"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-slate-700 hover:bg-gray-300"
                    }`}
                  >
                    Received
                  </button>
                </div>
              </div>

              {transfers.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No transfers found</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">From</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">To</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transfers.map((transfer) => {
                          const isSent = transfer.fromUser.id === user?.id;
                          return (
                            <tr key={transfer._id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm text-slate-600">
                                {formatDate(transfer.createdAt)}
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-900">
                                {transfer.fromUser.name}
                                {isSent && <span className="ml-2 text-blue-600">(You)</span>}
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-900">
                                {transfer.toUser.name}
                                {!isSent && <span className="ml-2 text-green-600">(You)</span>}
                              </td>
                              <td className={`py-3 px-4 text-sm font-medium text-right ${
                                isSent ? "text-red-600" : "text-green-600"
                              }`}>
                                {isSent ? "-" : "+"}{formatCurrency(transfer.amount)}
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-600">
                                {transfer.notes || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 bg-gray-200 text-slate-700 rounded disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-slate-600">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 bg-gray-200 text-slate-700 rounded disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

