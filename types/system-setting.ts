export type SystemSettingKey =
  | "DAILY_REPORT_DEADLINE_TIME"     // Giờ chốt nộp báo cáo ngày (VD: "17:30")
  | "WORKING_DAYS_PER_WEEK"          // Số ngày làm việc trong tuần (VD: 5 hoặc 6)
  | "MAX_ACTIVE_TASKS"               // Số task tối đa 1 TTS được nhận cùng lúc (VD: "5")
  | "MAX_WORKLOAD_DAYS"              // Hạn mức ngày công việc tối đa (VD: "10")
  | "SUBMISSION_MAX_FILE_SIZE_MB"    // Dung lượng file nộp bài tối đa (VD: "25")
  | "REPORT_ATTACHMENT_MAX_SIZE_MB"  // Dung lượng tệp đính kèm báo cáo tối đa (VD: "10")
  | "DISCORD_BOT_ENABLED"
  | "DISCORD_BOT_TOKEN"
  | "DISCORD_GUILD_ID"
  | "DISCORD_INVITE_URL"
  | "DISCORD_MEETING_EMPTY_BUFFER_MINUTES";

export interface SystemSetting {
  id: string;
  key: SystemSettingKey;
  value: string;
  description: string | null;
  updatedAt: string;
}

export interface SystemSettings {
  DAILY_REPORT_DEADLINE_TIME?: string;
  NEXT_DAILY_REPORT_DEADLINE_TIME?: string;
  DAILY_REPORT_DEADLINE_EFFECTIVE_DATE?: string;
  DAILY_REPORT_DEADLINE_APPLIES_NEXT_DAY?: boolean;
  WORKING_DAYS_PER_WEEK?: number;
  MAX_ACTIVE_TASKS?: number;
  MAX_WORKLOAD_DAYS?: number;
  MAX_LEADER_DEPARTMENTS?: number;
  AVATAR_MAX_FILE_SIZE_MB?: number;
  REPORT_MAX_FILE_SIZE_MB?: number;
  REPORT_VIDEO_MAX_FILE_SIZE_MB?: number;
  REPORT_ATTACHMENT_MAX_SIZE_MB?: number;
  SUBMISSION_ATTACHMENT_MAX_FILE_SIZE_MB?: number;
  SUBMISSION_MAX_FILE_SIZE_MB?: number;
  TASK_ATTACHMENT_MAX_FILE_SIZE_MB?: number;
  APPLICATION_MAX_FILE_SIZE_MB?: number;
  TASK_IMPORT_MAX_FILE_SIZE_MB?: number;
  ALLOW_CROSS_DEPARTMENT_ASSIGNMENT?: boolean;
  AUTO_EVALUATION_ENABLED?: boolean;
  DISCORD_BOT_ENABLED?: boolean;
  DISCORD_BOT_TOKEN?: string;
  DISCORD_GUILD_ID?: string;
  DISCORD_INVITE_URL?: string;
  DISCORD_MEETING_EMPTY_BUFFER_MINUTES?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface SystemSettingsResponse {
  success: boolean;
  data: SystemSettings;
  message?: string;
  code?: string;
}

export interface SystemSettingListResponse {
  success: boolean;
  data: SystemSetting[];
  message?: string;
  code?: string;
}

export interface SystemSettingItemResponse {
  success: boolean;
  data: SystemSetting;
  message?: string;
  code?: string;
}
