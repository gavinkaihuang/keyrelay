"use server";

import { prisma } from "../../lib/prisma";
import {
  normalizeRange,
  type KeyUsageItem,
  type ProjectUsageItem,
  type StatsRange,
  type TrendPoint,
  type UsageStats,
} from "../../lib/stats";

type TrendRow = {
  bucket: Date;
  success_count: number | bigint;
  fail_count: number | bigint;
  total_count: number | bigint;
};

type ProjectRow = {
  project_name: string;
  usage_count: number | bigint;
  success_count: number | bigint;
  fail_count: number | bigint;
};

type KeyUsageRow = {
  key_id: string;
  key_name: string | null;
  usage_count: number | bigint;
};

type TodaySummaryRow = {
  total_count: number | bigint | null;
  success_count: number | bigint | null;
};

function toNumber(value: number | bigint | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function startOfDay(input: Date) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDayLabel(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatHourLabel(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:00`;
}

function getRangeWindow(range: StatsRange, now: Date) {
  if (range === "today") {
    return {
      start: startOfDay(now),
      end: now,
    };
  }

  const start = startOfDay(now);
  start.setDate(start.getDate() - 6);

  return {
    start,
    end: now,
  };
}

function buildTrend(
  range: StatsRange,
  rows: TrendRow[],
  start: Date,
): TrendPoint[] {
  const rowMap = new Map(
    rows.map((row) => [row.bucket.toISOString(), row]),
  );

  if (range === "today") {
    const result: TrendPoint[] = [];

    for (let i = 0; i < 24; i += 1) {
      const slot = new Date(start);
      slot.setHours(i, 0, 0, 0);
      const row = rowMap.get(slot.toISOString());
      const success = toNumber(row?.success_count);
      const fail = toNumber(row?.fail_count);

      result.push({
        label: formatHourLabel(slot),
        success,
        fail,
        total: toNumber(row?.total_count) || success + fail,
      });
    }

    return result;
  }

  const result: TrendPoint[] = [];

  for (let i = 0; i < 7; i += 1) {
    const slot = new Date(start);
    slot.setDate(start.getDate() + i);
    const row = rowMap.get(slot.toISOString());
    const success = toNumber(row?.success_count);
    const fail = toNumber(row?.fail_count);

    result.push({
      label: formatDayLabel(slot),
      success,
      fail,
      total: toNumber(row?.total_count) || success + fail,
    });
  }

  return result;
}

export async function getUsageStats(rawRange: string): Promise<UsageStats> {
  const now = new Date();
  const range = normalizeRange(rawRange);
  const { start, end } = getRangeWindow(range, now);
  const todayStart = startOfDay(now);

  const [trendRows, projectRows, keyRows, summaryRows, coolingKeyCount] =
    await Promise.all([
      range === "today"
        ? prisma.$queryRaw<TrendRow[]>`
            SELECT
              date_trunc('hour', created_at) AS bucket,
              SUM(CASE WHEN request_status = 'success' THEN 1 ELSE 0 END)::int AS success_count,
              SUM(CASE WHEN request_status = 'fail' THEN 1 ELSE 0 END)::int AS fail_count,
              COUNT(*)::int AS total_count
            FROM usage_logs
            WHERE created_at >= ${start}
              AND created_at <= ${end}
            GROUP BY bucket
            ORDER BY bucket ASC
          `
        : prisma.$queryRaw<TrendRow[]>`
            SELECT
              date_trunc('day', created_at) AS bucket,
              SUM(CASE WHEN request_status = 'success' THEN 1 ELSE 0 END)::int AS success_count,
              SUM(CASE WHEN request_status = 'fail' THEN 1 ELSE 0 END)::int AS fail_count,
              COUNT(*)::int AS total_count
            FROM usage_logs
            WHERE created_at >= ${start}
              AND created_at <= ${end}
            GROUP BY bucket
            ORDER BY bucket ASC
          `,
      prisma.$queryRaw<ProjectRow[]>`
        SELECT
          project_name,
          COUNT(*)::int AS usage_count,
          SUM(CASE WHEN request_status = 'success' THEN 1 ELSE 0 END)::int AS success_count,
          SUM(CASE WHEN request_status = 'fail' THEN 1 ELSE 0 END)::int AS fail_count
        FROM usage_logs
        WHERE created_at >= ${start}
          AND created_at <= ${end}
        GROUP BY project_name
        ORDER BY usage_count DESC
        LIMIT 10
      `,
      prisma.$queryRaw<KeyUsageRow[]>`
        SELECT
          ul.key_id,
          k.name AS key_name,
          COUNT(*)::int AS usage_count
        FROM usage_logs ul
        LEFT JOIN keys k ON k.id = ul.key_id
        WHERE ul.created_at >= ${start}
          AND ul.created_at <= ${end}
        GROUP BY ul.key_id, k.name
        ORDER BY usage_count DESC
        LIMIT 5
      `,
      prisma.$queryRaw<TodaySummaryRow[]>`
        SELECT
          COUNT(*)::int AS total_count,
          SUM(CASE WHEN request_status = 'success' THEN 1 ELSE 0 END)::int AS success_count
        FROM usage_logs
        WHERE created_at >= ${todayStart}
          AND created_at <= ${now}
      `,
      prisma.key.count({
        where: {
          status: "cooling",
        },
      }),
    ]);

  const trend = buildTrend(range, trendRows, start);
  const rangeTotal = projectRows.reduce(
    (sum, row) => sum + toNumber(row.usage_count),
    0,
  );

  const projectUsage: ProjectUsageItem[] = projectRows.map((row) => ({
    projectName: row.project_name,
    usageCount: toNumber(row.usage_count),
    successCount: toNumber(row.success_count),
    failCount: toNumber(row.fail_count),
    usageRate: rangeTotal > 0 ? (toNumber(row.usage_count) / rangeTotal) * 100 : 0,
  }));

  const keyUsageTop5: KeyUsageItem[] = keyRows.map((row) => ({
    keyId: row.key_id,
    keyName: row.key_name ?? "Unknown Key",
    usageCount: toNumber(row.usage_count),
  }));

  const todayTotalRequests = toNumber(summaryRows[0]?.total_count);
  const todaySuccessCount = toNumber(summaryRows[0]?.success_count);
  const todaySuccessRate =
    todayTotalRequests > 0 ? (todaySuccessCount / todayTotalRequests) * 100 : 0;

  return {
    range,
    summary: {
      todayTotalRequests,
      todaySuccessRate,
      coolingKeyCount,
    },
    trend,
    projectUsage,
    keyUsageTop5,
  };
}