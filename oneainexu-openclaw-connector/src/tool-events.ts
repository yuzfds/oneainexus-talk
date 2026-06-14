import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/core';
import { CHANNEL_ID } from './types.js';
import { sendStreamEvent } from './outbound/stream.js';
import { runtimeStore } from './runtime-store.js';
import { CONNECTOR_VERSION_LABEL } from './version.js';

type HookHandler = (event: unknown, ctx: unknown) => void | Promise<void>;

type HookCapableApi = OpenClawPluginApi & {
  on?: (hookName: string, handler: HookHandler, opts?: { priority?: number }) => void;
  registerHook?: (hookName: string | string[], handler: HookHandler, opts?: { priority?: number }) => void;
};

type Logger = {
  debug?: (message: string, meta?: Record<string, unknown>) => void;
  info?: (message: string, meta?: Record<string, unknown>) => void;
  warn?: (message: string, meta?: Record<string, unknown>) => void;
};

type ActiveToolSession = {
  accountId: string;
  sessionId: string;
  target: string;
  sessionKey: string;
  runId?: string;
  expiresAt: number;
};

type ToolEventPayload = {
  accountId: string;
  target: string;
  text: string;
  eventType: string;
  eventData?: Record<string, unknown>;
  sessionKey?: string;
};

const ACTIVE_SESSION_TTL_MS = 30 * 60 * 1000;
const COMPLETED_SESSION_TTL_MS = 2 * 60 * 1000;
const DEDUPE_TTL_MS = 10 * 1000;
const MAX_SIGNATURES = 1024;
const STRING_LIMIT = 1200;

const sessionsBySessionKey = new Map<string, ActiveToolSession>();
const sessionsByRunId = new Map<string, ActiveToolSession>();
const recentSignatures = new Map<string, number>();

export function activateToolEventSession(params: {
  accountId: string;
  sessionId: string;
  target: string;
  sessionKey: string;
  runId?: string;
}): void {
  if (!params.sessionKey) return;
  pruneToolEventState();

  const session: ActiveToolSession = {
    ...params,
    expiresAt: Date.now() + ACTIVE_SESSION_TTL_MS,
  };
  sessionsBySessionKey.set(params.sessionKey, session);
  if (params.runId) {
    sessionsByRunId.set(params.runId, session);
  }
}

export function completeToolEventSession(params: { sessionKey: string; runId?: string }): void {
  const now = Date.now();
  const expiresAt = now + COMPLETED_SESSION_TTL_MS;
  const bySession = sessionsBySessionKey.get(params.sessionKey);
  if (bySession) {
    bySession.expiresAt = Math.min(bySession.expiresAt, expiresAt);
  }
  if (params.runId) {
    const byRun = sessionsByRunId.get(params.runId);
    if (byRun) {
      byRun.expiresAt = Math.min(byRun.expiresAt, expiresAt);
    }
  }
  pruneToolEventState(now);
}

export async function sendToolStreamEvent(params: ToolEventPayload): Promise<void> {
  const text = params.text.trim();
  if (!text) return;

  if (shouldSkipDuplicate(params)) {
    return;
  }

  logToolStreamEvent(params, text);

  await sendStreamEvent({
    accountId: params.accountId,
    target: params.target,
    text,
    eventType: params.eventType,
    ...(params.eventData ? { eventData: params.eventData } : {}),
  });
}

function logToolStreamEvent(params: ToolEventPayload, text: string): void {
  try {
    const logger = runtimeStore.getRuntime().logging.getChildLogger({
      plugin: CHANNEL_ID,
      accountId: params.accountId,
    }) as Logger;
    const event = params.eventData;
    const toolName = stringField(event, 'name') ?? stringField(event, 'title') ?? stringField(event, 'kind') ?? '-';
    logger.info?.(
      `Forwarding Oneainexus tool stream event type=${params.eventType} tool=${toolName} textLen=${text.length}`,
    );
  } catch {
    // Best-effort diagnostics only; never let logging block stream delivery.
  }
}

export function registerToolEventHooks(api: OpenClawPluginApi): void {
  const hookApi = api as HookCapableApi;
  const logger = api.logger as Logger;
  const register =
    typeof hookApi.on === 'function'
      ? (hookName: string, handler: HookHandler) => hookApi.on?.(hookName, handler)
      : typeof hookApi.registerHook === 'function'
        ? (hookName: string, handler: HookHandler) => hookApi.registerHook?.(hookName, handler)
        : undefined;

  if (!register) {
    logger.info?.(
      `OpenClaw tool hooks are not available for ${CONNECTOR_VERSION_LABEL}; ` +
        `registrationMode=${api.registrationMode}; falling back to reply progress callbacks only.`,
    );
    return;
  }

  try {
    register('before_tool_call', async (event, ctx) => {
      await emitHookToolStart(event, ctx, logger);
    });
    register('after_tool_call', async (event, ctx) => {
      await emitHookToolEnd(event, ctx, logger);
    });
    logger.info?.(`Registered OpenClaw tool call hooks for ${CONNECTOR_VERSION_LABEL}.`);
  } catch (error) {
    logger.warn?.(`Failed to register OpenClaw tool hooks: ${String(error)}`);
  }
}

async function emitHookToolStart(event: unknown, ctx: unknown, logger: Logger): Promise<void> {
  const session = resolveHookSession(event, ctx);
  const toolName = stringField(event, 'toolName') ?? stringField(ctx, 'toolName');
  logger.debug?.(
    `OpenClaw before_tool_call hook received: tool=${toolName ?? '-'} session=${stringField(ctx, 'sessionKey') ?? stringField(event, 'sessionKey') ?? '-'} run=${stringField(event, 'runId') ?? stringField(ctx, 'runId') ?? '-'}`,
  );
  if (!session || !toolName) {
    logger.debug?.(
      `OpenClaw before_tool_call hook ignored: sessionMatch=${session ? 'yes' : 'no'} tool=${toolName ?? '-'}`,
    );
    return;
  }

  await safeSendHookEvent(
    {
      accountId: session.accountId,
      target: session.target,
      sessionKey: session.sessionKey,
      text: `[tool] ${toolName} (start)`,
      eventType: 'tool_start',
      eventData: compactRecord({
        source: 'openclaw_hook',
        phase: 'start',
        status: 'running',
        name: toolName,
        toolCallId: stringField(event, 'toolCallId') ?? stringField(ctx, 'toolCallId'),
        runId: stringField(event, 'runId') ?? stringField(ctx, 'runId'),
        args: sanitizeValue(recordField(event, 'params'), 0),
      }),
    },
    logger,
  );
}

async function emitHookToolEnd(event: unknown, ctx: unknown, logger: Logger): Promise<void> {
  const session = resolveHookSession(event, ctx);
  const toolName = stringField(event, 'toolName') ?? stringField(ctx, 'toolName');
  logger.debug?.(
    `OpenClaw after_tool_call hook received: tool=${toolName ?? '-'} session=${stringField(ctx, 'sessionKey') ?? stringField(event, 'sessionKey') ?? '-'} run=${stringField(event, 'runId') ?? stringField(ctx, 'runId') ?? '-'}`,
  );
  if (!session || !toolName) {
    logger.debug?.(
      `OpenClaw after_tool_call hook ignored: sessionMatch=${session ? 'yes' : 'no'} tool=${toolName ?? '-'}`,
    );
    return;
  }

  const error = stringField(event, 'error');
  const durationMs = numberField(event, 'durationMs');
  const status = error ? 'error' : 'success';
  const output = error ?? summarizeValue(recordField(event, 'result'));
  const title = `[tool:${toolName}] ${status}${durationMs == null ? '' : ` (${durationMs}ms)`}`;

  await safeSendHookEvent(
    {
      accountId: session.accountId,
      target: session.target,
      sessionKey: session.sessionKey,
      text: output ? `${title}\n\n${output}` : title,
      eventType: 'tool_output',
      eventData: compactRecord({
        source: 'openclaw_hook',
        phase: 'end',
        status,
        name: toolName,
        toolCallId: stringField(event, 'toolCallId') ?? stringField(ctx, 'toolCallId'),
        runId: stringField(event, 'runId') ?? stringField(ctx, 'runId'),
        durationMs,
        output,
        args: sanitizeValue(recordField(event, 'params'), 0),
        result: sanitizeValue(recordField(event, 'result'), 0),
        error,
      }),
    },
    logger,
  );
}

async function safeSendHookEvent(params: ToolEventPayload, logger: Logger): Promise<void> {
  try {
    await sendToolStreamEvent(params);
  } catch (error) {
    logger.debug?.(`Failed to forward OpenClaw tool hook event: ${String(error)}`);
  }
}

function resolveHookSession(event: unknown, ctx: unknown): ActiveToolSession | undefined {
  pruneToolEventState();

  const runId = stringField(event, 'runId') ?? stringField(ctx, 'runId');
  if (runId) {
    const session = sessionsByRunId.get(runId);
    if (session) return session;
  }

  const sessionKey = stringField(ctx, 'sessionKey') ?? stringField(event, 'sessionKey');
  if (sessionKey) {
    return sessionsBySessionKey.get(sessionKey);
  }

  return undefined;
}

function shouldSkipDuplicate(params: ToolEventPayload): boolean {
  pruneSignatures();

  const scope = params.sessionKey ?? `${params.accountId}:${params.target}`;
  const signature = [
    scope,
    params.eventType,
    stringField(params.eventData, 'toolCallId') ?? stringField(params.eventData, 'itemId') ?? '',
    stringField(params.eventData, 'name') ?? stringField(params.eventData, 'title') ?? '',
    stringField(params.eventData, 'phase') ?? '',
    stringField(params.eventData, 'status') ?? '',
    params.text.trim().slice(0, 220),
  ].join('|');

  const now = Date.now();
  const previous = recentSignatures.get(signature);
  if (previous && now - previous < DEDUPE_TTL_MS) {
    return true;
  }
  recentSignatures.set(signature, now);
  return false;
}

function pruneToolEventState(now = Date.now()): void {
  for (const [sessionKey, session] of sessionsBySessionKey) {
    if (session.expiresAt <= now) {
      sessionsBySessionKey.delete(sessionKey);
    }
  }
  for (const [runId, session] of sessionsByRunId) {
    if (session.expiresAt <= now) {
      sessionsByRunId.delete(runId);
    }
  }
  pruneSignatures(now);
}

function pruneSignatures(now = Date.now()): void {
  for (const [signature, seenAt] of recentSignatures) {
    if (now - seenAt > DEDUPE_TTL_MS) {
      recentSignatures.delete(signature);
    }
  }
  if (recentSignatures.size <= MAX_SIGNATURES) return;

  const overflow = recentSignatures.size - MAX_SIGNATURES;
  const entries = [...recentSignatures.entries()].sort((left, right) => left[1] - right[1]);
  for (const [signature] of entries.slice(0, overflow)) {
    recentSignatures.delete(signature);
  }
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function stringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function numberField(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function recordField(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object') return undefined;
  return (value as Record<string, unknown>)[key];
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value == null) return undefined;
  if (typeof value === 'string') return redactSecrets(truncate(value, STRING_LIMIT));
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= 2) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 8).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value !== 'object') return truncate(String(value), 180);

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, 16)) {
    output[key] = isSensitiveKey(key) ? '[redacted]' : sanitizeValue(entry, depth + 1);
  }
  return output;
}

function summarizeValue(value: unknown): string | undefined {
  const sanitized = sanitizeValue(value, 0);
  if (sanitized == null) return undefined;
  if (typeof sanitized === 'string') return sanitized;
  try {
    return truncate(JSON.stringify(sanitized, null, 2), STRING_LIMIT);
  } catch {
    return truncate(String(sanitized), STRING_LIMIT);
  }
}

function truncate(value: string, maxChars: number): string {
  return value.length <= maxChars ? value : `${value.slice(0, Math.max(0, maxChars - 3))}...`;
}

function redactSecrets(value: string): string {
  return value
    .replace(/([?&](?:api_key|token|secret|key|password)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [redacted]');
}

function isSensitiveKey(key: string): boolean {
  return /secret|token|password|authorization|cookie|api[-_]?key|credential|private[-_]?key|bearer/i.test(key);
}
