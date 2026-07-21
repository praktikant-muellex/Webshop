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
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  employeeNumber: string | null;
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
  imageUrl: string | null;
  mandatoryForGroup: EmployeeGroup | null;
  sizeRangeRaw: string | null;
  sizes: ProductSize[];
  active?: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  sizeLabel: string | null;
  unitPriceEur: number;
  quantity: number;
}

export interface OrderUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  employeeNumber: string | null;
}

export interface Order {
  id: string;
  userId: string;
  user?: OrderUser;
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
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  employeeNumber: string | null;
  employeeGroup: EmployeeGroup | null;
  hireDate: string | null;
  employmentStatus: EmploymentStatus;
  resignationDate: string | null;
  hidden: boolean;
  balanceEur: number;
}

export interface InventoryRow {
  productId: string;
  productName: string;
  color: string | null;
  category: ProductCategory;
  previousCount: number | null;
  soldSincePrevious: number | null;
  expectedStock: number | null;
  lastDifference: number | null;
}

export interface InventoryOverview {
  latestSession: {
    id: string;
    takenAt: string;
    createdAt: string;
    createdBy: { firstName: string | null; lastName: string | null; email: string | null } | null;
  } | null;
  rows: InventoryRow[];
}

export interface InventorySessionListItem {
  id: string;
  takenAt: string;
  createdAt: string;
  createdBy: { firstName: string | null; lastName: string | null; email: string | null };
}
