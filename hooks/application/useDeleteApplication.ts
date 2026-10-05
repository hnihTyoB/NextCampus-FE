"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteApplicationService } from "@/services/application.service";
import type { ApplicationInviteRow } from "@/types/application";

type InviteListData = { data: ApplicationInviteRow[]; meta: unknown };

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApplicationService(id),

    onMutate: (id) => {
      const prev = queryClient.getQueriesData<InviteListData>({
        queryKey: ["application-invites"],
      });

      queryClient.setQueriesData<InviteListData>(
        { queryKey: ["application-invites"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((inv) => inv.application?.id !== id),
          };
        },
      );

      return { prev };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application-invites"] });
    },

    onError: (_err, _vars, ctx) => {
      ctx?.prev?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
    },
  });
}
