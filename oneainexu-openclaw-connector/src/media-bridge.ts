import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import type { MessagePart } from '@oneainexus/chat-sdk';
import type { PluginRuntime } from 'openclaw/plugin-sdk/core';

const MEDIA_DIR = path.join(tmpdir(), 'oneainexus-openclaw-connector-media');

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
};

const EXTENSION_BY_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_BY_EXTENSION).map(([extension, mime]) => [mime, extension]),
);

function sanitizeFileName(value: string): string {
  const trimmed = value.trim();
  const sanitized = trimmed.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
  return sanitized || 'attachment';
}

function normalizeMediaUrlInput(value: string): string {
  let raw = value.trim();
  if (!raw) return raw;

  if (raw.startsWith('<') && raw.endsWith('>') && raw.length >= 2) {
    raw = raw.slice(1, -1).trim();
  }

  const first = raw[0];
  const last = raw[raw.length - 1];
  if (
    raw.length >= 2 &&
    ((first === '"' && last === '"') || (first === "'" && last === "'") || (first === '`' && last === '`'))
  ) {
    raw = raw.slice(1, -1).trim();
  }

  return raw;
}

function decodeDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,([\s\S]+)$/i.exec(dataUrl);
  if (!match) return null;

  const mimeType = match[1]?.trim() || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? '';

  try {
    const buffer = isBase64
      ? Buffer.from(payload, 'base64')
      : Buffer.from(decodeURIComponent(payload), 'utf8');
    return {
      mimeType,
      buffer,
    };
  } catch {
    return null;
  }
}

function inferMimeTypeFromName(fileName?: string | null): string | undefined {
  if (!fileName) return undefined;
  return MIME_BY_EXTENSION[path.extname(fileName).toLowerCase()];
}

function inferExtensionFromMimeType(mimeType?: string | null): string {
  if (!mimeType) return '';
  return EXTENSION_BY_MIME[mimeType.toLowerCase()] ?? '';
}

function inferFileNameFromUrl(rawValue: string): string | undefined {
  const trimmed = rawValue.trim();
  if (!trimmed) return undefined;

  if (/^data:/i.test(trimmed)) {
    return undefined;
  }

  try {
    if (trimmed.startsWith('file://')) {
      return path.basename(fileURLToPath(trimmed));
    }

    const parsed = new URL(trimmed);
    const segment = parsed.pathname.split('/').pop();
    return segment ? decodeURIComponent(segment) : undefined;
  } catch {
    return path.basename(trimmed);
  }
}

function resolveMimeType(params: {
  explicitMimeType?: string | null;
  fileName?: string | null;
  url?: string | null;
}): string | undefined {
  return params.explicitMimeType ?? inferMimeTypeFromName(params.fileName) ?? inferMimeTypeFromName(params.url);
}

function buildDataUrl(buffer: Buffer, mimeType?: string | null): string {
  const safeMimeType = mimeType?.trim() || 'application/octet-stream';
  return `data:${safeMimeType};base64,${buffer.toString('base64')}`;
}

function isImageMimeType(mimeType?: string | null): boolean {
  return Boolean(mimeType?.startsWith('image/'));
}

function normalizeLocalPath(value: string): string {
  return value.startsWith('file://') ? fileURLToPath(value) : value;
}

async function ensureMediaDir(): Promise<void> {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function persistMediaBuffer(params: {
  buffer: Buffer;
  fileName?: string | null;
  mimeType?: string | null;
  runtime?: PluginRuntime | null;
}): Promise<string> {
  if (params.runtime?.channel?.media?.saveMediaBuffer) {
    const saved = await params.runtime.channel.media.saveMediaBuffer(
      params.buffer,
      params.mimeType ?? undefined,
      'inbound',
      FETCH_REMOTE_MAX_BYTES,
      params.fileName ?? undefined,
    );
    return saved.path;
  }

  await ensureMediaDir();

  const baseName = sanitizeFileName(
    params.fileName || `attachment${inferExtensionFromMimeType(params.mimeType)}`,
  );
  const extension = path.extname(baseName) || inferExtensionFromMimeType(params.mimeType);
  const stem = extension ? baseName.slice(0, -extension.length) : baseName;
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${sanitizeFileName(stem)}${extension}`;
  const outputPath = path.join(MEDIA_DIR, fileName);

  await fs.writeFile(outputPath, params.buffer);
  return outputPath;
}

const FETCH_REMOTE_TIMEOUT_MS = 30_000;
const FETCH_REMOTE_MAX_BYTES = 50 * 1024 * 1024;

async function fetchRemoteBuffer(url: string): Promise<{ buffer: Buffer; mimeType?: string; fileName?: string }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_REMOTE_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Failed to fetch media "${url}": ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const declaredSize = parseInt(contentLength, 10);
    if (Number.isFinite(declaredSize) && declaredSize > FETCH_REMOTE_MAX_BYTES) {
      throw new Error(`Remote media "${url}" exceeds size limit: ${declaredSize} bytes > ${FETCH_REMOTE_MAX_BYTES} bytes.`);
    }
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > FETCH_REMOTE_MAX_BYTES) {
    throw new Error(`Downloaded media from "${url}" exceeds size limit: ${arrayBuffer.byteLength} bytes > ${FETCH_REMOTE_MAX_BYTES} bytes.`);
  }

  const mimeType = response.headers.get('content-type')?.split(';', 1)[0] ?? undefined;
  const fileName = inferFileNameFromUrl(url);
  return {
    buffer: Buffer.from(arrayBuffer),
    ...(mimeType ? { mimeType } : {}),
    ...(fileName ? { fileName } : {}),
  };
}

export async function partToOpenClawMediaPath(
  part: Extract<MessagePart, { type: 'image' | 'file' }>,
): Promise<string> {
  return (await partToOpenClawMedia(part)).path;
}

export type OpenClawMediaPart = {
  path: string;
  contentType: string;
  fileName?: string;
  resourceType: 'image' | 'file';
  size?: number;
};

export async function partToOpenClawMedia(
  part: Extract<MessagePart, { type: 'image' | 'file' }>,
  runtime?: PluginRuntime | null,
): Promise<OpenClawMediaPart> {
  const normalizedUrl = normalizeMediaUrlInput(part.url);
  if (!normalizedUrl) {
    throw new Error('Empty media URL.');
  }

  if (/^data:/i.test(normalizedUrl)) {
    const decoded = decodeDataUrl(normalizedUrl);
    if (!decoded) {
      throw new Error('Invalid data URL attachment.');
    }
    const fileName = part.name || `attachment${inferExtensionFromMimeType(part.mimeType || decoded.mimeType)}`;
    const contentType = part.mimeType || decoded.mimeType || resolveMimeType({ fileName }) || defaultMimeTypeForPart(part);
    const savedPath = await persistMediaBuffer({
      buffer: decoded.buffer,
      fileName,
      mimeType: contentType,
      ...(runtime ? { runtime } : {}),
    });
    return buildOpenClawMediaPart(part, savedPath, contentType, fileName, decoded.buffer.length);
  }

  if (/^https?:\/\//i.test(normalizedUrl)) {
    const remote = await fetchRemoteBuffer(normalizedUrl);
    const fileName = part.name || remote.fileName || inferFileNameFromUrl(normalizedUrl);
    const contentType =
      part.mimeType ||
      remote.mimeType ||
      resolveMimeType({
        ...(fileName ? { fileName } : {}),
        url: normalizedUrl,
      }) ||
      defaultMimeTypeForPart(part);
    const savedPath = await persistMediaBuffer({
      buffer: remote.buffer,
      ...(fileName ? { fileName } : {}),
      mimeType: contentType,
      ...(runtime ? { runtime } : {}),
    });
    return buildOpenClawMediaPart(part, savedPath, contentType, fileName, remote.buffer.length);
  }

  const localPath = normalizeLocalPath(normalizedUrl);
  const fileName = part.name || inferFileNameFromUrl(normalizedUrl) || path.basename(localPath);
  const contentType =
    part.mimeType ||
    resolveMimeType({ fileName, url: localPath }) ||
    defaultMimeTypeForPart(part);
  if (runtime) {
    try {
      const buffer = await fs.readFile(localPath);
      const savedPath = await persistMediaBuffer({
        buffer,
        fileName,
        mimeType: contentType,
        runtime,
      });
      return buildOpenClawMediaPart(part, savedPath, contentType, fileName, buffer.length);
    } catch {
      // Keep the previous behavior for paths the bridge cannot read directly.
    }
  }
  return buildOpenClawMediaPart(part, localPath, contentType, fileName, 'size' in part ? part.size : undefined);
}

function defaultMimeTypeForPart(part: Extract<MessagePart, { type: 'image' | 'file' }>): string {
  return part.type === 'image' ? 'image/*' : 'application/octet-stream';
}

function buildOpenClawMediaPart(
  part: Extract<MessagePart, { type: 'image' | 'file' }>,
  mediaPath: string,
  contentType: string,
  fileName?: string,
  size?: number,
): OpenClawMediaPart {
  return {
    path: mediaPath,
    contentType,
    ...(fileName ? { fileName: sanitizeFileName(fileName) } : {}),
    resourceType: part.type,
    ...(typeof size === 'number' && Number.isFinite(size) ? { size } : {}),
  };
}

export async function mediaUrlToMessagePart(
  mediaUrl: string,
  hints?: {
    fileName?: string;
    mimeType?: string;
    size?: number;
  },
): Promise<MessagePart | null> {
  const trimmed = normalizeMediaUrlInput(mediaUrl);
  if (!trimmed) return null;

  if (/^data:/i.test(trimmed)) {
    const decoded = decodeDataUrl(trimmed);
    if (!decoded) return null;
    const resolvedMimeType = hints?.mimeType || decoded.mimeType;
    const name = sanitizeFileName(
      hints?.fileName || inferFileNameFromUrl(trimmed) || `attachment${inferExtensionFromMimeType(resolvedMimeType)}`,
    );
    if (isImageMimeType(resolvedMimeType)) {
      return {
        type: 'image',
        url: trimmed,
        mimeType: resolvedMimeType,
        name,
        alt: name,
      };
    }

    return {
      type: 'file',
      url: trimmed,
      mimeType: resolvedMimeType,
      name,
      size: hints?.size ?? decoded.buffer.length,
    };
  }

  try {
    const isRemote = /^https?:\/\//i.test(trimmed);
    const maybeRelative = !trimmed.startsWith('file://') && !/^[A-Za-z][\w+.-]*:\/\//i.test(trimmed);
    const resolvedRelativePath = maybeRelative ? path.resolve(trimmed) : '';
    const relativeFileExists = resolvedRelativePath ? await fileExists(resolvedRelativePath) : false;
    const isLocal = trimmed.startsWith('file://')
      || path.isAbsolute(trimmed)
      || /^[A-Za-z]:[\\/]/.test(trimmed)
      || relativeFileExists;

    let buffer: Buffer;
    let mimeType: string | undefined;
    let fileName: string | undefined;

    if (isRemote) {
      const remote = await fetchRemoteBuffer(trimmed);
      buffer = remote.buffer;
      mimeType = hints?.mimeType || remote.mimeType;
      fileName = hints?.fileName || remote.fileName;
    } else if (isLocal) {
      const filePath = trimmed.startsWith('file://')
        ? normalizeLocalPath(trimmed)
        : (resolvedRelativePath && relativeFileExists)
          ? resolvedRelativePath
          : normalizeLocalPath(trimmed);
      buffer = await fs.readFile(filePath);
      fileName = hints?.fileName || path.basename(filePath);
      mimeType = hints?.mimeType || inferMimeTypeFromName(fileName);
    } else {
      return null;
    }

    const resolvedName = sanitizeFileName(hints?.fileName || fileName || inferFileNameFromUrl(trimmed) || 'attachment');
    const resolvedMimeType = resolveMimeType({
      ...(mimeType ? { explicitMimeType: mimeType } : {}),
      fileName: resolvedName,
      url: trimmed,
    });
    const dataUrl = buildDataUrl(buffer, resolvedMimeType);

    if (isImageMimeType(resolvedMimeType)) {
      return {
        type: 'image',
        url: dataUrl,
        name: resolvedName,
        alt: resolvedName,
        ...(resolvedMimeType ? { mimeType: resolvedMimeType } : {}),
      };
    }

    return {
      type: 'file',
      url: dataUrl,
      name: resolvedName,
      ...(resolvedMimeType ? { mimeType: resolvedMimeType } : {}),
      size: hints?.size ?? buffer.length,
    };
  } catch {
    return null;
  }
}

