"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { reviewApplicationService } from "@/services/application.service";
import type { ReviewApplicationPayload, ApplicationInviteRow, Application } from "@/types/application";
import type { ApiErrorResponse } from "@/types/auth";

type PaginationMeta = {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

type InviteListData = { data: ApplicationInviteRow[]; meta: PaginationMeta };
type AppListData = { data: Application[]; meta: PaginationMeta };

export function useReviewApplication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: string;
            payload: ReviewApplicationPayload;
        }) => reviewApplicationService(id, payload),

        onMutate: ({ id, payload }) => {
            // Optimistic update: application-invites cache
            const prevInvites = queryClient.getQueriesData<InviteListData>({
                queryKey: ["application-invites"],
            });

            queryClient.setQueriesData<InviteListData>(
                { queryKey: ["application-invites"] },
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        data: old.data.map((inv) =>
                            inv.application?.id === id
                                ? {
                                      ...inv,
                                      application: {
                                          ...inv.application,
                                          status: payload.status,
                                      },
                                  }
                                : inv,
                        ),
                    };
                },
            );

            // Optimistic update: applications cache (PendingInternsTable)
            const prevApps = queryClient.getQueriesData<AppListData>({
                queryKey: ["applications"],
            });

            queryClient.setQueriesData<AppListData>(
                { queryKey: ["applications"] },
                (old) => {
                    if (!old) return old;
                    if (payload.status === "APPROVED" || payload.status === "REJECTED") {
                        // Remove from pending list
                        return {
                            ...old,
                            data: old.data.filter((app) => app.id !== id),
                            meta: { ...old.meta, total: old.meta.total - 1 },
                        };
                    }
                    return old;
                },
            );

            return { prevInvites, prevApps };
        },

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["application-invites"] });
            queryClient.invalidateQueries({ queryKey: ["applications"] });
        },

        onError: (_error: AxiosError<ApiErrorResponse>, _vars, ctx) => {
            ctx?.prevInvites?.forEach(([key, data]) =>
                queryClient.setQueryData(key, data),
            );
            ctx?.prevApps?.forEach(([key, data]) =>
                queryClient.setQueryData(key, data),
            );
        },
    });
}
