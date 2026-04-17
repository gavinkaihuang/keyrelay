import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const executedAt = new Date();

  // Use raw SQL so that NOW() runs inside the database, avoiding any
  // client-side timezone mismatch with `timestamp without time zone` columns.
  const rows = await prisma.$queryRaw<Array<{ recovered: bigint }>>`
    WITH updated AS (
      UPDATE keys
      SET status       = 'active',
          cooling_until = NULL,
          fail_count    = 0
      WHERE LOWER(status) = 'cooling'
        AND cooling_until IS NOT NULL
        AND cooling_until < NOW()
      RETURNING id
    )
    SELECT COUNT(*)::bigint AS recovered FROM updated
  `;

  const recovered = Number(rows[0]?.recovered ?? 0);

  return NextResponse.json({
    success: true,
    recovered,
    message: "Recovered cooling keys",
    executedAt: executedAt.toISOString(),
  });
}
