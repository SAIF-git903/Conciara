/**
 * Workspace-level API keys: create (ck_live_xxx), list, revoke. Plan-gated (API access required).
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma.js';

const KEY_PREFIX = 'ck_live_';
const RANDOM_BYTES = 24; // 32 hex chars
const KEY_PREFIX_DISPLAY_LENGTH = 12;
const BCRYPT_ROUNDS = 10;

export function generateWorkspaceApiKey(): { raw: string; prefix: string } {
  const random = crypto.randomBytes(RANDOM_BYTES).toString('hex');
  const raw = `${KEY_PREFIX}${random}`;
  const prefix = raw.slice(0, KEY_PREFIX_DISPLAY_LENGTH);
  return { raw, prefix };
}

export async function hashKey(raw: string): Promise<string> {
  return bcrypt.hash(raw, BCRYPT_ROUNDS);
}

export async function verifyKey(raw: string, keyHash: string): Promise<boolean> {
  return bcrypt.compare(raw, keyHash);
}

export async function createWorkspaceApiKey(
  workspaceId: number,
  createdById: number,
  name: string
): Promise<{ id: string; rawKey: string; keyPrefix: string; name: string; createdAt: Date }> {
  const { raw, prefix } = generateWorkspaceApiKey();
  const keyHash = await hashKey(raw);
  const key = await prisma.workspaceApiKey.create({
    data: {
      workspaceId,
      createdById,
      name: name.trim() || 'API Key',
      keyHash,
      keyPrefix: prefix,
    },
  });
  return {
    id: key.id,
    rawKey: raw,
    keyPrefix: key.keyPrefix,
    name: key.name,
    createdAt: key.createdAt,
  };
}

export async function listWorkspaceApiKeys(workspaceId: number) {
  return prisma.workspaceApiKey.findMany({
    where: { workspaceId, revokedAt: null },
    select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function revokeWorkspaceApiKey(keyId: string, workspaceId: number): Promise<boolean> {
  const result = await prisma.workspaceApiKey.updateMany({
    where: { id: keyId, workspaceId },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}

export async function validateWorkspaceApiKey(
  rawKey: string
): Promise<{ workspaceId: number; keyId: string } | null> {
  if (!rawKey.startsWith(KEY_PREFIX)) return null;
  const keys = await prisma.workspaceApiKey.findMany({
    where: { revokedAt: null },
    select: { id: true, workspaceId: true, keyHash: true },
  });
  for (const k of keys) {
    const ok = await verifyKey(rawKey, k.keyHash);
    if (ok) {
      await prisma.workspaceApiKey.update({
        where: { id: k.id },
        data: { lastUsedAt: new Date() },
      });
      return { workspaceId: k.workspaceId, keyId: k.id };
    }
  }
  return null;
}
