/**
 * Socket.IO auth middleware and connection handlers.
 * Attach to the IO server from server.ts after setSocketIo(io).
 */

import type { Server } from 'socket.io';
import { verifyJWT } from '../domains/auth/auth.service.js';
import { canManageAgent } from '../domains/agents/agent.service.js';
import { getWorkspaceMember } from '../domains/workspace/workspace.service.js';
import { agentRoom, workspaceRoom } from './index.js';

export function setupSocketHandlers(io: Server): void {
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth as { token?: string })?.token ||
      (socket.handshake.query?.token as string | undefined);
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyJWT(token);
      (socket.data as { userId: number }).userId = payload.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('subscribe-agent', async (agentId: number | string, cb?: (res: { ok: boolean }) => void) => {
      const userId = (socket.data as { userId: number }).userId;
      const id = typeof agentId === 'string' ? parseInt(agentId, 10) : agentId;
      if (isNaN(id)) {
        cb?.({ ok: false });
        return;
      }
      try {
        const ok = await canManageAgent(userId, id);
        if (ok) socket.join(agentRoom(id));
        cb?.({ ok: !!ok });
      } catch {
        cb?.({ ok: false });
      }
    });
    socket.on('unsubscribe-agent', (agentId: number | string) => {
      const id = typeof agentId === 'string' ? parseInt(agentId, 10) : agentId;
      if (!isNaN(id)) socket.leave(agentRoom(id));
    });

    socket.on('subscribe-workspace', async (workspaceId: number | string, cb?: (res: { ok: boolean }) => void) => {
      const userId = (socket.data as { userId: number }).userId;
      const id = typeof workspaceId === 'string' ? parseInt(workspaceId, 10) : workspaceId;
      if (isNaN(id)) {
        cb?.({ ok: false });
        return;
      }
      try {
        const member = await getWorkspaceMember(id, userId);
        if (member) socket.join(workspaceRoom(id));
        cb?.({ ok: !!member });
      } catch {
        cb?.({ ok: false });
      }
    });
    socket.on('unsubscribe-workspace', (workspaceId: number | string) => {
      const id = typeof workspaceId === 'string' ? parseInt(workspaceId, 10) : workspaceId;
      if (!isNaN(id)) socket.leave(workspaceRoom(id));
    });
  });
}
