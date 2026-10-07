"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { taskService } from "@/services/task.service";

export function useDownloadTemplate() {
  const t = useTranslations("leader.tasks");

  return useMutation({
    mutationFn: async () => {
      const blob = await taskService.downloadTemplate();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "task-import-template.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    },

    onSuccess: () => {
      toast.success(t("downloadTemplateSuccess"));
    },

    onError: (error: unknown) => {
      let msg = t("downloadTemplateError");
      if (typeof error === "object" && error !== null && "response" in error) {
        const res = (error as { response?: { data?: { message?: string } } }).response;
        if (res?.data?.message) {
          msg = res.data.message;
        }
      }
      toast.error(msg);
    },
  });
}
