# @oneainexus/openclaw-connector

`@oneainexus/openclaw-connector` 是一个 OpenClaw channel 插件，用于把 OpenClaw 和 `agent-app-backend` 通过 Oneainexus Chat SDK 连接起来。

## 功能

- 提供 `oneainexus` channel（支持 direct chat）
- 支持文本与媒体消息透传
- 支持文件附件发送（图片、文档、压缩包）
- 支持基于 `session:<sessionId>` 的目标路由
- 支持多账号配置
- 支持私聊策略（`dmPolicy`）与来源白名单（`allowFrom`）
- 阻断式流输出（`blockStreaming`）

## 安装

发布到 npm 后，在 OpenClaw 的运行环境中安装：

```bash
openclaw plugins install @oneainexus/openclaw-connector
```

如果你使用的是本地包或私有源，也可以按实际包名安装。

## 插件入口

本插件在 `package.json` 中声明了 OpenClaw 扩展信息：

- 扩展入口：`./dist/index.js`
- setup 入口：`./dist/setup-entry.js`
- channel id：`oneainexus`

通常只要在 OpenClaw 所在环境安装该包，OpenClaw 就可以识别这个 channel 插件。

## 配置方式

主配置使用 `channels.oneainexus.accounts`。

最小必填项：

- `apiEndpoint`
- `clientId`
- `clientSecret`

可选项：

- `name`
- `enabled`
- `wsPath`
- `dmPolicy`
- `allowFrom`

## 最小配置示例

```json
{
  "channels": {
    "oneainexus": {
      "accounts": {
        "default": {
          "enabled": true,
          "apiEndpoint": "https://your-chat-gateway.example.com",
          "clientId": "your-client-id",
          "clientSecret": "your-client-secret"
        }
      }
    }
  }
}
```

## 完整配置示例

```json
{
  "channels": {
    "oneainexus": {
      "accounts": {
        "default": {
          "enabled": true,
          "apiEndpoint": "https://aicloud.oneainexus.cn:30013/",
          "wsPath": "/agent-app/api/v1/user/chat/ws/sdk",
          "clientId": "oc_be6109dd63b74511",
          "clientSecret": "0b4f49acf0a1bf1fb901c3eca7f7fb8fc8254eab5b9e2cc2d24a469851bbb159"
        }
      }
    }
  }
}
```

## 多账号示例

```json
{
  "channels": {
    "oneainexus": {
      "accounts": {
        "default": {
          "name": "prod",
          "enabled": true,
          "apiEndpoint": "https://chat-prod.example.com",
          "clientId": "prod-client-id",
          "clientSecret": "prod-client-secret"
        },
        "staging": {
          "name": "staging",
          "enabled": true,
          "apiEndpoint": "https://chat-staging.example.com",
          "clientId": "staging-client-id",
          "clientSecret": "staging-client-secret",
          "wsPath": "/agent-app/api/v1/user/chat/ws/sdk"
        }
      }
    }
  }
}
```

## 字段说明

### `apiEndpoint`

Oneainexus Chat 网关的 HTTP 基地址。

### `wsPath`

WebSocket 路径，可选。默认值是：

```txt
/agent-app/api/v1/user/chat/ws/sdk
```

### `clientId`

SDK 使用的客户端标识。

### `clientSecret`

SDK 使用的客户端密钥。

### `enabled`

账号是否启用。未配置时默认按启用处理。

### `dmPolicy`

私聊策略，默认值是 `open`。

### `allowFrom`

来源白名单列表。

## 目标格式

当前 channel 的显式目标格式为：

```txt
session:<sessionId>
```

例如：

```txt
session:abc123
```

如果只传 `abc123`，插件也会自动规范化为 `session:abc123`。

## 支持的消息动作

| 动作 | 说明 |
|------|------|
| `send` | 发送文本消息（可附带媒体 URL） |
| `sendAttachment` | 发送附件 |
| `upload-file` | 上传文件并发送（支持图片、文档、压缩包等） |

支持的媒体类型：图片（png、jpg、gif、webp、svg）、文档（pdf、txt、md、docx、xlsx、pptx）、压缩包（zip）。

## 运行流程

1. OpenClaw 启动并加载插件
2. 插件读取 `channels.oneainexus.accounts`
3. 为每个启用的账号启动 SDK Worker，连接到 Oneainexus Chat 网关
4. 接收来自 SDK 的 `chat` 消息
5. 将消息路由到 OpenClaw 对话会话
6. 把 OpenClaw 的回复再发回对应的 `sessionId`

## 发布后接入建议

1. 先确认 `agent-app-backend` 服务地址可访问
2. 准备一组有效的 `clientId` 和 `clientSecret`
3. 在 OpenClaw 运行环境中安装本插件
4. 在 OpenClaw 主配置中增加 `channels.oneainexus.accounts.default`
5. 重启 OpenClaw 并检查该 channel 账号是否连接成功

## 常见问题

### 1. 账号没有连上

优先检查：

- `apiEndpoint` 是否可访问
- `wsPath` 是否正确
- `clientId` / `clientSecret` 是否有效

### 2. 找不到目标会话

优先检查发送目标是否是：

```txt
session:<sessionId>
```

### 3. 多账号时走错账号

如果未显式指定账号，默认优先使用 `default`，没有 `default` 时使用第一个账号。

## 开发

```bash
# 安装依赖
npm install

# 构建（会先构建依赖的 chat-sdk，再构建本插件）
npm run build
```

类型检查：

```bash
npm run typecheck
```
