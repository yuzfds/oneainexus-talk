# OpenClaw Web Chat

> 基于 Nuxt.js 的 AI 聊天应用 - Channel 插件 + SDK 模式！(￣▽￣)ﾉ

## 架构说明

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                   Nuxt.js 聊天应用                              │
│              ┌─────────────────────────────────────┐           │
│              │   前端 (Vue 3)                      │           │
│              │   localhost:3000                    │           │
│              └─────────────────────────────────────┘           │
│                                                                 │
│              ┌─────────────────────────────────────┐           │
│              │   API 端点                          │           │
│              │   /api/apps/*   → 应用管理          │           │
│              │   /api/_ws      → WebSocket (SDK)   │           │
│              └─────────────────┬───────────────────┘           │
│                                │                                │
│                                ▼                                │
│              ┌─────────────────────────────────────┐           │
│              │   MySQL 数据库                      │           │
│              │   - apps          应用表            │           │
│              │   - connections   连接记录表        │           │
│              │   - messages      消息记录表        │           │
│              └─────────────────────────────────────┘           │
│                                ▲                                │
│                                │ SDK 连接                       │
└────────────────────────────────┼────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────┐
│   OpenClaw Gateway             │                                │
│   ┌────────────────────────────┴───────────────────────────┐   │
│   │  Web Channel Plugin + SDK                               │   │
│   │  - 主动连接到 Nuxt 应用                                 │   │
│   │  - 使用 client_id + secret 认证                        │   │
│   └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ MySQL 数据库表结构

详细 SQL 请查看 [schema.sql](schema.sql)

### 表结构概览

| 表名 | 说明 |
| --- | --- |
| `apps` | 应用表 - 存储 client_id/secret |
| `connections` | 连接记录 - SDK 连接历史 |
| `messages` | 消息记录 - 聊天历史 |

### ER 关系图

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│    apps     │       │ connections  │       │   messages   │
├─────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)     │◄──────│ app_id (FK)  │       │ app_id (FK)  │
│ client_id   │  1:N  │ session_id   │       │ session_id   │
│ client_sec  │       │ state        │       │ role         │
│ name        │       │ connected_at │       │ content      │
│ owner_id    │       └──────────────┘       └──────────────┘
│ status      │
└─────────────┘
```

### apps 表

```sql
CREATE TABLE `apps` (
  `id` VARCHAR(36) NOT NULL,
  `client_id` VARCHAR(64) NOT NULL,
  `client_secret` VARCHAR(128) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(500),
  `owner_id` VARCHAR(36) NOT NULL,
  `status` ENUM('active', 'disabled') DEFAULT 'active',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_client_id` (`client_id`)
);
```

### connections 表

```sql
CREATE TABLE `connections` (
  `id` VARCHAR(36) NOT NULL,
  `app_id` VARCHAR(36) NOT NULL,
  `session_id` VARCHAR(36) NOT NULL,
  `state` ENUM('connecting', 'connected', 'disconnected', 'error'),
  `connected_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `disconnected_at` DATETIME,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE CASCADE
);
```

### messages 表

```sql
CREATE TABLE `messages` (
  `id` VARCHAR(36) NOT NULL,
  `app_id` VARCHAR(36) NOT NULL,
  `session_id` VARCHAR(36) NOT NULL,
  `role` ENUM('user', 'assistant', 'system'),
  `content` TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE CASCADE
);
```

---

## 技术栈

- **框架**: Nuxt 3.x
- **前端**: Vue 3.5 + TypeScript
- **状态管理**: Pinia
- **样式**: TailwindCSS + Element Plus
- **实时通信**: WebSocket + SSE
- **数据库**: MySQL 8.0+

---

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env

# 3. 创建数据库
mysql -u root -p < schema.sql

# 4. 启动
npm run dev
```

---

## API 端点

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/api/apps` | GET | 获取应用列表 |
| `/api/apps` | POST | 创建应用 |
| `/api/apps/:id` | DELETE | 删除应用 |
| `/api/_ws` | WS | WebSocket 连接 |

---

> 哼，简洁才是最高贵的优雅！(￣▽￣)ﾉ
