import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const logs = await prisma.usageLog.findMany({
    orderBy: {
      created_at: "desc",
    },
    take: 100,
    include: {
      key: {
        select: {
          name: true,
          platform: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen px-4 py-10 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="panel rounded-[30px] p-6 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-stone-900 sm:text-4xl">
            Usage Log
          </h1>
          <p className="mt-2 text-sm text-stone-600 sm:text-base">
            最近 100 条请求日志，包含项目来源、请求状态和对应 Key。
          </p>
        </section>

        <section className="panel rounded-[30px] p-3 sm:p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/8 text-xs uppercase tracking-[0.14em] text-stone-500">
                  <th className="px-3 py-3 font-medium">时间</th>
                  <th className="px-3 py-3 font-medium">项目</th>
                  <th className="px-3 py-3 font-medium">状态</th>
                  <th className="px-3 py-3 font-medium">Key</th>
                  <th className="px-3 py-3 font-medium">平台</th>
                  <th className="px-3 py-3 font-medium">报错信息</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-black/6 text-stone-700">
                    <td className="px-3 py-3 whitespace-nowrap">
                      {new Intl.DateTimeFormat("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      }).format(log.created_at)}
                    </td>
                    <td className="px-3 py-3">{log.project_name}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          log.request_status === "success"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {log.request_status}
                      </span>
                    </td>
                    <td className="px-3 py-3">{log.key?.name ?? "Unknown"}</td>
                    <td className="px-3 py-3">{log.key?.platform ?? "-"}</td>
                    <td className="px-3 py-3 text-stone-500">{log.error_message ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}