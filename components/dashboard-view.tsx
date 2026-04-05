"use client";

import { Activity, Flame, Snowflake, TrendingUp } from "lucide-react";
import { type ComponentType } from "react";
import {
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { StatsRange, UsageStats } from "../lib/stats";

const pieColors = ["#0f766e", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6"];

export function DashboardView({
  data,
  range,
}: {
  data: UsageStats;
  range: StatsRange;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function switchRange(nextRange: StatsRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextRange);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <main className="min-h-screen px-4 py-10 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="panel fade-up rounded-[30px] p-6 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">KeyRelay Analytics</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-stone-900 sm:text-4xl">
                使用统计仪表盘
              </h1>
              <p className="mt-2 text-sm text-stone-600 sm:text-base">
                观察请求趋势、项目占比与 Key 使用热度，支持今天/近一周快速切换。
              </p>
            </div>

            <div className="inline-flex rounded-full border border-stone-900/10 bg-white/75 p-1">
              <button
                type="button"
                onClick={() => switchRange("today")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  range === "today"
                    ? "bg-stone-900 text-stone-50"
                    : "text-stone-700 hover:bg-stone-900/5"
                }`}
              >
                今天
              </button>
              <button
                type="button"
                onClick={() => switchRange("7days")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  range === "7days"
                    ? "bg-stone-900 text-stone-50"
                    : "text-stone-700 hover:bg-stone-900/5"
                }`}
              >
                最近一周
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            icon={Activity}
            label="今日请求总数"
            value={String(data.summary.todayTotalRequests)}
            hint="UsageLog 当日累计"
          />
          <MetricCard
            icon={TrendingUp}
            label="今日成功率"
            value={`${data.summary.todaySuccessRate.toFixed(1)}%`}
            hint="success / total"
          />
          <MetricCard
            icon={Snowflake}
            label="当前 Cooling Key"
            value={String(data.summary.coolingKeyCount)}
            hint="status = cooling"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="panel rounded-[30px] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2 text-stone-700">
              <Flame className="h-4 w-4" />
              <h2 className="text-lg font-semibold">调用趋势</h2>
            </div>
            <div className="h-[320px] w-full">
              <ResponsiveContainer>
                <LineChart data={data.trend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.12)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="success"
                    name="Success"
                    stroke="#0f766e"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="fail"
                    name="Fail"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="#1f2937"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel rounded-[30px] p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-stone-800">项目调用占比</h2>
            <div className="h-[320px] w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.projectUsage.slice(0, 5).map((item) => ({
                      name: item.projectName,
                      value: item.usageCount,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={98}
                    paddingAngle={3}
                  >
                    {data.projectUsage.slice(0, 5).map((item, index) => (
                      <Cell key={`${item.projectName}-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <RankingTable
            title="使用最频繁的 Key Top 5"
            headers={["Key 别名", "Key ID", "调用次数"]}
            rows={data.keyUsageTop5.map((item) => [
              item.keyName,
              item.keyId.slice(0, 8),
              String(item.usageCount),
            ])}
            emptyMessage="当前范围内暂无 Key 调用记录"
          />

          <RankingTable
            title="最活跃的项目排行榜"
            headers={["项目", "调用次数", "占比"]}
            rows={data.projectUsage.map((item) => [
              item.projectName,
              String(item.usageCount),
              `${item.usageRate.toFixed(1)}%`,
            ])}
            emptyMessage="当前范围内暂无项目调用记录"
          />
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="panel rounded-[24px] p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{label}</p>
        <Icon className="h-4 w-4 text-teal-700" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-stone-900">{value}</p>
      <p className="mt-2 text-xs text-stone-500">{hint}</p>
    </div>
  );
}

function RankingTable({
  title,
  headers,
  rows,
  emptyMessage,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  emptyMessage: string;
}) {
  return (
    <div className="panel rounded-[30px] p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-stone-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/8 text-stone-500">
                {headers.map((header) => (
                  <th key={header} className="px-2 py-3 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-b border-black/6 text-stone-700">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${index}-${cellIndex}`} className="px-2 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}