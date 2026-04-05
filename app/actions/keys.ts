"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ensureKeySchemaHealthCheck, prisma } from "../../lib/prisma";
import { encrypt } from "../../lib/encrypt";
import {
  isPlatform,
  maskSecretKey,
  normalizeKeyStatus,
  type ActionResult,
  type DispatchedKey,
  type KeyListItem,
} from "../../lib/key-management";

function isMissingColumnError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022"
  );
}

export async function addKey(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const platform = String(formData.get("platform") ?? "").trim();
  const secretKey = String(formData.get("secretKey") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!isPlatform(platform)) {
    return {
      success: false,
      message: "Invalid platform.",
    };
  }

  if (!secretKey) {
    return {
      success: false,
      message: "Secret key is required.",
    };
  }

  try {
    await prisma.key.create({
      data: {
        platform,
        name: name || `${platform} Key`,
        secret_key: encrypt(secretKey),
        key_preview: maskSecretKey(secretKey),
        status: "active",
      },
    });
  } catch (error) {
    // Compatibility path for databases that have not applied key_preview migration yet.
    if (!isMissingColumnError(error)) {
      throw error;
    }

    await prisma.$executeRaw`
      INSERT INTO keys (id, platform, name, secret_key, status, last_used_at, fail_count)
      VALUES (${randomUUID()}::uuid, ${platform}, ${name || `${platform} Key`}, ${encrypt(secretKey)}, 'active', NOW(), 0)
    `;
  }

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
  const platform = String(formData.get("platform") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const secretKey = String(formData.get("secretKey") ?? "").trim();

  if (!id) {
    return {
      success: false,
      message: "Key id is required.",
    };
  }

  if (!isPlatform(platform)) {
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

  try {
    const result = await prisma.key.updateMany({
      where: {
        id,
      },
      data: {
        platform,
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
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }

    if (secretKey) {
      await prisma.$executeRaw`
        UPDATE keys
        SET platform = ${platform},
            name = ${name},
            secret_key = ${encrypt(secretKey)}
        WHERE id = ${id}::uuid
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE keys
        SET platform = ${platform},
            name = ${name}
        WHERE id = ${id}::uuid
      `;
    }
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
        platform: true,
        name: true,
        key_preview: true,
        status: true,
        last_used_at: true,
        created_at: true,
      },
    });

    return keys.map((item) => ({
      id: item.id,
      platform: item.platform as KeyListItem["platform"],
      name: item.name,
      keyPreview: item.key_preview,
      status: normalizeKeyStatus(item.status),
      lastUsedAt: item.last_used_at.toISOString(),
      createdAt: item.created_at.toISOString(),
    }));
  } catch (error) {
    // Compatibility path for legacy schema without key_preview/created_at columns.
    if (!isMissingColumnError(error)) {
      throw error;
    }

    const legacyKeys = await prisma.key.findMany({
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
      },
    });

    return legacyKeys.map((item) => ({
      id: item.id,
      platform: item.platform as KeyListItem["platform"],
      name: item.name,
      keyPreview: maskSecretKey(item.secret_key),
      status: normalizeKeyStatus(item.status),
      lastUsedAt: item.last_used_at.toISOString(),
      createdAt: item.last_used_at.toISOString(),
    }));
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
        in: ["cooling", "disabled"],
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
      SELECT id, platform, name, secret_key
      FROM keys
      WHERE platform = ${platform}
        AND status = 'active'
        AND (cooling_until IS NULL OR cooling_until < NOW())
      ORDER BY last_used_at ASC
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
      SET last_used_at = ${now}
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