export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "employee"
  phone?: string
  salary?: number
}

export interface Product {
  _id: string
  name: string
  price: number
  description?: string
}

export interface Customer {
  _id: string
  name: string
  phone: string
  cnic: string
  address: string
}

export interface InstallmentPlan {
  _id: string
  customerId: Customer
  productId: Product
  totalAmount: number
  downPayment: number
  remainingBalance: number
  monthlyInstallment: number
  interestRate: number
  numberOfMonths: number
  status: "pending" | "approved" | "rejected" | "completed"
  installmentSchedule: Array<{
    month: number
    dueDate: string
    amount: number
    status: "pending" | "paid" | "overdue"
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
