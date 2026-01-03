<script setup lang="ts">
/**
 * StreakBadge Component
 * 
 * Displays the current streak with a fire icon.
 * - Gray when streak is 0
 * - Orange/rose when streak > 0
 */

interface Props {
    streakDays: number;
}

const props = withDefaults(defineProps<Props>(), {
    streakDays: 0,
});

const hasStreak = computed(() => props.streakDays > 0);

const iconColor = computed(() => {
    if (!hasStreak.value) return 'text-zinc-500';
    if (props.streakDays >= 7) return 'text-rose-500';
    return 'text-orange-500';
});

const bgColor = computed(() => {
    if (!hasStreak.value) return 'bg-zinc-800/50';
    if (props.streakDays >= 7) return 'bg-rose-500/10';
    return 'bg-orange-500/10';
});

const borderColor = computed(() => {
    if (!hasStreak.value) return 'border-zinc-700';
    if (props.streakDays >= 7) return 'border-rose-500/30';
    return 'border-orange-500/30';
});

const tooltipText = computed(() => {
    if (!hasStreak.value) {
        return 'Estude hoje para começar um streak!';
    }
    return `🔥 ${props.streakDays} ${props.streakDays === 1 ? 'dia' : 'dias'} seguidos! Continue assim!`;
});
</script>

<template>
    <UTooltip :text="tooltipText">
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-300"
            :class="[bgColor, borderColor]">
            <UIcon name="i-heroicons-fire" class="w-4 h-4 transition-colors duration-300" :class="iconColor" />
            <span class="text-sm font-medium tabular-nums" :class="hasStreak ? 'text-white' : 'text-zinc-500'">
                {{ streakDays }}
            </span>
        </div>
    </UTooltip>
</template>
