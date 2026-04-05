import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL.");
}

const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

let schemaHealthCheckPromise: Promise<void> | null = null;

export async function ensureKeySchemaHealthCheck() {
  if (schemaHealthCheckPromise) {
    return schemaHealthCheckPromise;
  }

  schemaHealthCheckPromise = (async () => {
    try {
      const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'keys'
          AND column_name IN ('key_preview', 'created_at')
      `;

      const existingColumns = new Set(rows.map((row) => row.column_name));
      const missingColumns = ["key_preview", "created_at"].filter(
        (column) => !existingColumns.has(column),
      );

      if (missingColumns.length > 0) {
        console.warn(
          `[KeyRelay] Schema check: missing columns in keys table: ${missingColumns.join(", ")}. Please run Prisma migrations.`,
        );
      }
    } catch (error) {
      console.warn(
        "[KeyRelay] Schema check skipped due to database access issue:",
        error,
      );
    }
  })();

  return schemaHealthCheckPromise;
}