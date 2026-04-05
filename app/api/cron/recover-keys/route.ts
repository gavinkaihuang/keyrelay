import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const now = new Date();

  const result = await prisma.key.updateMany({
    where: {
      status: "cooling",
      cooling_until: {
        lt: now,
      },
    },
    data: {
      status: "active",
      cooling_until: null,
      fail_count: 0,
    },
  });

  return NextResponse.json({
    success: true,
    recovered: result.count,
    message: "Recovered cooling keys",
    executedAt: now.toISOString(),
  });
}
