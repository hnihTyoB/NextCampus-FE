"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useTranslations } from "next-intl";
import { meetingService } from "@/services/meeting.service";

export function useGrantDiscordPermissions() {
  const queryClient = useQueryClient();
  const t = useTranslations("meetings");

  return useMutation({
    mutationFn: (meetingId: string) =>
      meetingService.grantDiscordPermissions(meetingId),

    onSuccess: (data, meetingId) => {
      if (data.data && !data.data.success) {
        toast.error(t("discordPermissionsGrantedError"));
        return;
      }
      toast.success(t("discordPermissionsGrantedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["meetings", "discord-rooms"] });
    },

    onError: (error: unknown) => {
      const errorMsg = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(errorMsg ?? t("discordPermissionsGrantedError"));
    },
  });
}
