"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

const IconWrapper = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  />
);

const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 20h5v-2a4 4 0 00-4-4h-1"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 20H4v-2a4 4 0 014-4h1"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 11a4 4 0 100-8 4 4 0 000 8z"
    />
  </IconWrapper>
);

const CustomerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 20.25a8.25 8.25 0 0115 0"
    />
  </IconWrapper>
);

const ProductIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 7l9-4 9 4v10l-9 4-9-4V7z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18" />
  </IconWrapper>
);

const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 2h6a2 2 0 012 2v1H7V4a2 2 0 012-2z"
    />
    <rect
      x="7"
      y="7"
      width="10"
      height="14"
      rx="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconWrapper>
);

const CreditCardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <rect
      x="2"
      y="5"
      width="20"
      height="14"
      rx="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
  </IconWrapper>
);

const MoneyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3 1.343 3 3-1.343 3-3 3"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12v1a9 9 0 11-18 0v-1"
    />
  </IconWrapper>
);

const ChartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 13v6M15 8v11M21 3v16"
    />
  </IconWrapper>
);
// icons and components

interface DashboardStats {
  todaysDue: number;
  upcomingDue: number;
  overdue: number;
  totalCashIn: number;
  totalCashOut: number;
  cashInHand: number;
}

interface InstallmentListItem {
  planId: string;
  customer?: { _id: string; name?: string; phone?: string };
  installment: {
    month?: number;
    dueDate?: string;
    amount?: number;
    paidAmount?: number;
    remaining?: number;
  };
}

export const DashboardPage: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    todaysDue: 0,
    upcomingDue: 0,
    overdue: 0,
    totalCashIn: 0,
    totalCashOut: 0,
    cashInHand: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [todayList, setTodayList] = useState<InstallmentListItem[]>([]);
  const [upcomingList, setUpcomingList] = useState<InstallmentListItem[]>([]);
  const [overdueList, setOverdueList] = useState<InstallmentListItem[]>([]);
  const [expandedToday, setExpandedToday] = useState(false);
  const [expandedUpcoming, setExpandedUpcoming] = useState(false);
  const [expandedOverdue, setExpandedOverdue] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedScheduleMonth, setSelectedScheduleMonth] = useState<
    number | null
  >(null);
  const [logForm, setLogForm] = useState({
    response: "",
    contactMethod: "phone",
    nextContactDate: "",
    notes: "",
  });
  const [logLoading, setLogLoading] = useState(false);
  const { showToast } = useToast();

  const formatDate = (d?: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString();
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await client.get("/reports/dashboard");
        const d = res.data;
        setStats({
          todaysDue: d.today?.count || 0,
          upcomingDue: d.upcoming?.count || 0,
          overdue: d.overdue?.count || 0,
          totalCashIn: d.totalCashIn || 0,
          totalCashOut: d.totalCashOut || 0,
          cashInHand: (d.totalCashIn || 0) - (d.totalCashOut || 0),
        });

        setTodayList(d.todayList || []);
        setUpcomingList(d.upcomingList || []);
        setOverdueList(d.overdueList || []);
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navigateTo = (path: string) => {
    navigate(path);
  };

  async function handleSubmitLog(e: React.FormEvent) {
    e.preventDefault();
    setLogLoading(true);
    try {
      if (!selectedPlanId) throw new Error("No plan selected");
      const payload: any = {
        planId: selectedPlanId,
        // convert month to approximate index if available (month 1 -> index 0)
        scheduleIndex:
          typeof selectedScheduleMonth === "number"
            ? Math.max(0, selectedScheduleMonth - 1)
            : undefined,
        response: logForm.response || undefined,
        contactMethod: logForm.contactMethod || undefined,
        nextContactDate: logForm.nextContactDate || undefined,
        notes: logForm.notes || undefined,
      };
      await client.post("/contacts", payload);
      setShowLogModal(false);
      // refresh dashboard lists
      const res = await client.get("/reports/dashboard");
      const d = res.data;
      setTodayList(d.todayList || []);
      setUpcomingList(d.upcomingList || []);
      setOverdueList(d.overdueList || []);
      showToast("Contact logged", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err?.response?.data?.error || "Failed to log contact", "error");
    } finally {
      setLogLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Installment Manager
            </h1>
            <p className="text-slate-600 text-sm">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium capitalize">
              {user?.role}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <p className="text-slate-700 text-sm font-medium">Today's Due</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {stats.todaysDue}
            </p>
            <div className="mt-3 text-sm">
              {todayList.slice(0, 5).map((it) => (
                <div
                  key={`${it.planId}-${it.installment?.month}`}
                  className="flex justify-between"
                >
                  <div className="text-slate-700">
                    {it.customer?.name || "—"}
                  </div>
                  <div className="text-slate-900">
                    PKR{" "}
                    {(
                      it.installment?.remaining ||
                      it.installment?.amount ||
                      0
                    ).toLocaleString()}
                  </div>
                </div>
              ))}
              {todayList.length > 5 && (
                <div className="text-xs text-slate-500 mt-2">
                  +{todayList.length - 5} more
                </div>
              )}

              <div className="mt-3">
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => setExpandedToday((s) => !s)}
                >
                  {expandedToday ? "Collapse details" : "Expand details"}
                </button>
                {expandedToday && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr>
                          <th className="py-2">Plan ID</th>
                          <th className="py-2">Customer</th>
                          <th className="py-2">Due Date</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Paid</th>
                          <th className="py-2">Remaining</th>
                          <th className="py-2">Month</th>
                          <th className="py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayList.map((it) => (
                          <tr
                            key={`${it.planId}-${it.installment?.month}`}
                            className="border-t"
                          >
                            <td className="py-2">
                              {String(it.planId).slice(0, 8)}
                            </td>
                            <td className="py-2">{it.customer?.name || "—"}</td>
                            <td className="py-2">
                              {formatDate(it.installment?.dueDate)}
                            </td>
                            <td className="py-2">
                              {(it.installment?.amount || 0).toLocaleString()}
                            </td>
                            <td className="py-2">
                              {(
                                it.installment?.paidAmount || 0
                              ).toLocaleString()}
                            </td>
                            <td className="py-2">
                              {(
                                it.installment?.remaining ||
                                it.installment?.amount ||
                                0
                              ).toLocaleString()}
                            </td>
                            <td className="py-2">
                              {it.installment?.month ?? "—"}
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <button
                                  className="text-blue-600 hover:underline"
                                  onClick={() =>
                                    navigateTo(`/installments/${it.planId}`)
                                  }
                                >
                                  View
                                </button>
                                <button
                                  className="text-sm px-2 py-1 bg-blue-600 text-white rounded"
                                  onClick={() => {
                                    setSelectedPlanId(String(it.planId));
                                    setSelectedScheduleMonth(
                                      it.installment?.month ?? null
                                    );
                                    setLogForm({
                                      response: "",
                                      contactMethod: "phone",
                                      nextContactDate: "",
                                      notes: "",
                                    });
                                    setShowLogModal(true);
                                  }}
                                >
                                  Log Call
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="card p-6">
            <p className="text-slate-700 text-sm font-medium">Upcoming</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {stats.upcomingDue}
            </p>
            <div className="mt-3 text-sm">
              {upcomingList.slice(0, 5).map((it) => (
                <div
                  key={`${it.planId}-${it.installment?.month}`}
                  className="flex justify-between"
                >
                  <div className="text-slate-700">
                    {it.customer?.name || "—"}
                  </div>
                  <div className="text-slate-900">
                    {formatDate(it.installment?.dueDate)} • PKR{" "}
                    {(
                      it.installment?.remaining ||
                      it.installment?.amount ||
                      0
                    ).toLocaleString()}
                  </div>
                </div>
              ))}
              {upcomingList.length > 5 && (
                <div className="text-xs text-slate-500 mt-2">
                  +{upcomingList.length - 5} more
                </div>
              )}

              <div className="mt-3">
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => setExpandedUpcoming((s) => !s)}
                >
                  {expandedUpcoming ? "Collapse details" : "Expand details"}
                </button>
                {expandedUpcoming && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr>
                          <th className="py-2">Plan ID</th>
                          <th className="py-2">Customer</th>
                          <th className="py-2">Due Date</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Paid</th>
                          <th className="py-2">Remaining</th>
                          <th className="py-2">Month</th>
                          <th className="py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingList.map((it) => (
                          <tr
                            key={`${it.planId}-${it.installment?.month}`}
                            className="border-t"
                          >
                            <td className="py-2">
                              {String(it.planId).slice(0, 8)}
                            </td>
                            <td className="py-2">{it.customer?.name || "—"}</td>
                            <td className="py-2">
                              {formatDate(it.installment?.dueDate)}
                            </td>
                            <td className="py-2">
                              {(it.installment?.amount || 0).toLocaleString()}
                            </td>
                            <td className="py-2">
                              {(
                                it.installment?.paidAmount || 0
                              ).toLocaleString()}
                            </td>
                            <td className="py-2">
                              {(
                                it.installment?.remaining ||
                                it.installment?.amount ||
                                0
                              ).toLocaleString()}
                            </td>
                            <td className="py-2">
                              {it.installment?.month ?? "—"}
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <button
                                  className="text-blue-600 hover:underline"
                                  onClick={() =>
                                    navigateTo(`/installments/${it.planId}`)
                                  }
                                >
                                  View
                                </button>
                                <button
                                  className="text-sm px-2 py-1 bg-blue-600 text-white rounded"
                                  onClick={() => {
                                    setSelectedPlanId(String(it.planId));
                                    setSelectedScheduleMonth(
                                      it.installment?.month ?? null
                                    );
                                    setLogForm({
                                      response: "",
                                      contactMethod: "phone",
                                      nextContactDate: "",
                                      notes: "",
                                    });
                                    setShowLogModal(true);
                                  }}
                                >
                                  Log Call
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="card p-6">
            <p className="text-slate-700 text-sm font-medium">Overdue</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {stats.overdue}
            </p>
            <div className="mt-3 text-sm">
              {overdueList.slice(0, 5).map((it) => (
                <div
                  key={`${it.planId}-${it.installment?.month}`}
                  className="flex justify-between"
                >
                  <div className="text-slate-700">
                    {it.customer?.name || "—"}
                  </div>
                  <div className="text-red-600">
                    PKR{" "}
                    {(
                      it.installment?.remaining ||
                      it.installment?.amount ||
                      0
                    ).toLocaleString()}
                  </div>
                </div>
              ))}
              {overdueList.length > 5 && (
                <div className="text-xs text-slate-500 mt-2">
                  +{overdueList.length - 5} more
                </div>
              )}

              <div className="mt-3">
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => setExpandedOverdue((s) => !s)}
                >
                  {expandedOverdue ? "Collapse details" : "Expand details"}
                </button>
                {expandedOverdue && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr>
                          <th className="py-2">Plan ID</th>
                          <th className="py-2">Customer</th>
                          <th className="py-2">Due Date</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Paid</th>
                          <th className="py-2">Remaining</th>
                          <th className="py-2">Month</th>
                          <th className="py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overdueList.map((it) => (
                          <tr
                            key={`${it.planId}-${it.installment?.month}`}
                            className="border-t"
                          >
                            <td className="py-2">
                              {String(it.planId).slice(0, 8)}
                            </td>
                            <td className="py-2">{it.customer?.name || "—"}</td>
                            <td className="py-2">
                              {formatDate(it.installment?.dueDate)}
                            </td>
                            <td className="py-2">
                              {(it.installment?.amount || 0).toLocaleString()}
                            </td>
                            <td className="py-2">
                              {(
                                it.installment?.paidAmount || 0
                              ).toLocaleString()}
                            </td>
                            <td className="py-2">
                              {(
                                it.installment?.remaining ||
                                it.installment?.amount ||
                                0
                              ).toLocaleString()}
                            </td>
                            <td className="py-2">
                              {it.installment?.month ?? "—"}
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <button
                                  className="text-blue-600 hover:underline"
                                  onClick={() =>
                                    navigateTo(`/installments/${it.planId}`)
                                  }
                                >
                                  View
                                </button>
                                <button
                                  className="text-sm px-2 py-1 bg-blue-600 text-white rounded"
                                  onClick={() => {
                                    setSelectedPlanId(String(it.planId));
                                    setSelectedScheduleMonth(
                                      it.installment?.month ?? null
                                    );
                                    setLogForm({
                                      response: "",
                                      contactMethod: "phone",
                                      nextContactDate: "",
                                      notes: "",
                                    });
                                    setShowLogModal(true);
                                  }}
                                >
                                  Log Call
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="card p-6">
            <p className="text-slate-700 text-sm font-medium">Total Cash In</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              PKR {stats.totalCashIn.toLocaleString()}
            </p>
          </div>
          <div className="card p-6">
            <p className="text-slate-700 text-sm font-medium">Total Cash Out</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              PKR {stats.totalCashOut.toLocaleString()}
            </p>
          </div>
          <div className="card p-6">
            <p className="text-slate-700 text-sm font-medium">Cash in Hand</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              PKR {stats.cashInHand.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {user?.role === "admin" && (
            <button
              onClick={() => navigateTo("/users")}
              className="card p-6 text-left"
            >
              <p className="text-slate-700 text-sm font-medium">Manage Users</p>
              <div className="text-slate-900 text-lg font-semibold mt-2">
                <UsersIcon className="h-6 w-6" />
              </div>
            </button>
          )}
          {(user?.role === "admin" || hasPermission("manage_roles")) && (
            <button
              onClick={() => navigateTo("/roles")}
              className="card p-6 text-left"
            >
              <p className="text-slate-700 text-sm font-medium">Roles</p>
              <div className="text-slate-900 text-lg font-semibold mt-2">
                <UsersIcon className="h-6 w-6" />
              </div>
            </button>
          )}
          <button
            onClick={() => navigateTo("/customers")}
            className="card p-6 text-left"
          >
            <p className="text-slate-700 text-sm font-medium">Customers</p>
            <div className="text-slate-900 text-lg font-semibold mt-2">
              <CustomerIcon className="h-6 w-6" />
            </div>
          </button>
          <button
            onClick={() => navigateTo("/products")}
            className="card p-6 text-left"
          >
            <p className="text-slate-700 text-sm font-medium">Products</p>
            <div className="text-slate-900 text-lg font-semibold mt-2">
              <ProductIcon className="h-6 w-6" />
            </div>
          </button>
          <button
            onClick={() => navigateTo("/installments")}
            className="card p-6 text-left"
          >
            <p className="text-slate-700 text-sm font-medium">Installments</p>
            <div className="text-slate-900 text-lg font-semibold mt-2">
              <ClipboardIcon className="h-6 w-6" />
            </div>
          </button>
          <button
            onClick={() => navigateTo("/payments")}
            className="card p-6 text-left"
          >
            <p className="text-slate-700 text-sm font-medium">Payments</p>
            <div className="text-slate-900 text-lg font-semibold mt-2">
              <CreditCardIcon className="h-6 w-6" />
            </div>
          </button>
          <button
            onClick={() => navigateTo("/expenses")}
            className="card p-6 text-left"
          >
            <p className="text-slate-700 text-sm font-medium">Expenses</p>
            <div className="text-slate-900 text-lg font-semibold mt-2">
              <MoneyIcon className="h-6 w-6" />
            </div>
          </button>
          <button
            onClick={() => navigateTo("/reports")}
            className="card p-6 text-left"
          >
            <p className="text-slate-700 text-sm font-medium">Reports</p>
            <div className="text-slate-900 text-lg font-semibold mt-2">
              <ChartIcon className="h-6 w-6" />
            </div>
          </button>
        </div>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black opacity-40"
              onClick={() => setShowLogModal(false)}
            />
            <div className="bg-white rounded shadow-lg z-10 w-11/12 max-w-md p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Log Call / Reschedule</h3>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="px-2 py-1"
                >
                  Close
                </button>
              </div>
              <form onSubmit={handleSubmitLog} className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Plan
                  </label>
                  <div className="text-sm text-slate-600">
                    {selectedPlanId ? String(selectedPlanId).slice(0, 8) : "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Month
                  </label>
                  <div className="text-sm text-slate-600">
                    {selectedScheduleMonth ?? "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Response
                  </label>
                  <select
                    value={logForm.response}
                    onChange={(e) =>
                      setLogForm({ ...logForm, response: e.target.value })
                    }
                    className="px-3 py-2 border rounded w-full"
                  >
                    <option value="">Select outcome</option>
                    <option value="contacted">Contacted</option>
                    <option value="no_answer">No Answer</option>
                    <option value="wrong_number">Wrong Number</option>
                    <option value="reschedule">Reschedule</option>
                    <option value="not_interested">Not Interested</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Contact Method
                  </label>
                  <select
                    value={logForm.contactMethod}
                    onChange={(e) =>
                      setLogForm({ ...logForm, contactMethod: e.target.value })
                    }
                    className="px-3 py-2 border rounded w-full"
                  >
                    <option value="phone">Phone</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="in_person">In Person</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Next Contact Date
                  </label>
                  <input
                    type="date"
                    value={logForm.nextContactDate}
                    onChange={(e) =>
                      setLogForm({
                        ...logForm,
                        nextContactDate: e.target.value,
                      })
                    }
                    className="px-3 py-2 border rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={logForm.notes}
                    onChange={(e) =>
                      setLogForm({ ...logForm, notes: e.target.value })
                    }
                    className="px-3 py-2 border rounded w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={logLoading}
                    className="px-3 py-1 bg-blue-600 text-white rounded"
                  >
                    {logLoading ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-3 py-1 border rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
