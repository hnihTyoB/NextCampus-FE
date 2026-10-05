import api from "@/lib/axios";
import type {
  CronJobListResponse,
  TriggerCronJobPayload,
  TriggerCronJobResponse,
  ToggleCronJobResponse,
} from "@/types/cron";

export const cronService = {
  // Lấy danh sách các cron jobs đã đăng ký
  listJobs: async (search?: string): Promise<CronJobListResponse> => {
    const response = await api.get<CronJobListResponse>("/cron/jobs", {
      params: search ? { search } : undefined,
    });
    return response.data;
  },

  // Kích hoạt thủ công 1 cron job
  triggerJob: async (
    jobName: string,
    payload?: TriggerCronJobPayload
  ): Promise<TriggerCronJobResponse> => {
    const response = await api.post<TriggerCronJobResponse>(
      `/cron/jobs/${encodeURIComponent(jobName)}/trigger`,
      payload ?? {}
    );
    return response.data;
  },

  // Bật / Tắt lịch chạy tự động của 1 cron job
  toggleJob: async (
    jobName: string,
    payload?: { isEnabled?: boolean }
  ): Promise<ToggleCronJobResponse> => {
    const response = await api.patch<ToggleCronJobResponse>(
      `/cron/jobs/${encodeURIComponent(jobName)}/toggle`,
      payload
    );
    return response.data;
  },
};

