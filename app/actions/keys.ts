"use server";

import { revalidatePath } from "next/cache";
import { ensureKeySchemaHealthCheck, prisma } from "../../lib/prisma";
import { encrypt } from "../../lib/encrypt";
import {
  isPlatform,
  isUuid,
  maskSecretKey,
  normalizeKeyStatus,
  type ActionResult,
  type DispatchedKey,
  type KeyListItem,
} from "../../lib/key-management";

type PlatformRef = {
  id: string;
  name: string;
};

async function resolvePlatformById(platformId: string): Promise<PlatformRef | null> {
  if (!isUuid(platformId)) {
    return null;
  }

  return prisma.platform.findUnique({
    where: {
      id: platformId,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function addKey(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const platformId = String(formData.get("platformId") ?? "").trim();
  const secretKey = String(formData.get("secretKey") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!secretKey) {
    return {
      success: false,
      message: "Secret key is required.",
    };
  }

  const platform = await resolvePlatformById(platformId);

  if (!platform) {
    return {
      success: false,
      message: "Invalid platform.",
    };
  }

  await prisma.key.create({
    data: {
      platform_id: platform.id,
      name: name || `${platform.name} Key`,
      secret_key: encrypt(secretKey),
      key_preview: maskSecretKey(secretKey),
      status: "active",
    },
  });

  revalidatePath("/");

  return {
    success: true,
    message: "Key added.",
  };
}

export async function updateKey(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "").trim();
  const platformId = String(formData.get("platformId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const secretKey = String(formData.get("secretKey") ?? "").trim();

  if (!isUuid(id)) {
    return {
      success: false,
      message: "Key id is required.",
    };
  }

  const platform = await resolvePlatformById(platformId);

  if (!platform) {
    return {
      success: false,
      message: "Invalid platform.",
    };
  }

  if (!name) {
    return {
      success: false,
      message: "Alias is required.",
    };
  }

  const result = await prisma.key.updateMany({
    where: {
      id,
    },
    data: {
      platform_id: platform.id,
      name,
      ...(secretKey
        ? {
            secret_key: encrypt(secretKey),
            key_preview: maskSecretKey(secretKey),
          }
        : {}),
    },
  });

  if (result.count === 0) {
    return {
      success: false,
      message: "Key not found.",
    };
  }

  revalidatePath("/");

  return {
    success: true,
    message: "Key updated.",
  };
}

export async function getKeys(): Promise<KeyListItem[]> {
  await ensureKeySchemaHealthCheck();

  try {
    const keys = await prisma.key.findMany({
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        platform_id: true,
        platform_ref: {
          select: {
            id: true,
            name: true,
          },
        },
        name: true,
        key_preview: true,
        status: true,
        last_used_at: true,
        created_at: true,
      },
    });

    return keys.map((item) => ({
      id: item.id,
      platformId: item.platform_id,
      platform: item.platform_ref.name,
      name: item.name,
      keyPreview: item.key_preview ?? "",
      status: normalizeKeyStatus(item.status),
      lastUsedAt: item.last_used_at.toISOString(),
      createdAt: item.created_at.toISOString(),
    }));
  } catch (error) {
    throw error;
  }
}

export async function deleteKey(id: string) {
  if (!id) {
    return;
  }

  await prisma.key.deleteMany({
    where: {
      id,
    },
  });

  revalidatePath("/");
}

export async function resetKeyStatus(id: string) {
  if (!id) {
    return;
  }

  await prisma.key.updateMany({
    where: {
      id,
      status: {
        in: ["cooling", "disabled", "depleted", "COOLING", "DISABLED", "DEPLETED"],
      },
    },
    data: {
      status: "active",
      cooling_until: null,
      fail_count: 0,
    },
  });

  revalidatePath("/");
}

type DispatchRow = {
  id: string;
  platform: string;
  name: string;
  secret_key: string;
};

export async function dispatchKey(platform: string): Promise<DispatchedKey> {
  if (!isPlatform(platform)) {
    throw new Error("Invalid platform");
  }

  return prisma.$transaction(async (tx) => {
    // Lock one candidate row to avoid dispatching the same key under concurrency.
    const rows = await tx.$queryRaw<DispatchRow[]>`
      SELECT k.id, p.name AS platform, k.name, k.secret_key
      FROM keys k
      JOIN platforms p ON p.id = k.platform_id
      WHERE p.name = ${platform}
        AND (
          LOWER(k.status) = 'active'
          OR (LOWER(k.status) = 'cooling' AND k.cooling_until IS NOT NULL AND k.cooling_until < NOW())
        )
      ORDER BY k.last_used_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;

    const selected = rows[0];

    if (!selected) {
      throw new Error("No keys available");
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
        project_name: "server-action-dispatch",
        request_status: "success",
        error_message: null,
      },
    });

    return {
      id: selected.id,
      platform: selected.platform as DispatchedKey["platform"],
      name: selected.name,
      secretKey: selected.secret_key,
      lastUsedAt: now.toISOString(),
    };
  });
}