import type { MessagePart, ReceivedMessage } from '@oneainexus/chat-sdk';
import { resolveAgentWorkspaceDir } from 'openclaw/plugin-sdk/agent-runtime';
import type { OpenClawConfig, PluginRuntime, ReplyPayload } from 'openclaw/plugin-sdk/core';
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
  suppressDefaultToolProgressMessages?: boolean;
  allowProgressCallbacksWhenSourceDeliverySuppressed?: boolean;
  onPartialReply: (payload: { text?: string; mediaUrl?: string; mediaUrls?: string[] }) => Promise<void>;
  onToolStart: (payload: {
    itemId?: string;
    toolCallId?: string;
    name?: string;
    phase?: string;
    args?: Record<string, unknown>;
    detailMode?: 'explain' | 'raw';
  }) => Promise<void>;
  onItemEvent: (payload: {
    itemId?: string;
    kind?: string;
    title?: string;
    name?: string;
    phase?: string;
    status?: string;
    summary?: string;
    progressText?: string;
    meta?: string;
    approvalId?: string;
    approvalSlug?: string;
  }) => Promise<void>;
  onCommandOutput: (payload: {
    itemId?: string;
    phase?: string;
    title?: string;
    toolCallId?: string;
    name?: string;
    output?: string;
    status?: string;
    exitCode?: number | null;
    durationMs?: number;
    cwd?: string;
  }) => Promise<void>;
  onPlanUpdate: (payload: {
    phase?: string;
    title?: string;
    explanation?: string;
    steps?: string[];
    source?: string;
  }) => Promise<void>;
  onApprovalEvent: (payload: {
    phase?: string;
    kind?: string;
    status?: string;
    title?: string;
    itemId?: string;
    toolCallId?: string;
    approvalId?: string;
    approvalSlug?: string;
    command?: string;
    host?: string;
    reason?: string;
    scope?: 'turn' | 'session';
    message?: string;
  }) => Promise<void>;
  onPatchSummary: (payload: {
    itemId?: string;
    phase?: string;
    title?: string;
    toolCallId?: string;
    name?: string;
    added?: string[];
    modified?: string[];
    deleted?: string[];
    summary?: string;
  }) => Promise<void>;
  onToolResult: (payload: ReplyPayload) => Promise<void>;
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

function formatPlanUpdateText(payload: {
  phase?: string;
  title?: string;
  explanation?: string;
  steps?: string[];
}): string | null {
  const title = payload.title?.trim() || 'plan';
  const status = payload.phase?.trim();
  const steps = payload.steps?.map((step) => step.trim()).filter(Boolean).join('; ');
  const summary = payload.explanation?.trim() || steps;
  if (!title && !status && !summary) return null;
  return clipText(`[tool-item] ${title}${status ? ` - ${status}` : ''}${summary ? `: ${summary}` : ''}`, 480);
}

function formatApprovalEventText(payload: {
  phase?: string;
  kind?: string;
  status?: string;
  title?: string;
  approvalId?: string;
  approvalSlug?: string;
  command?: string;
  host?: string;
  reason?: string;
  message?: string;
}): string | null {
  const title =
    payload.title?.trim() ||
    payload.command?.trim() ||
    payload.kind?.trim() ||
    payload.approvalSlug?.trim() ||
    payload.approvalId?.trim();
  const status = payload.status?.trim() || payload.phase?.trim();
  const summary = payload.message?.trim() || payload.reason?.trim() || payload.host?.trim();
  if (!title && !status && !summary) return null;
  return clipText(`[tool-item] ${title ?? 'approval'}${status ? ` - ${status}` : ''}${summary ? `: ${summary}` : ''}`, 480);
}

function formatPatchSummaryText(payload: {
  name?: string;
  title?: string;
  phase?: string;
  added?: string[];
  modified?: string[];
  deleted?: string[];
  summary?: string;
}): string | null {
  const name = payload.name?.trim() || payload.title?.trim() || 'patch';
  const status = payload.phase?.trim();
  const changes = [
    payload.added?.length ? `added ${payload.added.length}` : '',
    payload.modified?.length ? `modified ${payload.modified.length}` : '',
    payload.deleted?.length ? `deleted ${payload.deleted.length}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  const summary = payload.summary?.trim() || changes;
  if (!name && !status && !summary) return null;
  return clipText(`[command:${name}] ${status ? `${status}: ` : ''}${summary ?? 'finished'}`, 800);
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
      suppressDefaultToolProgressMessages: false,
      allowProgressCallbacksWhenSourceDeliverySuppressed: true,
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
      onToolStart: async (payload: {
        itemId?: string;
        toolCallId?: string;
        name?: string;
        phase?: string;
        args?: Record<string, unknown>;
        detailMode?: 'explain' | 'raw';
      }) => {
        lastToolName = payload.name?.trim() || lastToolName;
        const text = formatToolStartText(payload);
        if (!text) return;
        await sendStreamEvent({
          accountId,
          target,
          text,
          eventType: 'tool_start',
          eventData: {
            itemId: payload.itemId,
            toolCallId: payload.toolCallId,
            name: payload.name,
            phase: payload.phase,
            args: payload.args,
            detailMode: payload.detailMode,
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
        meta?: string;
        approvalId?: string;
        approvalSlug?: string;
      }) => {
        logger.debug?.('[connector] onItemEvent', payload);
        const signature = [
          payload.itemId ?? '',
          payload.phase ?? '',
          payload.status ?? '',
          payload.summary ?? '',
          payload.progressText ?? '',
          payload.meta ?? '',
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
            meta: payload.meta,
            approvalId: payload.approvalId,
            approvalSlug: payload.approvalSlug,
          },
        });
      },
      onCommandOutput: async (payload: {
        itemId?: string;
        phase?: string;
        title?: string;
        toolCallId?: string;
        name?: string;
        output?: string;
        status?: string;
        exitCode?: number | null;
        durationMs?: number;
        cwd?: string;
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
            title: payload.title,
            status: payload.status,
            exitCode: payload.exitCode,
            durationMs: payload.durationMs,
            cwd: payload.cwd,
            output: payload.output,
          },
        });
      },
      onPlanUpdate: async (payload: {
        phase?: string;
        title?: string;
        explanation?: string;
        steps?: string[];
        source?: string;
      }) => {
        logger.debug?.('[connector] onPlanUpdate', payload);
        const text = formatPlanUpdateText(payload);
        if (!text) return;
        await sendStreamEvent({
          accountId,
          target,
          text,
          eventType: 'tool_item',
          eventData: {
            kind: 'plan',
            phase: payload.phase,
            title: payload.title,
            summary: payload.explanation,
            steps: payload.steps,
            source: payload.source,
          },
        });
      },
      onApprovalEvent: async (payload: {
        phase?: string;
        kind?: string;
        status?: string;
        title?: string;
        itemId?: string;
        toolCallId?: string;
        approvalId?: string;
        approvalSlug?: string;
        command?: string;
        host?: string;
        reason?: string;
        scope?: 'turn' | 'session';
        message?: string;
      }) => {
        logger.debug?.('[connector] onApprovalEvent', payload);
        const text = formatApprovalEventText(payload);
        if (!text) return;
        await sendStreamEvent({
          accountId,
          target,
          text,
          eventType: 'tool_item',
          eventData: {
            kind: payload.kind ?? 'approval',
            phase: payload.phase,
            status: payload.status,
            title: payload.title,
            itemId: payload.itemId,
            toolCallId: payload.toolCallId,
            approvalId: payload.approvalId,
            approvalSlug: payload.approvalSlug,
            command: payload.command,
            host: payload.host,
            reason: payload.reason,
            scope: payload.scope,
            message: payload.message,
          },
        });
      },
      onPatchSummary: async (payload: {
        itemId?: string;
        phase?: string;
        title?: string;
        toolCallId?: string;
        name?: string;
        added?: string[];
        modified?: string[];
        deleted?: string[];
        summary?: string;
      }) => {
        logger.debug?.('[connector] onPatchSummary', payload);
        const text = formatPatchSummaryText(payload);
        if (!text) return;
        await sendStreamEvent({
          accountId,
          target,
          text,
          eventType: 'tool_output',
          eventData: {
            itemId: payload.itemId,
            phase: payload.phase,
            title: payload.title,
            toolCallId: payload.toolCallId,
            name: payload.name ?? payload.title,
            status: payload.phase,
            output: payload.summary,
            added: payload.added,
            modified: payload.modified,
            deleted: payload.deleted,
          },
        });
      },
      onToolResult: async (payload: ReplyPayload) => {
        logger.debug?.('[connector] onToolResult', payload);
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

        const eventData: Record<string, unknown> = {};
        if (lastToolName) {
          eventData.name = lastToolName;
        }
        if (text) {
          eventData.output = text;
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
          eventData,
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

