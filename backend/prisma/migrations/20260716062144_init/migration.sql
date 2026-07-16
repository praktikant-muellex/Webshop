-- CreateEnum
CREATE TYPE "Role" AS ENUM ('employee', 'supervisor', 'admin');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('local');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('active', 'resigned');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('SHIRTS', 'HOSEN', 'PULLOVER', 'JACKEN_WESTEN', 'ZUBEHOER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'approved', 'rejected', 'ready_for_pickup', 'issued');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('base_grant', 'annual_grant', 'annual_grant_prorated', 'order_deduction', 'order_refund', 'manual_adjustment');

-- CreateTable
CREATE TABLE "employee_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseBudgetEur" INTEGER NOT NULL,
    "annualBudgetEur" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'local',
    "role" "Role" NOT NULL DEFAULT 'employee',
    "employeeGroupId" TEXT,
    "hireDate" DATE,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'active',
    "resignationDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "modelDesignation" TEXT,
    "material" TEXT,
    "color" TEXT,
    "priceEur" INTEGER NOT NULL,
    "mandatoryForGroupId" TEXT,
    "sizeRangeRaw" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_sizes" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "product_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "rejectionReason" TEXT,
    "reclaimFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeLabel" TEXT,
    "unitPriceEur" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_ledger_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "amountEur" INTEGER NOT NULL,
    "relatedOrderId" TEXT,
    "effectiveDate" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loaner_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuedAt" DATE NOT NULL,
    "dueBy" DATE NOT NULL,
    "returnedAt" DATE,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loaner_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_groups_code_key" ON "employee_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_name_color_modelDesignation_key" ON "products"("name", "color", "modelDesignation");

-- CreateIndex
CREATE UNIQUE INDEX "product_sizes_productId_sizeLabel_key" ON "product_sizes"("productId", "sizeLabel");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employeeGroupId_fkey" FOREIGN KEY ("employeeGroupId") REFERENCES "employee_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_mandatoryForGroupId_fkey" FOREIGN KEY ("mandatoryForGroupId") REFERENCES "employee_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_ledger_entries" ADD CONSTRAINT "budget_ledger_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_ledger_entries" ADD CONSTRAINT "budget_ledger_entries_relatedOrderId_fkey" FOREIGN KEY ("relatedOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_ledger_entries" ADD CONSTRAINT "budget_ledger_entries_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loaner_records" ADD CONSTRAINT "loaner_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
