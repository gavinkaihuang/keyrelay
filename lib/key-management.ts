export const resettableStatuses = ["cooling", "disabled", "depleted"] as const;

export type Platform = string;
export type PlatformOption = {
  id: string;
  name: string;
  icon: string | null;
};
export type KeyStatus = "active" | (typeof resettableStatuses)[number];

export type KeyListItem = {
  id: string;
  platformId: string;
  platform: Platform;
  name: string;
  keyPreview: string;
  status: KeyStatus;
  lastUsedAt: string;
  createdAt: string;
};

export type ActionResult = {
  success: boolean;
  message: string;
};

export type DispatchedKey = {
  id: string;
  platform: Platform;
  name: string;
  secretKey: string;
  lastUsedAt: string;
};

export function isPlatform(value: string): value is Platform {
  const normalized = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(normalized);
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

export function maskSecretKey(secretKey: string) {
  if (secretKey.length <= 8) {
    return secretKey;
  }

  return `${secretKey.slice(0, 3)}-...${secretKey.slice(-4)}`;
}

export function normalizeKeyStatus(rawStatus: string): KeyStatus {
  const value = rawStatus.trim().toLowerCase();

  if (value === "active") {
    return "active";
  }

  if (value === "cooling") {
    return "cooling";
  }

  if (value === "disabled") {
    return "disabled";
  }

  if (value === "depleted") {
    return "depleted";
  }

  return "disabled";
}