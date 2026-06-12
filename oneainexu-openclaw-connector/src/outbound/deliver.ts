import type { MessagePart, OneainexusChatClient } from '@oneainexus/chat-sdk';
import type { ReplyPayload } from 'openclaw/plugin-sdk/core';
import { mediaUrlToMessagePart } from '../media-bridge.js';
import { CHANNEL_ID } from '../types.js';
import { runtimeStore } from '../runtime-store.js';
import {
  ensureSessionTarget,
  getChannelDataObject,
  rememberSessionMedia,
  resolvePayloadMedia,
  payloadHasMedia,
  getCachedSessionMedia,
  extractMediaDescriptorsFromText,
} from './media-resolver.js';
import type { PayloadMediaDescriptor } from './media-resolver.js';
import type { DeliveryKind } from './media-resolver.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type PlainObject = Record<string, unknown>;

type ToolEventInfo = {
  kind: DeliveryKind;
  eventType: string;
  eventData: Record<string, unknown>;
  text: string;
};

function isPlainObject(value: unknown): value is PlainObject {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function numberValue(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function firstString(sources: PlainObject[], keys: string[]): string | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const value = stringValue(source[key]);
      if (value) return value;
    }
  }
  return undefined;
}

function uniqueSources(sources: PlainObject[]): PlainObject[] {
  const seen = new Set<PlainObject>();
  const result: PlainObject[] = [];
  for (const source of sources) {
    if (!seen.has(source)) {
      seen.add(source);
      result.push(source);
    }
  }
  return result;
}

function collectToolMetadataSources(payload: ReplyPayload): PlainObject[] {
  const payloadObject = payload as unknown as PlainObject;
  const sources: PlainObject[] = [payloadObject];
  const channelData = getChannelDataObject(payload);

  if (channelData) {
    sources.push(channelData);
    for (const key of [CHANNEL_ID, 'openclaw', 'tool', 'event', 'meta', 'metadata', 'data', 'details', 'command', 'acp']) {
      const nested = channelData[key];
      if (isPlainObject(nested)) {
        sources.push(nested);
      }
    }
  }

  for (const source of [...sources]) {
    for (const key of ['tool', 'event', 'meta', 'metadata', 'data', 'details', 'command', 'result']) {
      const nested = source[key];
      if (isPlainObject(nested)) {
        sources.push(nested);
      }
    }
  }

  return uniqueSources(sources);
}

const STRONG_TOOL_MARKER_KEYS = [
  'toolCallId',
  'tool_call_id',
  'itemId',
  'item_id',
  'commandId',
  'command_id',
  'approvalId',
  'approvalSlug',
  'exitCode',
  'durationMs',
  'cwd',
  'output',
  'args',
  'added',
  'modified',
  'deleted',
];

const WEAK_TOOL_MARKER_KEYS = ['phase', 'status', 'progressText'];

function hasToolMarkerField(sources: PlainObject[]): boolean {
  return sources.some((source) => {
    const hasStrongMarker = STRONG_TOOL_MARKER_KEYS.some((key) => {
      const value = source[key];
      if (value == null) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });
    if (hasStrongMarker) {
      return true;
    }

    const hasWeakMarker = WEAK_TOOL_MARKER_KEYS.some((key) => stringValue(source[key]) != null);
    if (!hasWeakMarker) {
      return false;
    }

    const semanticType = firstString([source], ['stream', 'tag', 'type', 'kind', 'name', 'title']);
    if (!semanticType) {
      return false;
    }

    const normalized = semanticType.toLowerCase().replace(/[-\s]+/g, '_');
    return (
      normalized === 'tool' ||
      normalized === 'tool_call' ||
      normalized === 'tool_call_update' ||
      normalized === 'tool_result' ||
      normalized === 'command_output' ||
      normalized === 'plan' ||
      normalized === 'approval' ||
      normalized === 'patch' ||
      normalized.includes('tool') ||
      normalized.includes('command')
    );
  });
}

function getRawToolEventType(sources: PlainObject[]): string | undefined {
  return firstString(sources, [
    'eventType',
    'event_type',
    'sessionUpdate',
    'session_update',
    'stream',
    'tag',
    'type',
    'kind',
  ]);
}

function normalizeToolEventType(rawType: string | undefined, kind: DeliveryKind | undefined): string {
  const normalized = rawType?.trim().toLowerCase().replace(/[-\s]+/g, '_');

  if (normalized) {
    if (
      normalized === 'tool_call_update' ||
      normalized === 'tool_item' ||
      normalized === 'item' ||
      normalized === 'plan' ||
      normalized === 'approval' ||
      normalized === 'patch' ||
      normalized.includes('update')
    ) {
      return 'tool_item';
    }
    if (normalized === 'tool_call' || normalized === 'tool_start' || normalized.includes('start')) {
      return 'tool_start';
    }
    if (
      normalized === 'tool' ||
      normalized === 'tool_result' ||
      normalized === 'tool_result_error' ||
      normalized === 'tool_output' ||
      normalized === 'command_output' ||
      normalized.includes('result') ||
      normalized.includes('output') ||
      normalized.includes('command')
    ) {
      return 'tool_output';
    }
    if (normalized.startsWith('tool_')) {
      return normalized;
    }
  }

  return kind === 'tool' ? 'tool_output' : 'tool_item';
}

function copyStringField(target: Record<string, unknown>, sources: PlainObject[], key: string, aliases: string[]): void {
  const value = firstString(sources, aliases);
  if (value) {
    target[key] = value;
  }
}

function copyNumberField(target: Record<string, unknown>, sources: PlainObject[], key: string, aliases: string[]): void {
  for (const source of sources) {
    for (const alias of aliases) {
      const value = numberValue(source[alias]);
      if (value !== undefined) {
        target[key] = value;
        return;
      }
    }
  }
}

function copyBooleanField(target: Record<string, unknown>, sources: PlainObject[], key: string, aliases: string[]): void {
  for (const source of sources) {
    for (const alias of aliases) {
      const value = booleanValue(source[alias]);
      if (value !== undefined) {
        target[key] = value;
        return;
      }
    }
  }
}

function copyPlainObjectField(target: Record<string, unknown>, sources: PlainObject[], key: string, aliases: string[]): void {
  for (const source of sources) {
    for (const alias of aliases) {
      const value = source[alias];
      if (isPlainObject(value)) {
        target[key] = value;
        return;
      }
    }
  }
}

function copyStringArrayField(target: Record<string, unknown>, sources: PlainObject[], key: string): void {
  for (const source of sources) {
    const value = source[key];
    if (Array.isArray(value)) {
      const items = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      if (items.length > 0) {
        target[key] = items;
        return;
      }
    }
  }
}

function collectToolEventData(sources: PlainObject[], text: string, eventType: string): Record<string, unknown> {
  const eventData: Record<string, unknown> = {};

  copyStringField(eventData, sources, 'toolCallId', ['toolCallId', 'tool_call_id', 'callId', 'call_id']);
  copyStringField(eventData, sources, 'itemId', ['itemId', 'item_id']);
  copyStringField(eventData, sources, 'commandId', ['commandId', 'command_id']);
  copyStringField(eventData, sources, 'name', ['name', 'toolName', 'tool_name', 'command', 'title']);
  copyStringField(eventData, sources, 'title', ['title', 'label']);
  copyStringField(eventData, sources, 'kind', ['kind', 'type', 'stream']);
  copyStringField(eventData, sources, 'phase', ['phase']);
  copyStringField(eventData, sources, 'status', ['status']);
  copyStringField(eventData, sources, 'summary', ['summary', 'message', 'reason']);
  copyStringField(eventData, sources, 'progressText', ['progressText', 'progress_text', 'text']);
  copyStringField(eventData, sources, 'meta', ['meta']);
  copyStringField(eventData, sources, 'detailMode', ['detailMode', 'detail_mode']);
  copyStringField(eventData, sources, 'scope', ['scope']);
  copyStringField(eventData, sources, 'output', ['output', 'stdout', 'stderr', 'resultText', 'result_text']);
  copyStringField(eventData, sources, 'cwd', ['cwd']);
  copyStringField(eventData, sources, 'approvalId', ['approvalId', 'approval_id']);
  copyStringField(eventData, sources, 'approvalSlug', ['approvalSlug', 'approval_slug']);
  copyStringField(eventData, sources, 'host', ['host']);
  copyNumberField(eventData, sources, 'exitCode', ['exitCode', 'exit_code']);
  copyNumberField(eventData, sources, 'durationMs', ['durationMs', 'duration_ms']);
  copyBooleanField(eventData, sources, 'isError', ['isError', 'is_error']);
  copyPlainObjectField(eventData, sources, 'args', ['args', 'arguments']);
  copyStringArrayField(eventData, sources, 'added');
  copyStringArrayField(eventData, sources, 'modified');
  copyStringArrayField(eventData, sources, 'deleted');

  if (eventData.isError === true && !stringValue(eventData.status)) {
    eventData.status = 'error';
  }

  if (eventType === 'tool_output' && !stringValue(eventData.output) && text.trim()) {
    eventData.output = text.trim();
  }

  return eventData;
}

function mergeEventData(
  extracted: Record<string, unknown>,
  explicit: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!explicit) {
    return extracted;
  }

  const merged: Record<string, unknown> = { ...extracted };
  for (const [key, value] of Object.entries(explicit)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function clipText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 3))}...`;
}

function formatToolEventText(eventType: string, eventData: Record<string, unknown>, fallbackText: string): string {
  const text = fallbackText.trim();
  if (text) {
    return text;
  }

  const name =
    stringValue(eventData.name) ||
    stringValue(eventData.title) ||
    stringValue(eventData.kind) ||
    stringValue(eventData.toolCallId) ||
    stringValue(eventData.itemId);
  const status = stringValue(eventData.status) || stringValue(eventData.phase);
  const summary = stringValue(eventData.summary) || stringValue(eventData.progressText) || stringValue(eventData.meta);
  const output = stringValue(eventData.output);

  if (eventType === 'tool_start') {
    return `[tool] ${name ?? 'unknown'}${status ? ` (${status})` : ''}`;
  }

  if (eventType === 'tool_output') {
    if (output) {
      return `[command${name ? `:${name}` : ''}] ${clipText(output, 800)}`;
    }
    if (status || eventData.exitCode != null) {
      return `[command${name ? `:${name}` : ''}] ${status ?? 'finished'}${
        eventData.exitCode == null ? '' : ` (exit=${String(eventData.exitCode)})`
      }`;
    }
  }

  const label = eventType === 'tool_item' ? 'tool-item' : 'tool';
  const nextText = `[${label}] ${name ?? 'task'}${status ? ` - ${status}` : ''}${summary ? `: ${summary}` : ''}`;
  return clipText(nextText, 320);
}

function resolveToolEvent(params: {
  payload: ReplyPayload;
  kind?: DeliveryKind;
  eventType?: string;
  eventData?: Record<string, unknown>;
  text: string;
}): ToolEventInfo | null {
  const explicitEventType = params.eventType?.trim();
  const explicitToolEvent = explicitEventType?.toLowerCase().startsWith('tool_') === true;
  if (explicitEventType && !explicitToolEvent && params.kind !== 'tool') {
    return null;
  }

  const sources = collectToolMetadataSources(params.payload);
  const rawToolEventType = explicitEventType ?? getRawToolEventType(sources);
  const rawLower = rawToolEventType?.trim().toLowerCase().replace(/[-\s]+/g, '_');
  const hasToolType =
    rawLower != null &&
    (rawLower === 'tool' ||
      rawLower === 'tool_call' ||
      rawLower === 'tool_call_update' ||
      rawLower === 'tool_result' ||
      rawLower === 'tool_result_error' ||
      rawLower === 'tool_output' ||
      rawLower === 'command_output' ||
      rawLower === 'plan' ||
      rawLower === 'approval' ||
      rawLower === 'patch' ||
      rawLower.startsWith('tool_'));
  const shouldTreatAsTool = params.kind === 'tool' || explicitToolEvent || hasToolType || hasToolMarkerField(sources);

  if (!shouldTreatAsTool) {
    return null;
  }

  const eventType = normalizeToolEventType(rawToolEventType, params.kind);
  const extractedData = collectToolEventData(sources, params.text, eventType);
  const eventData = mergeEventData(extractedData, params.eventData);
  const text = formatToolEventText(eventType, eventData, params.text);

  return {
    kind: 'tool',
    eventType,
    eventData,
    text,
  };
}

function summarizeParts(parts: MessagePart[]): string {
  return parts
    .map((part) => {
      if (part.type === 'text') return part.text;
      if (part.type === 'image') return part.alt || part.name || part.url;
      return part.name || part.url;
    })
    .filter(Boolean)
    .join('\n');
}

// ---------------------------------------------------------------------------
// sendChunk — low-level send primitive
// ---------------------------------------------------------------------------

async function sendChunk(params: {
  client: OneainexusChatClient;
  sessionId: string;
  text?: string;
  parts?: MessagePart[];
  done?: boolean;
  finishReason?: string;
  kind?: DeliveryKind;
  eventType?: string;
  eventData?: Record<string, unknown>;
}): Promise<void> {
  const normalizedParts = params.parts ?? [];
  const fallbackText = params.text ?? summarizeParts(normalizedParts);

  await params.client.sendStructuredMessage(
    {
      type: 'chat_stream',
      sessionId: params.sessionId,
      content: fallbackText,
      parts: normalizedParts,
      data: {
        sessionId: params.sessionId,
        content: fallbackText,
        parts: normalizedParts,
        done: params.done ?? false,
        finishReason: params.finishReason,
        eventType: params.eventType ?? params.kind ?? 'message',
        kind: params.kind,
        event: params.eventData,
      },
    },
    {
      sessionId: params.sessionId,
      waitForAck: false,
    },
  );
}

// ---------------------------------------------------------------------------
// Public delivery function
// ---------------------------------------------------------------------------

export async function deliverReplyPayloadToSession(params: {
  accountId?: string | null;
  target: string;
  payload: ReplyPayload;
  kind?: DeliveryKind;
  eventType?: string;
  eventData?: Record<string, unknown>;
}): Promise<void> {
  const client = runtimeStore.getClient(params.accountId);
  const sessionId = ensureSessionTarget(params.target);
  const directMedia = resolvePayloadMedia(params.payload);
  rememberSessionMedia(sessionId, directMedia);

  const rawText = typeof params.payload.text === 'string' ? params.payload.text : '';
  const toolEvent = resolveToolEvent({
    payload: params.payload,
    ...(params.kind == null ? {} : { kind: params.kind }),
    ...(params.eventType == null ? {} : { eventType: params.eventType }),
    ...(params.eventData == null ? {} : { eventData: params.eventData }),
    text: rawText,
  });
  const text = toolEvent?.text ?? rawText;
  const deliveryKind = toolEvent?.kind ?? params.kind;
  const eventType = toolEvent?.eventType ?? params.eventType;
  const eventData = toolEvent?.eventData ?? params.eventData;

  const cachedMedia = getCachedSessionMedia(sessionId);
  const allMedia: PayloadMediaDescriptor[] = [...directMedia];
  const seenUrls = new Set(directMedia.map((m) => m.url));
  for (const item of cachedMedia) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      allMedia.push(item);
    }
  }

  // Auto-detect file paths in text (e.g. "文件已保存在 C:\path\to\file.xlsx")
  const textMedia = extractMediaDescriptorsFromText(text);
  for (const item of textMedia) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      allMedia.push(item);
    }
  }

  const parts = await Promise.all(
    allMedia.map((item) =>
      mediaUrlToMessagePart(item.url, {
        ...(item.fileName ? { fileName: item.fileName } : {}),
        ...(item.mimeType ? { mimeType: item.mimeType } : {}),
        ...(item.size !== undefined ? { size: item.size } : {}),
      }),
    ),
  ).then((items) => items.filter((part): part is MessagePart => part != null));

  const logger = runtimeStore.getRuntime().logging.getChildLogger({
    plugin: CHANNEL_ID,
    accountId: params.accountId ?? 'default',
  });

  logger.info(
    `[oneainexus-outbound] deliver payload kind=${deliveryKind ?? 'message'} textLen=${text.length} ` +
      `mediaCount=${parts.length} directMedia=${directMedia.length} textMedia=${textMedia.length} ` +
      `hasMediaField=${payloadHasMedia(params.payload)}`,
  );

  if (!text.trim() && parts.length === 0) {
    logger.warn(
      `[oneainexus-outbound] payload skipped: no text/media. channelDataKeys=${
        Object.keys(getChannelDataObject(params.payload) ?? {}).join(',') || '(none)'
      }`,
    );
    return;
  }

  await sendChunk({
    client,
    sessionId,
    text,
    parts,
    ...(deliveryKind == null ? {} : { kind: deliveryKind }),
    ...(eventType == null ? {} : { eventType }),
    ...(eventData == null ? {} : { eventData }),
  });
}

// ---------------------------------------------------------------------------
// Re-exports for stream module
// ---------------------------------------------------------------------------

export { sendChunk, ensureSessionTarget };
