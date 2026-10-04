"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { batchAssignApplicationsService } from "@/services/application.service";
import type { BatchAssignApplicationItem } from "@/types/application";

export function useBatchAssignApplications() {
    const queryClient = useQueryClient();
    const t = useTranslations("batchSave");

    return useMutation({
        mutationFn: (items: BatchAssignApplicationItem[]) =>
            batchAssignApplicationsService(items),

        onSuccess: (res) => {
            const count = res.data?.length ?? 0;
            toast.success(t("saveSuccess", { count }));
            queryClient.invalidateQueries({ queryKey: ["application-invites"] });
            queryClient.invalidateQueries({ queryKey: ["applications"] });
        },

        onError: () => {
            toast.error(t("saveError"));
        },
    });
}
