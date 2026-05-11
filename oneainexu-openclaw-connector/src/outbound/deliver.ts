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

  const text = typeof params.payload.text === 'string' ? params.payload.text : '';

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
    `[oneainexus-outbound] deliver payload kind=${params.kind ?? 'message'} textLen=${text.length} ` +
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
    ...(params.kind == null ? {} : { kind: params.kind }),
    ...(params.eventType == null ? {} : { eventType: params.eventType }),
    ...(params.eventData == null ? {} : { eventData: params.eventData }),
  });
}

// ---------------------------------------------------------------------------
// Re-exports for stream module
// ---------------------------------------------------------------------------

export { sendChunk, ensureSessionTarget };
