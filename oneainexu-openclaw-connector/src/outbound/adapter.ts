import type { ReplyPayload } from 'openclaw/plugin-sdk/core';
import { CHANNEL_ID } from '../types.js';
import { ensureSessionTarget } from './media-resolver.js';
import { deliverReplyPayloadToSession } from './deliver.js';

// ---------------------------------------------------------------------------
// Target parsing
// ---------------------------------------------------------------------------

export function parseOneainexusTarget(target: string): { sessionId: string; normalizedTarget: string } {
  const sessionId = ensureSessionTarget(target);
  return {
    sessionId,
    normalizedTarget: `session:${sessionId}`,
  };
}

// ---------------------------------------------------------------------------
// Outbound adapter (flat structure, matching ChannelOutboundAdapter)
// ---------------------------------------------------------------------------

export const oneainexusOutbound = {
  deliveryMode: 'direct' as const,
  chunkerMode: 'markdown' as const,
  textChunkLimit: 4000,

  sendText: async (ctx: {
    to: string;
    text: string;
    accountId?: string | null;
  }) => {
    const { normalizedTarget } = parseOneainexusTarget(ctx.to);
    await deliverReplyPayloadToSession({
      target: normalizedTarget,
      payload: { text: ctx.text },
      ...(ctx.accountId == null ? {} : { accountId: ctx.accountId }),
    });
    return {
      channel: CHANNEL_ID,
      messageId: `${normalizedTarget}:${Date.now()}`,
      chatId: normalizedTarget,
    };
  },

  sendMedia: async (ctx: {
    to: string;
    text?: string;
    mediaUrl?: string;
    accountId?: string | null;
  }) => {
    if (!ctx.mediaUrl) {
      throw new Error('Oneainexus sendMedia requires a mediaUrl.');
    }

    const { normalizedTarget } = parseOneainexusTarget(ctx.to);
    const payload: ReplyPayload = {
      mediaUrl: ctx.mediaUrl,
      ...(ctx.text ? { text: ctx.text } : {}),
    };
    await deliverReplyPayloadToSession({
      target: normalizedTarget,
      payload,
      ...(ctx.accountId == null ? {} : { accountId: ctx.accountId }),
    });
    return {
      channel: CHANNEL_ID,
      messageId: `${normalizedTarget}:${Date.now()}`,
      chatId: normalizedTarget,
    };
  },

  sendPayload: async (ctx: {
    to: string;
    payload: ReplyPayload;
    accountId?: string | null;
  }) => {
    const { normalizedTarget } = parseOneainexusTarget(ctx.to);
    await deliverReplyPayloadToSession({
      target: normalizedTarget,
      payload: ctx.payload,
      ...(ctx.accountId == null ? {} : { accountId: ctx.accountId }),
    });
    return {
      channel: CHANNEL_ID,
      messageId: `${normalizedTarget}:${Date.now()}`,
      chatId: normalizedTarget,
    };
  },
};
