export const platforms = ["OpenAI", "Claude", "DeepSeek", "Gemini"] as const;
export const resettableStatuses = ["cooling", "disabled"] as const;

export type Platform = (typeof platforms)[number];
export type KeyStatus = "active" | (typeof resettableStatuses)[number] | "depleted";

export type KeyListItem = {
  id: string;
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
  return platforms.includes(value as Platform);
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