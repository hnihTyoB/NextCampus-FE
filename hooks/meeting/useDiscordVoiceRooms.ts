"use client";

import { useQuery } from "@tanstack/react-query";
import { meetingService } from "@/services/meeting.service";

export function useDiscordVoiceRooms(enabled = true) {
  return useQuery({
    queryKey: ["meetings", "discord-rooms"],
    queryFn: () => meetingService.getDiscordVoiceRooms(),
    enabled,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Auto-refresh voice channel list every minute
  });
}
