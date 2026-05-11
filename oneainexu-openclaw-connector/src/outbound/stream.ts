import { runtimeStore } from '../runtime-store.js';
import { sendChunk, ensureSessionTarget } from './deliver.js';

// ---------------------------------------------------------------------------
// Stream event helpers
// ---------------------------------------------------------------------------

export async function sendStreamEvent(params: {
  accountId?: string | null;
  target: string;
  text: string;
  eventType: string;
  eventData?: Record<string, unknown>;
}): Promise<void> {
  if (!params.text.trim()) {
    return;
  }

  await sendChunk({
    client: runtimeStore.getClient(params.accountId),
    sessionId: ensureSessionTarget(params.target),
    text: params.text,
    eventType: params.eventType,
    ...(params.eventData == null ? {} : { eventData: params.eventData }),
  });
}

export async function sendStreamDone(params: {
  accountId?: string | null;
  target: string;
  finishReason?: string;
}): Promise<void> {
  await sendChunk({
    client: runtimeStore.getClient(params.accountId),
    sessionId: ensureSessionTarget(params.target),
    text: '',
    done: true,
    finishReason: params.finishReason ?? 'stop',
    eventType: 'done',
  });
}

export async function sendStreamError(params: {
  accountId?: string | null;
  target: string;
  error: unknown;
}): Promise<void> {
  const message = params.error instanceof Error ? params.error.message : String(params.error);
  await sendChunk({
    client: runtimeStore.getClient(params.accountId),
    sessionId: ensureSessionTarget(params.target),
    text: `Connector error: ${message}`,
  });
  await sendStreamDone({
    target: params.target,
    finishReason: 'error',
    ...(params.accountId == null ? {} : { accountId: params.accountId }),
  });
}
