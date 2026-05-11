import type { OneainexusChatClient } from '@oneainexus/chat-sdk';
import { createPluginRuntimeStore } from 'openclaw/plugin-sdk/runtime-store';
import type { PluginRuntime } from 'openclaw/plugin-sdk/runtime-store';

const runtime = createPluginRuntimeStore<PluginRuntime>(
  'Oneainexus plugin runtime is not initialized yet.',
);

const clients = new Map<string, OneainexusChatClient>();

export const runtimeStore = {
  ...runtime,
  setClient(accountId: string, client: OneainexusChatClient) {
    clients.set(accountId, client);
  },
  getClient(accountId?: string | null): OneainexusChatClient {
    const resolvedAccountId = accountId ?? 'default';
    const client = clients.get(resolvedAccountId);
    if (!client) {
      throw new Error(`No Oneainexus SDK client is registered for account "${resolvedAccountId}".`);
    }
    return client;
  },
  tryGetClient(accountId?: string | null): OneainexusChatClient | null {
    return clients.get(accountId ?? 'default') ?? null;
  },
  removeClient(accountId?: string | null): void {
    clients.delete(accountId ?? 'default');
  },
  listClientAccountIds(): string[] {
    return Array.from(clients.keys());
  },
};

