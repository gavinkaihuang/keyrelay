export type StatsRange = "today" | "7days";

export type TrendPoint = {
  label: string;
  success: number;
  fail: number;
  total: number;
};

export type ProjectUsageItem = {
  projectName: string;
  usageCount: number;
  successCount: number;
  failCount: number;
  usageRate: number;
};

export type KeyUsageItem = {
  keyId: string;
  keyName: string;
  usageCount: number;
};

export type UsageStats = {
  range: StatsRange;
  summary: {
    todayTotalRequests: number;
    todaySuccessRate: number;
    coolingKeyCount: number;
  };
  trend: TrendPoint[];
  projectUsage: ProjectUsageItem[];
  keyUsageTop5: KeyUsageItem[];
};

export function normalizeRange(range: string | undefined): StatsRange {
  return range === "today" ? "today" : "7days";
}