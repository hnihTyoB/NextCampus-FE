"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { leaderService } from "@/services/leader.service";
import type { BatchUpdateLeaderItem } from "@/types/leader";

export function useBatchUpdateLeaders() {
    const queryClient = useQueryClient();
    const t = useTranslations("batchSave");

    return useMutation({
        mutationFn: (items: BatchUpdateLeaderItem[]) =>
            leaderService.batchUpdateLeaders(items),

        onSuccess: (res) => {
            const count = res.data?.length ?? 0;
            toast.success(t("saveSuccess", { count }));
            queryClient.invalidateQueries({ queryKey: ["leaders"] });
            queryClient.invalidateQueries({ queryKey: ["departments"] });
        },

        onError: () => {
            toast.error(t("saveError"));
        },
    });
}
