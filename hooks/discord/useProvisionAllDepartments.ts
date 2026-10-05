import { useMutation, useQueryClient } from "@tanstack/react-query";
import { discordService } from "@/services/discord.service";
import { DISCORD_WEBHOOKS_QUERY_KEY } from "./useDiscordWebhooks";
import type { ProvisionAllDepartmentsResponse } from "@/types/discord";

export function useProvisionAllDepartments() {
  const queryClient = useQueryClient();

  return useMutation<ProvisionAllDepartmentsResponse, Error, void>({
    mutationKey: ["discord", "provision-all"],
    mutationFn: () => discordService.provisionAllDepartments(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISCORD_WEBHOOKS_QUERY_KEY });
    },
  });
}
