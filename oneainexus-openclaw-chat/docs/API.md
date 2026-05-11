# oneainexus-openclaw-chat 接口文档

## 1. 基础信息

- 服务前缀（`app.baseURL`）：`/oneainexus-talk/`
- API 根路径：`/oneainexus-talk/api`
- 默认返回类型：`application/json`
- WebSocket 支持：已启用（Nitro websocket）

示例完整地址（本地 3100 端口）：

- HTTP: `http://localhost:3100/oneainexus-talk/api/health`
- WS（SDK）: `ws://localhost:3100/oneainexus-talk/api/_ws`
- WS（前端聊天）: `ws://localhost:3100/oneainexus-talk/api/chat.ws`

## 2. 认证方式

系统支持两类认证：

- 用户认证（Token）：请求头 `Authentication`（可由 `NUXT_AUTH_TOKEN_HEADER` 覆盖）
- 应用认证（App 凭证）：
  - Header: `Authorization: Bearer base64(client_id:client_secret)`
  - 或 Header: `Authorization: Basic base64(client_id:client_secret)`
  - 或 Query: `client_id=xxx&client_secret=xxx`
  - 或 Query: `token=base64(client_id:client_secret)`（适配 EventSource 等场景）

注意：

- `server/middleware/auth.ts` 会放行这些路径：`/health`、`/auth`、`/apps`、`/chat`、`/_ws`、`/_ws.ws`
- 放行表示“由接口自身决定是否鉴权”，不是完全不鉴权

## 3. HTTP 接口

### 3.1 健康检查

#### GET `/health`

- 说明：服务健康状态
- 鉴权：否

响应示例：

```json
{
  "status": "ok",
  "timestamp": 1710000000000,
  "uptime": 12.34,
  "version": "1.0.0",
  "services": {
    "gateway": true
  }
}
```

---

### 3.2 用户认证代理

#### POST `/auth/verify`

- 说明：用 token 调外部认证服务并返回用户信息
- 鉴权：请求体内提供 token

请求体：

```json
{
  "token": "user-token"
}
```

成功响应：

```json
{
  "success": true,
  "data": {
    "userName": "alice"
  }
}
```

失败：

- `400`：缺少 token
- `401`：认证失败
- `500/503`：认证服务不可用或配置缺失

---

### 3.3 应用管理（需要用户登录）

#### GET `/apps`

- 说明：获取当前用户的应用列表
- 鉴权：用户 token（`Authentication`）

#### POST `/apps`

- 说明：创建应用
- 鉴权：用户 token

请求体：

```json
{
  "name": "My App",
  "description": "demo",
  "callbackUrls": ["https://example.com/callback"],
  "rateLimit": {
    "maxRequests": 1000,
    "dailyLimit": 10000
  }
}
```

返回要点：

- `clientSecret` 仅创建时返回一次

#### GET `/apps/:appId`

- 说明：获取应用详情（仅所有者）
- 鉴权：用户 token

#### DELETE `/apps/:appId`

- 说明：删除应用（仅所有者）
- 鉴权：用户 token

#### POST `/apps/:appId/regenerate-secret`

- 说明：重置应用密钥（仅所有者）
- 鉴权：用户 token
- 返回：`clientSecret`（仅本次可见）

#### PUT `/apps/:appId/status`

- 说明：更新应用状态（仅所有者）
- 鉴权：用户 token

请求体：

```json
{
  "status": "active"
}
```

`status` 取值：`active | disabled | suspended`

---

### 3.4 Chat（HTTP）

#### POST `/chat`

- 说明：提交聊天消息到 SDK 通道（不是直接流式回包）
- 鉴权：
  - 用户 token（需要 `appId` 或 `clientId` 且必须是 owner）
  - 或应用凭证认证

请求体：

```json
{
  "messages": [
    {
      "role": "user",
      "content": "你好"
    }
  ],
  "appId": "app_xxx",
  "sessionId": "optional-session-id",
  "stream": true
}
```

约束：

- 请求体最大约 `12MB`
- 单条消息归一化文本最大 `200000` 字符

成功响应：

```json
{
  "success": true,
  "sessionId": "generated-or-input",
  "message": "Message sent. Response will be streamed via SDK connection.",
  "note": "This endpoint is for SDK-based communication. For direct streaming, use WebSocket or SSE endpoint."
}
```

失败：

- `400`：参数错误 / 缺少 appId|clientId / 文本过长
- `403`：非应用 owner
- `413`：消息体过大
- `503`：无可用 SDK 连接

---

### 3.5 Chat 历史与会话

#### GET `/chat/history?appId=xxx&sessionId=yyy&limit=50`

- 说明：查询会话历史
- 鉴权：可选（当前实现即使鉴权失败也继续）

#### GET `/chat/sessions?appId=xxx`

- 说明：查询应用下会话列表
- 鉴权：可选（当前实现即使鉴权失败也继续）

#### POST `/chat/sessions`

- 说明：创建新会话（会写入数据库占位记录，并尝试通知 OpenClaw 同步创建）
- 鉴权：可选（当前实现即使鉴权失败也继续）

请求体：

```json
{
  "appId": "app_xxx",
  "sessionId": "optional-session-id"
}
```

成功响应：

```json
{
  "success": true,
  "data": {
    "sessionId": "session_xxx",
    "title": "新对话",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  },
  "syncRequested": true
}
```

#### DELETE `/chat/sessions/:sessionId?appId=xxx`

- 说明：删除会话并尝试通知 SDK 端同步删除
- 鉴权：可选（当前实现即使鉴权失败也继续）
- 返回：`syncRequested` 表示是否已向在线 SDK 发出同步请求

---

### 3.6 SSE 相关

#### GET `/sse?sessionId=xxx`

- 说明：通用 SSE 心跳连接
- 鉴权：否
- 事件：`connected`、`heartbeat`（30 秒）

#### GET `/sdk/connect?client_id=xxx&client_secret=yyy`

- 说明：SDK 的 SSE 连接入口（历史方案）
- 鉴权：应用凭证（query）
- 事件：
  - `auth_result`
  - `heartbeat`（30 秒）

#### GET `/sdk/stats`

- 说明：SDK 连接统计
- 鉴权：否

## 4. WebSocket 协议

### 4.1 SDK WS：`/api/_ws`

连接建立后服务端会先发：

```json
{
  "type": "connected",
  "data": {
    "connectionId": "xxx",
    "message": "Please authenticate with your client credentials"
  }
}
```

客户端需发送认证消息：

```json
{
  "type": "auth",
  "id": "msg-id",
  "timestamp": 1710000000000,
  "data": {
    "clientId": "xxx",
    "clientSecret": "yyy"
  }
}
```

服务端返回：

- `auth_result`（`success=true/false`）
- 未认证先发其他消息会收到 `error`（`NOT_AUTHENTICATED`）
- 心跳 `heartbeat` 支持回显
- `chat` 消息会返回 `chat_received` 确认

### 4.2 前端 Chat WS：`/api/chat.ws`

连接后服务端先发：

```json
{
  "type": "connected",
  "message": "Ready for chat"
}
```

客户端发送：

```json
{
  "type": "chat",
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "appId": "app_xxx",
  "sessionId": "optional",
  "token": "optional-user-token"
}
```

服务端推送：

- `chat_stream`：增量内容、工具事件、完成状态
- `error`：参数错误、鉴权失败、无 SDK 连接等

## 5. 常见错误码

- `400`：参数缺失/格式错误
- `401`：认证失败或缺少凭证
- `403`：资源越权（非 owner）
- `404`：资源不存在（如 app）
- `413`：消息体过大
- `500`：服务内部错误/配置错误
- `503`：依赖不可用（认证服务或 SDK 通道）

## 6. 联调建议

- 优先使用 `/api/_ws` 作为 SDK 正式通道；`/api/sdk/connect` 仅保留兼容
- 在子路径部署场景中，客户端必须带完整前缀：`/oneainexus-talk/api/...`
- 建议先调用 `/api/health`、再做 `/api/_ws` 认证握手，最后再发 `chat`
