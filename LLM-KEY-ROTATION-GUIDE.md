# KeyRelay LLM 接入规范（获取 Key / 错误回传 / 冷却 / 换 Key）

本文件面向“调用下游大模型服务的其他 LLM/Agent 系统”。

目标：

1. 先向 KeyRelay 获取可用 Key。
2. 调用下游模型（OpenAI / Gemini / Claude / DeepSeek 等）。
3. 一旦失败，把错误回传给 KeyRelay，让系统自动冷却/禁用/耗尽该 Key。
4. 再次获取新 Key 并重试。

## 1. 认证与基础信息

- Base URL: 你的 KeyRelay 服务地址（例如 http://your-host:3010）
- 外部 API 认证头（二选一）：
  - X-KeyRelay-Token: <YOUR_TOKEN>
  - Authorization: Bearer <YOUR_TOKEN>
- 回调 API 认证头：
  - x-callback-token: <CALLBACK_SECRET>

相关环境变量：

- KEYRELAY_EXTERNAL_API_TOKEN（外部 API token）
- CALLBACK_SECRET（回调 token）
- CALLBACK_DEFAULT_PROJECT_NAME（可选）

## 2. 标准调用链（必须遵循）

1. 调用“分发接口”获取可用 Key。
2. 用返回的 apiKey 调用下游模型。
3. 如果下游调用失败：
   - 立刻把 rawError 回传到 KeyRelay 回调接口。
   - 然后重新请求分发接口，拿新 Key。
4. 按重试策略继续，直到成功或达到最大重试次数。

## 3. 获取可用 Key

接口：POST /api/external/keys/dispatch

请求示例：

```bash
curl -X POST "http://your-host:3010/api/external/keys/dispatch" \
  -H "Content-Type: application/json" \
  -H "X-KeyRelay-Token: <YOUR_TOKEN>" \
  -d '{
    "platform": "Gemini",
    "projectName": "agent-worker-a"
  }'
```

成功响应示例：

```json
{
  "success": true,
  "message": "Dispatched key",
  "data": {
    "id": "<KEY_ID>",
    "platform": "Gemini",
    "name": "Gemini Key 1",
    "apiKey": "<REAL_API_KEY>",
    "lastUsedAt": "2026-05-14T09:00:00.000Z"
  }
}
```

无可用 Key：

```json
{
  "success": false,
  "code": "NO_KEYS_AVAILABLE",
  "message": "No keys available"
}
```

建议：遇到 NO_KEYS_AVAILABLE 时等待 20-60 秒再试（指数退避更佳）。

## 4. 错误回传（让系统自动处理 Key 生命周期）

接口：POST /api/keys/callback

请求示例：

```bash
curl -X POST "http://your-host:3010/api/keys/callback" \
  -H "Content-Type: application/json" \
  -H "x-callback-token: <CALLBACK_SECRET>" \
  -d '{
    "keyId": "<KEY_ID>",
    "projectName": "agent-worker-a",
    "rawError": "RATE_LIMIT_EXCEEDED"
  }'
```

成功响应示例：

```json
{
  "success": true,
  "keyId": "<KEY_ID>",
  "actionCode": "RATE_LIMIT_EXCEEDED",
  "status": "COOLING",
  "coolDownUntil": "2026-05-14T09:05:00.000Z"
}
```

## 5. 系统内置错误分类（你只需准确上报 rawError）

KeyRelay 会根据 rawError 自动决定 Key 状态：

- API_KEY_INVALID 或 PERMISSION_DENIED
  - 状态 -> DISABLED（禁用）
- RATE_LIMIT_EXCEEDED 或 HTTP 429
  - 状态 -> COOLING（冷却 5 分钟）
- QUOTA_EXHAUSTED
  - 状态 -> DEPLETED（额度耗尽）
- SERVICE_UNAVAILABLE / INTERNAL / HTTP 503 / 其他未知错误
  - 状态 -> COOLING（冷却 30 秒）

注意：rawError 支持字符串或对象。建议把下游原始错误完整传入，不要丢关键信息（状态码、错误码、message）。

## 6. 推荐重试策略（给 LLM/Agent 的执行规则）

建议参数：

- 单请求最大重试次数：3 到 5
- 每次失败后都先回调，再换 Key
- 发生 NO_KEYS_AVAILABLE 时按指数退避等待

伪代码：

```text
for attempt in [1..maxRetries]:
  key = dispatch(platform, projectName)
  if key not available:
    sleep(backoff(attempt))
    continue

  result = call_provider(key.apiKey)
  if result success:
    return result

  callback(key.id, projectName, result.rawError)
  sleep(short_jitter)

raise "all retries failed"
```

## 7. 最佳实践

1. projectName 保持稳定且有辨识度（如 agent-worker-a、order-service）。
2. 每次失败都回调，不要静默吞错。
3. 不要重复使用已失败的同一 keyId；应重新 dispatch。
4. 记录 requestId / traceId，便于和 KeyRelay usage_logs 对账。
5. 对 429/503 类错误增加抖动延迟，减少雪崩重试。

## 8. 你可以直接复制的“系统提示词片段”（给其他 LLM）

```text
你是调用模型服务的执行代理，必须遵循以下规则：
1) 每次调用前，先向 /api/external/keys/dispatch 请求可用 key。
2) 调用下游模型失败后，必须立即调用 /api/keys/callback 上报 keyId、projectName、rawError。
3) 回调后不得复用该 key，必须重新 dispatch 新 key。
4) 若返回 NO_KEYS_AVAILABLE，执行退避等待后重试。
5) 达到最大重试次数后返回明确失败原因，不得无限重试。
```
