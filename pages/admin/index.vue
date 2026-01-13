<script setup lang="ts">
/**
 * Admin Dashboard Page
 * 
 * Displays all active users with management actions.
 * CSR page (server: false) for security.
 */

import type { AdminUserListItem } from '~/server/domain/admin/users.types';

definePageMeta({
    layout: 'default',
    middleware: 'admin',
});

useSeoMeta({
    title: 'Painel Admin | Gabarita.ai',
});

interface UsersResponse {
    success: boolean;
    data: {
        users: AdminUserListItem[];
    };
}

const router = useRouter();
const toast = useToast();

const { data, pending, refresh } = await useFetch<UsersResponse>('/api/admin/users', {
    server: false,
});

const users = computed(() => data.value?.data?.users ?? []);

const isRoleModalOpen = ref(false);
const selectedUser = ref<AdminUserListItem | null>(null);
const selectedRole = ref<'free' | 'pro' | 'admin'>('free');

const isDeleteModalOpen = ref(false);
const userToDelete = ref<AdminUserListItem | null>(null);

// Actions
async function handleRoleChange(user: AdminUserListItem) {
    selectedUser.value = user;
    selectedRole.value = user.role;
    isRoleModalOpen.value = true;
}

async function confirmRoleChange() {
    if (!selectedUser.value) return;

    try {
        await $fetch(`/api/admin/users/${selectedUser.value.id}`, {
            method: 'PATCH',
            body: { role: selectedRole.value },
        });

        toast.add({ title: 'Sucesso', description: 'Role atualizada com sucesso.', color: 'green' });
        isRoleModalOpen.value = false;
        await refresh();
    } catch (error: any) {
        toast.add({ title: 'Erro', description: error?.data?.message || 'Erro ao atualizar role.', color: 'red' });
    }
}

async function handleBlock(user: AdminUserListItem) {
    try {
        await $fetch(`/api/admin/users/${user.id}`, {
            method: 'PATCH',
            body: { blocked: !user.isBlocked },
        });

        const action = user.isBlocked ? 'desbloqueado' : 'bloqueado';
        toast.add({ title: 'Sucesso', description: `Usuário ${action} com sucesso.`, color: 'green' });
        await refresh();
    } catch (error: any) {
        toast.add({ title: 'Erro', description: error?.data?.message || 'Erro ao bloquear usuário.', color: 'red' });
    }
}

function handleDelete(user: AdminUserListItem) {
    userToDelete.value = user;
    isDeleteModalOpen.value = true;
}

async function confirmDelete() {
    if (!userToDelete.value) return;

    try {
        await $fetch(`/api/admin/users/${userToDelete.value.id}`, {
            method: 'DELETE',
        });

        toast.add({ title: 'Sucesso', description: 'Usuário excluído com sucesso.', color: 'green' });
        isDeleteModalOpen.value = false;
        await refresh();
    } catch (error: any) {
        toast.add({ title: 'Erro', description: error?.data?.message || 'Erro ao excluir usuário.', color: 'red' });
    }
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

const roleLabels = {
    free: 'Free',
    pro: 'Pro',
    admin: 'Admin',
};

const roleColors = {
    free: 'gray',
    pro: 'violet',
    admin: 'red',
} as const;
</script>

<template>
    <div class="min-h-screen bg-zinc-950 p-4 sm:p-8">
        <div class="max-w-6xl mx-auto">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 class="text-2xl sm:text-3xl font-bold text-white">Painel Admin</h1>
                    <p class="text-zinc-400 mt-1">Gerenciamento de usuários</p>
                </div>
                <div class="flex items-center gap-3">
                    <UButton color="gray" variant="outline" @click="router.push('/admin/health')">
                        <UIcon name="i-heroicons-heart" class="w-4 h-4 mr-1.5" />
                        Saúde do Sistema
                    </UButton>
                    <UButton icon="i-heroicons-arrow-path" color="gray" variant="ghost" :loading="pending"
                        @click="refresh()" />
                </div>
            </div>

            <!-- Loading -->
            <div v-if="pending && users.length === 0" class="flex justify-center py-20">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-zinc-500" />
            </div>

            <!-- Users List -->
            <div v-else>
                <!-- Desktop: Table -->
                <UCard class="hidden md:block" :ui="{ background: 'bg-zinc-900', ring: 'ring-1 ring-zinc-800' }">
                    <div class="overflow-x-auto">
                        <UTable :rows="users" :columns="[
                            { key: 'name', label: 'Nome' },
                            { key: 'email', label: 'Email' },
                            { key: 'role', label: 'Role' },
                            { key: 'createdAt', label: 'Cadastro' },
                            { key: 'status', label: 'Status' },
                            { key: 'actions', label: '' },
                        ]" :ui="{
                            thead: 'bg-zinc-800/50',
                            th: { padding: 'px-4 py-3' },
                            td: { padding: 'px-4 py-3' },
                        }">
                            <template #name-data="{ row }">
                                <span class="text-white">{{ row.name || '—' }}</span>
                            </template>

                            <template #email-data="{ row }">
                                <span class="text-zinc-300 text-sm">{{ row.email }}</span>
                            </template>

                            <template #role-data="{ row }">
                                <UBadge :color="roleColors[row.role as keyof typeof roleColors]" variant="subtle">
                                    {{ roleLabels[row.role as keyof typeof roleLabels] }}
                                </UBadge>
                            </template>

                            <template #createdAt-data="{ row }">
                                <span class="text-zinc-400 text-sm">{{ formatDate(row.createdAt) }}</span>
                            </template>

                            <template #status-data="{ row }">
                                <UBadge v-if="row.isBlocked" color="red" variant="subtle">
                                    Bloqueado
                                </UBadge>
                                <UBadge v-else color="green" variant="subtle">
                                    Ativo
                                </UBadge>
                            </template>

                            <template #actions-data="{ row }">
                                <UDropdown :items="[
                                    [{
                                        label: 'Alterar Role',
                                        icon: 'i-heroicons-user-circle',
                                        click: () => handleRoleChange(row),
                                    }],
                                    [{
                                        label: row.isBlocked ? 'Desbloquear' : 'Bloquear',
                                        icon: row.isBlocked ? 'i-heroicons-lock-open' : 'i-heroicons-lock-closed',
                                        click: () => handleBlock(row),
                                    }],
                                    [{
                                        label: 'Excluir',
                                        icon: 'i-heroicons-trash',
                                        click: () => handleDelete(row),
                                    }],
                                ]" :popper="{ placement: 'bottom-end' }">
                                    <UButton icon="i-heroicons-ellipsis-vertical" color="gray" variant="ghost"
                                        size="sm" />
                                </UDropdown>
                            </template>
                        </UTable>
                    </div>
                </UCard>

                <!-- Mobile: Cards -->
                <div class="md:hidden space-y-3">
                    <UCard v-for="user in users" :key="user.id"
                        :ui="{ background: 'bg-zinc-900', ring: 'ring-1 ring-zinc-800', body: { padding: 'p-4' } }">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0 flex-1">
                                <!-- Name & Email -->
                                <p class="text-white font-medium truncate">{{ user.name || '—' }}</p>
                                <p class="text-zinc-400 text-sm truncate">{{ user.email }}</p>

                                <!-- Badges -->
                                <div class="flex flex-wrap items-center gap-2 mt-2">
                                    <UBadge :color="roleColors[user.role as keyof typeof roleColors]" variant="subtle"
                                        size="xs">
                                        {{ roleLabels[user.role as keyof typeof roleLabels] }}
                                    </UBadge>
                                    <UBadge v-if="user.isBlocked" color="red" variant="subtle" size="xs">
                                        Bloqueado
                                    </UBadge>
                                    <UBadge v-else color="green" variant="subtle" size="xs">
                                        Ativo
                                    </UBadge>
                                </div>

                                <!-- Date -->
                                <p class="text-zinc-500 text-xs mt-2">
                                    Cadastro: {{ formatDate(user.createdAt) }}
                                </p>
                            </div>

                            <!-- Actions -->
                            <UDropdown :items="[
                                [{
                                    label: 'Alterar Role',
                                    icon: 'i-heroicons-user-circle',
                                    click: () => handleRoleChange(user),
                                }],
                                [{
                                    label: user.isBlocked ? 'Desbloquear' : 'Bloquear',
                                    icon: user.isBlocked ? 'i-heroicons-lock-open' : 'i-heroicons-lock-closed',
                                    click: () => handleBlock(user),
                                }],
                                [{
                                    label: 'Excluir',
                                    icon: 'i-heroicons-trash',
                                    click: () => handleDelete(user),
                                }],
                            ]" :popper="{ placement: 'bottom-end' }">
                                <UButton icon="i-heroicons-ellipsis-vertical" color="gray" variant="ghost" size="sm" />
                            </UDropdown>
                        </div>
                    </UCard>
                </div>
            </div>

            <!-- Role Change Modal -->
            <UModal v-model="isRoleModalOpen">
                <UCard :ui="{ background: 'bg-zinc-900', ring: 'ring-1 ring-zinc-800' }">
                    <template #header>
                        <h3 class="text-lg font-semibold text-white">Alterar Role</h3>
                    </template>

                    <div class="space-y-4">
                        <p class="text-zinc-400">
                            Alterando role de <strong class="text-white">{{ selectedUser?.email }}</strong>
                        </p>

                        <UFormGroup label="Nova Role">
                            <USelect v-model="selectedRole" :options="[
                                { label: 'Free', value: 'free' },
                                { label: 'Pro', value: 'pro' },
                                { label: 'Admin', value: 'admin' },
                            ]" />
                        </UFormGroup>
                    </div>

                    <template #footer>
                        <div class="flex justify-end gap-3">
                            <UButton color="gray" variant="ghost" @click="isRoleModalOpen = false">
                                Cancelar
                            </UButton>
                            <UButton color="violet" @click="confirmRoleChange">
                                Confirmar
                            </UButton>
                        </div>
                    </template>
                </UCard>
            </UModal>

            <!-- Delete Confirmation Modal -->
            <UModal v-model="isDeleteModalOpen">
                <UCard :ui="{ background: 'bg-zinc-900', ring: 'ring-1 ring-zinc-800' }">
                    <template #header>
                        <h3 class="text-lg font-semibold text-white">Confirmar Exclusão</h3>
                    </template>

                    <div class="space-y-4">
                        <UAlert color="red" variant="subtle" icon="i-heroicons-exclamation-triangle"
                            title="Atenção: Esta ação não pode ser desfeita." />

                        <p class="text-zinc-400">
                            Deseja realmente excluir o usuário
                            <strong class="text-white">{{ userToDelete?.email }}</strong>?
                        </p>
                    </div>

                    <template #footer>
                        <div class="flex justify-end gap-3">
                            <UButton color="gray" variant="ghost" @click="isDeleteModalOpen = false">
                                Cancelar
                            </UButton>
                            <UButton color="red" @click="confirmDelete">
                                Excluir
                            </UButton>
                        </div>
                    </template>
                </UCard>
            </UModal>
        </div>
    </div>
</template>
