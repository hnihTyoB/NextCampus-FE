"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMemo, useContext } from "react";
import { Trash2, Eye, ChevronLeft, ChevronRight, Bot, ClipboardList, Plus, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { AuthContext } from "@/contexts/AuthContext";
import { useWeeklyEvaluations } from "@/hooks/weekly-evaluation/useWeeklyEvaluations";
import { useDeleteWeeklyEvaluation } from "@/hooks/weekly-evaluation/useDeleteWeeklyEvaluation";
import { useInterns } from "@/hooks/intern/useInterns";
import { useRBAC } from "@/hooks/rbac/useRBAC";
import WeeklyEvaluationHeader from "./WeeklyEvaluationHeader";
import WeeklyEvaluationStats, { type WeeklyEvaluationOverviewStats } from "./WeeklyEvaluationStats";
import WeeklyEvaluationFilter from "./WeeklyEvaluationFilter";
import WeeklyEvaluationExportButton from "./WeeklyEvaluationExportButton";
import WeeklyEvaluationCreateModal from "./WeeklyEvaluationCreateModal";
import {
  RATING_COLORS,
  computeEvaluationScore,
  getGradeFromScore,
  type RatingLevel,
  type WeeklyEvaluationQueryParams,
  type WeeklyEvaluation,
} from "@/types/weekly-evaluation";

const COLUMNS = "minmax(240px, 2.5fr) minmax(120px, 1.2fr) minmax(150px, 1.5fr) minmax(100px, 1fr) minmax(200px, 2.2fr)";

export default function WeeklyEvaluationList() {
  const t = useTranslations("leader.weeklyEvaluation");
  const tRatings = useTranslations("leader.weeklyEvaluation.ratings");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { can } = useRBAC();
  const canReadInterns = can("INTERN_READ");
  const canCreate = can("WEEKLY_EVALUATION_CREATE");
  const canDelete = can("WEEKLY_EVALUATION_DELETE");

  const deleteEvaluation = useDeleteWeeklyEvaluation();
  const auth = useContext(AuthContext);
  const currentUserId = auth?.state.user?.id;

  // Sync search directly with searchParams (no cascading render effect)
  const searchQuery = searchParams.get("search") ?? "";

  const handleSearchChange = (val: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (val.trim()) {
      nextParams.set("search", val);
    } else {
      nextParams.delete("search");
    }
    nextParams.set("page", "1");
    router.push(`${pathname}?${nextParams.toString()}`);
  };

  const handleResetFilters = () => {
    router.push(pathname);
  };

  const hasFilters = Boolean(
    searchParams.get("search") ||
      searchParams.get("internId") ||
      searchParams.get("week") ||
      searchParams.get("rating"),
  );

  // Active interns for filter options
  const { data: internsData } = useInterns(
    {
      status: "ACTIVE",
      leaderId: currentUserId || undefined,
      limit: 100,
    },
    { enabled: canReadInterns }
  );
  const interns = useMemo(() => internsData?.data ?? [], [internsData]);

  // Overall evaluations query for accurate stats calculation
  const { data: allEvalsResponse, refetch: refetchAll } = useWeeklyEvaluations(
    currentUserId ? { leaderId: currentUserId, limit: 100 } : undefined,
  );
  const allEvaluations = useMemo(
    () => allEvalsResponse?.data ?? [],
    [allEvalsResponse],
  );

  const overviewStats: WeeklyEvaluationOverviewStats = useMemo(() => {
    const total = allEvaluations.length;
    if (total === 0) {
      return {
        totalEvaluations: 0,
        averageScore: 0,
        goodRate: 0,
        aiAssistedCount: 0,
      };
    }
    const scores = allEvaluations.map((e) => computeEvaluationScore(e));
    const sumScore = scores.reduce((acc, s) => acc + s, 0);
    const avgScore = sumScore / total;
    const goodCount = scores.filter((s) => s >= 6.5).length;
    const goodRate = Math.round((goodCount / total) * 100);
    const aiCount = allEvaluations.filter(
      (e) => Boolean(e.aiRatings) || Boolean(e.aiComment),
    ).length;

    return {
      totalEvaluations: total,
      averageScore: avgScore,
      goodRate,
      aiAssistedCount: aiCount,
    };
  }, [allEvaluations]);

  // Query params for active table data
  const params: WeeklyEvaluationQueryParams = useMemo(() => {
    const page = searchParams.get("page");
    const internId = searchParams.get("internId") || undefined;
    const weekStr = searchParams.get("week");
    const week = weekStr ? Number(weekStr) : undefined;

    return {
      page: page ? Number(page) : 1,
      limit: 10,
      sortBy: "createdAt",
      order: "desc",
      leaderId: currentUserId || undefined,
      internId,
      week,
    };
  }, [searchParams, currentUserId]);

  const {
    data: response,
    isLoading,
    refetch: refetchTable,
    isFetching,
  } = useWeeklyEvaluations(params);

  const rawEvaluations = useMemo(
    () => response?.data ?? [],
    [response],
  );
  const meta = response?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const currentPage = meta?.page ?? 1;

  // Client-side filtering for search and rating if needed
  const ratingFilter = searchParams.get("rating");
  const filteredEvaluations = useMemo(() => {
    let result = rawEvaluations;
    const query = (searchParams.get("search") ?? "").toLowerCase().trim();
    if (query) {
      result = result.filter((item) => {
        const fullName = (item.intern?.fullName || "").toLowerCase();
        const email = (item.intern?.user?.email || "").toLowerCase();
        return fullName.includes(query) || email.includes(query);
      });
    }
    if (ratingFilter) {
      result = result.filter((item) => {
        const scoreVal = computeEvaluationScore(item);
        const itemLevel =
          item.grade &&
          (item.grade === "TOT" ||
            item.grade === "KHA" ||
            item.grade === "TB" ||
            item.grade === "TBY" ||
            item.grade === "YEU")
            ? (item.grade as RatingLevel)
            : getGradeFromScore(scoreVal);
        return itemLevel === ratingFilter;
      });
    }
    return result;
  }, [rawEvaluations, searchParams, ratingFilter]);

  const refetchBoth = () => {
    refetchTable();
    refetchAll();
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("deleteConfirm"))) {
      try {
        await deleteEvaluation.mutateAsync(id);
        refetchBoth();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handlePageChange = (page: number) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("page", String(page));
    router.push(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card with Title and Create Action */}
      <WeeklyEvaluationHeader onSuccess={refetchBoth} />

      {/* 2. KPI Stat Cards */}
      <WeeklyEvaluationStats stats={overviewStats} />

      {/* 3. Clean Minimalist Filter Card */}
      <WeeklyEvaluationFilter
        interns={interns}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onReset={handleResetFilters}
        hasFilters={hasFilters}
      />

      {/* 4. Table without outer MetalCard wrapper (Aligned with /leader/department standard) */}
      <Table
        columns={COLUMNS}
        className="bg-card dark:bg-[linear-gradient(145deg,#101827_0%,#1a2235_20%,#0f172a_55%,#050816_100%)] shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,.45)] hover:shadow-md dark:hover:shadow-[0_20px_50px_rgba(21,174,245,.15)] transition-shadow duration-500"
      >
        <Table.Header>
          <span>{t("colIntern")}</span>
          <span>{t("colWeek")}</span>
          <span>{t("colScore")}</span>
          <span className="text-center">{t("colAi")}</span>
          <div className="flex items-center justify-end gap-2">
            <span className="text-right">{t("colActions")}</span>
            <Table.ReloadButton onReload={refetchBoth} isReloading={isFetching} />
          </div>
        </Table.Header>

        {isLoading ? (
          <Table.Body data={[]} isLoading={true} skeletonRows={5} render={() => null} />
        ) : filteredEvaluations.length === 0 ? (
          <div className="py-16 text-center space-y-3 border-t border-border dark:border-white/5">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-slate-100 text-muted dark:border-white/10 dark:bg-white/5">
                {hasFilters ? <SearchX className="h-7 w-7" /> : <ClipboardList className="h-7 w-7" />}
              </div>
            </div>
            <div>
              <h4 className="text-base font-semibold text-foreground">
                {hasFilters ? t("emptyFilteredTitle") : t("emptyTitle")}
              </h4>
              <p className="text-xs sm:text-sm text-muted mt-1 max-w-md mx-auto">
                {hasFilters ? t("emptyFilteredDescription") : t("emptyDescription")}
              </p>
            </div>
            <div className="pt-2">
              {hasFilters ? (
                <Button variant="glass" size="sm" onClick={handleResetFilters}>
                  {t("clearFilter")}
                </Button>
              ) : canCreate ? (
                <Modal>
                  <Modal.Open opens="create-evaluation-empty">
                    <Button variant="primary" size="sm" className="inline-flex items-center gap-1.5">
                      <Plus className="h-4 w-4 shrink-0" />
                      <span>{t("createEvaluation")}</span>
                    </Button>
                  </Modal.Open>
                  <Modal.Window name="create-evaluation-empty" size="lg">
                    <WeeklyEvaluationCreateModal onSuccess={refetchBoth} />
                  </Modal.Window>
                </Modal>
              ) : null}
            </div>
          </div>
        ) : (
          <Table.Body
            data={filteredEvaluations}
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
              const createdDate = new Date(item.createdAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
              const avatarLetter = (item.intern?.fullName || "I").charAt(0).toUpperCase();

              return (
                <Table.Row key={item.id}>
                  {/* Col 1: Intern Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-main to-primary-light text-xs font-bold text-white shadow-sm">
                      {avatarLetter}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="font-bold text-foreground text-sm truncate">
                        {item.intern?.fullName || t("unknown")}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {item.intern?.user?.email || ""}
                      </p>
                    </div>
                  </div>

                  {/* Col 2: Week & Date */}
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground text-sm">
                      {t("week", { n: item.week })}
                    </span>
                    <span className="text-[11px] text-muted">{createdDate}</span>
                  </div>

                  {/* Col 3: Score & Rating */}
                  <div className="flex flex-col gap-1.5 items-start">
                    <span className="text-sm font-extrabold text-foreground">
                      {scoreVal.toFixed(1)} / 10
                    </span>
                    <span
                      className={`inline-flex items-center justify-center text-[10px] font-semibold px-2.5 py-0.5 rounded-lg border leading-none ${RATING_COLORS[level]}`}
                    >
                      {tRatings(level)}
                    </span>
                  </div>

                  {/* Col 4: AI Status */}
                  <div className="flex justify-center">
                    {item.aiComment || item.aiRatings ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border text-emerald-600 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <Bot className="h-3 w-3 shrink-0" />
                        <span>{t("aiLabel")}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border text-muted border-border bg-slate-100 dark:border-white/10 dark:bg-white/5">
                        <Bot className="h-3 w-3 shrink-0" />
                        <span>{t("notYet")}</span>
                      </span>
                    )}
                  </div>

                  {/* Col 5: Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/leader/weekly-evaluation/${item.id}`}>
                      <Button variant="glass" size="sm" className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 shrink-0" />
                        <span>{t("view")}</span>
                      </Button>
                    </Link>
                    <WeeklyEvaluationExportButton id={item.id} />
                    {canDelete && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteEvaluation.isPending}
                        className="flex items-center justify-center"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      </Button>
                    )}
                  </div>
                </Table.Row>
              );
            }}
          />
        )}

        {/* Standardized Table Pagination (Rule 52-55) */}
        {meta && meta.totalPages > 1 && (
          <Table.Footer>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs sm:text-sm text-muted">
                {t("pagination", {
                  page: meta.page,
                  totalPages: meta.totalPages,
                  total: meta.total,
                })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex items-center justify-center h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                </Button>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex items-center justify-center h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </Button>
              </div>
            </div>
          </Table.Footer>
        )}
      </Table>
    </div>
  );
}
