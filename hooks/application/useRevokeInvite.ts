"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { revokeInviteService } from "@/services/application.service";
import type { ApplicationInviteRow } from "@/types/application";

type InviteListData = { data: ApplicationInviteRow[]; meta: unknown };

export function useRevokeInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => revokeInviteService(id),

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
            data: old.data.map((inv) =>
              inv.id === id ? { ...inv, status: "REVOKED" as const } : inv,
            ),
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
