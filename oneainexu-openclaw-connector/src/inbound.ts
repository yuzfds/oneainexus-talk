import type { MessagePart, ReceivedMessage } from '@oneainexus/chat-sdk';
import { resolveAgentWorkspaceDir } from 'openclaw/plugin-sdk/agent-runtime';
import type { OpenClawConfig, PluginRuntime } from 'openclaw/plugin-sdk/core';
import { partToOpenClawMediaPath } from './media-bridge.js';
import { DEFAULT_ACCOUNT_ID } from './types.js';
import {
  deliverReplyPayloadToSession,
} from './outbound/deliver.js';
import {
  noteSessionMediaFromText,
  noteSessionMediaFromWorkspace,
  payloadHasMedia,
} from './outbound/media-resolver.js';
import {
  sendStreamDone,
  sendStreamError,
  sendStreamEvent,
} from './outbound/stream.js';
import { CHANNEL_ID, type SDKChatEnvelope, type SDKChatTurn } from './types.js';

interface ReplyOptions {
  onPartialReply: (payload: { text?: string; mediaUrl?: string; mediaUrls?: string[] }) => Promise<void>;
  onToolStart: (payload: { name?: string; phase?: string }) => Promise<void>;
  onItemEvent: (payload: {
    itemId?: string;
    kind?: string;
    title?: string;
    name?: string;
    phase?: string;
    status?: string;
    summary?: string;
    progressText?: string;
  }) => Promise<void>;
  onCommandOutput: (payload: {
    itemId?: string;
    phase?: string;
    toolCallId?: string;
    name?: string;
    output?: string;
    status?: string;
    exitCode?: number | null;
  }) => Promise<void>;
}

function extractTextFromParts(parts?: MessagePart[]): string {
  if (!parts?.length) return '';

  return parts
    .map((part) => {
      if (part.type === 'text') return part.text;
      if (part.type === 'image') return part.alt || part.name || part.url;
      return part.name || part.url;
    })
    .filter(Boolean)
    .join('\n');
}

function normalizeTurnContent(message: SDKChatTurn): string {
  return message.content ?? extractTextFromParts(message.parts);
}

function extractEnvelope(rawMessage: ReceivedMessage): SDKChatEnvelope {
  if (!rawMessage.data || typeof rawMessage.data !== 'object') {
    return {};
  }

  return rawMessage.data as SDKChatEnvelope;
}

function clipText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 3))}...`;
}

function formatToolStartText(payload: { name?: string; phase?: string }): string | null {
  const name = payload.name?.trim();
  const phase = payload.phase?.trim();
  if (!name && !phase) return null;
  return `[tool] ${name ?? 'unknown'}${phase ? ` (${phase})` : ''}`;
}

function formatItemEventText(payload: {
  itemId?: string;
  kind?: string;
  title?: string;
  name?: string;
  phase?: string;
  status?: string;
  summary?: string;
  progressText?: string;
}): string | null {
  const title = payload.title?.trim() || payload.name?.trim() || payload.kind?.trim() || payload.itemId?.trim();
  const summary = payload.summary?.trim() || payload.progressText?.trim();
  const status = payload.status?.trim() || payload.phase?.trim();
  if (!title && !summary && !status) return null;
  const text = `[tool-item] ${title ?? 'task'}${status ? ` - ${status}` : ''}${summary ? `: ${summary}` : ''}`;
  return clipText(text, 320);
}

function formatCommandOutputText(payload: {
  name?: string;
  output?: string;
  status?: string;
  exitCode?: number | null;
}): string | null {
  const output = payload.output?.trim();
  const status = payload.status?.trim();
  const prefix = `[command${payload.name?.trim() ? `:${payload.name.trim()}` : ''}]`;

  if (output) {
    return `${prefix} ${clipText(output, 800)}`;
  }

  if (status || payload.exitCode != null) {
    return `${prefix} ${status ?? 'finished'}${payload.exitCode == null ? '' : ` (exit=${payload.exitCode})`}`;
  }

  return null;
}

function normalizeToolResultText(text?: string): string {
  return text?.trim() ?? '';
}

function resolveLatestUserTurn(envelope: SDKChatEnvelope): SDKChatTurn | null {
  const turns = envelope.messages ?? [];
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn?.role === 'user') {
      return turn;
    }
  }
  return null;
}

async function buildInboundMessageContext(params: {
  rawMessage: ReceivedMessage;
  target: string;
  accountId: string;
}) {
  const envelope = extractEnvelope(params.rawMessage);
  const latestUserTurn = resolveLatestUserTurn(envelope);
  if (!latestUserTurn) {
    return null;
  }

  const body = normalizeTurnContent(latestUserTurn);
  if (!body.trim()) {
    return null;
  }

  const mediaParts = (latestUserTurn.parts ?? []).filter((part): part is Extract<MessagePart, { type: 'image' | 'file' }> =>
    part.type === 'image' || part.type === 'file',
  );
  const mediaUrls = await Promise.all(mediaParts.map((part) => partToOpenClawMediaPath(part)));
  const mediaTypes = mediaParts.map(
    (part) => part.mimeType ?? (part.type === 'image' ? 'image/*' : 'application/octet-stream'),
  );

  return {
    body,
    msgContext: {
      Body: body,
      BodyForAgent: body,
      RawBody: body,
      BodyForCommands: body,
      CommandBody: body,
      CommandAuthorized: true,
      From: params.target,
      To: params.target,
      AccountId: params.accountId,
      SenderId: params.target,
      SenderName: params.target,
      MessageSid: params.rawMessage.id,
      Timestamp: params.rawMessage.timestamp,
      ChatType: 'direct',
      Provider: CHANNEL_ID,
      Surface: CHANNEL_ID,
      OriginatingChannel: CHANNEL_ID,
      OriginatingTo: params.target,
      ExplicitDeliverRoute: true,
      ...(mediaUrls.length > 0 ? { MediaUrls: mediaUrls, MediaTypes: mediaTypes } : {}),
    },
  };
}

export async function handleInboundSdkChat(params: {
  cfg: OpenClawConfig;
  runtime: PluginRuntime;
  accountId?: string | null;
  rawMessage: ReceivedMessage;
}): Promise<void> {
  const accountId = params.accountId ?? DEFAULT_ACCOUNT_ID;
  const logger = params.runtime.logging.getChildLogger({ plugin: CHANNEL_ID, accountId });
  const envelope = extractEnvelope(params.rawMessage);
  const sessionId = envelope.sessionId || params.rawMessage.sessionId;

  if (!sessionId) {
    throw new Error('Inbound SDK chat is missing sessionId.');
  }

  const target = `session:${sessionId}`;
  const inbound = await buildInboundMessageContext({
    rawMessage: params.rawMessage,
    target,
    accountId,
  });

  if (!inbound) {
    return;
  }

  const route = params.runtime.channel.routing.resolveAgentRoute({
    cfg: params.cfg,
    channel: CHANNEL_ID,
    accountId,
    peer: {
      kind: 'direct',
      id: target,
    },
  });

  const ctxPayload = params.runtime.channel.reply.finalizeInboundContext({
    ...inbound.msgContext,
    SessionKey: route.sessionKey,
  });
  const workspaceDir = resolveAgentWorkspaceDir(params.cfg, route.agentId);

  const cfgWithSession = params.cfg as OpenClawConfig & {
    session?: { store?: string };
    sessions?: { store?: string };
  };
  const sessionStorePath = cfgWithSession.session?.store ?? cfgWithSession.sessions?.store;
  const storePath = params.runtime.channel.session.resolveStorePath(sessionStorePath, {
    agentId: route.agentId,
  });
  await params.runtime.channel.session.recordInboundSession({
    storePath,
    sessionKey: route.sessionKey,
    ctx: ctxPayload,
    createIfMissing: true,
    updateLastRoute: {
      sessionKey: route.sessionKey,
      channel: CHANNEL_ID,
      to: target,
      accountId,
    },
    onRecordError: (error) => {
      params.runtime.logging.getChildLogger({ plugin: CHANNEL_ID }).warn(
        `Failed to record inbound session for ${target}: ${String(error)}`,
      );
    },
  });

  try {
    let streamedWithPartials = false;
    const itemEventDedupe = new Map<string, string>();
    const commandOutputDedupe = new Set<string>();
    let lastToolName: string | undefined;

    const replyOptions: ReplyOptions = {
      onPartialReply: async (payload: { text?: string; mediaUrl?: string; mediaUrls?: string[] }) => {
        const hasText = typeof payload.text === 'string' && payload.text.length > 0;
        const hasMedia = payloadHasMedia(payload);
        if (!hasText && !hasMedia) {
          return;
        }

        streamedWithPartials = true;
        await noteSessionMediaFromWorkspace(sessionId, workspaceDir);

        await deliverReplyPayloadToSession({
          accountId,
          target,
          payload,
          kind: 'block',
          eventType: 'partial',
        });
      },
      onToolStart: async (payload: { name?: string; phase?: string }) => {
        lastToolName = payload.name?.trim() || lastToolName;
        const text = formatToolStartText(payload);
        if (!text) return;
        await sendStreamEvent({
          accountId,
          target,
          text,
          eventType: 'tool_start',
          eventData: {
            name: payload.name,
            phase: payload.phase,
          },
        });
      },
      onItemEvent: async (payload: {
        itemId?: string;
        kind?: string;
        title?: string;
        name?: string;
        phase?: string;
        status?: string;
        summary?: string;
        progressText?: string;
      }) => {
        logger.debug?.('[connector] onItemEvent', payload);
        const signature = [
          payload.itemId ?? '',
          payload.phase ?? '',
          payload.status ?? '',
          payload.summary ?? '',
          payload.progressText ?? '',
        ].join('|');
        const dedupeKey = payload.itemId ?? `${payload.kind ?? ''}:${payload.name ?? ''}:${payload.title ?? ''}`;
        if (dedupeKey && itemEventDedupe.get(dedupeKey) === signature) {
          return;
        }
        if (dedupeKey) {
          itemEventDedupe.set(dedupeKey, signature);
        }

        const text = formatItemEventText(payload);
        if (!text) return;
        await sendStreamEvent({
          accountId,
          target,
          text,
          eventType: 'tool_item',
          eventData: {
            itemId: payload.itemId,
            kind: payload.kind,
            title: payload.title,
            name: payload.name,
            phase: payload.phase,
            status: payload.status,
            summary: payload.summary,
            progressText: payload.progressText,
          },
        });
      },
      onCommandOutput: async (payload: {
        itemId?: string;
        phase?: string;
        toolCallId?: string;
        name?: string;
        output?: string;
        status?: string;
        exitCode?: number | null;
      }) => {
        logger.debug?.('[connector] onCommandOutput', payload);
        const text = formatCommandOutputText(payload);
        if (!text) return;
        noteSessionMediaFromText(sessionId, `${payload.output ?? ''}\n${text}`);
        await noteSessionMediaFromWorkspace(sessionId, workspaceDir);
        commandOutputDedupe.add(normalizeToolResultText(text));
        await sendStreamEvent({
          accountId,
          target,
          text,
          eventType: 'tool_output',
          eventData: {
            itemId: payload.itemId,
            phase: payload.phase,
            toolCallId: payload.toolCallId,
            name: payload.name,
            status: payload.status,
            exitCode: payload.exitCode,
            output: payload.output,
          },
        });
      },
    };

    await params.runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
      ctx: ctxPayload,
      cfg: params.cfg,
      dispatcherOptions: {
        deliver: async (payload, info) => {
          if (info.kind === 'tool') {
            const text = normalizeToolResultText(payload.text);
            const hasMedia = payloadHasMedia(payload);
            if (text) {
              noteSessionMediaFromText(sessionId, text);
            }
            await noteSessionMediaFromWorkspace(sessionId, workspaceDir);
            const isDuplicateText = text.length > 0 && commandOutputDedupe.has(text);

            if (isDuplicateText && !hasMedia) {
              return;
            }
            if (text) {
              commandOutputDedupe.add(text);
            }

            await deliverReplyPayloadToSession({
              accountId,
              target,
              payload: {
                ...payload,
                text,
              },
              kind: 'tool',
              eventType: 'tool_output',
              eventData: {
                name: lastToolName,
                ...(text ? { output: text } : {}),
              },
            });
            return;
          }

          const shouldStripTextForDuplicate =
            streamedWithPartials &&
            (info.kind === 'block' || info.kind === 'final') &&
            typeof payload.text === 'string' &&
            payload.text.trim().length > 0;

          const nextPayload = shouldStripTextForDuplicate
            ? {
                ...payload,
                text: '',
              }
            : payload;

          await noteSessionMediaFromWorkspace(sessionId, workspaceDir);
          await deliverReplyPayloadToSession({
            accountId,
            target,
            payload: nextPayload,
            kind: info.kind,
          });
        },
        onError: (error, info) => {
          params.runtime.logging.getChildLogger({ plugin: CHANNEL_ID }).error(
            `Reply dispatch failed for ${target} (${info.kind}): ${String(error)}`,
          );
        },
      },
      replyOptions,
    });

    await sendStreamDone({
      accountId,
      target,
      finishReason: envelope.stream === false ? 'stop' : 'stream_end',
    });
  } catch (error) {
    await sendStreamError({
      accountId,
      target,
      error,
    });
  }
}

