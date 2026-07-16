import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface EmployeeGroupSeed {
  code: string;
  name: string;
  baseBudgetEur: number;
  annualBudgetEur: number;
}

interface ProductSeed {
  category: string;
  name: string;
  modelDesignation: string | null;
  material: string | null;
  color: string | null;
  priceEur: number;
  mandatoryForGroupCode: string | null;
  sizeRangeRaw: string | null;
}

const ALPHA_SIZE_SEQUENCE = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL"];

/** Expands a catalog size range ("XS - 4XL" or "44 - 68") into discrete, ordered size labels. */
function parseSizeRange(raw: string | null): string[] {
  if (!raw) return [];
  const [startRaw, endRaw] = raw.split("-").map((s) => s.trim());

  if (/^\d+$/.test(startRaw) && /^\d+$/.test(endRaw)) {
    const start = parseInt(startRaw, 10);
    const end = parseInt(endRaw, 10);
    const sizes: string[] = [];
    for (let s = start; s <= end; s += 2) sizes.push(String(s));
    return sizes;
  }

  const startIdx = ALPHA_SIZE_SEQUENCE.indexOf(startRaw);
  const endIdx = ALPHA_SIZE_SEQUENCE.indexOf(endRaw);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Unbekanntes Größenformat im Katalog-Seed: "${raw}"`);
  }
  return ALPHA_SIZE_SEQUENCE.slice(startIdx, endIdx + 1);
}

async function main() {
  const groups: EmployeeGroupSeed[] = JSON.parse(
    readFileSync(join(__dirname, "employee-groups.json"), "utf-8")
  );
  const products: ProductSeed[] = JSON.parse(readFileSync(join(__dirname, "products.json"), "utf-8"));

  const groupIdByCode = new Map<string, string>();
  for (const g of groups) {
    const record = await prisma.employeeGroup.upsert({
      where: { code: g.code },
      update: { name: g.name, baseBudgetEur: g.baseBudgetEur, annualBudgetEur: g.annualBudgetEur },
      create: g,
    });
    groupIdByCode.set(g.code, record.id);
  }
  console.log(`${groups.length} Mitarbeitergruppen eingespielt.`);

  let productCount = 0;
  let sizeCount = 0;

  for (const p of products) {
    const mandatoryForGroupId = p.mandatoryForGroupCode
      ? groupIdByCode.get(p.mandatoryForGroupCode) ?? null
      : null;
    if (p.mandatoryForGroupCode && !mandatoryForGroupId) {
      throw new Error(`Unbekannter Gruppencode in products.json: ${p.mandatoryForGroupCode}`);
    }

    // Not a plain prisma.product.upsert(): Prisma's generated compound-unique
    // input for `naturalKey` requires non-null strings even though the
    // columns are nullable (color/modelDesignation are null for the one
    // ZUBEHOER product) — SQL NULL isn't equal to NULL, so Prisma disallows
    // it in a unique `where`. findFirst has no such restriction.
    const existing = await prisma.product.findFirst({
      where: { name: p.name, color: p.color, modelDesignation: p.modelDesignation },
    });

    const data = {
      category: p.category as never,
      name: p.name,
      modelDesignation: p.modelDesignation,
      material: p.material,
      color: p.color,
      priceEur: p.priceEur,
      mandatoryForGroupId,
      sizeRangeRaw: p.sizeRangeRaw,
      active: true,
    };

    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data })
      : await prisma.product.create({ data });
    productCount += 1;

    const sizeLabels = parseSizeRange(p.sizeRangeRaw);
    for (let i = 0; i < sizeLabels.length; i += 1) {
      await prisma.productSize.upsert({
        where: { productId_sizeLabel: { productId: product.id, sizeLabel: sizeLabels[i] } },
        update: { sortOrder: i },
        create: { productId: product.id, sizeLabel: sizeLabels[i], sortOrder: i },
      });
      sizeCount += 1;
    }
  }
  console.log(`${productCount} Produkte, ${sizeCount} Größen-Einträge eingespielt.`);

  // Bootstrap admin account: there is otherwise no way to create the first
  // admin, since /admin/employees itself requires an admin to call it.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@muellex.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "admin",
    },
  });
  console.log(`Admin-Account bereit: ${adminEmail} (Passwort aus SEED_ADMIN_PASSWORD bzw. Default).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
