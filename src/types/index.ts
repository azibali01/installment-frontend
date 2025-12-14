export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "employee"
  phone?: string
  salary?: number
  cashBalance?: number
}

export interface Product {
  _id: string
  name: string
  price: number
  description?: string
  quantity?: number
  createdAt?: string
  updatedAt?: string
}

export interface Customer {
  _id: string
  customerId?: number
  name: string
  phone: string
  cnic: string
  address: string
  so?: string
  cast?: string
}

export interface InstallmentPlan {
  _id: string
  installmentId?: string
  startDate?: string
  endDate?: string
  customerId: Customer
  productId: Product
  bankCheque?: {
    bankName?: string
    branch?: string
    accountNumber?: string
    chequeNumber?: string
  }
  guarantors?: Array<{
    name?: string
    relation?: string
    phone?: string
    cnicMasked?: string
    address?: string
  }>
  totalAmount: number
  downPayment: number
  remainingBalance: number
  monthlyInstallment: number
  markupPercent: number
  numberOfMonths: number
  status: "pending" | "approved" | "rejected" | "completed"
  reference?: string
  installmentSchedule: Array<{
    month: number
    dueDate: string
    amount: number
    status: "pending" | "paid" | "overdue"
    paidAmount?: number
    paidDate?: string
  }>
}

export interface Payment {
  _id: string
  installmentPlanId: InstallmentPlan
  installmentMonth: number
  amount: number
  paymentDate: string
  recordedBy: User
}

export interface Expense {
  _id: string
  category: string
  amount: number
  date: string
  description: string
  userId: User
  relatedUser?: User
}

export interface CashTransfer {
  _id: string
  fromUser: User
  toUser: User
  amount: number
  notes?: string
  status: "pending" | "completed" | "rejected"
  createdBy: User
  createdAt: string
  updatedAt: string
}
