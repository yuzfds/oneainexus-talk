import {
  buildChannelOutboundSessionRoute,
  createChannelPluginBase,
  createChatChannelPlugin,
  jsonResult,
  type OpenClawConfig,
} from 'openclaw/plugin-sdk/core';
import {
  oneainexusConfigAdapter,
  oneainexusConfigSchema,
  resolveOneainexusAccount,
} from './config.js';
import { oneainexusOutbound, parseOneainexusTarget } from './outbound/adapter.js';
import { deliverReplyPayloadToSession } from './outbound/deliver.js';
import { runtimeStore } from './runtime-store.js';
import { startAccountWorker } from './sdk-worker.js';
import { CHANNEL_ID, DEFAULT_DM_POLICY, type OneainexusAccount } from './types.js';
import { CONNECTOR_VERSION_LABEL } from './version.js';

const oneainexusPluginBase = {
  ...createChannelPluginBase<OneainexusAccount>({
    id: CHANNEL_ID,
    meta: {
      id: CHANNEL_ID,
      label: 'Oneainexus Chat',
      selectionLabel: 'Oneainexus Chat',
      docsPath: '/channels/oneainexus',
      docsLabel: 'oneainexus',
      blurb: 'Bridge OpenClaw with agent-app-backend via a persistent SDK client.',
      aliases: ['oneainexus-chat'],
      order: 80,
      quickstartAllowFrom: false,
    },
    capabilities: {
      chatTypes: ['direct'],
      media: true,
      threads: false,
      reactions: false,
      nativeCommands: true,
      blockStreaming: true,
    },
    reload: {
      configPrefixes: [`channels.${CHANNEL_ID}`],
    },
    setup: {
      resolveAccountId: ({ cfg, accountId }) => accountId ?? oneainexusConfigAdapter.defaultAccountId?.(cfg) ?? 'default',
      applyAccountConfig: ({ cfg, accountId, input }) => {
        const nextCfg = structuredClone(cfg);
        const channels = (nextCfg.channels ??= {});
        const channelSection = ((channels as Record<string, unknown>)[CHANNEL_ID] ??= {}) as Record<string, unknown>;
        const accounts = ((channelSection.accounts as Record<string, unknown> | undefined) ??= {});
        const existing = (accounts[accountId] as Record<string, unknown> | undefined) ?? {};

          accounts[accountId] = {
            ...existing,
            enabled: true,
            ...(input.name ? { name: input.name } : {}),
            ...(input.httpUrl || input.url ? { apiEndpoint: input.httpUrl ?? input.url } : {}),
            ...(input.webhookPath ? { wsPath: input.webhookPath } : {}),
            ...(input.userId || input.botToken || input.token ? { clientId: input.userId ?? input.botToken ?? input.token } : {}),
            ...(input.accessToken || input.password ? { clientSecret: input.accessToken ?? input.password } : {}),
          };

        return nextCfg;
      },
      validateInput: ({ input }) => {
        if (!input.httpUrl && !input.url) {
          return 'Oneainexus setup requires httpUrl or url for the chat gateway endpoint.';
        }

        return null;
      },
    },
  }),
  config: oneainexusConfigAdapter,
  configSchema: oneainexusConfigSchema,
};

export const oneainexusPlugin = createChatChannelPlugin<OneainexusAccount>({
  base: oneainexusPluginBase as Parameters<typeof createChatChannelPlugin<OneainexusAccount>>[0]['base'],
  security: {
    dm: {
      channelKey: CHANNEL_ID,
      resolvePolicy: (account) => account.dmPolicy || DEFAULT_DM_POLICY,
      resolveAllowFrom: (account) => account.allowFrom,
      defaultPolicy: DEFAULT_DM_POLICY,
    },
  },
  threading: {
    topLevelReplyToMode: 'off',
  },
  outbound: oneainexusOutbound,
});

oneainexusPlugin.messaging = {
  normalizeTarget: (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;

    return trimmed.startsWith('session:') ? trimmed : `session:${trimmed}`;
  },
  inferTargetChatType: () => 'direct',
  parseExplicitTarget: (params) => {
    const { normalizedTarget } = parseOneainexusTarget(params.raw);
    return {
      to: normalizedTarget,
      chatType: 'direct',
    };
  },
  resolveOutboundSessionRoute: (params) => {
    const { normalizedTarget } = parseOneainexusTarget(params.target);
    return buildChannelOutboundSessionRoute({
      cfg: params.cfg,
      agentId: params.agentId,
      channel: CHANNEL_ID,
      peer: {
        kind: 'direct',
        id: normalizedTarget,
      },
      chatType: 'direct',
      from: normalizedTarget,
      to: normalizedTarget,
      ...(params.accountId == null ? {} : { accountId: params.accountId }),
    });
  },
  targetResolver: {
    looksLikeId: (raw, normalized) => {
      const candidate = normalized ?? raw;
      return candidate.startsWith('session:');
    },
    hint: '<sessionId|session:sessionId>',
  },
};

oneainexusPlugin.agentPrompt = {
  messageToolHints: () => [
    '- Oneainexus supports sending file attachments (images, documents, archives) directly to the user.',
    '- IMPORTANT: After generating any file (xlsx, pdf, png, etc.), you MUST send it using the message tool with action="upload-file" and filePath="<absolute path>". Do NOT just tell the user where the file is saved.',
    '- Example: message(action="upload-file", filePath="C:\\Users\\Administrator\\.openclaw\\workspace\\testme.xlsx")',
    '- Supported media types: images (png, jpg, gif, webp, svg), documents (pdf, txt, md, docx, xlsx, pptx), and archives (zip).',
  ],
};

oneainexusPlugin.actions = {
  describeMessageTool: (_params) => {
    return {
      actions: ['send', 'sendAttachment', 'upload-file'],
      capabilities: [],
      schema: null,
    };
  },
  handleAction: async (ctx) => {
    const { action, params, accountId } = ctx;
    const to = (params.to as string) ?? '';
    const message = (params.message as string) ?? '';
    const mediaUrl =
      (params.media as string) ??
      (params.filePath as string) ??
      (params.path as string);

    const { normalizedTarget } = parseOneainexusTarget(to);
    const aid = accountId ?? undefined;

    if (action === 'sendAttachment' || action === 'upload-file') {
      await deliverReplyPayloadToSession({
        target: normalizedTarget,
        payload: {
          mediaUrl: mediaUrl ?? '',
          ...(message ? { text: message } : {}),
        },
        ...(aid == null ? {} : { accountId: aid }),
      });
      return jsonResult({ ok: true, channel: CHANNEL_ID, messageId: `${normalizedTarget}:${Date.now()}` });
    }

    await deliverReplyPayloadToSession({
      target: normalizedTarget,
      payload: {
        text: message,
        ...(mediaUrl ? { mediaUrl } : {}),
      },
      ...(aid == null ? {} : { accountId: aid }),
    });
    return jsonResult({ ok: true, channel: CHANNEL_ID, messageId: `${normalizedTarget}:${Date.now()}` });
  },
};

oneainexusPlugin.gateway = {
  startAccount: async (ctx) => {
    const runtime = runtimeStore.getRuntime();
    const logger = runtime.logging.getChildLogger({ plugin: CHANNEL_ID, accountId: ctx.accountId });
    logger.info(`Starting ${CONNECTOR_VERSION_LABEL} gateway account "${ctx.accountId}".`);

    const account = resolveOneainexusAccount({
      cfg: ctx.cfg as OpenClawConfig,
      accountId: ctx.accountId,
    });
    logger.info(
      `Resolved Oneainexus account "${account.accountId}": enabled=${account.enabled} configured=${account.configured}.`,
    );

    await startAccountWorker({
      cfg: ctx.cfg as OpenClawConfig,
      runtime,
      accountId: ctx.accountId,
      account,
      abortSignal: ctx.abortSignal,
      setStatus: ctx.setStatus,
      log: (message) => ctx.log?.info(message),
    });
  },
  stopAccount: async (ctx) => {
    const client = runtimeStore.tryGetClient(ctx.accountId);
    if (client) {
      await client.disconnect().catch(() => undefined);
      runtimeStore.removeClient(ctx.accountId);
    }
  },
};
