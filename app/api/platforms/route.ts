import { NextRequest } from "next/server";
import {
  createPlatform,
  getPlatforms,
} from "../../actions/platforms";
import { apiError, apiSuccess } from "../../../lib/external-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const platforms = await getPlatforms();

  return apiSuccess({
    data: platforms,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        icon?: string;
      }
    | null;

  if (!body) {
    return apiError(400, "BAD_REQUEST", "Invalid JSON body");
  }

  const result = await createPlatform(body.name ?? "", body.icon ?? "");

  if (!result.success) {
    return apiError(400, "BAD_REQUEST", result.message);
  }

  return apiSuccess(
    {
      message: result.message,
    },
    201,
  );
}
