# KeyRelay PM2 启动与脚本使用说明

本文件用于说明如何在服务器上通过 PM2 启动项目，以及如何使用项目内置脚本进行日常管理。

## 1. 前置条件

在服务器中确保已安装：

- Node.js（建议 LTS 版本）
- npm
- PM2（全局安装）

安装 PM2：

```bash
npm i -g pm2
```

## 2. 项目脚本说明

项目根目录提供了 3 个脚本：

- `start-keyrelay.sh`
  - 自动安装依赖（当 `node_modules` 不存在时）
  - 执行生产构建 `npm run build`
  - 使用 PM2 启动或重启应用
  - 进程名：`keyrelay`
  - 端口：`3010`（来自 `ecosystem.config.js`）

- `logs-keyrelay.sh`
  - 查看 `keyrelay` 的 PM2 实时日志

- `stop-keyrelay.sh`
  - 停止并删除 PM2 进程 `keyrelay`

## 3. 首次部署 / 启动

进入项目目录后执行：

```bash
./start-keyrelay.sh
```

启动成功后可检查状态：

```bash
pm2 status keyrelay
```

## 4. 日常操作

查看日志：

```bash
./logs-keyrelay.sh
```

停止服务：

```bash
./stop-keyrelay.sh
```

重新启动（推荐）：

```bash
./start-keyrelay.sh
```

## 5. 开机自启（可选但推荐）

如果希望服务器重启后自动拉起 PM2 进程：

```bash
pm2 startup
pm2 save
```

执行 `pm2 startup` 后，按终端提示再执行一次它给出的命令即可完成系统级自启注册。

## 6. 故障排查

- 启动失败先看日志：

```bash
./logs-keyrelay.sh
```

- 若构建失败，通常是依赖或环境变量问题，先确认生产环境变量完整。
- 若提示找不到 PM2，请先执行 `npm i -g pm2`。
