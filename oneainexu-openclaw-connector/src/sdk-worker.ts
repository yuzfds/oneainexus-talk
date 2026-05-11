import {
  ConnectionState,
  OneainexusChatClient,
  type ReceivedMessage,
} from '@oneainexus/chat-sdk';
import type { ChannelAccountSnapshot, OpenClawConfig, PluginRuntime } from 'openclaw/plugin-sdk/core';
import { CHANNEL_ID, type OneainexusAccount } from './types.js';
import { handleInboundSdkChat } from './inbound.js';
import { runtimeStore } from './runtime-store.js';
import { deleteOpenClawSession } from './session-delete.js';
import { MessageDedup } from './dedup.js';
import { emitSecurityWarnings } from './security.js';

const DEFAULT_WS_PATH = '/oneainexus-talk/api/_ws';

function resolveWsPath(apiEndpoint: string, wsPath?: string): string {
  const raw = wsPath?.trim();
  if (!raw) {
    return DEFAULT_WS_PATH;
  }

  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;

  // Backward compatibility:
  // If apiEndpoint is deployed under a sub-path and wsPath is still "/api/...",
  // prepend the apiEndpoint pathname to avoid dropping the deployment prefix.
  if (!normalizedPath.startsWith('/api/')) {
    return normalizedPath;
  }

  try {
    const endpoint = new URL(apiEndpoint);
    const endpointPath = endpoint.pathname.replace(/\/+$/, '');
    if (!endpointPath || endpointPath === '/') {
      return normalizedPath;
    }
    if (normalizedPath.startsWith(`${endpointPath}/`)) {
      return normalizedPath;
    }
    return `${endpointPath}${normalizedPath}`;
  } catch {
    return normalizedPath;
  }
}

function ensureRuntimeChannel(runtime: PluginRuntime): PluginRuntime['channel'] {
  if (!runtime.channel) {
    throw new Error('OpenClaw channel runtime helpers are not available.');
  }
  return runtime.channel;
}

function isSessionDeleteMessage(
  rawMessage: ReceivedMessage & { type: string; data?: unknown },
): rawMessage is ReceivedMessage & { type: 'session_delete'; data?: { sessionId?: string } } {
  return (rawMessage as { type?: string }).type === 'session_delete';
}

function resolveDeleteSessionId(rawMessage: ReceivedMessage & { data?: unknown }): string {
  if (rawMessage.data && typeof rawMessage.data === 'object') {
    const candidate = (rawMessage.data as { sessionId?: unknown }).sessionId;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (typeof rawMessage.sessionId === 'string' && rawMessage.sessionId.trim()) {
    return rawMessage.sessionId.trim();
  }

  throw new Error('Session delete message is missing sessionId.');
}

export async function startAccountWorker(params: {
  cfg: OpenClawConfig;
  runtime: PluginRuntime;
  accountId: string;
  account: OneainexusAccount;
  abortSignal: AbortSignal;
  setStatus?: (next: ChannelAccountSnapshot) => void;
  log?: (message: string) => void;
}): Promise<void> {
  const { cfg, runtime, accountId, account, abortSignal } = params;
  ensureRuntimeChannel(runtime);

  if (!account.apiEndpoint || !account.clientId || !account.clientSecret) {
    throw new Error(`Oneainexus account "${accountId}" is not fully configured.`);
  }

  const logger = runtime.logging.getChildLogger({ plugin: CHANNEL_ID, accountId });
  const dedup = new MessageDedup({ ttlMs: 12 * 60 * 60 * 1000, maxEntries: 5000 });

  emitSecurityWarnings(cfg, logger);

  const client = new OneainexusChatClient({
    apiEndpoint: account.apiEndpoint,
    clientId: account.clientId,
    clientSecret: account.clientSecret,
    wsPath: resolveWsPath(account.apiEndpoint, account.wsPath),
    enableAck: false,
    reconnect: true,
    logLevel: 'info',
  });

  const updateStatus = (
    state: ConnectionState,
    extra?: Omit<ChannelAccountSnapshot, 'accountId' | 'running' | 'connected' | 'lastState' | 'lastEventAt'>,
  ) => {
    params.setStatus?.({
      accountId,
      running: state !== ConnectionState.Disconnected,
      connected: state === ConnectionState.Connected,
      healthState: state,
      lastEventAt: Date.now(),
      ...(extra ?? {}),
    });
  };

  client.onStateChange((state) => {
    logger.info(`SDK connection state changed to ${state}`);
    updateStatus(state);
  });

  client.onError((error) => {
    logger.error(`SDK client error: ${String(error)}`);
    updateStatus(client.getConnectionState(), {
      lastError: String(error),
    });
  });

  client.onMessage(async (rawMessage: ReceivedMessage) => {
    const message = rawMessage as ReceivedMessage & { type: string; data?: unknown };

    if (message.type === 'chat') {
      if (!dedup.tryRecord(rawMessage.id, accountId)) {
        logger.debug?.(`Skipping duplicate inbound message: ${rawMessage.id}`);
        return;
      }
      try {
        await handleInboundSdkChat({
          cfg,
          runtime,
          accountId,
          rawMessage,
        });
        runtime.channel.activity.record({
          channel: CHANNEL_ID,
          accountId,
          direction: 'inbound',
        });
      } catch (error) {
        logger.error(`Failed to handle inbound SDK chat: ${String(error)}`);
      }
      return;
    }

    if (!isSessionDeleteMessage(message)) {
      return;
    }

    try {
      const sessionId = resolveDeleteSessionId(message);
      const result = await deleteOpenClawSession({
        cfg,
        runtime,
        accountId,
        sessionId,
      });

      if (result.deleted) {
        logger.info(`Deleted OpenClaw session "${result.sessionKey}" for oneainexus session "${sessionId}"`, {
          storePath: result.storePath,
        });
      } else {
        logger.warn(`OpenClaw session not found for oneainexus session "${sessionId}"`, {
          sessionKey: result.sessionKey,
          storePath: result.storePath,
        });
      }
    } catch (error) {
      logger.error(`Failed to delete OpenClaw session from SDK control message: ${String(error)}`);
    }
  });

  if (abortSignal.aborted) {
    logger.info(`Oneainexus SDK worker aborted before connect for account "${accountId}"`);
    updateStatus(ConnectionState.Disconnected, {
      lastStopAt: Date.now(),
    });
    return;
  }

  let stoppedByAbort = false;
  const handleAbort = () => {
    if (stoppedByAbort) {
      return;
    }
    stoppedByAbort = true;

    void client.disconnect().catch((abortError) => {
      logger.warn(`Graceful disconnect failed: ${String(abortError)}`);
    });
    dedup.dispose();
    runtimeStore.removeClient(accountId);
    updateStatus(ConnectionState.Disconnected, {
      lastStopAt: Date.now(),
    });
  };

  abortSignal.addEventListener('abort', handleAbort, { once: true });

  try {
    logger.info(`Connecting Oneainexus SDK client for account "${accountId}"`);
    updateStatus(ConnectionState.Connecting);

    await client.connect();
    if (abortSignal.aborted) {
      handleAbort();
      return;
    }

    runtimeStore.setClient(accountId, client);
    updateStatus(ConnectionState.Connected, {
      lastStartAt: Date.now(),
      baseUrl: account.apiEndpoint,
    });

    await new Promise<void>((resolve) => {
      if (abortSignal.aborted) {
        resolve();
        return;
      }

      abortSignal.addEventListener('abort', () => resolve(), { once: true });
    });
  } finally {
    abortSignal.removeEventListener('abort', handleAbort);
  }
}

