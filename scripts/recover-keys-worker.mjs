const baseUrl = (process.env.KEYRELAY_BASE_URL || "http://127.0.0.1:3010").replace(/\/$/, "");
const intervalMsRaw = Number(process.env.KEYRELAY_RECOVER_INTERVAL_MS || "60000");
const intervalMs = Number.isFinite(intervalMsRaw) && intervalMsRaw >= 5000 ? intervalMsRaw : 60000;
const timeoutMsRaw = Number(process.env.KEYRELAY_RECOVER_TIMEOUT_MS || "10000");
const timeoutMs = Number.isFinite(timeoutMsRaw) && timeoutMsRaw >= 1000 ? timeoutMsRaw : 10000;
const cronSecret = process.env.KEYRELAY_CRON_SECRET?.trim();

const recoverUrl = `${baseUrl}/api/cron/recover-keys`;

async function runOnce() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = cronSecret ? { "x-cron-secret": cronSecret } : {};
    const response = await fetch(recoverUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      console.error(
        `[recover-worker] HTTP ${response.status} while calling ${recoverUrl}. body=${bodyText}`,
      );
      return;
    }

    const payload = await response.json().catch(() => null);
    const recovered = typeof payload?.recovered === "number" ? payload.recovered : "unknown";
    const executedAt = payload?.executedAt || new Date().toISOString();
    console.log(`[recover-worker] recovered=${recovered} executedAt=${executedAt}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[recover-worker] request failed: ${message}`);
  } finally {
    clearTimeout(timer);
  }
}

console.log(
  `[recover-worker] started url=${recoverUrl} intervalMs=${intervalMs} timeoutMs=${timeoutMs}`,
);

await runOnce();
setInterval(() => {
  void runOnce();
}, intervalMs);
