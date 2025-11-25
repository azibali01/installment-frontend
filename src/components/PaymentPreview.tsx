import React from "react";
import type { InstallmentPlan } from "../types";
import { allocatePaymentToSchedule } from "../utils/finance";

interface Props {
  planId: string;
  amount: number;
  installments: InstallmentPlan[];
}

const PaymentPreview: React.FC<Props> = ({ planId, amount, installments }) => {
  const plan = installments.find((p) => String(p._id) === String(planId)) as
    | any
    | undefined;
  if (!plan || !amount)
    return <div className="text-sm text-slate-500">No preview available</div>;

  const schedule = (plan.installmentSchedule || []).map((s: any) => ({
    month: s.month,
    dueDate: s.dueDate,
    amount: s.amount,
    principal: s.principal || s.amount,
    interest: s.interest || 0,
    balance: s.balance || 0,
    status: s.status || "pending",
    paidAmount: s.paidAmount || 0,
  }));

  const alloc = allocatePaymentToSchedule(
    schedule,
    plan.interestModel || "equal",
    amount,
    plan.roundingPolicy || "nearest"
  );

  return (
    <div>
      <div className="text-sm text-slate-600">Allocation</div>
      <div className="mt-2 text-sm">
        <div>Principal: PKR {alloc.breakdown.principal.toLocaleString()}</div>
        <div>Interest: PKR {alloc.breakdown.interest.toLocaleString()}</div>
        <div className="mt-2">
          Applied To:
          <ul className="list-disc ml-5">
            {alloc.appliedToMonths.map((a) => (
              <li key={`${a.month}-${a.applied}`}>
                {a.month === -1 ? "Prepayment/credit" : `Month ${a.month}`}: PKR{" "}
                {Number(a.applied).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentPreview;
