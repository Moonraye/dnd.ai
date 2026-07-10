import { io, type Socket } from 'socket.io-client';
import { getSupabaseClient } from './supabaseClient';

let socket: Socket | null = null;

/**
 * Lazily created singleton Socket.io client (one connection app-wide).
 *
 * ADR 2: the `auth` callback runs on every connection attempt — including
 * automatic reconnects — so when the server drops an expired socket, the
 * next handshake picks up the refreshed Supabase access token.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001', {
      autoConnect: false,
      auth: (cb) => {
        void getSupabaseClient()
          .auth.getSession()
          .then(({ data }) => cb({ token: data.session?.access_token ?? '' }));
      },
    });
  }
  return socket;
}
