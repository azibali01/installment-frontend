"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../contexts/AuthContext";

type CashFlowData = {
  totalCashIn: number;
  totalCashOut: number;
  profit: number;
};

type InstallmentStats = {
  duToday?: any[];
  dueToday?: any[];
  upcoming?: any[];
  overdue?: any[];
};

const formatCurrency = (value?: number) =>
  `PKR ${Math.round(value ?? 0).toLocaleString()}`;

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`card p-6 bg-white rounded-lg border border-gray-200 ${className}`}
    >
      {children}
    </div>
  );
}

const getCount = (
  stats: InstallmentStats | null,
  ...keys: (keyof InstallmentStats)[]
) => {
  if (!stats) return 0;
  for (const k of keys) {
    const val = stats[k];
    if (Array.isArray(val)) return val.length;
  }
  return 0;
};

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);
  const [installmentStats, setInstallmentStats] =
    useState<InstallmentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!user) return;
    if (!["admin", "manager"].includes(user?.role || "")) {
      navigate("/dashboard");
      return;
    }
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchReports = async () => {
    setIsLoading(true);
    setError("");
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [flowRes, statsRes] = await Promise.all([
        client.get("/reports/cash-flow", { params }),
        client.get("/reports/installment-status", { params }),
      ]);

      setCashFlow(
        flowRes?.data ?? { totalCashIn: 0, totalCashOut: 0, profit: 0 }
      );
      setInstallmentStats(
        statsRes?.data ?? { dueToday: [], upcoming: [], overdue: [] }
      );
    } catch (err) {
      console.error("Failed to fetch reports", err);
      setError("Failed to load reports. Try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = () => fetchReports();
  const handlePrint = () => window.print();

  const dueCount = getCount(installmentStats, "duToday", "dueToday");
  const upcomingCount = getCount(installmentStats, "upcoming");
  const overdueCount = getCount(installmentStats, "overdue");

  const totalPlans = dueCount + upcomingCount + overdueCount;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-slate-600 hover:text-slate-900 transition"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          </div>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            Print Report
          </button>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8 print:hidden">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Filter Reports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded text-slate-900"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFilter}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition font-medium"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </Card>

        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-slate-500">Loading reports...</div>
        ) : (
          <div className="space-y-8">
            <Card>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Cash Flow Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                  <p className="text-slate-500 text-sm font-medium">
                    Total Cash In
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {formatCurrency(cashFlow?.totalCashIn)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                  <p className="text-slate-500 text-sm font-medium">
                    Total Cash Out
                  </p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {formatCurrency(cashFlow?.totalCashOut)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                  <p className="text-slate-500 text-sm font-medium">
                    Profit / Loss
                  </p>
                  <p
                    className={`text-3xl font-bold mt-2 ${
                      (cashFlow?.profit ?? 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(cashFlow?.profit)}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Installment Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                  <p className="text-slate-500 text-sm font-medium">
                    Today's Due
                  </p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {dueCount}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                  <p className="text-slate-500 text-sm font-medium">Upcoming</p>
                  <p className="text-3xl font-bold text-yellow-500 mt-2">
                    {upcomingCount}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                  <p className="text-slate-500 text-sm font-medium">Overdue</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {overdueCount}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Summary
              </h2>
              <div className="space-y-3 text-slate-700">
                <p>
                  • Total installment plans:{" "}
                  <span className="text-slate-900 font-semibold">
                    {totalPlans}
                  </span>
                </p>
                <p>
                  • Revenue collected:{" "}
                  <span className="text-green-600 font-semibold">
                    {formatCurrency(cashFlow?.totalCashIn)}
                  </span>
                </p>
                <p>
                  • Total expenses:{" "}
                  <span className="text-red-600 font-semibold">
                    {formatCurrency(cashFlow?.totalCashOut)}
                  </span>
                </p>
                <p>
                  • Net profit:{" "}
                  <span
                    className={`font-semibold ${
                      (cashFlow?.profit ?? 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(cashFlow?.profit)}
                  </span>
                </p>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};
