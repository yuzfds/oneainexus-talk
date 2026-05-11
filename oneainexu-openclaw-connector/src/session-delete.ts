import type { OpenClawConfig, PluginRuntime } from 'openclaw/plugin-sdk/core';
import { resolveSessionStoreEntry, updateSessionStore } from 'openclaw/plugin-sdk/config-runtime';
import { CHANNEL_ID, DEFAULT_ACCOUNT_ID } from './types.js';

function resolveSessionStoreConfig(cfg: OpenClawConfig): string | undefined {
  const cfgWithSession = cfg as OpenClawConfig & {
    session?: { store?: string };
    sessions?: { store?: string };
  };

  return cfgWithSession.session?.store ?? cfgWithSession.sessions?.store;
}

export async function deleteOpenClawSession(params: {
  cfg: OpenClawConfig;
  runtime: PluginRuntime;
  accountId?: string | null;
  sessionId: string;
}): Promise<{
  deleted: boolean;
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

  const storePath = params.runtime.channel.session.resolveStorePath(
    resolveSessionStoreConfig(params.cfg),
    { agentId: route.agentId },
  );

  const deleted = await updateSessionStore(storePath, (store) => {
    const resolved = resolveSessionStoreEntry({
      store,
      sessionKey: route.sessionKey,
    });

    if (!resolved.existing) {
      return false;
    }

    delete store[resolved.normalizedKey];
    for (const legacyKey of resolved.legacyKeys) {
      delete store[legacyKey];
    }
    return true;
  });

  return {
    deleted,
    sessionKey: route.sessionKey,
    storePath,
  };
}
