import { NextRequest } from "next/server";
import { encrypt } from "../../../../lib/encrypt";
import { isPlatform, maskSecretKey } from "../../../../lib/key-management";
import {
  apiError,
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

  const platform = request.nextUrl.searchParams.get("platform")?.trim() ?? "";

  if (platform && !isPlatform(platform)) {
    return apiError(400, "BAD_REQUEST", "Invalid platform");
  }

  const keys = await prisma.key.findMany({
    where: platform
      ? {
          platform_ref: {
            name: platform,
          },
        }
      : undefined,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      platform_ref: {
        select: {
          name: true,
        },
      },
      name: true,
      key_preview: true,
      secret_key: true,
      status: true,
      last_used_at: true,
      cooling_until: true,
      created_at: true,
    },
  });

  return apiSuccess({
    data: keys.map((item) => ({
      id: item.id,
      platform: item.platform_ref.name,
      name: item.name,
      keyPreview: item.key_preview ?? maskSecretKey(item.secret_key),
      status: item.status,
      lastUsedAt: item.last_used_at.toISOString(),
      coolingUntil: item.cooling_until?.toISOString() ?? null,
      createdAt: item.created_at.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireExternalApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        platform?: string;
        name?: string;
        secretKey?: string;
      }
    | null;

  if (!body) {
    return apiError(400, "BAD_REQUEST", "Invalid JSON body");
  }

  const platform = (body.platform ?? "").trim();
  const name = (body.name ?? "").trim();
  const secretKey = (body.secretKey ?? "").trim();

  if (!isPlatform(platform)) {
    return apiError(400, "BAD_REQUEST", "Invalid platform");
  }

  if (!secretKey) {
    return apiError(400, "BAD_REQUEST", "secretKey is required");
  }

  const platformRecord = await prisma.platform.findUnique({
    where: {
      name: platform,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!platformRecord) {
    return apiError(400, "BAD_REQUEST", "Platform not found");
  }

  const created = await prisma.key.create({
    data: {
      platform_id: platformRecord.id,
      name: name || `${platformRecord.name} Key`,
      secret_key: encrypt(secretKey),
      key_preview: maskSecretKey(secretKey),
      status: "active",
    },
    select: {
      id: true,
      platform_ref: {
        select: {
          name: true,
        },
      },
      name: true,
      key_preview: true,
      status: true,
    },
  });

  return apiSuccess(
    {
      message: "Key created",
      data: {
        id: created.id,
        platform: created.platform_ref.name,
        name: created.name,
        keyPreview: created.key_preview,
        status: created.status,
      },
    },
    201,
  );
}