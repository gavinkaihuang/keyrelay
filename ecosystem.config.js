module.exports = {
  apps: [
    {
      name: "keyrelay",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3010, // 在这里修改为你想要的端口
      },
    },
    {
      name: "keyrelay-recover-worker",
      script: "node",
      args: "scripts/recover-keys-worker.mjs",
      env: {
        NODE_ENV: "production",
        KEYRELAY_BASE_URL: "http://127.0.0.1:3010",
        KEYRELAY_RECOVER_INTERVAL_MS: "60000",
        KEYRELAY_RECOVER_TIMEOUT_MS: "10000",
      },
    },
  ],
};