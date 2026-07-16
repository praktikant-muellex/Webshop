-- Employees now log in with firstName + lastName + employeeNumber instead
-- of email + password. Admin/supervisor accounts are unaffected (still
-- email + passwordHash), so email stays but becomes optional.

ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "users"
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "nickname" TEXT,
  ADD COLUMN "employeeNumber" TEXT;

CREATE UNIQUE INDEX "users_employeeNumber_key" ON "users" ("employeeNumber");
