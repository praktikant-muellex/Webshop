export type Role = "employee" | "supervisor" | "admin";
export type EmploymentStatus = "active" | "resigned";
export type OrderStatus = "pending" | "approved" | "rejected" | "ready_for_pickup" | "issued";
export type ProductCategory = "SHIRTS" | "HOSEN" | "PULLOVER" | "JACKEN_WESTEN" | "ZUBEHOER";
export type LedgerEntryType =
  | "base_grant"
  | "annual_grant"
  | "annual_grant_prorated"
  | "order_deduction"
  | "order_refund"
  | "manual_adjustment";

export interface EmployeeGroup {
  id: string;
  code: string;
  name: string;
  baseBudgetEur: number;
  annualBudgetEur: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  employeeGroup: EmployeeGroup | null;
  hireDate: string | null;
  employmentStatus: EmploymentStatus;
}

export interface ProductSize {
  id: string;
  sizeLabel: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  category: ProductCategory;
  name: string;
  modelDesignation: string | null;
  material: string | null;
  color: string | null;
  priceEur: number;
  mandatoryForGroup: EmployeeGroup | null;
  sizeRangeRaw: string | null;
  sizes: ProductSize[];
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  sizeLabel: string | null;
  unitPriceEur: number;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  user?: { id: string; email: string };
  status: OrderStatus;
  submittedAt: string;
  decidedAt: string | null;
  rejectionReason: string | null;
  reclaimFlag: boolean;
  items: OrderItem[];
}

export interface BudgetLedgerEntry {
  id: string;
  entryType: LedgerEntryType;
  amountEur: number;
  effectiveDate: string;
  note: string;
  relatedOrderId: string | null;
}

export interface BudgetSummary {
  balanceEur: number;
  ledger: BudgetLedgerEntry[];
}

export interface EmployeeListItem {
  id: string;
  email: string;
  employeeGroup: EmployeeGroup | null;
  hireDate: string | null;
  employmentStatus: EmploymentStatus;
  resignationDate: string | null;
  balanceEur: number;
}
