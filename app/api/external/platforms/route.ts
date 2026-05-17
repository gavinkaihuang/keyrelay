import { NextRequest } from "next/server";
import {
  apiSuccess,
  requireExternalApiAuth,
} from "../../../../lib/external-api";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireExternalApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const platforms = await prisma.platform.findMany({
    where: {
      keys: {
        some: {
          OR: [
            {
              status: {
                equals: "active",
                mode: "insensitive",
              },
            },
            {
              status: {
                equals: "cooling",
                mode: "insensitive",
              },
              cooling_until: {
                lt: new Date(),
              },
            },
          ],
        },
      },
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  return apiSuccess({
    data: platforms,
  });
}
