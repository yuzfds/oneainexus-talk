# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
# 核心：必须先复制 SDK 的 package.json，因为主应用依赖它
COPY oneainexus-chat-sdk/package*.json ./oneainexus-chat-sdk/
COPY oneainexus-openclaw-chat/package*.json ./oneainexus-openclaw-chat/
# 安装 SDK 依赖（需要 devDeps 来构建）
WORKDIR /app/oneainexus-chat-sdk
RUN npm ci
# 安装主应用依赖
WORKDIR /app/oneainexus-openclaw-chat
RUN npm ci

FROM base AS builder
# 复制依赖
COPY --from=deps /app/oneainexus-chat-sdk/node_modules /app/oneainexus-chat-sdk/node_modules
COPY --from=deps /app/oneainexus-openclaw-chat/node_modules /app/oneainexus-openclaw-chat/node_modules

# 1. 构建 SDK（生成 dist 目录）
COPY oneainexus-chat-sdk /app/oneainexus-chat-sdk
WORKDIR /app/oneainexus-chat-sdk
RUN npm run build

# 2. 构建主应用
COPY oneainexus-openclaw-chat /app/oneainexus-openclaw-chat
WORKDIR /app/oneainexus-openclaw-chat
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/oneainexus-openclaw-chat/.output ./.output
COPY --from=builder /app/oneainexus-openclaw-chat/public ./public
COPY --from=builder /app/oneainexus-openclaw-chat/package*.json ./

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
