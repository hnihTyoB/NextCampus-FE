import api from "@/lib/axios";
import type {
    LeaderSuccessResponse,
    LeaderListResponse,
    LeaderQueryParams,
    CreateLeaderPayload,
    UpdateLeaderPayload,
    UpdateMeLeaderPayload,
    BatchUpdateLeaderItem,
    BatchUpdateLeadersResponse,
} from "@/types/leader";
import type { MessageSuccessResponse } from "@/types/auth";

export const leaderService = {
    getMyLeader: async (): Promise<LeaderSuccessResponse> => {
        const response = await api.get<LeaderSuccessResponse>("/leaders/me");
        return response.data;
    },

    updateMyLeader: async (
        payload: UpdateMeLeaderPayload,
    ): Promise<LeaderSuccessResponse> => {
        const response = await api.put<LeaderSuccessResponse>(
            "/leaders/me",
            payload,
        );
        return response.data;
    },

    getLeaders: async (
        params?: LeaderQueryParams,
    ): Promise<LeaderListResponse> => {
        const response = await api.get<LeaderListResponse>("/leaders", {
            params,
        });
        return response.data;
    },

    getLeader: async (id: string): Promise<LeaderSuccessResponse> => {
        const response = await api.get<LeaderSuccessResponse>(
            `/leaders/${id}`,
        );
        return response.data;
    },

    createLeader: async (
        payload: CreateLeaderPayload,
    ): Promise<LeaderSuccessResponse> => {
        const response = await api.post<LeaderSuccessResponse>(
            "/leaders",
            payload,
        );
        return response.data;
    },

    updateLeader: async (
        id: string,
        payload: UpdateLeaderPayload,
    ): Promise<LeaderSuccessResponse> => {
        const response = await api.put<LeaderSuccessResponse>(
            `/leaders/${id}`,
            payload,
        );
        return response.data;
    },

    batchUpdateLeaders: async (
        items: BatchUpdateLeaderItem[],
    ): Promise<BatchUpdateLeadersResponse> => {
        const response = await api.post<BatchUpdateLeadersResponse>(
            "/leaders/batch-update",
            { items },
        );
        return response.data;
    },

    deleteLeader: async (id: string): Promise<MessageSuccessResponse> => {
        const response = await api.delete<MessageSuccessResponse>(
            `/leaders/${id}`,
        );
        return response.data;
    },
};
