"use client";

import { useState } from "react";

export const dynamic = "force-dynamic";

const baseUrl = "http://localhost:3000";

const apiDocs = [
  {
    id: "list-keys",
    title: "1) 列出 Key",
    method: "GET",
    path: "/api/external/keys",
    summary: "查询当前 Key 列表，支持按平台过滤。",
    curl: `curl -X GET "${baseUrl}/api/external/keys" \\
  -H "X-KeyRelay-Token: <YOUR_TOKEN>"`,
    notes: "支持查询参数 platform=OpenAI|Claude|DeepSeek|Gemini。",
  },
  {
    id: "create-key",
    title: "2) 新增 Key",
    method: "POST",
    path: "/api/external/keys",
    summary: "向 KeyRelay 写入新的可管理 Key。",
    curl: `curl -X POST "${baseUrl}/api/external/keys" \\
  -H "Content-Type: application/json" \\
  -H "X-KeyRelay-Token: <YOUR_TOKEN>" \\
  -d '{
    "platform": "OpenAI",
    "name": "Primary GPT",
    "secretKey": "sk-xxxx"
  }'`,
  },
  {
    id: "dispatch-key",
    title: "3) 分发可用 Key",
    method: "POST",
    path: "/api/external/keys/dispatch",
    summary: "重点接口，分发一个当前可用 Key，并自动记录成功调用。",
    curl: `curl -X POST "${baseUrl}/api/external/keys/dispatch" \\
  -H "Content-Type: application/json" \\
  -H "X-KeyRelay-Token: <YOUR_TOKEN>" \\
  -d '{
    "platform": "OpenAI",
    "projectName": "order-service"
  }'`,
    notes:
      "重点接口：并发安全分发。服务端会事务内锁定并更新 last_used_at，避免重复分发。分发成功后会自动写入 usage_logs(success)。projectName 可选，默认 external-api。",
  },
  {
    id: "delete-key",
    title: "4) 删除 Key",
    method: "DELETE",
    path: "/api/external/keys/:id",
    summary: "删除指定 Key。",
    curl: `curl -X DELETE "${baseUrl}/api/external/keys/<KEY_ID>" \\
  -H "X-KeyRelay-Token: <YOUR_TOKEN>"`,
  },
  {
    id: "reset-key",
    title: "5) 手动重置 Key 状态",
    method: "POST",
    path: "/api/external/keys/:id/reset",
    summary: "将 cooling 或 disabled 的 Key 恢复为 active。",
    curl: `curl -X POST "${baseUrl}/api/external/keys/<KEY_ID>/reset" \\
  -H "X-KeyRelay-Token: <YOUR_TOKEN>"`,
    notes: "仅对 cooling / disabled 状态生效。",
  },
  {
    id: "callback-key",
    title: "6) Gemini 错误回调（生命周期管理）",
    method: "POST",
    path: "/api/keys/callback",
    summary: "重点接口，按错误类型自动管理 Key 生命周期并记录失败日志。",
    curl: `curl -X POST "${baseUrl}/api/keys/callback" \\
  -H "Content-Type: application/json" \\
  -H "x-callback-token: <CALLBACK_SECRET>" \\
  -d '{
    "keyId": "<KEY_ID>",
    "projectName": "gemini-worker-a",
    "rawError": "RATE_LIMIT_EXCEEDED"
  }'`,
    notes:
      "重点接口：根据错误类型自动将 Key 调整为 COOLING / DISABLED / DEPLETED，并写入 usage_logs(fail)。",
  },
] as const;

export default function ExternalApiDocsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(apiDocs[0]?.id ?? null);

  return (
    <main className="min-h-screen px-4 py-10 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="panel rounded-[30px] p-6 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-stone-900">
            External API 调用说明
          </h1>
          <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
            该页面用于第三方系统接入 KeyRelay。大部分外部接口需要在请求头中携带
            <span className="mx-1 rounded bg-stone-900 px-2 py-0.5 text-xs text-stone-50">
              X-KeyRelay-Token
            </span>
            ，而回调接口使用独立的
            <span className="mx-1 rounded bg-stone-900 px-2 py-0.5 text-xs text-stone-50">
              x-callback-token
            </span>
            。
          </p>
          <div className="mt-5 grid gap-3 rounded-2xl border border-black/6 bg-white/65 p-4 text-sm text-stone-700">
            <p>Base URL: {baseUrl}</p>
            <p>Header (外部 API): X-KeyRelay-Token: &lt;YOUR_TOKEN&gt;</p>
            <p>Header (回调 API): x-callback-token: &lt;CALLBACK_SECRET&gt;</p>
            <p>可选 Header: Authorization: Bearer &lt;YOUR_TOKEN&gt;</p>
            <p>环境变量: KEYRELAY_EXTERNAL_API_TOKEN</p>
            <p>环境变量: CALLBACK_SECRET / CALLBACK_DEFAULT_PROJECT_NAME</p>
          </div>
        </section>

        <section className="panel rounded-[30px] border-2 border-teal-600/30 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-stone-900">重点接口（其他系统必接）</h2>
          <p className="mt-2 text-sm leading-7 text-stone-600 sm:text-base">
            推荐调用链路：先调用
            <span className="mx-1 rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
              /api/external/keys/dispatch
            </span>
            获取可用 Key；若下游 Gemini 返回错误，再调用
            <span className="mx-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              /api/keys/callback
            </span>
            上报失败并自动管理 Key 生命周期。
          </p>
        </section>

        <section className="panel rounded-[30px] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-stone-900">接口列表</h2>
          <p className="mt-2 text-sm leading-7 text-stone-600 sm:text-base">
            下面的列表按实际接入顺序整理，可直接展开查看每个接口的调用示例。
          </p>
          <div className="mt-5 grid gap-3">
            {apiDocs.map((api) => (
              <section
                key={api.id}
                className="rounded-2xl border border-black/8 bg-white/70 p-4 transition hover:border-teal-500/40 hover:bg-white"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800">
                    {api.method}
                  </span>
                  <span className="rounded-full bg-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700">
                    {api.path}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-stone-900">{api.title}</h3>
                <p className="mt-1 text-sm text-stone-600">{api.summary}</p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((current) => (current === api.id ? null : api.id))
                    }
                    className="rounded-full border border-teal-700/20 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-100"
                  >
                    {expandedId === api.id ? "收起调用示例" : "查看调用示例"}
                  </button>
                </div>
                {expandedId === api.id ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-black/10 bg-stone-50/80 p-4">
                    <CodeBlock code={api.curl} />
                    {api.notes ? <p className="mt-3 text-sm text-stone-600">{api.notes}</p> : null}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        </section>

        <section className="panel rounded-[30px] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-stone-900">统一错误格式</h2>
          <CodeBlock
            code={`{
  "success": false,
  "code": "ERROR_CODE",
  "message": "错误说明"
}`}
          />
          <p className="mt-3 text-sm text-stone-600">
            常见错误码：UNAUTHORIZED、FORBIDDEN、BAD_REQUEST、NOT_FOUND、NO_KEYS_AVAILABLE。
          </p>
        </section>
      </div>
    </main>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-stone-900/12 bg-white/70 px-3 py-1 text-xs font-medium text-stone-700 transition hover:bg-white"
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-2xl border border-black/8 bg-stone-900 p-4 text-xs leading-6 text-stone-100 sm:text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}