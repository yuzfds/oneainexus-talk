import type { OpenClawConfig } from 'openclaw/plugin-sdk/core';
import { listOneainexusAccountIds, resolveOneainexusAccount } from './config.js';

// ---------------------------------------------------------------------------
// Secret masking
// ---------------------------------------------------------------------------

export function maskSecret(value: string): string {
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}****${value.slice(-2)}`;
}

// ---------------------------------------------------------------------------
// Multi-account isolation check
// ---------------------------------------------------------------------------

export function emitSecurityWarnings(
  cfg: OpenClawConfig,
  logger: { warn?: (msg: string) => void; info?: (msg: string) => void },
): void {
  const accountIds = listOneainexusAccountIds(cfg);
  if (accountIds.length <= 1) return;

  const enabledAccounts = accountIds
    .map((id) => resolveOneainexusAccount({ cfg, accountId: id }))
    .filter((account) => account.enabled);

  if (enabledAccounts.length <= 1) return;

  const hasBindings = cfg.bindings?.some(
    (b) => b.match?.channel === 'oneainexus' && b.match?.accountId,
  );

  if (!hasBindings) {
    logger.warn?.(
      `[security] Multiple oneainexus accounts (${enabledAccounts.length}) are enabled without agent bindings. ` +
        `All accounts will share the default agent. Add bindings to isolate accounts:\n` +
        enabledAccounts
          .map((a) => `  openclaw config set bindings[+].match.channel oneainexus && openclaw config set bindings[-1].match.accountId ${a.accountId}`)
          .join('\n'),
    );
  }
}
