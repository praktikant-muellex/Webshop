import { prisma } from "../../src/db/prisma";
import { EmploymentStatus, OrderStatus } from "@prisma/client";

export async function createEmployeeGroup(overrides: Partial<{ code: string; name: string; baseBudgetEur: number; annualBudgetEur: number }> = {}) {
  return prisma.employeeGroup.create({
    data: {
      code: overrides.code ?? "fahrer",
      name: overrides.name ?? "Fahrer",
      baseBudgetEur: overrides.baseBudgetEur ?? 500,
      annualBudgetEur: overrides.annualBudgetEur ?? 200,
    },
  });
}

export async function createEmployee(
  employeeGroupId: string,
  overrides: Partial<{
    firstName: string;
    lastName: string;
    employeeNumber: string;
    hireDate: Date;
    employmentStatus: EmploymentStatus;
  }> = {}
) {
  return prisma.user.create({
    data: {
      role: "employee",
      firstName: overrides.firstName ?? "Test",
      lastName: overrides.lastName ?? "Mitarbeiter",
      employeeNumber: overrides.employeeNumber ?? `t-${Math.random().toString(36).slice(2, 8)}`,
      employeeGroupId,
      hireDate: overrides.hireDate ?? new Date(Date.UTC(2020, 0, 15)),
      employmentStatus: overrides.employmentStatus ?? "active",
    },
  });
}

export async function createProduct(overrides: Partial<{ name: string; priceEur: number; active: boolean }> = {}) {
  return prisma.product.create({
    data: {
      category: "SHIRTS",
      name: overrides.name ?? "Test-Shirt",
      priceEur: overrides.priceEur ?? 20,
      active: overrides.active ?? true,
    },
  });
}

export async function createOrder(
  userId: string,
  productId: string,
  overrides: Partial<{ quantity: number; unitPriceEur: number; status: OrderStatus; submittedAt: Date }> = {}
) {
  return prisma.order.create({
    data: {
      userId,
      status: overrides.status ?? "pending",
      submittedAt: overrides.submittedAt ?? new Date(),
      items: {
        create: [
          {
            productId,
            unitPriceEur: overrides.unitPriceEur ?? 20,
            quantity: overrides.quantity ?? 1,
          },
        ],
      },
    },
    include: { items: true },
  });
}
