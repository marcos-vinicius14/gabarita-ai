/**
 * WebSocket Composable
 * 
 * Provides WebSocket connection for real-time status updates.
 * Auto-reconnects and integrates with TanStack Query cache.
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

export function useWebSocket(options: UseWebSocketOptions) {
    const config = useRuntimeConfig();
    const queryClient = useQueryClient();
    const toast = useToast();

    const ws = ref<WebSocket | null>(null);
    const isConnected = ref(false);
    const lastEvent = ref<DeckStatusEvent | null>(null);

    const WS_URL = (config.public.wsUrl as string) || 'ws://localhost:3001';

    function connect() {
        if (ws.value?.readyState === WebSocket.OPEN) return;

        console.log('[WS] Connecting to', WS_URL);
        ws.value = new WebSocket(WS_URL as string);

        ws.value.onopen = () => {
            console.log('[WS] Connected');
            isConnected.value = true;

            // Authenticate with userId
            if (options.userId.value) {
                ws.value?.send(JSON.stringify({
                    type: 'auth',
                    userId: options.userId.value,
                }));
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

            // Reconnect after 3 seconds
            setTimeout(() => connect(), 3000);
        };

        ws.value.onerror = (err) => {
            console.error('[WS] Error:', err);
        };
    }

    function disconnect() {
        ws.value?.close();
        ws.value = null;
        isConnected.value = false;
    }

    function handleDeckStatus(event: DeckStatusEvent) {
        console.log('[WS] Deck status:', event.deckId, event.status, event.progress);
        lastEvent.value = event;

        // Show progress toast
        if (event.status === 'processing' && event.progress) {
            // Don't spam toasts - could use a persistent notification instead
        }

        // On status change, invalidate the decks query
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

    // Watch userId to authenticate when available
    watch(options.userId, (userId) => {
        if (userId && ws.value?.readyState === WebSocket.OPEN) {
            ws.value.send(JSON.stringify({ type: 'auth', userId }));
        }
    });

    // Connect on mount, disconnect on unmount
    onMounted(() => {
        if (options.userId.value) {
            connect();
        }
    });

    onUnmounted(() => {
        disconnect();
    });

    // Also watch userId to connect when user logs in
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
        connect,
        disconnect,
    };
}
