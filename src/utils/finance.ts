export type RoundingPolicy = "nearest" | "up" | "down";
export type InterestModel = "amortized" | "flat" | "equal";

export interface ScheduleItem {
    month: number;
    dueDate: string;
    amount: number;
    principal: number;
    interest: number;
    balance: number;
    status?: string;
}

function applyRounding(value: number, policy: RoundingPolicy) {
    switch (policy) {
        case "up":
            return Math.ceil(value * 100) / 100;
        case "down":
            return Math.floor(value * 100) / 100;
        default:
            return Math.round(value * 100) / 100;
    }
}
export function amortizedMonthlyPayment(
    principal: number,
    annualRate: number,
    months: number
): number {
    if (!principal || months <= 0) return 0;
    const r = (annualRate || 0) / 100 / 12;
    if (r === 0) return principal / months;
    const pow = Math.pow(1 + r, months);
    return (principal * r * pow) / (pow - 1);
}

export function totalWithInterest(
    principal: number,
    monthlyPayment: number,
    months: number
): number {
    return monthlyPayment * months + 0;
}

export function generateSchedule(
    principal: number,
    annualRate: number,
    months: number,
    startDate?: string | Date,
    rounding: RoundingPolicy = "nearest",
    model: InterestModel = "equal",
): ScheduleItem[] {
    const schedule: ScheduleItem[] = [];
    if (months <= 0 || principal <= 0) return schedule;
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    if (model === "flat") {
        const totalWithInterest = principal * (1 + ((annualRate || 0) / 100) * (months / 12));
        const monthly = totalWithInterest / months;
        for (let i = 0; i < months; i++) {
            const due = new Date(start.getFullYear(), start.getMonth() + i + 1, start.getDate());
            schedule.push({
                month: i + 1,
                dueDate: due.toISOString(),
                amount: applyRounding(monthly, rounding),
                principal: applyRounding(principal / months, rounding),
                interest: applyRounding((totalWithInterest - principal) / months, rounding),
                balance: Math.max(0, Number((principal - (principal / months) * (i + 1)).toFixed(2))),
                status: "pending",
            });
        }
        return schedule;
    }

    if (model === "equal") {
        const monthly = principal / months;
        for (let i = 0; i < months; i++) {
            const due = new Date(start.getFullYear(), start.getMonth() + i + 1, start.getDate());
            const principalR = applyRounding(monthly, rounding);
            const amount = principalR;
            const balance = Math.max(0, Number((principal - (monthly * (i + 1))).toFixed(2)));
            schedule.push({
                month: i + 1,
                dueDate: due.toISOString(),
                amount,
                principal: principalR,
                interest: 0,
                balance,
                status: 'pending',
            });
        }
        return schedule;
    }

    const monthly = amortizedMonthlyPayment(principal, annualRate, months);
    const r = (annualRate || 0) / 100 / 12;
    let balance = principal;

    for (let m = 1; m <= months; m++) {
        const interest = r === 0 ? 0 : balance * r;
        let principalPortion = monthly - interest;
        if (m === months) principalPortion = balance;
        const interestR = applyRounding(interest, rounding);
        const principalR = applyRounding(principalPortion, rounding);
        let amount = applyRounding(interestR + principalR, rounding);
        if (m === months) {
            amount = applyRounding(balance + interest, rounding);
        }
        schedule.push({
            month: m,
            dueDate: new Date(start.getFullYear(), start.getMonth() + m, start.getDate()).toISOString(),
            amount,
            principal: principalR,
            interest: interestR,
            balance: Math.max(0, Number((balance - principalPortion).toFixed(2))),
            status: "pending",
        });
        balance = Math.max(0, balance - principalPortion);
    }
    return schedule;
}

export function allocatePaymentToSchedule(
    schedule: ScheduleItem[],
    model: InterestModel,
    amount: number,
    rounding: RoundingPolicy = "nearest",
) {
    const allocation = {
        total: amount,
        appliedToMonths: [] as Array<{ month: number; applied: number; remainingForMonth: number }>,
        breakdown: { principal: 0, interest: 0, fees: 0 },
    }

    let remaining = amount
    for (let i = 0; i < schedule.length && remaining > 0; i++) {
        const entry = schedule[i]
        const due = Number(entry.amount || 0)
        const paid = Number((entry as any).paidAmount || 0)
        const outstanding = Math.max(0, due - paid)
        if (outstanding <= 0) continue

        const applied = Math.min(outstanding, remaining)
        remaining = remaining - applied

        if (model === "equal") {
            allocation.breakdown.principal += applied
        } else {
            const interestPart = Number(entry.interest || 0)
            const principalPart = Math.max(0, due - interestPart)
            const ratio = outstanding > 0 ? applied / outstanding : 0
            const appliedInterest = applyRounding(interestPart * ratio, rounding)
            const appliedPrincipal = applyRounding(applied - appliedInterest, rounding)
            allocation.breakdown.interest += appliedInterest
            allocation.breakdown.principal += appliedPrincipal
        }

        allocation.appliedToMonths.push({ month: entry.month, applied, remainingForMonth: Math.max(0, outstanding - applied) })
    }

    if (remaining > 0) {
        allocation.breakdown.principal += remaining
        allocation.appliedToMonths.push({ month: -1, applied: remaining, remainingForMonth: 0 })
        remaining = 0
    }

    return allocation
}

export default {
    amortizedMonthlyPayment,
    totalWithInterest,
    generateSchedule,
};
