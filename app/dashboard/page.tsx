import { DashboardView } from "../../components/dashboard-view";
import { getUsageStats } from "../actions/stats";
import { normalizeRange } from "../../lib/stats";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = normalizeRange(params.range);
  const usageStats = await getUsageStats(range);

  return <DashboardView data={usageStats} range={range} />;
}