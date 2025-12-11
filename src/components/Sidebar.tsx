"use client";

import React, { useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const IconWrapper = ({ children, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth={1.5}
    stroke="currentColor"
    {...(props as any)}
  >
    {children}
  </svg>
);

const DashboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13h8V3H3v10zM13 21h8V11h-8v10z"
    />
  </IconWrapper>
);

const CustomersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 11c1.657 0 3-1.343 3-3S17.657 5 16 5s-3 1.343-3 3 1.343 3 3 3zM8 11c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 20a6 6 0 0112 0" />
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

const InstallmentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4" />
  </IconWrapper>
);

const PaymentIcon = (props: React.SVGProps<SVGSVGElement>) => (
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

const ExpenseIcon = (props: React.SVGProps<SVGSVGElement>) => (
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

const ReportsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13v6M15 8v11" />
  </IconWrapper>
);

const RequestsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 7h16M4 12h10M4 17h16"
    />
  </IconWrapper>
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

const RolesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <IconWrapper {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z"
    />
  </IconWrapper>
);

const LinkItemInner: React.FC<{
  to: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick: (e: React.MouseEvent, to: string) => void;
}> = ({ to, icon, children, onClick }) => (
  <NavLink
    to={to}
    onClick={(e) => onClick(e, to)}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-100 transition ${
        isActive ? "bg-gray-100 font-semibold" : "text-slate-700"
      }`
    }
  >
    <span className="w-5 h-5 text-slate-500">{icon}</span>
    <span className="text-sm">{children}</span>
  </NavLink>
);

export const Sidebar: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const navTimer = useRef<number | null>(null);

  const handleNav = (e: React.MouseEvent, to: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (navTimer.current) window.clearTimeout(navTimer.current);
    navTimer.current = window.setTimeout(() => navigate(to), 200);
  };

  return (
    <aside className="w-56 bg-white border-r border-gray-200 h-screen sticky top-0">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-bold">Installment App</h2>
        <p className="text-sm text-slate-500 mt-1">
          {user?.name} • {user?.role}
        </p>
      </div>

      <nav className="p-4 space-y-1">
        <LinkItemInner to="/dashboard" icon={<DashboardIcon className="w-5 h-5" />} onClick={handleNav}>
          Dashboard
        </LinkItemInner>
        <LinkItemInner to="/customers" icon={<CustomersIcon className="w-5 h-5" />} onClick={handleNav}>
          Customers
        </LinkItemInner>
        <LinkItemInner to="/products" icon={<ProductIcon className="w-5 h-5" />} onClick={handleNav}>
          Products
        </LinkItemInner>
        <LinkItemInner to="/installments" icon={<InstallmentIcon className="w-5 h-5" />} onClick={handleNav}>
          Installments
        </LinkItemInner>
        {(user?.role === "admin" ||
          user?.role === "manager" ||
          (hasPermission && hasPermission("manage_installments"))) && (
          <LinkItemInner to="/requests" icon={<RequestsIcon className="w-5 h-5" />} onClick={handleNav}>
            Requests
          </LinkItemInner>
        )}
        <LinkItemInner to="/payments" icon={<PaymentIcon className="w-5 h-5" />} onClick={handleNav}>
          Payments
        </LinkItemInner>
        <LinkItemInner to="/expenses" icon={<ExpenseIcon className="w-5 h-5" />} onClick={handleNav}>
          Expenses
        </LinkItemInner>
        <LinkItemInner to="/reports" icon={<ReportsIcon className="w-5 h-5" />} onClick={handleNav}>
          Reports
        </LinkItemInner>
        {(user?.role === "admin" ||
          (hasPermission && hasPermission("manage_users"))) && (
          <LinkItemInner to="/users" icon={<UsersIcon className="w-5 h-5" />} onClick={handleNav}>
            Users
          </LinkItemInner>
        )}
        {(user?.role === "admin" ||
          (hasPermission && hasPermission("manage_roles"))) && (
          <LinkItemInner to="/roles" icon={<RolesIcon className="w-5 h-5" />} onClick={handleNav}>
            Roles
          </LinkItemInner>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
