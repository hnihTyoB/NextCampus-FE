"use client";

import { useState, useMemo, useContext, useCallback } from "react";
import { Sparkles, ChevronDown, ChevronUp, Info, Bot } from "lucide-react";
import { toast } from "react-hot-toast";
import { useTranslations, useLocale } from "next-intl";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useCreateWeeklyEvaluation } from "@/hooks/weekly-evaluation/useCreateWeeklyEvaluation";
import { useAiSuggestion } from "@/hooks/weekly-evaluation/useAiSuggestion";
import { useInterns } from "@/hooks/intern/useInterns";
import { useWeeklyEvaluations } from "@/hooks/weekly-evaluation/useWeeklyEvaluations";
import { useSystemSettings } from "@/hooks/system-setting/useSystemSettings";
import { AuthContext } from "@/contexts/AuthContext";
import type { CreateWeeklyEvaluationPayload, EvaluationRatings, RatingLevel } from "@/types/weekly-evaluation";
import type { Intern } from "@/types/intern";
import {
  CRITERIA_SECTIONS,
  DEFAULT_RATINGS,
  RATING_SCORES,
  RATING_COLORS,
  getWeeklyEvaluationStartDayName,
  isWeeklyEvaluationWindowOpen,
} from "@/types/weekly-evaluation";

interface Props {
  onCloseModal?: () => void;
  onSuccess?: () => void;
}

const RATING_LEVELS: RatingLevel[] = ["TOT", "KHA", "TB", "TBY", "YEU"];

function computeScores(ratings: EvaluationRatings) {
  const s = (k: keyof EvaluationRatings) =>
    ratings[k] ? RATING_SCORES[ratings[k] as RatingLevel] : 6;
  const avg = (nums: number[]) =>
    parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1));

  // Nhóm I: Kỷ luật & tư chất (5 tiêu chí)
  const group1 = avg([
    s("ruleCompliance"),
    s("workAttitude"),
    s("learningCapacity"),
    s("pressureTolerance"),
    s("communication"),
  ]);

  // Nhóm II: Khả năng chuyên môn (5 tiêu chí)
  const group2 = avg([
    s("knowledge"),
    s("practicalSkill"),
    s("languageProficiency"),
    s("teamwork"),
    s("creativity"),
  ]);

  // Nhóm III: Kết quả thực hiện đề tài (2 tiêu chí)
  const group3 = avg([s("contentRequirement"), s("progressRequirement")]);

  // Aliases for legacy stats columns
  const communication = avg([s("communication"), s("teamwork")]);
  const attitude = avg([s("ruleCompliance"), s("workAttitude"), s("pressureTolerance")]);
  const learning = avg([s("learningCapacity"), s("knowledge"), s("creativity")]);
  const coding = avg([s("practicalSkill"), s("contentRequirement"), s("progressRequirement")]);

  const allScores = CRITERIA_SECTIONS.flatMap((sec) =>
    sec.criteria.map((c) => s(c.key)),
  );
  const totalScore = avg(allScores);

  return { group1, group2, group3, communication, attitude, learning, coding, totalScore };
}

function RatingSelector({
  value,
  onChange,
  aiValue,
  disabled = false,
}: {
  value: RatingLevel;
  onChange: (v: RatingLevel) => void;
  aiValue?: RatingLevel;
  disabled?: boolean;
}) {
  const tRatings = useTranslations("leader.weeklyEvaluation.ratings");
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {RATING_LEVELS.map((level) => {
        const isSelected = value === level;
        const isAi = aiValue === level && !isSelected;
        const label = tRatings(level);
        return (
          <button
            key={level}
            type="button"
            disabled={disabled}
            onClick={() => onChange(level)}
            className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:focus-visible:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSelected
                ? `${RATING_COLORS[level]} border-current ring-1 ring-current scale-105 shadow-sm`
                : isAi
                ? "border-sky-300 bg-sky-100/80 text-sky-700 hover:bg-sky-200/80 dark:border-sky-400/40 dark:text-sky-300 dark:bg-sky-500/10 dark:hover:bg-sky-500/20"
                : "border-border text-muted bg-slate-100/70 hover:border-slate-300 hover:text-foreground hover:bg-slate-200/60 dark:border-white/10 dark:text-muted dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:text-foreground dark:hover:bg-white/[0.06]"
            }`}
            title={isAi ? `AI gợi ý: ${label}` : label}
          >
            {label}
            {isAi && (
              <span className="ml-1 opacity-80 text-[9px] font-bold text-sky-600 dark:text-sky-400">
                AI
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function WeeklyEvaluationCreateModal({ onCloseModal, onSuccess }: Props) {
  const t = useTranslations("leader.weeklyEvaluation.createModal");
  const tSections = useTranslations("leader.weeklyEvaluation.sections");
  const tCriteria = useTranslations("leader.weeklyEvaluation.criteria");
  const locale = useLocale();

  const auth = useContext(AuthContext);
  const currentUserId = auth?.state.user?.id;
  const createEvaluation = useCreateWeeklyEvaluation();
  const aiSuggestion = useAiSuggestion();
  const { data: settingsResponse } = useSystemSettings();
  const workingDaysPerWeek = settingsResponse?.data?.WORKING_DAYS_PER_WEEK ?? 6;
  const startDayName = useMemo(
    () => getWeeklyEvaluationStartDayName(workingDaysPerWeek, locale),
    [workingDaysPerWeek, locale],
  );
  const { data: internsData, isLoading: internsLoading } = useInterns({
    status: "ACTIVE",
    leaderId: currentUserId || undefined,
  });
  const interns = useMemo(() => internsData?.data ?? [], [internsData]);

  const [internId, setInternId] = useState("");
  const [week, setWeek] = useState(1);
  const [ratings, setRatings] = useState<EvaluationRatings>({
    ...DEFAULT_RATINGS,
  });
  const { data: existingEvaluations } = useWeeklyEvaluations(
    internId ? { internId, limit: 100 } : undefined,
  );
  const evaluatedWeeks = useMemo(
    () => existingEvaluations?.data?.map((e) => e.week) ?? [],
    [existingEvaluations],
  );
  const selectedIntern = useMemo(
    () => interns.find((i) => i.id === internId),
    [interns, internId],
  );

  const isInternMidWeekThisWeek = useCallback((internItem: Intern) => {
    const tzOffset = 7 * 60 * 60 * 1000;
    const now = new Date();
    const nowVn = new Date(now.getTime() + tzOffset);
    const vnDay = nowVn.getUTCDay();
    const diffToMonday = vnDay === 0 ? -6 : 1 - vnDay;
    const startOfWeekVn = new Date(
      Date.UTC(
        nowVn.getUTCFullYear(),
        nowVn.getUTCMonth(),
        nowVn.getUTCDate() + diffToMonday,
        0,
        0,
        0,
        0,
      ),
    );
    const endOfMondayVn = new Date(startOfWeekVn.getTime() + 24 * 3600 * 1000 - 1);
    const startDate = new Date(internItem.startDate);
    const createdAt = new Date(internItem.createdAt);

    const isStartedMidWeek =
      startDate.getTime() + tzOffset > endOfMondayVn.getTime() &&
      startDate.getTime() + tzOffset <= nowVn.getTime() + 7 * 24 * 3600 * 1000;
    const isCreatedMidWeek =
      createdAt.getTime() + tzOffset > endOfMondayVn.getTime();

    return isStartedMidWeek || isCreatedMidWeek;
  }, []);

  const maxWeek = useMemo(() => {
    if (!selectedIntern) return 99;
    const tzOffset = 7 * 60 * 60 * 1000; // Asia/Ho_Chi_Minh is UTC+7
    const startLocal = new Date(
      new Date(selectedIntern.startDate).getTime() + tzOffset,
    );
    const startMidnight = new Date(
      Date.UTC(
        startLocal.getUTCFullYear(),
        startLocal.getUTCMonth(),
        startLocal.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const today = new Date();
    const todayLocal = new Date(today.getTime() + tzOffset);
    const todayMidnight = new Date(
      Date.UTC(
        todayLocal.getUTCFullYear(),
        todayLocal.getUTCMonth(),
        todayLocal.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const diffMs = todayMidnight.getTime() - startMidnight.getTime();
    const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));
    const elapsedWeeks = Math.floor(diffDays / 7) + 1;
    return Math.max(1, elapsedWeeks);
  }, [selectedIntern]);

  const isWeekendAllowedForCurrentWeek = useMemo(() => {
    return isWeeklyEvaluationWindowOpen(workingDaysPerWeek);
  }, [workingDaysPerWeek]);

  const handleInternChange = (id: string) => {
    setInternId(id);
    const intern = interns.find((i) => i.id === id);
    if (intern) {
      const tzOffset = 7 * 60 * 60 * 1000;
      const startLocal = new Date(
        new Date(intern.startDate).getTime() + tzOffset,
      );
      const startMidnight = new Date(
        Date.UTC(
          startLocal.getUTCFullYear(),
          startLocal.getUTCMonth(),
          startLocal.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      const today = new Date();
      const todayLocal = new Date(today.getTime() + tzOffset);
      const todayMidnight = new Date(
        Date.UTC(
          todayLocal.getUTCFullYear(),
          todayLocal.getUTCMonth(),
          todayLocal.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      const diffMs = todayMidnight.getTime() - startMidnight.getTime();
      const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));
      const elapsedWeeks = Math.floor(diffDays / 7) + 1;
      setWeek(Math.max(1, elapsedWeeks));
    }
  };

  const [aiRatings, setAiRatings] = useState<EvaluationRatings | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiComment, setAiComment] = useState<string | null>(null);
  const [aiStrengths, setAiStrengths] = useState<string[]>([]);
  const [aiWeaknesses, setAiWeaknesses] = useState<string[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);

  const [comment, setComment] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    I: true,
    II: true,
    III: true,
  });
  const scores = useMemo(() => computeScores(ratings), [ratings]);

  const setRating = (key: keyof EvaluationRatings, value: RatingLevel) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGetAiSuggestion = async () => {
    if (!internId) {
      toast.error(t("selectInternFirst"));
      return;
    }
    if (!week || week <= 0) {
      toast.error(t("enterValidWeek"));
      return;
    }
    if (selectedIntern && (Number(week) < 1 || Number(week) > maxWeek)) {
      toast.error(t("weekRange", { max: maxWeek }));
      return;
    }
    if (
      selectedIntern &&
      isInternMidWeekThisWeek(selectedIntern) &&
      Number(week) === maxWeek
    ) {
      toast.error(t("assignedMidWeekNotice"));
      return;
    }
    if (
      selectedIntern &&
      Number(week) === maxWeek &&
      !isWeekendAllowedForCurrentWeek
    ) {
      toast.error(t("weekendOnly", { day: startDayName }));
      return;
    }
    if (evaluatedWeeks.includes(Number(week))) {
      toast.error(t("weekAlreadyExists", { week }));
      return;
    }
    try {
      const response = await aiSuggestion.mutateAsync({
        internId,
        week: Number(week),
        year: new Date().getFullYear(),
      });
      if (response?.data) {
        setRatings(response.data.ratings);
        setAiRatings(response.data.ratings);
        setAiScore(response.data.score ?? null);
        setComment(response.data.comment || "");
        setAiComment(response.data.comment || "");
        setAiStrengths(response.data.strengths || []);
        setAiWeaknesses(response.data.weaknesses || []);
        setAiRecommendations(response.data.recommendations || []);
        toast.success(t("aiSuggestionReceived"));
      }
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internId) {
      toast.error(t("selectInternFirst"));
      return;
    }
    if (selectedIntern && (Number(week) < 1 || Number(week) > maxWeek)) {
      toast.error(t("weekRange", { max: maxWeek }));
      return;
    }
    if (
      selectedIntern &&
      isInternMidWeekThisWeek(selectedIntern) &&
      Number(week) === maxWeek
    ) {
      toast.error(t("assignedMidWeekNotice"));
      return;
    }
    if (
      selectedIntern &&
      Number(week) === maxWeek &&
      !isWeekendAllowedForCurrentWeek
    ) {
      toast.error(t("weekendOnly", { day: startDayName }));
      return;
    }
    if (evaluatedWeeks.includes(Number(week))) {
      toast.error(t("weekAlreadyExists", { week }));
      return;
    }

    const payload: CreateWeeklyEvaluationPayload = {
      internId,
      week: Number(week),
      year: new Date().getFullYear(),
      ratings,
      communication: scores.communication,
      attitude: scores.attitude,
      learning: scores.learning,
      coding: scores.coding,
      comment: comment || undefined,
      ...(aiRatings && {
        aiRatings,
        aiScore: aiScore ?? computeScores(aiRatings).totalScore,
        aiCommunication: computeScores(aiRatings).communication,
        aiAttitude: computeScores(aiRatings).attitude,
        aiLearning: computeScores(aiRatings).learning,
        aiCoding: computeScores(aiRatings).coding,
        aiComment: aiComment || undefined,
        aiStrengths: aiStrengths.length > 0 ? aiStrengths : undefined,
        aiWeaknesses: aiWeaknesses.length > 0 ? aiWeaknesses : undefined,
        aiRecommendations:
          aiRecommendations.length > 0 ? aiRecommendations : undefined,
      }),
    };
    try {
      await createEvaluation.mutateAsync(payload);
      onSuccess?.();
      onCloseModal?.();
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const internOptions = useMemo(
    () =>
      interns.map((i) => {
        const isMidWeek = isInternMidWeekThisWeek(i);
        return {
          value: i.id,
          label: `${i.fullName || i.user?.fullName || "Intern"} (${i.user?.email || ""})${isMidWeek ? ` — [${t("assignedMidWeek")}]` : ""}`,
          disabled: isMidWeek,
        };
      }),
    [interns, isInternMidWeekThisWeek, t],
  );

  return (
    <div className="flex flex-col">
      {/* Standardized Sticky Modal Header (Rule 2.3 & 3.3 Compliant) */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl pb-4 pt-1 -mt-1 border-b border-border dark:border-white/10 pr-10 sm:pr-12">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300 bg-cyan-100 text-cyan-700 shadow-sm dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300 dark:shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold metal-text truncate">{t("title")}</h3>
            <p className="text-xs sm:text-sm text-muted truncate">{t("description")}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 pt-5">
        {/* Row 1: Intern Select & Week Input (Uniform Height Rule 195-202) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div>
            <Select
              label={t("intern")}
              required
              placeholder={t("selectIntern")}
              options={internOptions}
              value={internId}
              onChange={handleInternChange}
              searchable
              disabled={internsLoading}
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1 mb-1.5">
              {t("week")} <span className="text-destructive font-bold">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={maxWeek}
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="h-[42px] sm:h-[46px] w-full rounded-xl border border-border bg-card dark:border-white/10 dark:bg-white/5 px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground placeholder:text-muted transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/30"
              required
            />
            {selectedIntern && (
              <div className="mt-1.5 space-y-1">
                <p className="text-[11px] text-muted">
                  {t("currentWeek", { week: maxWeek, max: maxWeek })}
                </p>
                {Number(week) === maxWeek && isInternMidWeekThisWeek(selectedIntern) && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    {t("assignedMidWeekNotice")}
                  </p>
                )}
                {Number(week) === maxWeek &&
                  !isInternMidWeekThisWeek(selectedIntern) &&
                  !isWeekendAllowedForCurrentWeek && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                      {t("weekendNotice", { day: startDayName })}
                    </p>
                  )}
                {evaluatedWeeks.includes(Number(week)) && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                    {t("weekAlreadyEvaluated")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Human-in-the-Loop AI Draft Preview banner */}
        {aiRatings && (
          <div className="flex items-center justify-between rounded-xl border border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200 p-3 sm:p-4 text-xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <Bot className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
              <div>
                <span className="font-semibold text-sky-950 dark:text-sky-100">{t("draftPreviewNotice")}</span>
                <p className="text-[11px] text-sky-800/80 dark:text-sky-300/80 mt-0.5">
                  Bạn có thể điều chỉnh bất kỳ tiêu chí nào hoặc viết lại nhận xét trước khi lưu chính thức.
                </p>
              </div>
            </div>
            <span className="rounded-md border border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-400/40 dark:bg-sky-500/20 dark:text-sky-300 px-2.5 py-1 font-bold uppercase text-[10px] shrink-0 ml-3">
              {t("draftBadge")}
            </span>
          </div>
        )}

        {/* AI Action trigger & Helper */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <p className="text-xs text-muted">{t("selectRatings")}</p>
          <Button
            type="button"
            variant="glass"
            size="sm"
            onClick={handleGetAiSuggestion}
            isLoading={aiSuggestion.isPending}
            disabled={aiSuggestion.isPending || !internId}
            className="flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span>{t("getAiSuggestion")}</span>
          </Button>
        </div>

        {/* 3-Group Score preview bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl border border-cyan-200 bg-cyan-50/60 dark:border-cyan-500/20 dark:bg-cyan-500/5 p-3.5">
          <div className="text-center p-2 rounded-xl bg-white/80 dark:bg-white/[0.02] border border-cyan-100/60 dark:border-transparent shadow-xs dark:shadow-none">
            <div className="text-[11px] text-muted mb-0.5 font-medium">I. Kỷ luật</div>
            <div className="text-sm sm:text-base font-bold text-cyan-700 dark:text-cyan-300">
              {scores.group1.toFixed(1)}
            </div>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/80 dark:bg-white/[0.02] border border-cyan-100/60 dark:border-transparent shadow-xs dark:shadow-none">
            <div className="text-[11px] text-muted mb-0.5 font-medium">II. Chuyên môn</div>
            <div className="text-sm sm:text-base font-bold text-cyan-700 dark:text-cyan-300">
              {scores.group2.toFixed(1)}
            </div>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/80 dark:bg-white/[0.02] border border-cyan-100/60 dark:border-transparent shadow-xs dark:shadow-none">
            <div className="text-[11px] text-muted mb-0.5 font-medium">III. Đề tài</div>
            <div className="text-sm sm:text-base font-bold text-cyan-700 dark:text-cyan-300">
              {scores.group3.toFixed(1)}
            </div>
          </div>
          <div className="text-center p-2 rounded-xl bg-cyan-100/80 border border-cyan-300 dark:bg-cyan-500/10 dark:border-cyan-500/30 shadow-xs dark:shadow-none">
            <div className="text-[11px] text-cyan-800 dark:text-cyan-200 mb-0.5 font-semibold">{t("totalScore")}</div>
            <div className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-cyan-600 dark:from-emerald-400 dark:to-cyan-300">
              {scores.totalScore.toFixed(1)}
            </div>
          </div>
        </div>

        {/* 12 Criteria grouped by 3 sections */}
        <div className="space-y-3 border-t border-border dark:border-white/10 pt-4">
          {CRITERIA_SECTIONS.map((section) => (
            <div
              key={section.id}
              className="rounded-2xl border border-border dark:border-white/10 overflow-hidden bg-card/60 dark:bg-white/[0.01]"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 hover:bg-slate-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-100 text-cyan-700 border border-cyan-300 dark:bg-cyan-500/20 dark:border-transparent dark:text-cyan-300 text-xs font-bold shrink-0">
                    {section.id}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {tSections(section.id)}
                  </span>
                  <span className="text-xs text-muted">
                    {t("criteriaCount", { count: section.criteria.length })}
                  </span>
                </div>
                {expandedSections[section.id] ? (
                  <ChevronUp className="h-4 w-4 text-muted shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted shrink-0" />
                )}
              </button>

              {expandedSections[section.id] && (
                <div className="divide-y divide-border/60 dark:divide-white/5">
                  {section.criteria.map((criterion, idx) => (
                    <div
                      key={criterion.key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs text-muted font-mono shrink-0">
                          {idx + 1}.
                        </span>
                        <span
                          className="text-xs sm:text-sm text-foreground/90 truncate"
                          title={criterion.tooltip}
                        >
                          {tCriteria(criterion.key)}
                        </span>
                        {criterion.tooltip && (
                          <span
                            className="text-muted hover:text-cyan-600 dark:hover:text-cyan-400 cursor-help transition shrink-0"
                            title={criterion.tooltip}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </span>
                        )}
                        {aiRatings?.[criterion.key] && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-sky-100/80 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-medium shrink-0">
                            <Sparkles className="h-2.5 w-2.5" />
                            {t("aiSuggestedBadge")}
                          </span>
                        )}
                      </div>

                      <div className="shrink-0 pl-4 sm:pl-0">
                        <RatingSelector
                          value={ratings[criterion.key]}
                          onChange={(v) => setRating(criterion.key, v)}
                          aiValue={aiRatings?.[criterion.key]}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comment Section */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1 mb-1.5">
            {t("comment")}
          </label>
          <textarea
            rows={4}
            placeholder={t("commentPlaceholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            className="w-full rounded-xl border border-border bg-card dark:border-white/10 dark:bg-white/5 p-4 text-xs sm:text-sm text-foreground placeholder:text-muted transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/30 resize-none scrollbar-dropdown"
          />
          {aiComment && aiComment !== comment && (
            <button
              type="button"
              className="mt-1.5 text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 flex items-center gap-1.5 transition cursor-pointer font-medium"
              onClick={() => setComment(aiComment)}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>{t("useAiComment")}</span>
            </button>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border dark:border-white/10">
          <Button
            type="button"
            variant="glass"
            size="md"
            onClick={onCloseModal}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={createEvaluation.isPending}
          >
            {t("saveEvaluation")}
          </Button>
        </div>
      </form>
    </div>
  );
}
