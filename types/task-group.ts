// ─── Entity ───────────────────────────────────────────────────────────────

export type TaskGroupStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface TaskGroupMember {
  userId?: string;
  internId?: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    internshipProfile?: {
      id: string;
      mentorId: string | null;
      status: string;
      department: { id: string; name: string } | null;
      position: { id: string; name: string } | null;
    } | null;
  };
  intern?: {
    id: string;
    leaderId: string | null;
    fullName: string;
    status: "ACTIVE" | "COMPLETED" | "DROPPED" | string;
    user?: { email: string | null; avatarUrl?: string | null };
    department?: { id: string; name: string } | null;
    position?: { id: string; name: string } | null;
  };
}

export function getTaskGroupMemberId(member: TaskGroupMember): string {
  return member.userId || member.internId || member.user?.id || member.intern?.id || "";
}

export function getTaskGroupMemberName(member: TaskGroupMember): string {
  return member.intern?.fullName || member.user?.fullName || "—";
}

export function getTaskGroupMemberEmail(member: TaskGroupMember): string {
  return member.user?.email || member.intern?.user?.email || "";
}

export function getTaskGroupMemberAvatar(member: TaskGroupMember): string | undefined {
  return member.user?.avatarUrl || member.intern?.user?.avatarUrl || undefined;
}

export interface TaskGroup {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  status: TaskGroupStatus;
  department?: { id: string; name: string } | null;
  maxWorkloadDays: number;
  maxActiveTasks: number | null;
  requireAllMembers: boolean;
  members?: TaskGroupMember[];
  _count?: { tasks: number; members: number };
  createdAt: string;
  updatedAt: string;
}

export interface TaskGroupProgress {
  taskGroupId: string;
  taskGroupName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  todoTasks: number;
  blockedTasks: number;
  unassignedTasks: number;
  completionRate: number;
}

export interface TaskGroupTask {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  deadline: string;
  startDate: string | null;
  estDays: number;
  phase: string | null;
  module: string | null;
  priority: string;
  createdBy: string;
  createdAt: string;
  assignment?: {
    id: string;
    status: string;
    internId: string;
    supportId: string | null;
    intern?: {
      id: string;
      fullName: string;
      user?: { email?: string | null; avatarUrl?: string | null };
    } | null;
    support?: {
      id: string;
      fullName: string;
      user?: { email?: string | null; avatarUrl?: string | null };
    } | null;
  } | null;
  dependsOn?: Array<{
    id: string;
    code: string | null;
    title: string;
    assignment?: { id: string; status: string } | null;
  }>;
  dependencies?: Array<{
    id: string;
    code: string | null;
    title: string;
    assignment?: { id: string; status: string } | null;
  }>;
}

// ─── Response wrappers ────────────────────────────────────────────────────

export interface TaskGroupSuccessResponse {
  success: boolean;
  data: TaskGroup;
}

export interface TaskGroupPaginatedPayload {
  data: TaskGroup[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type TaskGroupData = TaskGroup[] | TaskGroupPaginatedPayload;

export interface TaskGroupListResponse {
  success: boolean;
  data: TaskGroup[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TaskGroupApiResponse {
  success?: boolean;
  data?: TaskGroupData;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function extractTaskGroups(data?: TaskGroupData | null): TaskGroup[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if ("data" in data && Array.isArray(data.data)) return data.data;
  return [];
}

export interface TaskGroupProgressResponse {
  success: boolean;
  data: TaskGroupProgress;
}

export interface TaskGroupTasksResponse {
  success: boolean;
  data: TaskGroupTask[];
}

// ─── Payloads ─────────────────────────────────────────────────────────────

export interface CreateTaskGroupPayload {
  name: string;
  description?: string;
  departmentId?: string | null;
  status?: TaskGroupStatus;
  memberIds?: string[];
  maxWorkloadDays?: number;
  maxActiveTasks?: number | null;
  requireAllMembers?: boolean;
}

export interface UpdateTaskGroupPayload {
  name?: string;
  description?: string | null;
  departmentId?: string | null;
  status?: TaskGroupStatus;
  memberIds?: string[];
  maxWorkloadDays?: number;
  maxActiveTasks?: number | null;
  requireAllMembers?: boolean;
}

export interface TaskGroupQueryParams {
  departmentId?: string;
  status?: TaskGroupStatus;
  search?: string;
  page?: number;
  limit?: number;
}
