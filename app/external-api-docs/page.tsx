"use client";

import { useState } from "react";

export const dynamic = "force-dynamic";

const baseUrl = "http://localhost:3000";

export default function ExternalApiDocsPage() {
  return (
    <main className="min-h-screen px-4 py-10 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="panel rounded-[30px] p-6 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-stone-900">
            External API 调用说明
          </h1>
          <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
            该页面用于第三方系统接入 KeyRelay。所有接口统一返回 JSON，且需要在请求头中携带
            <span className="mx-1 rounded bg-stone-900 px-2 py-0.5 text-xs text-stone-50">
              X-KeyRelay-Token
            </span>
            。
          </p>
          <div className="mt-5 grid gap-3 rounded-2xl border border-black/6 bg-white/65 p-4 text-sm text-stone-700">
            <p>Base URL: {baseUrl}</p>
            <p>Header: X-KeyRelay-Token: &lt;YOUR_TOKEN&gt;</p>
            <p>可选 Header: Authorization: Bearer &lt;YOUR_TOKEN&gt;</p>
            <p>环境变量: KEYRELAY_EXTERNAL_API_TOKEN</p>
          </div>
        </section>

        <ApiCard
          title="1) 列出 Key"
          method="GET"
          path="/api/external/keys"
          curl={`curl -X GET "${baseUrl}/api/external/keys" \\
  -H "X-KeyRelay-Token: <YOUR_TOKEN>"`}
          notes="支持查询参数 platform=OpenAI|Claude|DeepSeek|Gemini。"
        />

        <ApiCard
          title="2) 新增 Key"
          method="POST"
          path="/api/external/keys"
          curl={`curl -X POST "${baseUrl}/api/external/keys" \\
  -H "Content-Type: application/json" \\
  -H "X-KeyRelay-Token: <YOUR_TOKEN>" \\
  -d '{
    "platform": "OpenAI",
    "name": "Primary GPT",
    "secretKey": "sk-xxxx"
  }'`}
        />

        <ApiCard
          title="3) 分发可用 Key"
          method="POST"
          path="/api/external/keys/dispatch"
          curl={`curl -X POST "${baseUrl}/api/external/keys/dispatch" \\
  -H "Content-Type: application/json" \\
  -H "X-KeyRelay-Token: <YOUR_TOKEN>" \\
  -d '{
    "platform": "OpenAI",
    "projectName": "order-service"
  }'`}
          notes="并发安全：服务端会在事务内锁定并更新 last_used_at，避免重复分发。分发成功后会自动写入 usage_logs(success)。projectName 可选，默认 external-api。"
        />

        <ApiCard
          title="4) 删除 Key"
          method="DELETE"
          path="/api/external/keys/:id"
          curl={`curl -X DELETE "${baseUrl}/api/external/keys/<KEY_ID>" \\
  -H "X-KeyRelay-Token: <YOUR_TOKEN>"`}
        />

        <ApiCard
          title="5) 手动重置 Key 状态"
          method="POST"
          path="/api/external/keys/:id/reset"
          curl={`curl -X POST "${baseUrl}/api/external/keys/<KEY_ID>/reset" \\
  -H "X-KeyRelay-Token: <YOUR_TOKEN>"`}
          notes="仅对 cooling / disabled 状态生效。"
        />

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

function ApiCard({
  title,
  method,
  path,
  curl,
  notes,
}: {
  title: string;
  method: string;
  path: string;
  curl: string;
  notes?: string;
}) {
  return (
    <section className="panel rounded-[30px] p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800">
          {method}
        </span>
        <span className="rounded-full bg-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700">
          {path}
        </span>
      </div>
      <CodeBlock code={curl} />
      {notes ? <p className="mt-3 text-sm text-stone-600">{notes}</p> : null}
    </section>
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