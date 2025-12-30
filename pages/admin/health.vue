<script setup lang="ts">
/**
 * Admin Health Dashboard
 * 
 * Displays 3 database health metrics with color-coded status indicators.
 */

definePageMeta({
    layout: 'default',
    middleware: 'admin',
});

interface ConnectionMetrics {
    current: number;
    max: number;
    percentage: number;
    status: 'healthy' | 'warning' | 'critical';
}

interface QueueMetrics {
    pending: number;
    oldestMinutes: number | null;
    status: 'healthy' | 'warning' | 'critical';
}

interface TableSizeMetrics {
    bytes: number;
    formatted: string;
    status: 'healthy' | 'warning' | 'critical';
}

interface HealthMetrics {
    connections: ConnectionMetrics;
    queue: QueueMetrics;
    tableSize: TableSizeMetrics;
    timestamp: string;
}

const { data, pending, refresh } = await useFetch<{ success: boolean; data: HealthMetrics }>('/api/admin/health', {
    server: false,
});

const metrics = computed(() => data.value?.data);

const statusColors = {
    healthy: 'green',
    warning: 'yellow',
    critical: 'red',
} as const;

const statusLabels = {
    healthy: 'Saudável',
    warning: 'Atenção',
    critical: 'Crítico',
} as const;

const statusIcons = {
    healthy: 'i-heroicons-check-circle',
    warning: 'i-heroicons-exclamation-triangle',
    critical: 'i-heroicons-x-circle',
} as const;

// Actions for each metric
const connectionActions = {
    warning: [
        'Verifique conexões ociosas em transação ("idle in transaction")',
        'Considere reiniciar o serviço WebSocket se necessário',
        'Revise o pool de conexões da aplicação',
    ],
    critical: [
        'Aumente max_connections no PostgreSQL e reinicie',
        'Escale verticalmente a VPS se necessário',
        'Identifique vazamento de conexões no código',
        'Considere implementar PgBouncer',
    ],
};

const queueActions = {
    warning: [
        'Verifique logs do worker (pnpm worker)',
        'Confirme se a cota da API Gemini não foi excedida',
        'Considere adicionar um segundo worker',
    ],
    critical: [
        'Pare e reinicie o serviço worker',
        'Verifique jobs "zumbis" com SKIP LOCKED',
        'Execute limpeza de jobs: pnpm db:archive',
        'Investigue memory leaks no worker',
    ],
};

const tableSizeActions = {
    warning: [
        "DELETE FROM pgboss.job WHERE state = 'completed' AND created_on < NOW() - INTERVAL '7 days'",
        'Diminua archiveCompletedAfter para 3 dias',
    ],
    critical: [
        'Pare o worker',
        'Execute VACUUM FULL pgboss.job',
        'Reindexe a tabela',
        'Configure cron para pnpm db:archive diariamente',
    ],
};

// Auto-refresh every 30 seconds
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null);

onMounted(() => {
    refreshInterval.value = setInterval(() => {
        refresh();
    }, 30000);
});

onUnmounted(() => {
    if (refreshInterval.value) {
        clearInterval(refreshInterval.value);
    }
});
</script>

<template>
    <div class="min-h-screen bg-zinc-950 p-8">
        <div class="max-w-6xl mx-auto">
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-white">Saúde do Sistema</h1>
                    <p class="text-zinc-400 mt-1">Métricas do PostgreSQL em tempo real</p>
                </div>
                <div class="flex items-center gap-4">
                    <span v-if="metrics" class="text-xs text-zinc-500">
                        Última atualização: {{ new Date(metrics.timestamp).toLocaleTimeString('pt-BR') }}
                    </span>
                    <UButton icon="i-heroicons-arrow-path" color="gray" variant="ghost" :loading="pending"
                        @click="refresh()" />
                </div>
            </div>

            <div v-if="pending && !metrics" class="flex justify-center py-20">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-zinc-500" />
            </div>

            <div v-else-if="metrics" class="grid gap-6 md:grid-cols-3">
                <!-- Connection Card -->
                <UCard :ui="{
                    base: 'overflow-hidden',
                    background: 'bg-zinc-900',
                    ring: `ring-1 ring-${statusColors[metrics.connections.status]}-500/50`,
                }">
                    <template #header>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <UIcon name="i-heroicons-server-stack" class="w-5 h-5 text-zinc-400" />
                                <span class="font-semibold text-white">Conexões</span>
                            </div>
                            <UBadge :color="statusColors[metrics.connections.status]" variant="subtle">
                                <UIcon :name="statusIcons[metrics.connections.status]" class="w-3 h-3 mr-1" />
                                {{ statusLabels[metrics.connections.status] }}
                            </UBadge>
                        </div>
                    </template>

                    <div class="space-y-4">
                        <div class="text-center">
                            <div class="text-4xl font-bold text-white">{{ metrics.connections.percentage }}%</div>
                            <div class="text-sm text-zinc-400">
                                {{ metrics.connections.current }} / {{ metrics.connections.max }} conexões
                            </div>
                        </div>

                        <UProgress :value="metrics.connections.percentage"
                            :color="statusColors[metrics.connections.status]" size="lg" />

                        <div v-if="metrics.connections.status !== 'healthy'" class="pt-4 border-t border-zinc-800">
                            <p class="text-xs font-medium text-zinc-400 mb-2">Ações Recomendadas:</p>
                            <ul class="text-xs text-zinc-500 space-y-1">
                                <li v-for="action in connectionActions[metrics.connections.status]" :key="action"
                                    class="flex items-start gap-2">
                                    <UIcon name="i-heroicons-arrow-right" class="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    {{ action }}
                                </li>
                            </ul>
                        </div>
                    </div>
                </UCard>

                <!-- Queue Card -->
                <UCard :ui="{
                    base: 'overflow-hidden',
                    background: 'bg-zinc-900',
                    ring: `ring-1 ring-${statusColors[metrics.queue.status]}-500/50`,
                }">
                    <template #header>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <UIcon name="i-heroicons-queue-list" class="w-5 h-5 text-zinc-400" />
                                <span class="font-semibold text-white">Fila de Jobs</span>
                            </div>
                            <UBadge :color="statusColors[metrics.queue.status]" variant="subtle">
                                <UIcon :name="statusIcons[metrics.queue.status]" class="w-3 h-3 mr-1" />
                                {{ statusLabels[metrics.queue.status] }}
                            </UBadge>
                        </div>
                    </template>

                    <div class="space-y-4">
                        <div class="text-center">
                            <div class="text-4xl font-bold text-white">{{ metrics.queue.pending }}</div>
                            <div class="text-sm text-zinc-400">jobs pendentes</div>
                        </div>

                        <div class="text-center text-sm">
                            <span class="text-zinc-400">Job mais antigo: </span>
                            <span class="text-white font-medium">
                                {{ metrics.queue.oldestMinutes ? `${metrics.queue.oldestMinutes} min` : 'N/A' }}
                            </span>
                        </div>

                        <div v-if="metrics.queue.status !== 'healthy'" class="pt-4 border-t border-zinc-800">
                            <p class="text-xs font-medium text-zinc-400 mb-2">Ações Recomendadas:</p>
                            <ul class="text-xs text-zinc-500 space-y-1">
                                <li v-for="action in queueActions[metrics.queue.status]" :key="action"
                                    class="flex items-start gap-2">
                                    <UIcon name="i-heroicons-arrow-right" class="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    {{ action }}
                                </li>
                            </ul>
                        </div>
                    </div>
                </UCard>

                <!-- Table Size Card -->
                <UCard :ui="{
                    base: 'overflow-hidden',
                    background: 'bg-zinc-900',
                    ring: `ring-1 ring-${statusColors[metrics.tableSize.status]}-500/50`,
                }">
                    <template #header>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <UIcon name="i-heroicons-circle-stack" class="w-5 h-5 text-zinc-400" />
                                <span class="font-semibold text-white">Tabela de Jobs</span>
                            </div>
                            <UBadge :color="statusColors[metrics.tableSize.status]" variant="subtle">
                                <UIcon :name="statusIcons[metrics.tableSize.status]" class="w-3 h-3 mr-1" />
                                {{ statusLabels[metrics.tableSize.status] }}
                            </UBadge>
                        </div>
                    </template>

                    <div class="space-y-4">
                        <div class="text-center">
                            <div class="text-4xl font-bold text-white">{{ metrics.tableSize.formatted }}</div>
                            <div class="text-sm text-zinc-400">tamanho pgboss.job</div>
                        </div>

                        <UProgress :value="Math.min((metrics.tableSize.bytes / (1024 * 1024 * 1024)) * 100, 100)"
                            :color="statusColors[metrics.tableSize.status]" size="lg" />

                        <div v-if="metrics.tableSize.status !== 'healthy'" class="pt-4 border-t border-zinc-800">
                            <p class="text-xs font-medium text-zinc-400 mb-2">Ações Recomendadas:</p>
                            <ul class="text-xs text-zinc-500 space-y-1">
                                <li v-for="action in tableSizeActions[metrics.tableSize.status]" :key="action"
                                    class="flex items-start gap-2">
                                    <UIcon name="i-heroicons-arrow-right" class="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    <code v-if="action.includes('DELETE') || action.includes('VACUUM')"
                                        class="text-zinc-400">
                        {{ action }}
                    </code>
                                    <span v-else>{{ action }}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </UCard>
            </div>

            <!-- Legend -->
            <div class="mt-8 flex items-center justify-center gap-6 text-sm text-zinc-500">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Saudável</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Atenção</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Crítico</span>
                </div>
            </div>
        </div>
    </div>
</template>
