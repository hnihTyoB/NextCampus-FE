import type { Intern } from "./intern";

// ─── Rating Level ─────────────────────────────────────────────────────────────
// 5 mức xếp loại chuẩn: TOT=10, KHA=8, TB=6, TBY=4, YEU=2
export type RatingLevel = "TOT" | "KHA" | "TB" | "TBY" | "YEU";

export const RATING_LABELS: Record<RatingLevel, string> = {
  TOT: "Tốt",
  KHA: "Khá",
  TB: "Trung bình",
  TBY: "Trung bình yếu",
  YEU: "Yếu",
};

export const RATING_SCORES: Record<RatingLevel, number> = {
  TOT: 10,
  KHA: 8,
  TB: 6,
  TBY: 4,
  YEU: 2,
};

export const RATING_COLORS: Record<RatingLevel, string> = {
  TOT: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  KHA: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  TB: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  TBY: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  YEU: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
};

/**
 * 12 tiêu chí đánh giá chuẩn chia làm 3 nhóm lớn đồng bộ Backend v2 & evaluation-criteria-ui-config.json
 */
export interface EvaluationRatings {
  // Nhóm I: Kỷ luật & tư chất
  ruleCompliance: RatingLevel;   // 1. Thực hiện nội quy của cơ quan
  workAttitude: RatingLevel;     // 2. Thái độ làm việc
  learningCapacity: RatingLevel; // 3. Năng lực tiếp thu
  pressureTolerance: RatingLevel;// 4. Khả năng vượt khó, chịu áp lực
  communication: RatingLevel;    // 5. Giao tiếp và ứng xử

  // Nhóm II: Chuyên môn
  knowledge: RatingLevel;        // 1. Kiến thức
  practicalSkill: RatingLevel;   // 2. Kỹ năng thực hành
  languageProficiency: RatingLevel; // 3. Năng lực ngoại ngữ
  teamwork: RatingLevel;         // 4. Kỹ năng làm việc nhóm
  creativity: RatingLevel;       // 5. Tính sáng tạo

  // Nhóm III: Kết quả đề tài
  contentRequirement: RatingLevel; // 1. Thực hiện yêu cầu về nội dung
  progressRequirement: RatingLevel;// 2. Thực hiện yêu cầu về tiến độ

  // Tương thích ngược nếu còn code cũ tham chiếu
  resilience?: RatingLevel;
  practicalSkills?: RatingLevel;
  foreignLanguage?: RatingLevel;
  contentQuality?: RatingLevel;
  progressDelivery?: RatingLevel;
}

export type EvaluationCriteriaKey = keyof Omit<
  EvaluationRatings,
  "resilience" | "practicalSkills" | "foreignLanguage" | "contentQuality" | "progressDelivery"
>;

export const RATING_ALIASES: Record<string, string> = {
  resilience: "pressureTolerance",
  pressureTolerance: "resilience",
  practicalSkills: "practicalSkill",
  practicalSkill: "practicalSkills",
  foreignLanguage: "languageProficiency",
  languageProficiency: "foreignLanguage",
  contentQuality: "contentRequirement",
  contentRequirement: "contentQuality",
  progressDelivery: "progressRequirement",
  progressRequirement: "progressDelivery",
  attitude: "workAttitude",
  learning: "learningCapacity",
  coding: "practicalSkill",
};

export function getRatingLevel(
  ratings?: EvaluationRatings | Record<string, unknown> | null,
  key?: string
): RatingLevel | undefined {
  if (!ratings || !key) return undefined;
  const raw = (ratings as Record<string, unknown>)[key];
  if (
    typeof raw === "string" &&
    (raw === "TOT" || raw === "KHA" || raw === "TB" || raw === "TBY" || raw === "YEU")
  ) {
    return raw as RatingLevel;
  }
  const alias = RATING_ALIASES[key];
  if (alias) {
    const aliasVal = (ratings as Record<string, unknown>)[alias];
    if (
      typeof aliasVal === "string" &&
      (aliasVal === "TOT" || aliasVal === "KHA" || aliasVal === "TB" || aliasVal === "TBY" || aliasVal === "YEU")
    ) {
      return aliasVal as RatingLevel;
    }
  }
  return undefined;
}

export const CRITERIA_SECTIONS = [
  {
    id: "I",
    label: "Kỷ luật và tư chất",
    name: "I. Kỷ luật và tư chất",
    criteria: [
      { key: "ruleCompliance" as const, label: "Thực hiện nội quy của cơ quan", name: "Thực hiện nội quy của cơ quan", tooltip: "Chấp hành giờ giấc, nộp daily report đúng hạn" },
      { key: "workAttitude" as const, label: "Thái độ làm việc", name: "Thái độ làm việc", tooltip: "Nghiêm túc, chủ động và có tinh thần trách nhiệm" },
      { key: "learningCapacity" as const, label: "Năng lực tiếp thu", name: "Năng lực tiếp thu", tooltip: "Khả năng nắm bắt kiến thức và tiếp thu phản hồi" },
      { key: "pressureTolerance" as const, label: "Khả năng vượt khó chịu áp lực", name: "Khả năng vượt khó chịu áp lực", tooltip: "Bền bỉ xử lý bug và gỡ blocker" },
      { key: "communication" as const, label: "Giao tiếp và ứng xử", name: "Giao tiếp và ứng xử", tooltip: "Giao tiếp lịch sự, chuẩn mực trong PR review và họp" },
    ],
  },
  {
    id: "II",
    label: "Khả năng chuyên môn",
    name: "II. Khả năng chuyên môn",
    criteria: [
      { key: "knowledge" as const, label: "Kiến thức", name: "Kiến thức", tooltip: "Hiểu biết về stack kỹ thuật và kiến trúc" },
      { key: "practicalSkill" as const, label: "Kỹ năng thực hành", name: "Kỹ năng thực hành", tooltip: "Chất lượng code, tuân thủ convention và viết test" },
      { key: "languageProficiency" as const, label: "Năng lực ngoại ngữ", name: "Năng lực ngoại ngữ", tooltip: "Đọc tài liệu, viết PR description bằng tiếng Anh" },
      { key: "teamwork" as const, label: "Kỹ năng làm việc nhóm", name: "Kỹ năng làm việc nhóm", tooltip: "Phối hợp, review chéo và hỗ trợ đồng đội" },
      { key: "creativity" as const, label: "Tính sáng tạo", name: "Tính sáng tạo", tooltip: "Đề xuất cải tiến và tối ưu giải pháp" },
    ],
  },
  {
    id: "III",
    label: "Kết quả thực hiện đề tài",
    name: "III. Kết quả thực hiện đề tài",
    criteria: [
      { key: "contentRequirement" as const, label: "Thực hiện yêu cầu về nội dung", name: "Thực hiện yêu cầu về nội dung", tooltip: "Đúng nghiệp vụ, pass acceptance criteria" },
      { key: "progressRequirement" as const, label: "Thực hiện yêu cầu về tiến độ", name: "Thực hiện yêu cầu về tiến độ", tooltip: "Hoàn thành và nộp bài đúng hạn" },
    ],
  },
] as const;

export const DEFAULT_RATINGS: EvaluationRatings = {
  ruleCompliance: "TB",
  workAttitude: "TB",
  learningCapacity: "TB",
  pressureTolerance: "TB",
  communication: "TB",
  knowledge: "TB",
  practicalSkill: "TB",
  languageProficiency: "TB",
  teamwork: "TB",
  creativity: "TB",
  contentRequirement: "TB",
  progressRequirement: "TB",
};

// ─── WeeklyEvaluation Entity ──────────────────────────────────────────────────

type WeeklyEvaluationIntern = Omit<Intern, "user" | "leader"> & {
  user: Pick<Intern["user"], "id" | "email" | "fullName">;
};

export interface WeeklyEvaluation {
  id: string;
  internId: string;
  leaderId: string;
  week: number;
  year: number;
  startDate?: string | null;
  endDate?: string | null;
  communication: number;
  attitude: number;
  learning: number;
  coding: number;
  totalScore: number;
  score?: number;
  grade?: string | null;
  comment: string | null;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  ratings: EvaluationRatings | null;
  aiRatings: EvaluationRatings | null;
  aiScore?: number | null;
  aiCommunication: number | null;
  aiAttitude: number | null;
  aiLearning: number | null;
  aiCoding: number | null;
  aiComment: string | null;
  aiStrengths?: string[];
  aiWeaknesses?: string[];
  aiRecommendations?: string[];
  aiGeneratedAt: string | null;
  leaderEdited: boolean;
  isAiAdjusted?: boolean;
  viewedAt: string | null;
  /** @deprecated Use viewedAt instead */
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  intern: WeeklyEvaluationIntern;
  leader: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl?: string | null;
  };
}

// ─── Response wrappers ──────────────────────────────────────────────────────

export interface WeeklyEvaluationSuccessResponse {
  success: boolean;
  data: WeeklyEvaluation;
  message?: string;
  code?: string;
}

export interface WeeklyEvaluationListResponse {
  success: boolean;
  data: WeeklyEvaluation[];
  items?: WeeklyEvaluation[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Query params ───────────────────────────────────────────────────────────

export interface WeeklyEvaluationQueryParams {
  internId?: string;
  leaderId?: string;
  departmentId?: string;
  week?: number;
  year?: number;
  sortBy?: "week" | "totalScore" | "score" | "createdAt";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// ─── Payloads ───────────────────────────────────────────────────────────────

export interface CreateWeeklyEvaluationPayload {
  internId: string;
  week: number;
  year?: number;
  ratings: EvaluationRatings;
  communication?: number;
  attitude?: number;
  learning?: number;
  coding?: number;
  comment?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  aiRatings?: EvaluationRatings;
  aiScore?: number;
  aiCommunication?: number;
  aiAttitude?: number;
  aiLearning?: number;
  aiCoding?: number;
  aiComment?: string;
  aiStrengths?: string[];
  aiWeaknesses?: string[];
  aiRecommendations?: string[];
}

export interface UpdateWeeklyEvaluationPayload {
  year?: number;
  ratings?: EvaluationRatings;
  communication?: number;
  attitude?: number;
  learning?: number;
  coding?: number;
  comment?: string | null;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}

// ─── AI Suggestion DTOs ──────────────────────────────────────────────────────

export interface WeeklyEvaluationAiPayload {
  internId: string;
  week: number;
  year?: number;
}

export type AiSuggestRequestDto = WeeklyEvaluationAiPayload;
export type AiSuggestionPayload = WeeklyEvaluationAiPayload;

export interface AiSuggestionData {
  ratings: EvaluationRatings;
  score?: number;
  grade?: string;
  communication: number;
  attitude: number;
  learning: number;
  coding: number;
  totalScore: number;
  comment: string;
  strengths: string[];
  weaknesses: string[];
  recommendations?: string[];
  suggestions?: string[];
  dataUsed?: {
    dailyReportsCount: number;
    taskSubmissionsCount: number;
    weekRange: {
      from: string;
      to: string;
    };
  };
}

// ─── Intern Progress Summary (6-Week Chart / Radar Data) ─────────────────────

export interface WeeklyEvaluationSummary {
  internId: string;
  internName: string;
  totalEvaluations: number;
  avgScore: number;
  overallGrade: string | null;
  viewedCount: number;
  unviewedCount: number;
  trend: "IMPROVING" | "DECLINING" | "STABLE";
  recentWeeks: Array<{
    id: string;
    week: number;
    year: number;
    score: number;
    grade: string | null;
    viewedAt: string | null;
    comment: string | null;
    createdAt: string;
  }>;
}

export type InternEvaluationSummaryDto = WeeklyEvaluationSummary;

/**
 * Lấy tên ngày bắt đầu mở đánh giá tuần theo cấu hình số ngày làm việc
 */
export function getWeeklyEvaluationStartDayName(workingDaysPerWeek: number, locale: string): string {
  const VI_DAYS: Record<number, string> = {
    1: "Thứ Hai",
    2: "Thứ Ba",
    3: "Thứ Tư",
    4: "Thứ Năm",
    5: "Thứ Sáu",
    6: "Thứ Bảy",
    7: "Chủ Nhật",
  };
  const EN_DAYS: Record<number, string> = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  };
  if (locale === "vi") {
    return VI_DAYS[workingDaysPerWeek] || "Thứ Bảy";
  }
  return EN_DAYS[workingDaysPerWeek] || "Saturday";
}

/**
 * Kiểm tra xem hiện tại (giờ Việt Nam UTC+7) đã đến khung giờ mở đánh giá tuần hiện tại hay chưa
 */
export function isWeeklyEvaluationWindowOpen(workingDaysPerWeek = 6, date = new Date()): boolean {
  const tzOffset = 7 * 60 * 60 * 1000;
  const localDate = new Date(date.getTime() + tzOffset);
  const dayOfWeek = localDate.getUTCDay();
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  const hours = localDate.getUTCHours();
  const isLastWorkingDayAllowed = isoDay === workingDaysPerWeek && hours >= 11;
  const isWeekendAllowed = isoDay > workingDaysPerWeek;
  return isLastWorkingDayAllowed || isWeekendAllowed;
}


