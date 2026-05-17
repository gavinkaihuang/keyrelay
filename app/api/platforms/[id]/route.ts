import { NextRequest } from "next/server";
import {
  deletePlatform,
  updatePlatform,
} from "../../../actions/platforms";
import { apiError, apiSuccess } from "../../../../lib/external-api";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        icon?: string;
      }
    | null;

  if (!body) {
    return apiError(400, "BAD_REQUEST", "Invalid JSON body");
  }

  const { id } = await context.params;
  const result = await updatePlatform(id, body.name ?? "", body.icon ?? "");

  if (!result.success) {
    return apiError(400, "BAD_REQUEST", result.message);
  }

  return apiSuccess({
    message: result.message,
  });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await deletePlatform(id);

  if (!result.success) {
    const status =
      result.message === "Platform not found."
        ? 404
        : result.message === "Cannot delete platform with existing keys."
          ? 409
          : 400;

    return apiError(status, "BAD_REQUEST", result.message);
  }

  return apiSuccess({
    message: result.message,
  });
}
