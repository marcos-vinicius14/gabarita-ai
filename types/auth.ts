/**
 * Auth API Types (Discriminated Unions)
 * 
 * Type-safe API responses using discriminated unions pattern.
 * This ensures exhaustive type checking in consumers.
 */

// =============================================================================
// User Profile
// =============================================================================

export interface UserProfile {
    id: string
    email: string
    name: string | null
    role: 'free' | 'trial' | 'pro' | 'admin'
    emailVerified: boolean
    createdAt: string
}

// =============================================================================
// API Response Types (Discriminated Unions)
// =============================================================================

// Base response shape
interface SuccessResponse<T> {
    success: true
    message: string
    data: T
}

interface ErrorResponse {
    success: false
    message: string
    code?: string
    errors?: Record<string, string[]>
}

// Union type for API responses
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse

// =============================================================================
// Auth-specific Response Types
// =============================================================================

export type LoginResponse = ApiResponse<{ user: UserProfile }>
export type RegisterResponse = ApiResponse<undefined>
export type MeResponse = ApiResponse<{ user: UserProfile }>
export type LogoutResponse = ApiResponse<undefined>
export type RefreshResponse = ApiResponse<{ user: UserProfile }>

// =============================================================================
// Input Types
// =============================================================================

export interface LoginInput {
    email: string
    password: string
}

export interface RegisterInput {
    name: string
    email: string
    password: string
}

// =============================================================================
// Helper Type Guards
// =============================================================================

export function isSuccess<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
    return response.success === true
}

export function isError<T>(response: ApiResponse<T>): response is ErrorResponse {
    return response.success === false
}
