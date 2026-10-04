"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import { internService } from "@/services/intern.service";
import type { BatchUpdateInternItem } from "@/types/intern";

export function useBatchUpdateInterns() {
    const queryClient = useQueryClient();
    const t = useTranslations("batchSave");

    return useMutation({
        mutationFn: (items: BatchUpdateInternItem[]) =>
            internService.batchUpdateInterns(items),

        onSuccess: (res) => {
            const count = res.data?.length ?? 0;
            toast.success(t("saveSuccess", { count }));
            queryClient.invalidateQueries({ queryKey: ["interns"] });
        },

        onError: () => {
            toast.error(t("saveError"));
        },
    });
}
