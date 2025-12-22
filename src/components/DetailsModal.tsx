import React from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../utils/format";

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

interface DetailsModalProps {
  isOpen: boolean;
  title: string;
  data: InstallmentListItem[];
  onClose: () => void;
  onLogCall: (item: InstallmentListItem) => void;
}

export const DetailsModal: React.FC<DetailsModalProps> = ({
  isOpen,
  title,
  data,
  onClose,
  onLogCall,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const formatDate = (d?: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black opacity-50"
        onClick={onClose}
      />
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        <div className="p-4 overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-slate-700 font-medium">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Plan ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 rounded-tr-lg">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((it) => (
                <tr
                  key={`${it.planId}-${it.installment?.month}`}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {String(it.planId).slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {it.customer?.name || "—"}
                    <div className="text-xs text-slate-500 font-normal">{it.customer?.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(it.installment?.dueDate)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatCurrency(it.installment?.amount || 0)}
                  </td>
                  <td className="px-4 py-3 text-green-600">
                    {formatCurrency(it.installment?.paidAmount || 0)}
                  </td>
                  <td className="px-4 py-3 font-bold text-red-600">
                    {formatCurrency(
                      it.installment?.remaining ||
                      it.installment?.amount ||
                      0
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {it.installment?.month ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs uppercase tracking-wide"
                        onClick={() => {
                          onClose();
                          navigate(`/installment/${String(it.planId)}`);
                        }}
                      >
                        View
                      </button>
                      <button
                        className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full text-xs font-medium transition-colors"
                        onClick={() => onLogCall(it)}
                      >
                        Log Call
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
