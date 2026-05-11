import { z, toJSONSchema } from 'zod';
import type { ChannelAccountSnapshot, OpenClawConfig } from 'openclaw/plugin-sdk/core';
import {
  adaptScopedAccountAccessor,
  createScopedChannelConfigAdapter,
} from 'openclaw/plugin-sdk/channel-config-helpers';
import {
  CHANNEL_ID,
  DEFAULT_ACCOUNT_ID,
  DEFAULT_DM_POLICY,
  type OneainexusAccount,
} from './types.js';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const OneainexusAccountConfigSchema = z.object({
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  apiEndpoint: z.string().optional(),
  wsPath: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  dmPolicy: z.string().optional(),
  allowFrom: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v === undefined || v == null) return [];
      return Array.isArray(v) ? v : [v];
    }),
});

const OneainexusChannelConfigSchema = z.object({
  accounts: z.record(z.string(), OneainexusAccountConfigSchema).optional(),
});

// ---------------------------------------------------------------------------
// JSON Schema for plugin manifest
// ---------------------------------------------------------------------------

const ONEAINEXUS_CONFIG_JSON_SCHEMA: Record<string, unknown> = toJSONSchema(OneainexusChannelConfigSchema, {
  target: 'draft-07',
  io: 'input',
  unrepresentable: 'any',
});

// ---------------------------------------------------------------------------
// Account resolution
// ---------------------------------------------------------------------------

function resolveAccountsSection(cfg: OpenClawConfig): Record<string, unknown> {
  const channels = cfg.channels as Record<string, unknown> | undefined;
  const channelSection = (channels?.[CHANNEL_ID] ?? {}) as Record<string, unknown>;
  return (channelSection.accounts ?? {}) as Record<string, unknown>;
}

export function listOneainexusAccountIds(cfg: OpenClawConfig): string[] {
  return Object.keys(resolveAccountsSection(cfg));
}

export function resolveDefaultOneainexusAccountId(cfg: OpenClawConfig): string {
  const accountIds = listOneainexusAccountIds(cfg);
  if (accountIds.includes(DEFAULT_ACCOUNT_ID)) return DEFAULT_ACCOUNT_ID;
  return accountIds[0] ?? DEFAULT_ACCOUNT_ID;
}

export function resolveOneainexusAccount(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): OneainexusAccount {
  const accounts = resolveAccountsSection(params.cfg);
  const resolvedAccountId = params.accountId ?? resolveDefaultOneainexusAccountId(params.cfg);
  const raw = accounts[resolvedAccountId] ?? {};

  const parsed = OneainexusAccountConfigSchema.parse(raw);
  const enabled = parsed.enabled !== false;

  return {
    accountId: resolvedAccountId,
    enabled,
    configured: Boolean(parsed.apiEndpoint && parsed.clientId && parsed.clientSecret),
    allowFrom: parsed.allowFrom,
    dmPolicy: parsed.dmPolicy ?? DEFAULT_DM_POLICY,
    ...(parsed.name ? { name: parsed.name } : {}),
    ...(parsed.apiEndpoint ? { apiEndpoint: parsed.apiEndpoint } : {}),
    ...(parsed.wsPath ? { wsPath: parsed.wsPath } : {}),
    ...(parsed.clientId ? { clientId: parsed.clientId } : {}),
    ...(parsed.clientSecret ? { clientSecret: parsed.clientSecret } : {}),
  };
}

export function describeOneainexusAccount(account: OneainexusAccount): ChannelAccountSnapshot {
  return {
    accountId: account.accountId,
    ...(account.name ? { name: account.name } : {}),
    enabled: account.enabled,
    configured: account.configured,
    tokenSource: account.clientId ? 'config' : 'missing',
    secretSource: account.clientSecret ? 'config' : 'missing',
    ...(account.apiEndpoint ? { baseUrl: account.apiEndpoint } : {}),
  };
}

export const oneainexusConfigSchema = {
  schema: ONEAINEXUS_CONFIG_JSON_SCHEMA,
};

const baseConfigAdapter = createScopedChannelConfigAdapter<OneainexusAccount>({
  sectionKey: CHANNEL_ID,
  listAccountIds: (cfg) => listOneainexusAccountIds(cfg),
  resolveAccount: adaptScopedAccountAccessor(resolveOneainexusAccount),
  defaultAccountId: (cfg) => resolveDefaultOneainexusAccountId(cfg),
  clearBaseFields: [
    'name',
    'enabled',
    'apiEndpoint',
    'wsPath',
    'clientId',
    'clientSecret',
    'dmPolicy',
    'allowFrom',
  ],
  resolveAllowFrom: (account) => account.allowFrom,
  formatAllowFrom: (allowFrom) => allowFrom.map((entry) => String(entry).trim()).filter(Boolean),
});

export const oneainexusConfigAdapter = {
  ...baseConfigAdapter,
  isConfigured: (account: OneainexusAccount) => account.configured,
  isEnabled: (account: OneainexusAccount) => account.enabled,
  describeAccount: (account: OneainexusAccount) => describeOneainexusAccount(account),
};
