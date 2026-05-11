/**
 * FIFO-based message deduplication.
 *
 * WebSocket connections may redeliver messages on reconnect.
 * This module tracks recently-seen message IDs and filters duplicates.
 *
 * Design choices:
 * - FIFO eviction (not LRU) — message IDs are write-once/check-once,
 *   no hot/cold access pattern. FIFO naturally expires the oldest entry
 *   first, which matches the dedup semantics.
 * - ES2015 `Map` preserves insertion order, giving us FIFO for free.
 * - Periodic sweep leverages FIFO ordering: iterate from oldest and
 *   `break` at the first non-expired entry → O(expired), not O(n).
 */

export interface MessageDedupOpts {
  ttlMs?: number;
  maxEntries?: number;
}

const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 5_000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

export class MessageDedup {
  private readonly store = new Map<string, number>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly sweepTimer: ReturnType<typeof setInterval>;

  constructor(opts: MessageDedupOpts = {}) {
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = opts.maxEntries ?? DEFAULT_MAX_ENTRIES;

    this.sweepTimer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();
  }

  tryRecord(id: string, scope?: string): boolean {
    const key = scope ? `${scope}:${id}` : id;
    const now = Date.now();

    const existing = this.store.get(key);
    if (existing !== undefined) {
      if (now - existing < this.ttlMs) {
        return false;
      }
      this.store.delete(key);
    }

    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) {
        this.store.delete(oldest);
      }
    }

    this.store.set(key, now);
    return true;
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    clearInterval(this.sweepTimer);
    this.store.clear();
  }

  dispose(): void {
    clearInterval(this.sweepTimer);
    this.store.clear();
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, ts] of this.store) {
      if (now - ts < this.ttlMs) break;
      this.store.delete(key);
    }
  }
}
