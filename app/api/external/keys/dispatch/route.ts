import { NextRequest } from "next/server";
import { decrypt } from "../../../../../lib/encrypt";
import { isPlatform } from "../../../../../lib/key-management";
import {
  apiError,
  apiSuccess,
  requireExternalApiAuth,
} from "../../../../../lib/external-api";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

type DispatchRow = {
  id: string;
  platform: string;
  name: string;
  secret_key: string;
};

export async function POST(request: NextRequest) {
  const unauthorized = requireExternalApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        platform?: string;
        projectName?: string;
      }
    | null;

  if (!body) {
    return apiError(400, "BAD_REQUEST", "Invalid JSON body");
  }

  const platform = (body.platform ?? "").trim();
  const projectName = (body.projectName ?? "external-api").trim() || "external-api";

  if (!isPlatform(platform)) {
    return apiError(400, "BAD_REQUEST", "Invalid platform");
  }

  try {
    const dispatched = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<DispatchRow[]>`
        SELECT id, platform, name, secret_key
        FROM keys
        WHERE platform = ${platform}
          AND (
            LOWER(status) = 'active'
            OR (LOWER(status) = 'cooling' AND cooling_until IS NOT NULL AND cooling_until < NOW())
          )
        ORDER BY last_used_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;

      const selected = rows[0];

      if (!selected) {
        return null;
      }

      const now = new Date();

      await tx.$executeRaw`
        UPDATE keys
        SET status = CASE
              WHEN LOWER(status) = 'cooling' AND cooling_until IS NOT NULL AND cooling_until < NOW() THEN 'active'
              ELSE status
            END,
            cooling_until = CASE
              WHEN LOWER(status) = 'cooling' AND cooling_until IS NOT NULL AND cooling_until < NOW() THEN NULL
              ELSE cooling_until
            END,
            fail_count = CASE
              WHEN LOWER(status) = 'cooling' AND cooling_until IS NOT NULL AND cooling_until < NOW() THEN 0
              ELSE fail_count
            END,
            last_used_at = ${now}
        WHERE id = ${selected.id}::uuid
      `;

      await tx.usageLog.create({
        data: {
          key_id: selected.id,
          project_name: projectName,
          request_status: "success",
          error_message: null,
        },
      });

      return {
        id: selected.id,
        platform: selected.platform,
        name: selected.name,
        apiKey: decrypt(selected.secret_key),
        lastUsedAt: now.toISOString(),
      };
    });

    if (!dispatched) {
      return apiError(404, "NO_KEYS_AVAILABLE", "No keys available");
    }

    return apiSuccess({
      message: "Dispatched key",
      data: dispatched,
    });
  } catch (error) {
    console.error("[KeyRelay] External dispatch failed:", error);
    return apiError(500, "INTERNAL_ERROR", "Failed to dispatch key");
  }
}