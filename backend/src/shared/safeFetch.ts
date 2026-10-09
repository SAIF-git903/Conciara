/**
 * SSRF-safe outbound HTTP for user-supplied URLs (website crawler, custom actions).
 *
 * - Only http/https.
 * - Every resolved IP is checked against private/reserved ranges at connect time (via a custom
 *   DNS lookup on the undici dispatcher), which also defeats DNS rebinding.
 * - IP-literal hosts are checked up front (they bypass DNS lookup).
 * - Redirects are followed manually so every hop is re-validated.
 * - Overall timeout and response size cap.
 *
 * ALLOW_PRIVATE_NETWORK_FETCH=1 disables the IP checks outside production (local testing only).
 */

import dns from 'node:dns';
import net from 'node:net';
import { Agent, fetch as undiciFetch, type Dispatcher } from 'undici';

export class UnsafeUrlError extends Error {}

const blockList = new net.BlockList();
// IPv4 (IPv4-mapped IPv6 addresses are checked against these too)
for (const [addr, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) {
  blockList.addSubnet(addr, prefix, 'ipv4');
}
// IPv6
for (const [addr, prefix] of [
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['100::', 64], ['2001::', 32],
  ['2001:db8::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
] as const) {
  blockList.addSubnet(addr, prefix, 'ipv6');
}

function privateFetchAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_PRIVATE_NETWORK_FETCH === '1';
}

export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 0) return true;
  return blockList.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

function parseHttpUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('URL must start with http:// or https://');
  }
  return url;
}

function checkIpLiteralHost(url: URL): void {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isBlockedAddress(host) && !privateFetchAllowed()) {
    throw new UnsafeUrlError('URL points to a private or local address');
  }
}

/**
 * Validate a user-supplied URL before saving or using it: http(s) only, and the host must not
 * resolve to a private/reserved address. safeFetch re-checks at connect time.
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  const url = parseHttpUrl(rawUrl);
  checkIpLiteralHost(url);
  if (privateFetchAllowed()) return url;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!net.isIP(host)) {
    let records: dns.LookupAddress[];
    try {
      records = await dns.promises.lookup(host, { all: true });
    } catch {
      throw new UnsafeUrlError('URL host could not be resolved');
    }
    if (!records.length || records.some((r) => isBlockedAddress(r.address))) {
      throw new UnsafeUrlError('URL resolves to a private or local address');
    }
  }
  return url;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void;

function safeLookup(hostname: string, options: dns.LookupOptions, callback: LookupCallback): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '');
    const list = addresses as dns.LookupAddress[];
    if (!privateFetchAllowed() && (!list.length || list.some((a) => isBlockedAddress(a.address)))) {
      return callback(Object.assign(new UnsafeUrlError(`Blocked private or local address for ${hostname}`), { code: 'EBLOCKED' }), '');
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

const dispatcher: Dispatcher = new Agent({
  connect: { lookup: safeLookup } as Record<string, unknown>,
});

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  /** Optional caller abort signal, combined with the timeout */
  signal?: AbortSignal;
}

export interface SafeFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  /** Final URL after redirects */
  url: string;
  headers: Headers;
  text: string;
}

async function readCapped(body: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<string> {
  if (!body) return '';
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Response exceeded ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<SafeFetchResponse> {
  const { timeoutMs = 15_000, maxBytes = 5 * 1024 * 1024, maxRedirects = 5 } = options;
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);
  let method = (options.method || 'GET').toUpperCase();
  let body = options.body;
  let current = parseHttpUrl(rawUrl);

  for (let hop = 0; ; hop++) {
    checkIpLiteralHost(current);
    const response = await undiciFetch(current, {
      method,
      headers: options.headers,
      body,
      redirect: 'manual',
      signal,
      dispatcher,
    });

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      if (hop >= maxRedirects) throw new Error('Too many redirects');
      current = parseHttpUrl(new URL(location, current).toString());
      // Per the fetch spec, 303 (and 301/302 for POST) switch to GET without a body.
      if (response.status === 303 || ((response.status === 301 || response.status === 302) && method === 'POST')) {
        method = 'GET';
        body = undefined;
      }
      continue;
    }

    const text = await readCapped(response.body as ReadableStream<Uint8Array> | null, maxBytes);
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: current.toString(),
      headers: response.headers as unknown as Headers,
      text,
    };
  }
}
