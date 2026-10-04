export interface InternUser {
    id: string;
    email: string;
    fullName: string | null;
    isActive: boolean;
    role?: {
        id: string;
        name: string;
        portalType: string;
    } | null;
}

export interface Intern {
    id: string;
    userId: string;
    leaderId: string | null;
    fullName: string;
    phone: string;
    department: { id: string; name: string } | null;
    position: { id: string; name: string } | null;
    startDate: string;
    duration: number;
    discordUserId: string | null;
    discordUsername: string | null;
    discordRoleGranted: boolean;
    status: "ACTIVE" | "COMPLETED" | "DROPPED";
    createdAt: string;
    updatedAt: string;
    user: InternUser;
    leader: InternUser | null;
}

export interface InternSuccessResponse {
    success: boolean;
    data: Intern;
}

export interface AssignmentInternLookup {
    id: string;
    fullName: string;
    email: string;
    leader: Pick<InternUser, "id" | "email" | "fullName">;
}

export interface AssignmentInternLookupResponse {
    success: boolean;
    data: AssignmentInternLookup;
}

export interface InternListResponse {
    success: boolean;
    data: Intern[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface InternQueryParams {
    fullName?: string;
    departmentId?: string;
    positionId?: string;
    department?: string;
    position?: string;
    status?: "ACTIVE" | "COMPLETED" | "DROPPED";
    leaderId?: string;
    leader?: string;
    discordRoleGranted?: boolean;
    startDateFrom?: string;
    startDateTo?: string;
    sortBy?: "createdAt" | "fullName" | "startDate" | "status";
    order?: "asc" | "desc";
    page?: number;
    limit?: number;
}

export interface CreateInternPayload {
    userId: string;
    leaderId?: string;
    fullName: string;
    phone: string;
    departmentId: string;
    positionId: string;
    startDate: string;
    duration: number;
    discordUsername?: string;
}

export interface DirectCreateInternPayload {
    email: string;
    leaderId?: string;
    fullName: string;
    phone: string;
    departmentId: string;
    positionId: string;
    startDate: string;
    duration: number;
    discordUsername?: string;
}

export interface UpdateInternPayload {
    leaderId?: string | null;
    fullName?: string;
    phone?: string;
    departmentId?: string | null;
    positionId?: string | null;
    startDate?: string;
    duration?: number;
    discordUsername?: string | null;
    discordRoleGranted?: boolean;
    status?: "ACTIVE" | "COMPLETED" | "DROPPED";
}

export interface UpdateMeInternPayload {
    phone?: string;
    discordUserId?: string | null;
    discordUsername?: string | null;
    university?: string | null;
    major?: string | null;
}
