/**
 * Socket.IO instance for server-side emit (e.g. agent training progress).
 * Set from server.ts after creating the IO server.
 */

import type { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketIo(server: Server): void {
  io = server;
}

export function getSocketIo(): Server | null {
  return io;
}

/** Room name for an agent's training progress subscribers. */
export function agentRoom(agentId: number): string {
  return `agent:${agentId}`;
}
