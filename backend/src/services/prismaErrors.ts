import { Prisma } from "@prisma/client";

/** True for Prisma's "foreign key constraint violated" error (P2003). */
export function isForeignKeyViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003";
}
