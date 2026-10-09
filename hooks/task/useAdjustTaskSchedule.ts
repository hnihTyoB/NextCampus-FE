"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { taskService } from "@/services/task.service";
import type { AdjustTaskSchedulePayload } from "@/types/task";

import type { AxiosError } from "axios";

export function useAdjustTaskSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdjustTaskSchedulePayload) =>
      taskService.adjustSchedule(payload),

    onSuccess: (data) => {
      toast.success(
        data.message ||
          `Đã điều chỉnh lịch trình thành công cho ${data.data.adjustedTasksCount} công việc.`,
      );
      queryClient.invalidateQueries({ queryKey: ["tasks"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["task-groups"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stats"], exact: false });
    },

    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      const msg =
        axiosError?.response?.data?.message ||
        axiosError?.message ||
        "Không thể điều chỉnh lịch trình công việc.";
      toast.error(msg);
    },
  });
}
