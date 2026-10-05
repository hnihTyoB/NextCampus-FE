"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cronService } from "@/services/cron.service";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

export type ToggleCronJobVariables =
  | string
  | { jobName: string; isEnabled?: boolean };

export function useToggleCronJob() {
  const queryClient = useQueryClient();
  const t = useTranslations("admin.settings.cronJobs");

  return useMutation({
    mutationFn: (variables: ToggleCronJobVariables) => {
      const jobName = typeof variables === "string" ? variables : variables.jobName;
      const isEnabled = typeof variables === "object" ? variables.isEnabled : undefined;
      return cronService.toggleJob(
        jobName,
        isEnabled !== undefined ? { isEnabled } : undefined
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["cron-jobs"] });
      toast.success(res.message);
    },
    onError: () => {
      toast.error(t("toggleError"));
    },
  });
}
