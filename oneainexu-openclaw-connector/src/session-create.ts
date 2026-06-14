import type { OpenClawConfig, PluginRuntime } from 'openclaw/plugin-sdk/core';
import { CHANNEL_ID, DEFAULT_ACCOUNT_ID } from './types.js';

function resolveSessionStoreConfig(cfg: OpenClawConfig): string | undefined {
  const cfgWithSession = cfg as OpenClawConfig & {
    session?: { store?: string };
    sessions?: { store?: string };
  };

  return cfgWithSession.session?.store ?? cfgWithSession.sessions?.store;
}

export async function createOpenClawSession(params: {
  cfg: OpenClawConfig;
  runtime: PluginRuntime;
  accountId?: string | null;
  sessionId: string;
  title?: string;
}): Promise<{
  sessionKey: string;
  storePath: string;
}> {
  const accountId = params.accountId ?? DEFAULT_ACCOUNT_ID;
  const target = `session:${params.sessionId}`;
  const route = params.runtime.channel.routing.resolveAgentRoute({
    cfg: params.cfg,
    channel: CHANNEL_ID,
    accountId,
    peer: {
      kind: 'direct',
      id: target,
    },
  });
  const routeAccountId = route.accountId ?? accountId;

  const ctxPayload = params.runtime.channel.reply.finalizeInboundContext({
    Body: '',
    BodyForAgent: '',
    RawBody: '',
    BodyForCommands: '',
    CommandBody: '',
    CommandAuthorized: true,
    From: target,
    To: target,
    AccountId: routeAccountId,
    SenderId: target,
    SenderName: target,
    MessageSid: `session-create:${params.sessionId}`,
    Timestamp: Date.now(),
    ChatType: 'direct',
    Provider: CHANNEL_ID,
    Surface: CHANNEL_ID,
    OriginatingChannel: CHANNEL_ID,
    OriginatingTo: target,
    ExplicitDeliverRoute: true,
    SessionKey: route.sessionKey,
    ...(params.title ? { ThreadLabel: params.title } : {}),
  });

  const storePath = params.runtime.channel.session.resolveStorePath(
    resolveSessionStoreConfig(params.cfg),
    { agentId: route.agentId },
  );

  await params.runtime.channel.session.recordInboundSession({
    storePath,
    sessionKey: route.sessionKey,
    ctx: ctxPayload,
    createIfMissing: true,
    updateLastRoute: {
      sessionKey: route.sessionKey,
      channel: CHANNEL_ID,
      to: target,
      accountId: routeAccountId,
    },
    onRecordError: (error) => {
      params.runtime.logging.getChildLogger({ plugin: CHANNEL_ID, accountId: routeAccountId }).warn(
        `Failed to record created OpenClaw session for ${target}: ${String(error)}`,
      );
    },
  });

  return {
    sessionKey: route.sessionKey,
    storePath,
  };
}
