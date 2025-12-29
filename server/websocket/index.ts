/**
 * WebSocket Server
 * 
 * Independent WebSocket server for real-time status updates.
 * Subscribes to Redis Pub/Sub and broadcasts to connected clients.
 * 
 * Run: pnpm ws
 */

import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';

// Redis connection
function getRedisUrl(): string {
    return process.env.REDIS_URL as string;
}

interface DeckStatusEvent {
    type: 'deck:status';
    deckId: string;
    userId: string;
    status: 'processing' | 'ready' | 'failed';
    progress?: string;
    errorMessage?: string;
    timestamp: string;
}

interface ClientInfo {
    ws: WebSocket;
    userId?: string;
}

const clients = new Map<WebSocket, ClientInfo>();

const PORT = parseInt(process.env.WS_PORT || '3002');
const wss = new WebSocketServer({ port: PORT });

console.log(`[WebSocket] Server starting on port ${PORT}...`);

const subscriber = new Redis(getRedisUrl());

subscriber.on('connect', () => {
    console.log('[WebSocket] Connected to Redis');
});

subscriber.on('error', (err) => {
    console.error('[WebSocket] Redis error:', err.message);
});

subscriber.subscribe('deck:status', (err) => {
    if (err) {
        console.error('[WebSocket] Failed to subscribe:', err);
        return;
    }
    console.log('[WebSocket] Subscribed to deck:status channel');
});

subscriber.on('message', (channel, message) => {
    if (channel !== 'deck:status') return;

    try {
        const event: DeckStatusEvent = JSON.parse(message);
        console.log(`[WebSocket] Received event:`, event.type, event.deckId, event.status);

        for (const [ws, info] of clients) {
            if (info.userId === event.userId && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(event));
            }
        }
    } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
    }
});

wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected');
    clients.set(ws, { ws });
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());

            if (message.type === 'auth' && message.userId) {
                const info = clients.get(ws);
                if (info) {
                    info.userId = message.userId;
                    console.log(`[WebSocket] Client authenticated: ${message.userId}`);
                    ws.send(JSON.stringify({ type: 'auth:success' }));
                }
            }
        } catch (err) {
            console.error('[WebSocket] Failed to parse client message:', err);
        }
    });

    ws.on('close', () => {
        const info = clients.get(ws);
        console.log(`[WebSocket] Client disconnected: ${info?.userId || 'unauthenticated'}`);
        clients.delete(ws);
    });

    ws.on('error', (err) => {
        console.error('[WebSocket] Client error:', err.message);
    });
});

wss.on('listening', () => {
    console.log(`[WebSocket] Server listening on ws://localhost:${PORT}`);
});

process.on('SIGTERM', async () => {
    console.log('[WebSocket] Received SIGTERM, shutting down...');
    await subscriber.quit();
    wss.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('[WebSocket] Received SIGINT, shutting down...');
    await subscriber.quit();
    wss.close();
    process.exit(0);
});
