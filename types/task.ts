// ─── Status types ──────────────────────────────────────────────────────────

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

// ─── Sub-entities ─────────────────────────────────────────────────────────

export interface TaskGroup {
  id: string;
  name: string;
  departmentId?: string | null;
}

export interface TaskCreator {
  id: string;
  email: string;
  fullName: string;
}

export interface TaskAssignmentSummary {
  id: string;
  taskId: string;
  internId: string;
  assignedBy: string;
  status: string;
  blockedReason: string | null;
  assignedAt: string;
  updatedAt: string;
  intern?: { id: string; fullName: string };
  support?: { id: string; fullName: string } | null;
}

export interface TaskAttachmentSummary {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

export interface TaskDependency {
  id: string;
  code: string | null;
  title: string;
  assignment?: {
    id: string;
    status: string;
    intern?: { id: string; fullName: string } | null;
  } | null;
}

// ─── Entity ───────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  deadline: string | null;
  startDate: string | null;
  estDays: number | null;
  phase: string | null;
  module: string | null;
  acceptanceCriteria: string | null;
  taskNotes: string | null;
  priority: TaskPriority;
  taskGroupId: string | null;
  createdBy: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  taskGroup: TaskGroup | null;
  creator: TaskCreator;
  assignment: TaskAssignmentSummary | null;
  attachments: TaskAttachmentSummary[];
  dependsOn: TaskDependency[];
  dependencies: TaskDependency[];
  recreatedTaskId: string | null;
  recreatedTask: { id: string; title: string; code: string | null; assignment: { intern: { fullName: string } } | null } | null;
}

// ─── Response wrappers ────────────────────────────────────────────────────

export interface TaskSuccessResponse {
  success: boolean;
  data: Task;
}

export interface TaskListResponse {
  success: boolean;
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function extractTasks(data?: any): Task[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.data)) return data.data.data;
  return [];
}

export interface TaskDeleteResponse {
  success: boolean;
  message: string;
}

// ─── Query params ─────────────────────────────────────────────────────────

export interface TaskQueryParams {
  title?: string;
  code?: string;
  owner?: string;
  priority?: TaskPriority;
  createdBy?: string;
  phase?: string;
  module?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  taskGroupId?: string;
  status?: string;
  statusNot?: string;
  sortBy?: "createdAt" | "title" | "deadline" | "priority";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// ─── Payloads ─────────────────────────────────────────────────────────────

export interface CreateTaskPayload {
  title: string;
  description?: string;
  deadline?: string | null;
  estDays: number;
  priority?: TaskPriority;
  code?: string;
  startDate?: string | null;
  phase?: string;
  module?: string;
  acceptanceCriteria?: string;
  taskNotes?: string;
  taskGroupId?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  deadline?: string | null;
  priority?: TaskPriority;
  code?: string | null;
  startDate?: string | null;
  estDays?: number | null;
  phase?: string | null;
  module?: string | null;
  acceptanceCriteria?: string | null;
  taskNotes?: string | null;
  taskGroupId?: string | null;
  recreatedTaskId?: string | null;
}

// ─── Bulk Import ──────────────────────────────────────────────────────────

export interface ImportTaskRow {
  excelCode: string;
  title: string;
  description: string;
  deadline?: string | null;
  startDate?: string | null;
  priority: TaskPriority;
  ownerEmail?: string;
  supportEmail?: string;
  phase?: string;
  module?: string;
  estDays?: number;
  acceptanceCriteria?: string;
  taskNotes?: string;
  dependencyCodes: string[];
}

export interface ImportPreviewData {
  totalRows: number;
  validRows: ImportTaskRow[];
  errorRows: { rowIndex: number; excelCode?: string; errors: string[] }[];
  internMappings: {
    ownerAlias: string;
    email: string;
    internId: string | null;
    internFullName: string | null;
  }[];
  taskGroupId?: string;
  taskGroupName?: string;
}

export interface ImportResultData {
  importedTasks: number;
  importedAssignments: number;
  importedDependencies: number;
  importedAttachments: number;
  skippedCodes: string[];
  errorRows: { excelCode?: string; error: string }[];
  taskGroupId?: string;
  taskGroupName?: string;
}

export interface ImportPreviewResponse {
  success: boolean;
  data: ImportPreviewData;
}

export interface ImportResultResponse {
  success: boolean;
  data: ImportResultData;
}

// ─── Analytics ────────────────────────────────────────────────────────────

export interface TaskStatusDistribution {
  status: string;
  count: number;
}

export interface TaskPriorityDistribution {
  priority: string;
  count: number;
}

export interface WorkloadByIntern {
  internId: string;
  internFullName: string;
  totalTasks: number;
  totalEstDays: number;
  byStatus: TaskStatusDistribution[];
}

export interface PhaseProgress {
  phase: string;
  totalTasks: number;
  doneTasks: number;
  completionRate: number;
}

export interface TaskAnalytics {
  overview: {
    totalTasks: number;
    overdueTasks: number;
    byStatus: TaskStatusDistribution[];
    byPriority: TaskPriorityDistribution[];
  };
  workloadByIntern: WorkloadByIntern[];
  progressByPhase: PhaseProgress[];
}

export interface TaskAnalyticsResponse {
  success: boolean;
  data: TaskAnalytics;
}

// ─── Schedule Adjustment ──────────────────────────────────────────────────

export interface AdjustTaskSchedulePayload {
  taskGroupId?: string;
  taskIds?: string[];
  anchorStartDate?: string;
  shiftDays?: number;
}

export interface AdjustTaskScheduleResponse {
  success: boolean;
  message: string;
  data: {
    adjustedTasksCount: number;
    tasks: Array<{
      id: string;
      code: string | null;
      title: string;
      startDate: string | null;
      deadline: string | null;
      estDays: number | null;
    }>;
  };
}
