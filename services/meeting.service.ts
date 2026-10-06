import api from "@/lib/axios";
import type {
  MeetingListResponse,
  MeetingSuccessResponse,
  MeetingDeleteResponse,
  ParticipantSuccessResponse,
  InviteResultResponse,
  AbsenceListResponse,
  AbsenceSuccessResponse,
  MeetingQueryParams,
  CreateMeetingPayload,
  UpdateMeetingPayload,
  InviteParticipantsPayload,
  RsvpPayload,
  SubmitAbsencePayload,
  ReviewAbsencePayload,
  DiscordVoiceRoom,
  DiscordPermissionResponse,
} from "@/types/meeting";

export const meetingService = {
  getMeetings: async (
    params?: MeetingQueryParams,
  ): Promise<MeetingListResponse> => {
    const response = await api.get<MeetingListResponse>("/meetings", { params });
    return response.data;
  },

  getMeeting: async (id: string): Promise<MeetingSuccessResponse> => {
    const response = await api.get<MeetingSuccessResponse>(`/meetings/${id}`);
    return response.data;
  },

  createMeeting: async (
    payload: CreateMeetingPayload,
  ): Promise<MeetingSuccessResponse> => {
    const response = await api.post<MeetingSuccessResponse>(
      "/meetings",
      payload,
    );
    return response.data;
  },

  updateMeeting: async (
    id: string,
    payload: UpdateMeetingPayload,
  ): Promise<MeetingSuccessResponse> => {
    const response = await api.put<MeetingSuccessResponse>(
      `/meetings/${id}`,
      payload,
    );
    return response.data;
  },

  deleteMeeting: async (id: string): Promise<MeetingDeleteResponse> => {
    const response = await api.delete<MeetingDeleteResponse>(
      `/meetings/${id}`,
    );
    return response.data;
  },

  inviteParticipants: async (
    id: string,
    payload: InviteParticipantsPayload,
  ): Promise<InviteResultResponse> => {
    const response = await api.post<InviteResultResponse>(
      `/meetings/${id}/participants`,
      payload,
    );
    return response.data;
  },

  rsvp: async (
    id: string,
    payload: RsvpPayload,
  ): Promise<ParticipantSuccessResponse> => {
    const response = await api.post<ParticipantSuccessResponse>(
      `/meetings/${id}/rsvp`,
      payload,
    );
    return response.data;
  },

  joinMeeting: async (id: string): Promise<ParticipantSuccessResponse> => {
    const response = await api.post<ParticipantSuccessResponse>(
      `/meetings/${id}/join`,
    );
    return response.data;
  },

  getAbsences: async (
    meetingId: string,
  ): Promise<AbsenceListResponse> => {
    const response = await api.get<AbsenceListResponse>(
      `/meetings/${meetingId}/absences`,
    );
    return response.data;
  },

  submitAbsence: async (
    meetingId: string,
    payload: SubmitAbsencePayload,
  ): Promise<AbsenceSuccessResponse> => {
    const response = await api.post<AbsenceSuccessResponse>(
      `/meetings/${meetingId}/absences`,
      payload,
    );
    return response.data;
  },

  reviewAbsence: async (
    absenceId: string,
    payload: ReviewAbsencePayload,
  ): Promise<AbsenceSuccessResponse> => {
    const response = await api.put<AbsenceSuccessResponse>(
      `/meetings/absences/${absenceId}/review`,
      payload,
    );
    return response.data;
  },

  getBusyUsers: async (
    startTime: string,
    endTime: string,
    userIds?: string,
  ): Promise<{ success: boolean; data: string[] }> => {
    const response = await api.get<{ success: boolean; data: string[] }>(
      "/meetings/busy-users",
      { params: { startTime, endTime, userIds } },
    );
    return response.data;
  },

  getDiscordVoiceRooms: async (): Promise<{ success: boolean; data: DiscordVoiceRoom[] }> => {
    const response = await api.get<{ success: boolean; data: DiscordVoiceRoom[] }>(
      "/meetings/discord-rooms",
    );
    return response.data;
  },

  grantDiscordPermissions: async (id: string): Promise<DiscordPermissionResponse> => {
    const response = await api.post<DiscordPermissionResponse>(
      `/meetings/${id}/discord-permissions/grant`,
    );
    return response.data;
  },

  resetDiscordPermissions: async (id: string): Promise<DiscordPermissionResponse> => {
    const response = await api.post<DiscordPermissionResponse>(
      `/meetings/${id}/discord-permissions/reset`,
    );
    return response.data;
  },
};
