"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createInviteService } from "@/services/application.service";
import type { CreateInvitePayload } from "@/types/application";

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInvitePayload) => createInviteService(payload),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application-invites"] });
    },
  });
}
