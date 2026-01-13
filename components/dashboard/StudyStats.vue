<script setup lang="ts">
/**
 * StudyStats Component
 * 
 * Dashboard widget showing gamification stats:
 * - Current streak
 * - Total cards reviewed
 * - Last 7 days activity
 */

interface DailyActivity {
    date: string;
    count: number;
}

interface Props {
    streakDays: number;
    totalCardsReviewed: number;
    weeklyActivity: DailyActivity[];
    isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    streakDays: 0,
    totalCardsReviewed: 0,
    weeklyActivity: () => [],
    isLoading: false,
});

const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const activityDays = computed(() => {
    return props.weeklyActivity.map((activity, index) => {
        const date = new Date(activity.date + 'T12:00:00');
        const dayIndex = date.getDay();
        return {
            label: dayLabels[dayIndex],
            count: activity.count,
            hasActivity: activity.count > 0,
            date: activity.date,
        };
    });
});
</script>

<template>
    <UCard class="bg-zinc-900/80 backdrop-blur-xl border-zinc-800">
        <template #header>
            <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-violet-400" />
                <span class="font-semibold">Estatísticas de Estudo</span>
            </div>
        </template>

        <div v-if="isLoading" class="flex items-center justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-violet-500" />
        </div>

        <div v-else class="space-y-6">
            <!-- Stats Grid -->
            <div class="grid grid-cols-2 gap-4">
                <!-- Streak -->
                <div class="text-center p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                    <div class="flex items-center justify-center gap-2 mb-1">
                        <UIcon name="i-heroicons-fire" class="w-5 h-5"
                            :class="streakDays > 0 ? 'text-orange-500' : 'text-zinc-500'" />
                    </div>
                    <p class="text-2xl sm:text-3xl font-bold text-white">{{ streakDays }}</p>
                    <p class="text-xs text-zinc-400 mt-1">Dias Seguidos</p>
                </div>

                <!-- Total Reviews -->
                <div class="text-center p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                    <div class="flex items-center justify-center gap-2 mb-1">
                        <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500" />
                    </div>
                    <p class="text-2xl sm:text-3xl font-bold text-white">{{ totalCardsReviewed }}</p>
                    <p class="text-xs text-zinc-400 mt-1">Total de Revisões</p>
                </div>
            </div>

            <!-- Weekly Activity -->
            <div>
                <p class="text-xs text-zinc-400 mb-3">Últimos 7 dias</p>
                <div class="flex items-center justify-between gap-1">
                    <div v-for="day in activityDays" :key="day.date" class="flex flex-col items-center gap-1.5 flex-1">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-colors"
                            :class="day.hasActivity
                                ? 'bg-green-500/20 border border-green-500/30'
                                : 'bg-zinc-800/50 border border-zinc-700/30'">
                            <UIcon :name="day.hasActivity ? 'i-heroicons-check' : 'i-heroicons-minus'" class="w-4 h-4"
                                :class="day.hasActivity ? 'text-green-400' : 'text-zinc-600'" />
                        </div>
                        <span class="text-[10px] text-zinc-500">{{ day.label }}</span>
                    </div>
                </div>
            </div>
        </div>
    </UCard>
</template>
