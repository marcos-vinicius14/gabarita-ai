/**
 * WebSocket Server
 *
 * Independent WebSocket server for real-time status updates.
 * Subscribes to PostgreSQL LISTEN/NOTIFY and broadcasts to connected clients.
 *
 * Run: pnpm ws
 */

import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import { Client } from 'pg';

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

// PostgreSQL connection for LISTEN
const databaseUrl = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/gabarita_ai';
const subscriber = new Client({ connectionString: databaseUrl });

async function startSubscriber() {
    try {
        await subscriber.connect();
        console.log('[WebSocket] Connected to PostgreSQL');

        await subscriber.query('LISTEN deck_status');
        console.log('[WebSocket] Subscribed to deck_status channel');

        subscriber.on('notification', (msg) => {
            if (msg.channel !== 'deck_status' || !msg.payload) return;

            try {
                const event: DeckStatusEvent = JSON.parse(msg.payload);
                console.log(`[WebSocket] Received event:`, event.type, event.deckId, event.status);

                // Broadcast to authenticated clients for this user
                for (const [ws, info] of clients) {
                    if (info.userId === event.userId && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(event));
                    }
                }
            } catch (err) {
                console.error('[WebSocket] Failed to parse notification:', err);
            }
        });

        subscriber.on('error', (err) => {
            console.error('[WebSocket] PostgreSQL error:', err.message);
        });

        subscriber.on('end', () => {
            console.log('[WebSocket] PostgreSQL connection ended, reconnecting...');
            setTimeout(startSubscriber, 5000);
        });

    } catch (err) {
        console.error('[WebSocket] Failed to connect to PostgreSQL:', err);
        setTimeout(startSubscriber, 5000);
    }
}

// Start the subscriber
startSubscriber();

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

const shutdown = async () => {
    console.log('[WebSocket] Shutting down...');
    try {
        await subscriber.end();
    } catch (err) {
        // Ignore errors during shutdown
    }
    wss.close();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
