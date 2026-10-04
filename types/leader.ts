export const MAX_LEADER_DEPARTMENTS = 3;

export interface LeaderDepartment {
    id: string;
    name: string;
}

export interface LeaderUser {
    id: string;
    email: string;
    fullName: string | null;
    isActive: boolean;
    avatarUrl: string | null;
    role?: {
        id: string;
        name: string;
        portalType: string;
    } | null;
}

export interface Leader {
    id: string;
    userId: string;
    departmentId: string | null;
    position: string | null;
    phone: string | null;
    createdAt: string;
    updatedAt: string;
    user: LeaderUser;
    departments: LeaderDepartment[];
    /** @deprecated Use departments. */
    department: { id: string; name: string } | null;
    internCount?: number;
}

export interface LeaderSuccessResponse {
    success: boolean;
    data: Leader;
}

export interface LeaderListResponse {
    success: boolean;
    data: Leader[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface LeaderQueryParams {
    fullName?: string;
    departmentId?: string;
    department?: string;
    isActive?: boolean;
    sortBy?: "createdAt" | "fullName";
    order?: "asc" | "desc";
    page?: number;
    limit?: number;
}

export interface CreateLeaderPayload {
    userId: string;
    departmentIds?: string[];
    /** @deprecated Use departmentIds. */
    departmentId?: string;
    position?: string;
    phone?: string;
}

export interface UpdateLeaderPayload {
    departmentIds?: string[];
    /** @deprecated Use departmentIds. */
    departmentId?: string | null;
    position?: string | null;
    phone?: string;
}

export interface UpdateMeLeaderPayload {
    phone?: string | null;
}

export interface BatchUpdateLeaderItem {
    id: string;
    departmentIds?: string[];
    position?: string | null;
    phone?: string;
    isActive?: boolean;
}

export interface BatchUpdateLeadersResponse {
    success: boolean;
    message: string;
    data: Leader[];
}

