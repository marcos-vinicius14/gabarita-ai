/**
 * Admin Middleware
 * 
 * Protects admin routes by checking if user has admin role.
 * Redirects to dashboard if not authorized.
 */

export default defineNuxtRouteMiddleware(async (to) => {
    const { data: authData } = await useFetch('/api/auth/me');

    if (!authData.value?.success || !authData.value?.data?.user) {
        return navigateTo('/login');
    }

    const user = authData.value.data.user;

    if (user.role !== 'admin') {
        return navigateTo('/dashboard');
    }
});
