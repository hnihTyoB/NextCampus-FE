import { useMutation, useQueryClient } from "@tanstack/react-query";
import { discordService } from "@/services/discord.service";
import { DISCORD_WEBHOOKS_QUERY_KEY } from "./useDiscordWebhooks";
import type { ProvisionDepartmentResponse } from "@/types/discord";

export function useProvisionDepartment() {
  const queryClient = useQueryClient();

  return useMutation<ProvisionDepartmentResponse, Error, string>({
    mutationKey: ["discord", "provision-department"],
    mutationFn: (departmentId: string) =>
      discordService.provisionDepartment(departmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISCORD_WEBHOOKS_QUERY_KEY });
    },
  });
}
