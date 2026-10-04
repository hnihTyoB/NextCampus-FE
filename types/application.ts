// ─── Entities ────────────────────────────────────────────────────────────

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApplicationAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface Application {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  preferredDepartment: string | null;
  preferredPosition: string | null;
  department: { id: string; name: string } | null;
  position: { id: string; name: string } | null;
  startDate: string;
  duration: number;
  status: ApplicationStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  regulationId: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  approver: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
  attachments?: ApplicationAttachment[];
}

export type ApplicationInviteStatus = "UNUSED" | "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";

export interface ApplicationInvite {
  id: string;
  email: string;
  token: string;
  status: ApplicationInviteStatus;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Response wrappers ────────────────────────────────────────────────────

export interface ApplicationSuccessResponse {
  success: boolean;
  data: Application;
}

export interface ApplicationListResponse {
  success: boolean;
  data: Application[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateInviteSuccessResponse {
  success: boolean;
  data: {
    invite: ApplicationInvite;
    link: string;
  };
}

export interface VerifyInviteSuccessResponse {
  success: boolean;
  data: {
    valid: boolean;
    email: string;
  };
}

// ─── Query params ─────────────────────────────────────────────────────────

export interface ApplicationQueryParams {
  status?: ApplicationStatus;
  departmentId?: string;
  positionId?: string;
  email?: string;
  startDateFrom?: string;
  startDateTo?: string;
  sortBy?: "createdAt" | "startDate" | "fullName" | "status";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// ─── Payloads ─────────────────────────────────────────────────────────────

export interface CreateApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  university?: string;
  major?: string;
  preferredDepartment: string;
  preferredPosition: string;
  startDate: string;
  duration?: number;
  token: string;
  regulationId?: string;
  acceptedRegulations: boolean;
  cvUrl?: string;
  files?: File[];
  uploadedFiles?: Array<{
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
  }>;
}

export interface CreateInvitePayload {
  email: string;
}

export interface ReviewApplicationPayload {
  status: "APPROVED" | "REJECTED";
}

export interface AssignApplicationPayload {
  departmentId: string | null;
  positionId: string | null;
}

// ─── Invite list (GET /applications/invites) ──────────────────────────────

export interface ApplicationInviteRow {
  id: string;
  email: string;
  token: string;
  status: ApplicationInviteStatus;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  application: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    preferredDepartment: string | null;
    preferredPosition: string | null;
    department: { id: string; name: string } | null;
    position: { id: string; name: string } | null;
    status: ApplicationStatus;
    startDate: string;
    duration: number;
    createdAt: string;
    attachments?: ApplicationAttachment[];
  } | null;
  creator: {
    id: string;
    fullName: string;
  } | null;
}

export interface ApplicationInviteListResponse {
  success: boolean;
  data: ApplicationInviteRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetApplicationInvitesParams {
  email?: string;
  inviteStatus?: ApplicationInviteStatus;
  applicationStatus?: ApplicationStatus;
  departmentId?: string;
  positionId?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: "createdAt" | "expiresAt" | "email";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface BatchAssignApplicationItem {
  id: string;
  departmentId: string | null;
  positionId: string | null;
}

export interface BatchAssignApplicationsResponse {
  success: boolean;
  message: string;
  data: Application[];
}

