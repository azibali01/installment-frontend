"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

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
import { useNavigate } from "react-router-dom";
import client from "../api/client";

interface DashboardStats {
  todaysDue: number;
  upcomingDue: number;
  overdue: number;
  totalCashIn: number;
  totalCashOut: number;
  cashInHand: number;
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [installments, cashFlow] = await Promise.all([
          client.get("/reports/installment-status"),
          client.get("/reports/cash-flow"),
        ]);

        setStats({
          todaysDue: installments.data.duToday?.length || 0,
          upcomingDue: installments.data.upcoming?.length || 0,
          overdue: installments.data.overdue?.length || 0,
          totalCashIn: cashFlow.data.totalCashIn || 0,
          totalCashOut: cashFlow.data.totalCashOut || 0,
          cashInHand:
            (cashFlow.data.totalCashIn || 0) -
            (cashFlow.data.totalCashOut || 0),
        });
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
          </div>
          <div className="card p-6">
            <p className="text-slate-700 text-sm font-medium">Upcoming</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {stats.upcomingDue}
            </p>
          </div>
          <div className="card p-6">
            <p className="text-slate-700 text-sm font-medium">Overdue</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {stats.overdue}
            </p>
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
      </main>
    </div>
  );
};
