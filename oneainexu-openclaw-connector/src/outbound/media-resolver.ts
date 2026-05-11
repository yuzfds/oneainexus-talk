import { Dirent, promises as fs } from 'node:fs';
import path from 'node:path';
import type { ReplyPayload } from 'openclaw/plugin-sdk/core';
import { CHANNEL_ID } from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeliveryKind = 'tool' | 'block' | 'final';

export type PayloadMediaDescriptor = {
  url: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
};

type SessionMediaCacheEntry = {
  items: PayloadMediaDescriptor[];
  updatedAt: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_MEDIA_CACHE_TTL_MS = 2 * 60 * 1000;
const SESSION_MEDIA_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const MEDIA_VALUE_KEYS = new Set([
  'mediaUrl',
  'mediaUrls',
  'filePath',
  'filePaths',
  'path',
  'paths',
  'localPath',
  'localPaths',
  'imagePath',
  'imagePaths',
  'attachment',
  'attachments',
  'file',
  'files',
  'image',
  'images',
]);

const FILE_NAME_KEYS = ['fileName', 'filename', 'name', 'title'];
const MIME_TYPE_KEYS = ['mimeType', 'contentType', 'type'];
const SIZE_KEYS = ['size', 'fileSize'];

const WORKSPACE_MEDIA_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg',
  '.pdf', '.txt', '.md', '.json', '.csv',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip',
]);

const WORKSPACE_SCAN_MAX_FILES = 512;
const WORKSPACE_SCAN_MAX_DEPTH = 4;

// ---------------------------------------------------------------------------
// Session media cache with periodic sweep
// ---------------------------------------------------------------------------

const recentSessionMedia = new Map<string, SessionMediaCacheEntry>();

const sessionMediaSweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of recentSessionMedia) {
    if (now - entry.updatedAt > SESSION_MEDIA_CACHE_TTL_MS) {
      recentSessionMedia.delete(key);
    } else {
      break;
    }
  }
}, SESSION_MEDIA_SWEEP_INTERVAL_MS);
sessionMediaSweepTimer.unref();

// ---------------------------------------------------------------------------
// Target helpers
// ---------------------------------------------------------------------------

export function ensureSessionTarget(target: string): string {
  const trimmed = target.trim();
  if (!trimmed) {
    throw new Error('Oneainexus target is required.');
  }

  return trimmed.startsWith('session:') ? trimmed.slice('session:'.length) : trimmed;
}

// ---------------------------------------------------------------------------
// Payload media extraction helpers
// ---------------------------------------------------------------------------

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function looksLikeMediaReference(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^(https?:\/\/|file:\/\/|data:)/i.test(trimmed)) return true;
  if (/^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith('\\\\')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg|pdf|txt|md|csv|json|docx?|xlsx?|pptx?|zip)$/i.test(trimmed);
}

function readFirstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readString(record[key]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function readFirstNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = readNumber(record[key]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Channel data helpers
// ---------------------------------------------------------------------------

export function getChannelDataObject(payload: ReplyPayload): Record<string, unknown> | null {
  return payload.channelData && typeof payload.channelData === 'object' && !Array.isArray(payload.channelData)
    ? (payload.channelData as Record<string, unknown>)
    : null;
}

function getOneainexusChannelData(payload: ReplyPayload): Record<string, unknown> | null {
  const channelData = getChannelDataObject(payload);
  if (!channelData) {
    return null;
  }

  const nested = channelData[CHANNEL_ID];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }

  return channelData;
}

// ---------------------------------------------------------------------------
// Media descriptor extraction from text
// ---------------------------------------------------------------------------

export function extractMediaDescriptorsFromText(text: string): PayloadMediaDescriptor[] {
  const matches = text.match(
    /(?:[A-Za-z]:\\[^\s"'<>|]+|\\\\[^\s"'<>|]+\\[^\s"'<>|]+|https?:\/\/[^\s"'<>]+|file:\/\/[^\s"'<>]+)/g,
  ) ?? [];

  const seen = new Set<string>();
  const results: PayloadMediaDescriptor[] = [];
  for (const match of matches) {
    const url = match.trim();
    if (!looksLikeMediaReference(url) || seen.has(url)) {
      continue;
    }

    seen.add(url);
    results.push({ url });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Session media cache operations
// ---------------------------------------------------------------------------

export function rememberSessionMedia(sessionId: string, items: PayloadMediaDescriptor[]): void {
  if (items.length === 0) {
    return;
  }

  recentSessionMedia.set(sessionId, {
    items: items.slice(-3),
    updatedAt: Date.now(),
  });
}

export function noteSessionMediaFromText(sessionId: string, text: string): void {
  const items = extractMediaDescriptorsFromText(text);
  rememberSessionMedia(sessionId, items);
}

async function collectRecentWorkspaceMedia(
  workspaceDir: string,
  now = Date.now(),
): Promise<PayloadMediaDescriptor[]> {
  const results: Array<PayloadMediaDescriptor & { mtimeMs: number }> = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: workspaceDir, depth: 0 }];
  let visitedFiles = 0;

  while (queue.length > 0 && visitedFiles < WORKSPACE_SCAN_MAX_FILES) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current.dir, entry.name);

      if (entry.isDirectory()) {
        if (current.depth < WORKSPACE_SCAN_MAX_DEPTH) {
          queue.push({ dir: fullPath, depth: current.depth + 1 });
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      visitedFiles += 1;

      const extension = path.extname(entry.name).toLowerCase();
      if (!WORKSPACE_MEDIA_EXTENSIONS.has(extension)) {
        continue;
      }

      try {
        const stat = await fs.stat(fullPath);
        if (now - stat.mtimeMs > SESSION_MEDIA_CACHE_TTL_MS) {
          continue;
        }

        results.push({
          url: fullPath,
          fileName: entry.name,
          ...(stat.size >= 0 ? { size: stat.size } : {}),
          mtimeMs: stat.mtimeMs,
        });
      } catch {
        continue;
      }
    }
  }

  return results
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, 3)
    .map(({ mtimeMs: _mtimeMs, ...item }) => item);
}

export async function noteSessionMediaFromWorkspace(sessionId: string, workspaceDir?: string | null): Promise<void> {
  const resolvedWorkspaceDir = workspaceDir?.trim();
  if (!resolvedWorkspaceDir) {
    return;
  }

  const items = await collectRecentWorkspaceMedia(resolvedWorkspaceDir);
  rememberSessionMedia(sessionId, items);
}

export function getCachedSessionMedia(sessionId: string): PayloadMediaDescriptor[] {
  const entry = recentSessionMedia.get(sessionId);
  if (!entry) {
    return [];
  }

  if (Date.now() - entry.updatedAt > SESSION_MEDIA_CACHE_TTL_MS) {
    recentSessionMedia.delete(sessionId);
    return [];
  }

  return entry.items;
}

// ---------------------------------------------------------------------------
// Payload media resolution
// ---------------------------------------------------------------------------

export function resolvePayloadMedia(payload: ReplyPayload): PayloadMediaDescriptor[] {
  const standardUrls = payload.mediaUrls?.length
    ? payload.mediaUrls
    : payload.mediaUrl
      ? [payload.mediaUrl]
      : [];

  const channelData = getOneainexusChannelData(payload);
  const channelUrls = Array.isArray(channelData?.mediaUrls)
    ? channelData.mediaUrls.map(readString).filter((value): value is string => Boolean(value))
    : [];
  const channelUrl = readString(channelData?.mediaUrl);

  const fileName = readString(channelData?.fileName) || readString(channelData?.name);
  const mimeType = readString(channelData?.mimeType) || readString(channelData?.contentType);
  const size = readNumber(channelData?.size);

  const results: PayloadMediaDescriptor[] = [];
  const seen = new Set<string>();
  const push = (url: string) => {
    const normalized = url.trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    results.push({
      url: normalized,
      ...(fileName ? { fileName } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(size !== undefined ? { size } : {}),
    });
  };

  for (const url of standardUrls) {
    push(url);
  }
  for (const url of channelUrls) {
    push(url);
  }
  if (channelUrl) {
    push(channelUrl);
  }

  return results;
}

export function payloadHasMedia(payload: ReplyPayload): boolean {
  return resolvePayloadMedia(payload).length > 0;
}
