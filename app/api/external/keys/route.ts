import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
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

function isMissingColumnError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022"
  );
}

export async function GET(request: NextRequest) {
  const unauthorized = requireExternalApiAuth(request);

  if (unauthorized) {
    return unauthorized;
  }

  const platform = request.nextUrl.searchParams.get("platform")?.trim() ?? "";

  if (platform && !isPlatform(platform)) {
    return apiError(400, "BAD_REQUEST", "Invalid platform");
  }

  try {
    const keys = await prisma.key.findMany({
      where: platform ? { platform } : undefined,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        platform: true,
        name: true,
        key_preview: true,
        status: true,
        last_used_at: true,
        cooling_until: true,
        created_at: true,
      },
    });

    return apiSuccess({
      data: keys.map((item) => ({
        id: item.id,
        platform: item.platform,
        name: item.name,
        keyPreview: item.key_preview,
        status: item.status,
        lastUsedAt: item.last_used_at.toISOString(),
        coolingUntil: item.cooling_until?.toISOString() ?? null,
        createdAt: item.created_at.toISOString(),
      })),
    });
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }

    const keys = await prisma.key.findMany({
      where: platform ? { platform } : undefined,
      orderBy: {
        last_used_at: "asc",
      },
      select: {
        id: true,
        platform: true,
        name: true,
        secret_key: true,
        status: true,
        last_used_at: true,
        cooling_until: true,
      },
    });

    return apiSuccess({
      data: keys.map((item) => ({
        id: item.id,
        platform: item.platform,
        name: item.name,
        keyPreview: maskSecretKey(item.secret_key),
        status: item.status,
        lastUsedAt: item.last_used_at.toISOString(),
        coolingUntil: item.cooling_until?.toISOString() ?? null,
        createdAt: item.last_used_at.toISOString(),
      })),
    });
  }
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

  try {
    const created = await prisma.key.create({
      data: {
        platform,
        name: name || `${platform} Key`,
        secret_key: encrypt(secretKey),
        key_preview: maskSecretKey(secretKey),
        status: "active",
      },
      select: {
        id: true,
        platform: true,
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
          platform: created.platform,
          name: created.name,
          keyPreview: created.key_preview,
          status: created.status,
        },
      },
      201,
    );
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }

    const id = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO keys (id, platform, name, secret_key, status, last_used_at, fail_count)
      VALUES (${id}::uuid, ${platform}, ${name || `${platform} Key`}, ${encrypt(secretKey)}, 'active', NOW(), 0)
    `;

    return apiSuccess(
      {
        message: "Key created",
        data: {
          id,
          platform,
          name: name || `${platform} Key`,
          keyPreview: maskSecretKey(secretKey),
          status: "active",
        },
      },
      201,
    );
  }
}