import api from "@/lib/axios";
import type {
  TaskListResponse,
  TaskSuccessResponse,
  TaskDeleteResponse,
  TaskQueryParams,
  CreateTaskPayload,
  UpdateTaskPayload,
  ImportPreviewResponse,
  ImportResultResponse,
  TaskAnalyticsResponse,
  AdjustTaskSchedulePayload,
  AdjustTaskScheduleResponse,
} from "@/types/task";
import type { AiRecommendationResponse } from "@/types/task-allocation";

export const taskService = {
  // ─── CRUD ────────────────────────────────────────────────────────────

  // GET /tasks
  getTasks: async (params?: TaskQueryParams): Promise<TaskListResponse> => {
    const response = await api.get<any>("/tasks", { params });
    const raw = response.data;
    const taskList = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.data?.data)
        ? raw.data.data
        : [];
    const meta = raw?.meta ?? raw?.data?.meta ?? {
      total: taskList.length,
      page: 1,
      limit: taskList.length,
      totalPages: 1,
    };
    return {
      success: raw?.success ?? true,
      data: taskList,
      meta,
    };
  },

  // GET /tasks/:id
  getTask: async (id: string): Promise<TaskSuccessResponse> => {
    const response = await api.get<TaskSuccessResponse>(`/tasks/${id}`);
    return response.data;
  },

  // POST /tasks
  createTask: async (payload: CreateTaskPayload): Promise<TaskSuccessResponse> => {
    const response = await api.post<TaskSuccessResponse>("/tasks", payload);
    return response.data;
  },

  // PUT /tasks/:id
  updateTask: async (
    id: string,
    payload: UpdateTaskPayload,
  ): Promise<TaskSuccessResponse> => {
    const response = await api.put<TaskSuccessResponse>(`/tasks/${id}`, payload);
    return response.data;
  },

  // DELETE /tasks/:id
  deleteTask: async (id: string): Promise<TaskDeleteResponse> => {
    const response = await api.delete<TaskDeleteResponse>(`/tasks/${id}`);
    return response.data;
  },

  // ─── Import ──────────────────────────────────────────────────────────

  // POST /tasks/import/preview
  previewImport: async (
    file: File,
    taskGroupId?: string,
    taskGroupName?: string,
  ): Promise<ImportPreviewResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    if (taskGroupId) formData.append("taskGroupId", taskGroupId);
    if (taskGroupName) formData.append("taskGroupName", taskGroupName);
    const response = await api.post<ImportPreviewResponse>(
      "/tasks/import/preview",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      },
    );
    return response.data;
  },

  // POST /tasks/import
  executeImport: async (
    file: File,
    taskGroupId?: string,
    taskGroupName?: string,
  ): Promise<ImportResultResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    if (taskGroupId) formData.append("taskGroupId", taskGroupId);
    if (taskGroupName) formData.append("taskGroupName", taskGroupName);
    const response = await api.post<ImportResultResponse>(
      "/tasks/import",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      },
    );
    return response.data;
  },

  // GET /tasks/import/template
  downloadTemplate: async (): Promise<Blob> => {
    const response = await api.get("/tasks/import/template", {
      responseType: "blob",
    });
    return response.data;
  },

  // ─── Analytics ───────────────────────────────────────────────────────

  // GET /tasks/analytics
  getAnalytics: async (
    taskGroupId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<TaskAnalyticsResponse> => {
    const params: Record<string, string> = {};
    if (taskGroupId) params.taskGroupId = taskGroupId;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    const response = await api.get<TaskAnalyticsResponse>("/tasks/analytics", {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
    return response.data;
  },

  // ─── AI Recommendation ──────────────────────────────────────────────

  // POST /tasks/:taskId/ai-recommendation
  getAiRecommendation: async (taskId: string): Promise<AiRecommendationResponse> => {
    const response = await api.post<AiRecommendationResponse>(`/tasks/${taskId}/ai-recommendation`);
    return response.data;
  },

  // POST /tasks/adjust-schedule
  adjustSchedule: async (
    payload: AdjustTaskSchedulePayload,
  ): Promise<AdjustTaskScheduleResponse> => {
    const response = await api.post<AdjustTaskScheduleResponse>(
      "/tasks/adjust-schedule",
      payload,
    );
    return response.data;
  },
};
