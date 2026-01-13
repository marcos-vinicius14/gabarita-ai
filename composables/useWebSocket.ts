/**
 * WebSocket Composable
 *
 * Provides WebSocket connection for real-time status updates.
 * Features:
 * - Exponential backoff reconnection (handles server downtime gracefully)
 * - Query current deck status on reconnect (handles LISTEN/NOTIFY limitations)
 * - Integrates with TanStack Query cache
 */

import { useQueryClient } from '@tanstack/vue-query';
import { deckKeys } from './useDecks';

interface DeckStatusEvent {
    type: 'deck:status';
    deckId: string;
    userId: string;
    status: 'processing' | 'ready' | 'failed';
    progress?: string;
    errorMessage?: string;
    timestamp: string;
}

interface UseWebSocketOptions {
    userId: Ref<string | undefined>;
}

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const BACKOFF_MULTIPLIER = 2;

export function useWebSocket(options: UseWebSocketOptions) {
    const config = useRuntimeConfig();
    const queryClient = useQueryClient();
    const toast = useToast();

    const ws = ref<WebSocket | null>(null);
    const isConnected = ref(false);
    const lastEvent = ref<DeckStatusEvent | null>(null);
    const reconnectAttempts = ref(0);
    const reconnectTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

    const WS_URL = (config.public.wsUrl as string) || 'ws://localhost:3002';

    /**
     * Calculate delay with exponential backoff
     */
    function getReconnectDelay(): number {
        const delay = INITIAL_RECONNECT_DELAY * Math.pow(BACKOFF_MULTIPLIER, reconnectAttempts.value);
        return Math.min(delay, MAX_RECONNECT_DELAY);
    }

    /**
     * Refresh deck data after reconnection to catch any missed notifications
     */
    async function refreshDecksOnReconnect() {
        console.log('[WS] Refreshing decks after reconnect...');
        await queryClient.invalidateQueries({ queryKey: deckKeys.all });
    }

    function connect() {
        if (reconnectTimeout.value) {
            clearTimeout(reconnectTimeout.value);
            reconnectTimeout.value = null;
        }

        if (ws.value?.readyState === WebSocket.OPEN) return;

        console.log('[WS] Connecting to', WS_URL);
        ws.value = new WebSocket(WS_URL as string);

        ws.value.onopen = async () => {
            console.log('[WS] Connected');
            isConnected.value = true;

            const wasReconnecting = reconnectAttempts.value > 0;
            reconnectAttempts.value = 0;

            if (options.userId.value) {
                ws.value?.send(JSON.stringify({
                    type: 'auth',
                    userId: options.userId.value,
                }));
            }

            if (wasReconnecting) {
                await refreshDecksOnReconnect();
            }
        };

        ws.value.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'auth:success') {
                    console.log('[WS] Authenticated');
                    return;
                }

                if (data.type === 'deck:status') {
                    handleDeckStatus(data as DeckStatusEvent);
                }
            } catch (err) {
                console.error('[WS] Failed to parse message:', err);
            }
        };

        ws.value.onclose = () => {
            console.log('[WS] Disconnected');
            isConnected.value = false;

            if (options.userId.value) {
                scheduleReconnect();
            }
        };

        ws.value.onerror = (err) => {
            console.error('[WS] Error:', err);
        };
    }

    function scheduleReconnect() {
        reconnectAttempts.value++;
        const delay = getReconnectDelay();

        console.log(`[WS] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts.value})`);

        reconnectTimeout.value = setTimeout(() => {
            connect();
        }, delay);
    }

    function disconnect() {
        if (reconnectTimeout.value) {
            clearTimeout(reconnectTimeout.value);
            reconnectTimeout.value = null;
        }

        ws.value?.close();
        ws.value = null;
        isConnected.value = false;
        reconnectAttempts.value = 0;
    }

    function handleDeckStatus(event: DeckStatusEvent) {
        console.log('[WS] Deck status:', event.deckId, event.status, event.progress);
        lastEvent.value = event;

        if (event.status === 'ready') {
            toast.add({
                title: 'Deck pronto!',
                description: 'Seus flashcards foram gerados com sucesso.',
                color: 'green',
                icon: 'i-heroicons-check-circle',
            });
            queryClient.invalidateQueries({ queryKey: deckKeys.all });
        }

        if (event.status === 'failed') {
            toast.add({
                title: 'Erro ao processar',
                description: event.errorMessage || 'Ocorreu um erro ao gerar os flashcards.',
                color: 'red',
                icon: 'i-heroicons-x-circle',
            });
            queryClient.invalidateQueries({ queryKey: deckKeys.all });
        }
    }

    watch(options.userId, (userId) => {
        if (userId && ws.value?.readyState === WebSocket.OPEN) {
            ws.value.send(JSON.stringify({ type: 'auth', userId }));
        }
    });

    onMounted(() => {
        if (options.userId.value) {
            connect();
        }
    });

    onUnmounted(() => {
        disconnect();
    });

    watch(options.userId, (userId) => {
        if (userId) {
            connect();
        } else {
            disconnect();
        }
    });

    return {
        isConnected: readonly(isConnected),
        lastEvent: readonly(lastEvent),
        reconnectAttempts: readonly(reconnectAttempts),
        connect,
        disconnect,
    };
}
