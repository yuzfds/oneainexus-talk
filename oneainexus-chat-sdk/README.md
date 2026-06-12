# @oneainexus/chat-sdk

Oneainexus Chat SDK — 基于 WebSocket 的聊天客户端 SDK，用于连接 Oneainexus Chat 网关，提供连接管理、消息收发、自动重连和心跳保活能力。

## 安装

```bash
npm install @oneainexus/chat-sdk
```

## 快速开始

```typescript
import { OneainexusChatClient } from '@oneainexus/chat-sdk';

const client = new OneainexusChatClient({
  apiEndpoint: 'https://your-chat-gateway.example.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
});

// 监听消息
client.onMessage((message) => {
  console.log('收到消息:', message);
});

// 监听连接状态变化
client.onStateChange((state) => {
  console.log('连接状态:', state);
});

// 连接到网关
await client.connect();

// 发送文本消息
await client.sendMessage('你好！');

// 发送富媒体消息
await client.sendMessage([
  { type: 'text', text: '请看这张图片' },
  { type: 'image', url: 'https://example.com/photo.jpg' },
]);

// 断开连接
await client.disconnect();
```

## 配置项

`OneainexusClientConfig` 接口：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `apiEndpoint` | `string` | ✅ | - | 网关 HTTP 基地址 |
| `clientId` | `string` | ✅ | - | 客户端标识 |
| `clientSecret` | `string` | ✅ | - | 客户端密钥 |
| `wsPath` | `string` | - | `/api/_ws` | WebSocket 路径 |
| `reconnect` | `boolean` | - | `true` | 是否自动重连 |
| `reconnectInterval` | `number` | - | `3000` | 重连间隔（ms） |
| `maxReconnectAttempts` | `number` | - | `10` | 最大重连次数 |
| `heartbeatInterval` | `number` | - | `30000` | 心跳间隔（ms） |
| `enableAck` | `boolean` | - | `true` | 是否启用消息确认 |
| `messageQueueSize` | `number` | - | `100` | 消息队列大小 |
| `messageTimeout` | `number` | - | `60000` | 消息超时（ms） |
| `logLevel` | `string` | - | `'info'` | 日志级别：`debug` / `info` / `warn` / `error` / `silent` |

## 连接状态

```typescript
enum ConnectionState {
  Disconnected = 'disconnected',   // 已断开
  Connecting = 'connecting',       // 连接中
  Connected = 'connected',         // 已连接
  Reconnecting = 'reconnecting',   // 重连中
  Error = 'error',                 // 错误
}
```

## 核心方法

### 连接管理

| 方法 | 说明 |
|------|------|
| `connect()` | 连接到网关（自动完成认证） |
| `disconnect(graceful?)` | 断开连接（默认优雅断开） |
| `getConnectionState()` | 获取当前连接状态 |

### 消息收发

| 方法 | 说明 |
|------|------|
| `sendMessage(content, options?)` | 发送消息（支持字符串、ChatMessage、MessagePart 数组） |
| `sendStructuredMessage(message, options?)` | 发送结构化消息 |
| `acknowledge(messageId)` | 确认收到消息 |
| `acknowledgeBatch(messageIds)` | 批量确认 |

### 事件监听

| 方法 | 说明 |
|------|------|
| `onMessage(listener)` | 监听消息，返回取消函数 |
| `onceMessage(listener)` | 监听单次消息 |
| `offMessage(listener)` | 取消消息监听 |
| `onStateChange(listener)` | 监听连接状态变化 |
| `onError(listener)` | 监听错误事件 |

### 状态查询

| 方法 | 说明 |
|------|------|
| `getStats()` | 获取统计信息（已发/收消息数、心跳、重连次数） |
| `getSessionInfo()` | 获取当前会话信息 |

## 消息类型

### ChatMessage

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content?: string;
  parts?: MessagePart[];
}
```

### MessagePart

支持三种消息片段：

```typescript
// 文本
{ type: 'text', text: '你好' }

// 图片
{ type: 'image', url: 'https://...', alt?: string, width?: number, height?: number }

// 文件
{ type: 'file', url: 'https://...', name: 'file.pdf', size?: number }
```

### ReceivedMessage

SDK 收到的消息结构：

```typescript
interface ReceivedMessage {
  id: string;
  type: 'auth_result' | 'chat' | 'chat_stream' | 'connected' | 'data' | 'error' | 'heartbeat' | 'text';
  content: string;
  parts?: MessagePart[];
  data?: unknown;
  timestamp: number;
  sessionId: string;
  requiresAck: boolean;
}
```

## 运行流程

1. 调用 `connect()` 建立 WebSocket 连接
2. SDK 自动发送 `auth` 认证消息（使用 clientId + clientSecret）
3. 收到 `auth_result` 后进入 Connected 状态，启动心跳
4. 通过 `sendMessage()` 发送聊天消息
5. 通过 `onMessage()` 监听并处理收到的消息
6. 连接断开时自动尝试重连（可配置）

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（监听文件变化）
npm run dev
```

构建工具使用 [tsup](https://tsup.egoist.dev/)，输出 CommonJS + ESM 格式及 TypeScript 类型声明。
