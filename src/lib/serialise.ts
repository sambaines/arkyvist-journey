// JSON export/import and URL hash encoding

import type { Scale, Route, SpeedSettings, MapSession } from '../types';

const SCHEMA_VERSION = '1.0';

interface ExportedSession {
  version: string;
  mapFilename: string;
  mapWidth: number;
  mapHeight: number;
  scale: Scale;
  routes: Route[];
  activeRouteId: string;
  speedSettings: SpeedSettings;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function compress(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const input = encoder.encode(data);
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(input);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function decompress(bytes: Uint8Array): Promise<string> {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  // Write and close in a separate microtask to allow errors from the readable
  // side to be caught by the caller rather than as unhandled rejections.
  const writePromise = writer.write(bytes).then(() => writer.close());
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } catch (err) {
    // Ensure write promise rejection is consumed to prevent unhandled rejection
    writePromise.catch(() => {});
    throw err;
  }
  await writePromise;
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  const decoder = new TextDecoder();
  return decoder.decode(result);
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8Array(str: string): Uint8Array {
  // Restore standard base64
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateSession(obj: unknown): ExportedSession | null {
  if (typeof obj !== 'object' || obj === null) return null;
  const data = obj as Record<string, unknown>;

  if (typeof data.version !== 'string') return null;
  if (typeof data.mapFilename !== 'string') return null;
  if (!data.scale || typeof data.scale !== 'object') return null;
  const scale = data.scale as Record<string, unknown>;
  if (typeof scale.pixelsPerUnit !== 'number' || scale.pixelsPerUnit <= 0) return null;
  if (typeof scale.unit !== 'string') return null;
  if (!Array.isArray(data.routes)) return null;
  if (!data.speedSettings || typeof data.speedSettings !== 'object') return null;
  const speeds = data.speedSettings as Record<string, unknown>;
  if (!Array.isArray(speeds.modes)) return null;

  // Warn if version is newer
  if (data.version > SCHEMA_VERSION) {
    console.warn(`Importing session with version ${data.version} (current: ${SCHEMA_VERSION}). Some data may not load correctly.`);
  }

  return {
    version: data.version as string,
    mapFilename: data.mapFilename as string,
    mapWidth: typeof data.mapWidth === 'number' ? data.mapWidth : 0,
    mapHeight: typeof data.mapHeight === 'number' ? data.mapHeight : 0,
    scale: data.scale as Scale,
    routes: data.routes as Route[],
    activeRouteId: typeof data.activeRouteId === 'string' ? data.activeRouteId : '',
    speedSettings: data.speedSettings as SpeedSettings,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function exportSession(session: MapSession): void {
  const exported: ExportedSession = {
    version: SCHEMA_VERSION,
    mapFilename: session.mapFilename,
    mapWidth: session.mapWidth,
    mapHeight: session.mapHeight,
    scale: session.scale,
    routes: session.routes,
    activeRouteId: session.activeRouteId,
    speedSettings: session.speedSettings,
  };

  const json = JSON.stringify(exported, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `arkyvist-map-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function importSession(json: string): ExportedSession | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  return validateSession(parsed);
}

export async function encodeSessionToHash(session: MapSession): Promise<string> {
  const exported: ExportedSession = {
    version: SCHEMA_VERSION,
    mapFilename: session.mapFilename,
    mapWidth: session.mapWidth,
    mapHeight: session.mapHeight,
    scale: session.scale,
    routes: session.routes,
    activeRouteId: session.activeRouteId,
    speedSettings: session.speedSettings,
  };

  const json = JSON.stringify(exported);
  const compressed = await compress(json);
  const encoded = uint8ArrayToBase64Url(compressed);
  const hash = `#data=${encoded}`;
  if (typeof window !== 'undefined') {
    window.location.hash = `data=${encoded}`;
  }
  return hash;
}

export async function decodeHashToSession(hash: string): Promise<ExportedSession | null> {
  try {
    let encoded = hash;
    if (encoded.startsWith('#data=')) {
      encoded = encoded.slice(6);
    } else if (encoded.startsWith('data=')) {
      encoded = encoded.slice(5);
    }

    if (!encoded) return null;

    const bytes = base64UrlToUint8Array(encoded);
    const json = await decompress(bytes);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return null;
    }
    return validateSession(parsed);
  } catch {
    return null;
  }
}
