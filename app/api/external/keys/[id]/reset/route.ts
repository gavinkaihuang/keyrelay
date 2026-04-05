import { NextRequest } from "next/server";
import {
  apiError,
  apiSuccess,
  requireExternalApiAuth,
} from "../../../../../../lib/external-api";
import { prisma } from "../../../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireExternalApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;

  if (!id) {
    return apiError(400, "BAD_REQUEST", "id is required");
  }

  const result = await prisma.key.updateMany({
    where: {
      id,
      status: {
        in: ["cooling", "disabled"],
      },
    },
    data: {
      status: "active",
      cooling_until: null,
      fail_count: 0,
    },
  });

  if (result.count === 0) {
    return apiError(
      404,
      "NOT_FOUND",
      "Key not found or not in cooling/disabled status",
    );
  }

  return apiSuccess({
    message: "Key status reset to active",
  });
}