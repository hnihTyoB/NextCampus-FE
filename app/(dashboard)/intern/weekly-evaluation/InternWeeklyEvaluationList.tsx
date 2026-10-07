"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMemo } from "react";
import { Sparkles, ChevronLeft, ChevronRight, CheckCircle2, Clock, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import WeeklyEvaluationExportButton from "@/components/pdf/WeeklyEvaluationExportButton";
import InternWeeklyEvaluationStats from "./InternWeeklyEvaluationStats";
import { useWeeklyEvaluations } from "@/hooks/weekly-evaluation/useWeeklyEvaluations";
import {
  RATING_COLORS,
  computeEvaluationScore,
  getGradeFromScore,
  type RatingLevel,
  type WeeklyEvaluation,
  type WeeklyEvaluationQueryParams,
} from "@/types/weekly-evaluation";

export default function InternWeeklyEvaluationList() {
  const t = useTranslations("intern.weeklyEvaluation");
  const tRatings = useTranslations("intern.weeklyEvaluation.ratings");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params: WeeklyEvaluationQueryParams = useMemo(() => {
    const page = searchParams.get("page");
    return {
      page: page ? Number(page) : 1,
      limit: 10,
      sortBy: "week",
      order: "desc",
    };
  }, [searchParams]);

  const { data: response, isLoading, refetch, isFetching } = useWeeklyEvaluations(params);
  const evaluations = useMemo(
    () => response?.data ?? response?.items ?? [],
    [response],
  );
  const meta = useMemo(
    () =>
      response?.meta ??
      (response
        ? {
            total: response.total ?? 0,
            page: response.page ?? 1,
            limit: response.limit ?? 10,
            totalPages: response.totalPages ?? 1,
          }
        : undefined),
    [response],
  );


  const handlePageChange = (newPage: number) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("page", String(newPage));
    router.push(`${pathname}?${nextParams.toString()}`);
  };

  // Tính toán số liệu tổng hợp cho 4 thẻ KPI
  const statsData = useMemo(() => {
    if (evaluations.length === 0) {
      return {
        latestScore: null,
        latestWeek: null,
        avgScore: null,
        totalEvaluations: 0,
        reviewedCount: 0,
      };
    }

    const latest = evaluations[0];
    const latestScoreVal = computeEvaluationScore(latest);
    const sumScore = evaluations.reduce((sum, e) => sum + computeEvaluationScore(e), 0);
    const avgScoreVal = parseFloat((sumScore / evaluations.length).toFixed(1));
    const reviewed = evaluations.filter((e) => e.viewedAt || e.reviewedAt).length;

    return {
      latestScore: latestScoreVal,
      latestWeek: latest.week,
      avgScore: avgScoreVal,
      totalEvaluations: meta?.total ?? evaluations.length,
      reviewedCount: reviewed,
    };
  }, [evaluations, meta]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-28">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── PAGE HEADER (Rule 44 Compliant) ─────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <Sparkles className="h-6 w-6 shrink-0" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted truncate">
            {t("description")}
          </p>
        </div>
      </div>

      {/* ─── 4 STAT CARDS (Rules 49-51 Compliant) ─────────────────────────── */}
      <InternWeeklyEvaluationStats stats={statsData} />

      {/* ─── TABLE SECTION HEADER ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-base sm:text-lg font-semibold metal-text">
            {t("evaluationHistory")}
          </h2>
          <p className="text-xs text-muted mt-0.5">{t("historyDesc")}</p>
        </div>
      </div>

      {/* ─── EVALUATION TABLE: BORDERLESS LAYOUT (Rule 47 Compliant) ─────── */}
      {evaluations.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card dark:border-white/10 dark:bg-white/[0.02] p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/20 border border-border dark:bg-white/5 dark:border-white/10 text-muted mb-4">
            <Sparkles className="h-8 w-8 text-cyan-500/60 dark:text-cyan-400/60" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {t("noEvaluations")}
          </h3>
          <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
            {t("historyDesc")}
          </p>
        </div>
      ) : (
        <Table
          columns="minmax(140px, 1.2fr) minmax(160px, 1.5fr) minmax(140px, 1.2fr) minmax(180px, 1.5fr)"
          className="bg-card dark:bg-[linear-gradient(145deg,#101827_0%,#1a2235_20%,#0f172a_55%,#050816_100%)] shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,.45)] hover:shadow-md dark:hover:shadow-[0_20px_50px_rgba(21,174,245,.15)] transition-shadow duration-500"
        >
          <Table.Header>
            <span>{t("colWeek")}</span>
            <span>{t("colScore")}</span>
            <span className="text-center">{t("colStatus")}</span>
            <div className="flex items-center justify-end gap-2">
              <span className="text-right">{t("colActions")}</span>
              <Table.ReloadButton onReload={refetch} isReloading={isFetching} />
            </div>
          </Table.Header>

          <Table.Body
            data={evaluations}
            render={(item: WeeklyEvaluation) => {
              const scoreVal = computeEvaluationScore(item);
              const level: RatingLevel =
                item.grade &&
                (item.grade === "TOT" ||
                  item.grade === "KHA" ||
                  item.grade === "TB" ||
                  item.grade === "TBY" ||
                  item.grade === "YEU")
                  ? (item.grade as RatingLevel)
                  : getGradeFromScore(scoreVal);
              const isReviewed = !!(item.viewedAt || item.reviewedAt);

              return (
                <Table.Row key={item.id}>
                  {/* Cột 1: Tuần & Ngày tạo */}
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-foreground text-sm">
                      {t("week", { n: item.week })}
                    </span>
                    <span className="text-[11px] text-muted">
                      {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>

                  {/* Cột 2: Điểm & Xếp loại */}
                  <div className="flex flex-col gap-1 items-start">
                    <span className="text-sm font-extrabold text-foreground">
                      {scoreVal.toFixed(1)} / 10
                    </span>
                    <span
                      className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-lg border leading-none w-fit ${RATING_COLORS[level]}`}
                    >
                      {tRatings(level)}
                    </span>
                  </div>

                  {/* Cột 3: Trạng thái xác nhận */}
                  <div className="flex justify-center">
                    {isReviewed ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border text-emerald-700 bg-emerald-100/80 border-emerald-300 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        {t("reviewed")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border text-amber-700 bg-amber-100/80 border-amber-300 dark:text-amber-400 dark:border-amber-500/30 dark:bg-amber-500/10">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {t("notReviewed")}
                      </span>
                    )}
                  </div>

                  {/* Cột 4: Thao tác (Xuất PDF + Xem chi tiết) */}
                  <div className="flex items-center justify-end gap-2">
                    <WeeklyEvaluationExportButton
                      id={item.id}
                      label="PDF"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs h-9 rounded-xl"
                    />
                    <Link href={`/intern/weekly-evaluation/${item.id}`}>
                      <Button
                        variant="glass"
                        size="sm"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs h-9 rounded-xl"
                      >
                        <Eye className="h-3.5 w-3.5 shrink-0" />
                        <span>{t("view")}</span>
                      </Button>
                    </Link>
                  </div>
                </Table.Row>
              );
            }}
          />

          {/* ─── PHÂN TRANG (Rules 52-55 Compliant) ─────────────────────────── */}
          {meta && meta.totalPages > 1 && (
            <Table.Footer>
              <div className="flex w-full items-center justify-between text-xs sm:text-sm">
                <span className="text-muted">
                  {t("pagination", {
                    page: meta.page,
                    totalPages: meta.totalPages,
                    total: meta.total,
                  })}
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => handlePageChange(meta.page - 1)}
                    disabled={meta.page <= 1}
                    aria-label="Previous page"
                    className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg border border-border dark:border-white/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => handlePageChange(meta.page + 1)}
                    disabled={meta.page >= meta.totalPages}
                    aria-label="Next page"
                    className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg border border-border dark:border-white/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Table.Footer>
          )}
        </Table>
      )}
    </div>
  );
}
