import api from "@/lib/axios";
import {
  ApplicationListResponse,
  ApplicationSuccessResponse,
  ApplicationQueryParams,
  CreateApplicationPayload,
  CreateInvitePayload,
  CreateInviteSuccessResponse,
  ReviewApplicationPayload,
  AssignApplicationPayload,
  VerifyInviteSuccessResponse,
  ApplicationInviteListResponse,
  GetApplicationInvitesParams,
  ApplicationInviteRow,
  BatchAssignApplicationItem,
  BatchAssignApplicationsResponse,
} from "@/types/application";
import { MessageSuccessResponse } from "@/types/auth";

export interface InviteDetailResponse {
  success: boolean;
  data: ApplicationInviteRow;
}

// 1. POST /applications/invites — Gửi lời mời nộp đơn (Admin)
export const createInviteService = async (
  payload: CreateInvitePayload,
): Promise<CreateInviteSuccessResponse> => {
  const response = await api.post<CreateInviteSuccessResponse>(
    "/applications/invites",
    payload,
  );
  return response.data;
};

// 2. GET /applications/invites/verify — Xác thực token (Public)
export const verifyInviteService = async (
  token: string,
): Promise<VerifyInviteSuccessResponse> => {
  const response = await api.get<VerifyInviteSuccessResponse>(
    "/applications/invites/verify",
    { params: { token } },
  );
  return response.data;
};

// 3. PATCH /applications/invites/:id/revoke — Thu hồi lời mời (Admin)
export const revokeInviteService = async (
  id: string,
): Promise<MessageSuccessResponse> => {
  const response = await api.patch<MessageSuccessResponse>(
    `/applications/invites/${id}/revoke`,
  );
  return response.data;
};

// 4. POST /applications/submit — Nộp đơn (Public)
export const createApplicationService = async (
  payload: CreateApplicationPayload,
): Promise<ApplicationSuccessResponse> => {
  const data = { ...payload };
  delete (data as { files?: unknown }).files;
  const response = await api.post<ApplicationSuccessResponse>(
    "/applications/submit",
    data,
  );
  return response.data;
};

// GET /applications/attachments/upload-url (Public, dùng token để xác thực)
export const getApplicationAttachmentPutUrl = async (
  token: string,
  fileName: string,
  contentType: string,
): Promise<{ success: boolean; data: { uploadUrl: string; fileKey: string; key?: string; filePath?: string; publicUrl?: string } }> => {
  const response = await api.get<{
    success: boolean;
    data: { uploadUrl: string; key: string; filePath?: string; publicUrl?: string };
  }>("/applications/attachments/upload-url", {
    params: { token, fileName, contentType, mimeType: contentType },
  });
  const resData = response.data.data;
  const key = resData.filePath ?? resData.key;
  return {
    ...response.data,
    data: {
      ...resData,
      fileKey: key,
      filePath: key,
      key,
    },
  };
};

// 5. GET /applications — Danh sách đơn (Admin, Leader)
export const getApplicationsService = async (
  params?: ApplicationQueryParams,
): Promise<ApplicationListResponse> => {
  const response = await api.get<ApplicationListResponse>("/applications", {
    params,
  });
  return response.data;
};

// 6. GET /applications/:id — Chi tiết đơn (Admin, Leader)
export const getApplicationService = async (
  id: string,
): Promise<ApplicationSuccessResponse> => {
  const response = await api.get<ApplicationSuccessResponse>(
    `/applications/${id}`,
  );
  return response.data;
};

// 7. PATCH /applications/:id/review — Duyệt / từ chối đơn (Admin, Leader)
export const reviewApplicationService = async (
  id: string,
  payload: ReviewApplicationPayload,
): Promise<ApplicationSuccessResponse> => {
  const response = await api.patch<ApplicationSuccessResponse>(
    `/applications/${id}/review`,
    payload,
  );
  return response.data;
};

export const assignApplicationService = async (
  id: string,
  payload: AssignApplicationPayload,
): Promise<ApplicationSuccessResponse> => {
  const response = await api.patch<ApplicationSuccessResponse>(
    `/applications/${id}/assignment`,
    payload,
  );
  return response.data;
};

export const batchAssignApplicationsService = async (
  items: BatchAssignApplicationItem[],
): Promise<BatchAssignApplicationsResponse> => {
  const response = await api.post<BatchAssignApplicationsResponse>(
    "/applications/batch-assign",
    { items },
  );
  return response.data;
};

// 9. GET /applications/invites — Danh sách lời mời (Admin, Leader)
export const getApplicationInvitesService = async (
  params?: GetApplicationInvitesParams,
): Promise<ApplicationInviteListResponse> => {
  const response = await api.get<ApplicationInviteListResponse>(
    "/applications/invites",
    { params },
  );
  return response.data;
};

// 10. GET /applications/invites/:id — Chi tiêt 1 lời mời (Admin, Leader)
export const getInviteByIdService = async (
  id: string,
): Promise<InviteDetailResponse> => {
  const response = await api.get<InviteDetailResponse>(
    `/applications/invites/${id}`,
  );
  return response.data;
};
export const deleteApplicationService = async (
  id: string,
): Promise<MessageSuccessResponse> => {
  const response = await api.delete<MessageSuccessResponse>(
    `/applications/${id}`,
  );
  return response.data;
};
