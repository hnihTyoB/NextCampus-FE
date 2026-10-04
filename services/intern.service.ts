import api from "@/lib/axios";
import type {
    InternSuccessResponse,
    InternListResponse,
    InternQueryParams,
    AssignmentInternLookupResponse,
    CreateInternPayload,
    DirectCreateInternPayload,
    UpdateInternPayload,
    UpdateMeInternPayload,
    BatchUpdateInternItem,
    BatchUpdateInternsResponse,
} from "@/types/intern";
import type { MessageSuccessResponse } from "@/types/auth";

export const internService = {
    // ─── Self-service (INTERN) ──────────────────────────────────────

    getMyIntern: async (): Promise<InternSuccessResponse> => {
        const response = await api.get<InternSuccessResponse>("/interns/me");
        return response.data;
    },

    updateMyIntern: async (
        payload: UpdateMeInternPayload,
    ): Promise<InternSuccessResponse> => {
        const response = await api.put<InternSuccessResponse>(
            "/interns/me",
            payload,
        );
        return response.data;
    },

    // ─── Admin / Leader ─────────────────────────────────────────────

        // GET /interns/me
    getInterns: async (
        params?: InternQueryParams,
    ): Promise<InternListResponse> => {
        const response = await api.get<InternListResponse>("/interns", {
            params,
        });
        return response.data;
    },
        //GET /interns/:id
    getIntern: async (id: string): Promise<InternSuccessResponse> => {
        const response = await api.get<InternSuccessResponse>(
            `/interns/${id}`,
        );
        return response.data;
    },
    lookupAssignmentIntern: async (
        email: string,
    ): Promise<AssignmentInternLookupResponse> => {
        const response = await api.get<AssignmentInternLookupResponse>(
            "/interns/assignment-lookup",
            { params: { email } },
        );
        return response.data;
    },
        //POST /interns
    createIntern: async (
        payload: CreateInternPayload,
    ): Promise<InternSuccessResponse> => {
        const response = await api.post<InternSuccessResponse>(
            "/interns",
            payload,
        );
        return response.data;
    },
        // POST /interns/direct
    directCreateIntern: async (
        payload: DirectCreateInternPayload,
    ): Promise<InternSuccessResponse> => {
        const response = await api.post<InternSuccessResponse>(
            "/interns/direct",
            payload,
        );
        return response.data;
    },
        //PUT /interns/:id
    updateIntern: async (
        id: string,
        payload: UpdateInternPayload,
    ): Promise<InternSuccessResponse> => {
        const response = await api.put<InternSuccessResponse>(
            `/interns/${id}`,
            payload,
        );
        return response.data;
    },

    batchUpdateInterns: async (
        items: BatchUpdateInternItem[],
    ): Promise<BatchUpdateInternsResponse> => {
        const response = await api.post<BatchUpdateInternsResponse>(
            "/interns/batch-update",
            { items },
        );
        return response.data;
    },
        //DELETE /interns/:id
    deleteIntern: async (id: string): Promise<MessageSuccessResponse> => {
        const response = await api.delete<MessageSuccessResponse>(
            `/interns/${id}`,
        );
        return response.data;
    },

    remindDiscord: async (id: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post<{ success: boolean; message: string }>(
            `/interns/${id}/remind-discord`,
        );
        return response.data;
    },
};
