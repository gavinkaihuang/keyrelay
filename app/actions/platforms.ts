"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import { isPlatform, isUuid, type PlatformOption } from "../../lib/key-management";

export type PlatformActionResult = {
  success: boolean;
  message: string;
};

function normalizePlatformName(name: string) {
  return name.trim();
}

export async function createPlatform(name: string, icon?: string): Promise<PlatformActionResult> {
  const normalizedName = normalizePlatformName(name);
  const normalizedIcon = icon?.trim() || null;

  if (!isPlatform(normalizedName)) {
    return {
      success: false,
      message: "Invalid platform name.",
    };
  }

  const existing = await prisma.platform.findUnique({
    where: {
      name: normalizedName,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return {
      success: false,
      message: "Platform already exists.",
    };
  }

  await prisma.platform.create({
    data: {
      name: normalizedName,
      icon: normalizedIcon,
    },
  });

  revalidatePath("/");

  return {
    success: true,
    message: "Platform created.",
  };
}

export async function addPlatform(
  _previousState: PlatformActionResult,
  formData: FormData,
): Promise<PlatformActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();

  return createPlatform(name, icon);
}

export async function getPlatforms(): Promise<PlatformOption[]> {
  const platforms = await prisma.platform.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      icon: true,
    },
  });

  return platforms;
}

export async function updatePlatform(
  id: string,
  name: string,
  icon?: string,
): Promise<PlatformActionResult> {
  const normalizedId = id.trim();
  const normalizedName = normalizePlatformName(name);
  const normalizedIcon = icon?.trim() || null;

  if (!isUuid(normalizedId)) {
    return {
      success: false,
      message: "Invalid platform id.",
    };
  }

  if (!isPlatform(normalizedName)) {
    return {
      success: false,
      message: "Invalid platform name.",
    };
  }

  const conflict = await prisma.platform.findFirst({
    where: {
      name: normalizedName,
      id: {
        not: normalizedId,
      },
    },
    select: {
      id: true,
    },
  });

  if (conflict) {
    return {
      success: false,
      message: "Platform already exists.",
    };
  }

  const updated = await prisma.platform.updateMany({
    where: {
      id: normalizedId,
    },
    data: {
      name: normalizedName,
      icon: normalizedIcon,
    },
  });

  if (updated.count === 0) {
    return {
      success: false,
      message: "Platform not found.",
    };
  }

  revalidatePath("/");

  return {
    success: true,
    message: "Platform updated.",
  };
}

export async function deletePlatform(id: string): Promise<PlatformActionResult> {
  const normalizedId = id.trim();

  if (!isUuid(normalizedId)) {
    return {
      success: false,
      message: "Invalid platform id.",
    };
  }

  const keyCount = await prisma.key.count({
    where: {
      platform_id: normalizedId,
    },
  });

  if (keyCount > 0) {
    return {
      success: false,
      message: "Cannot delete platform with existing keys.",
    };
  }

  const deleted = await prisma.platform.deleteMany({
    where: {
      id: normalizedId,
    },
  });

  if (deleted.count === 0) {
    return {
      success: false,
      message: "Platform not found.",
    };
  }

  revalidatePath("/");

  return {
    success: true,
    message: "Platform deleted.",
  };
}
