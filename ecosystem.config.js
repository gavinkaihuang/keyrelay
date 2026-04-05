module.exports = {
  apps : [{
    name: "keyrelay",
    script: "npm",
    args: "start",
    env: {
      NODE_ENV: "production",
      PORT: 3010  // 在这里修改为你想要的端口
    }
  }]
}