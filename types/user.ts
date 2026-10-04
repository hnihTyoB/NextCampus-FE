// ─── User entity ────────────────────────────────────────────────────────

import { ApiErrorResponse } from "@/types/auth";

export interface ApiError {
  response?: {
    data?: ApiErrorResponse;
  };
}

export interface UserRole {
  id: string;
  name: string;
  isSystem?: boolean;
  portalType?: "ADMIN" | "LEADER" | "INTERN";
}

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  roleId: string;
  isActive: boolean;
  avatarUrl: string | null;
  discordUserId?: string | null;
  discordUsername?: string | null;
  createdAt: string;
  updatedAt: string;
  role: UserRole;
}

// ─── Response wrappers ──────────────────────────────────────────────────

export interface UserSuccessResponse {
  success: boolean;
  data: User;
}

export interface UserListResponse {
  success: boolean;
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Payloads ───────────────────────────────────────────────────────────

export interface UserQueryParams {
  email?: string;
  fullName?: string;
  roleName?: string;
  portalType?: "ADMIN" | "LEADER" | "INTERN";
  excludeRoles?: string;
  isActive?: boolean;
  sortBy?: "createdAt" | "email" | "fullName";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CreateUserPayload {
  email: string;
  password?: string;
  roleName?: string;
  roleId?: string;
  fullName?: string;
}

export interface UpdateUserPayload {
  isActive?: boolean;
  role?: string;
  roleId?: string;
  fullName?: string;
}
