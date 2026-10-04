"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Building2,
  RotateCcw,
  Trash2,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "react-hot-toast";
import { useDepartments } from "@/hooks/department/useDepartments";
import { useDeleteDepartment } from "@/hooks/department/useDeleteDepartment";
import { useLeaders } from "@/hooks/leader/useLeaders";
import { useBatchUpdateLeaders } from "@/hooks/leader/useBatchUpdateLeaders";
import { MAX_LEADER_DEPARTMENTS, type Leader } from "@/types/leader";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import BatchSaveBar from "@/components/ui/BatchSaveBar";
import type { Department } from "@/types/department";
import DepartmentRow from "./DepartmentRow";
import EditDepartmentModal from "./EditDepartmentModal";
import ManagePositionsModal from "./ManagePositionsModal";

const COLUMNS =
  "minmax(200px, 1.5fr) minmax(220px, 2fr) minmax(130px, 1fr) minmax(180px, 1.5fr) 56px";

const PAGE_SIZE = 10;

export default function DepartmentTable() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const name = searchParams.get("name") ?? undefined;
  const leader = searchParams.get("leader") ?? undefined;
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const { data, isPending, isError, refetch, isFetching } = useDepartments({
    name,
    leader,
  });
  const {
    data: leadersData,
    isPending: leadersPending,
    isError: leadersError,
  } = useLeaders({ limit: 100, sortBy: "fullName", order: "asc" });

  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [positionsDepartment, setPositionsDepartment] =
    useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] =
    useState<Department | null>(null);

  const { mutate: deleteDepartment, isPending: isDeleting } =
    useDeleteDepartment({
      onSuccess: () => {
        setDeletingDepartment(null);
      },
    });

  const departments = data?.data ?? [];
  const leaders = leadersData?.data ?? [];

  const [draftLeaderDepts, setDraftLeaderDepts] = useState<Record<string, string[]>>({});
  const { mutateAsync: batchUpdateLeaders, isPending: isSaving } = useBatchUpdateLeaders();

  const handleToggleLeaderForDept = (dept: Department, leader: Leader) => {
    const currentDeptIds =
      draftLeaderDepts[leader.id] ?? leader.departments.map((d) => d.id);
    const isAssigned = currentDeptIds.includes(dept.id);

    if (!isAssigned && currentDeptIds.length >= MAX_LEADER_DEPARTMENTS) {
      toast.error(
        t("admin.department.maxDepartmentsToast", { n: MAX_LEADER_DEPARTMENTS })
      );
      return;
    }

    const nextDeptIds = isAssigned
      ? currentDeptIds.filter((id) => id !== dept.id)
      : [...currentDeptIds, dept.id];

    setDraftLeaderDepts((prev) => ({
      ...prev,
      [leader.id]: nextDeptIds,
    }));
  };

  const deptAssignedLeaderIds = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const dept of departments) {
      if (Object.keys(draftLeaderDepts).length === 0) {
        map[dept.id] = new Set((dept.leaders ?? []).map((l) => l.id));
        continue;
      }
      const set = new Set<string>();
      for (const l of dept.leaders ?? []) {
        if (draftLeaderDepts[l.id] === undefined) {
          set.add(l.id);
        }
      }
      for (const leader of leaders) {
        const leaderDeptIds =
          draftLeaderDepts[leader.id] ?? leader.departments.map((d) => d.id);
        if (leaderDeptIds.includes(dept.id)) {
          set.add(leader.id);
        } else {
          set.delete(leader.id);
        }
      }
      map[dept.id] = set;
    }
    return map;
  }, [departments, leaders, draftLeaderDepts]);

  const isDeptDirty = (dept: Department): boolean => {
    const initialLeaderIds = new Set((dept.leaders ?? []).map((l) => l.id));
    const currentLeaderIds = deptAssignedLeaderIds[dept.id] ?? new Set();
    if (initialLeaderIds.size !== currentLeaderIds.size) return true;
    for (const id of currentLeaderIds) {
      if (!initialLeaderIds.has(id)) return true;
    }
    return false;
  };

  const dirtyLeaders = useMemo(() => {
    const list: Array<{ leader: Leader; departmentIds: string[] }> = [];
    for (const leader of leaders) {
      const draftIds = draftLeaderDepts[leader.id];
      if (!draftIds) continue;
      const initialIds = leader.departments.map((d) => d.id).sort();
      const sortedDraftIds = [...draftIds].sort();
      const isDifferent =
        initialIds.length !== sortedDraftIds.length ||
        initialIds.some((id, idx) => id !== sortedDraftIds[idx]);
      if (isDifferent) {
        list.push({ leader, departmentIds: draftIds });
      }
    }
    return list;
  }, [leaders, draftLeaderDepts]);

  const dirtyCount = dirtyLeaders.length;

  async function handleBatchSave() {
    if (dirtyLeaders.length === 0) return;
    try {
      await batchUpdateLeaders(
        dirtyLeaders.map((item) => ({
          id: item.leader.id,
          departmentIds: item.departmentIds,
        })),
      );
      setDraftLeaderDepts({});
      refetch();
    } catch {
      // Error handled by mutation hook
    }
  }

  function handleDiscard() {
    setDraftLeaderDepts({});
  }

  const total = departments.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const validPage = totalPages > 0 ? Math.max(1, Math.min(page, totalPages)) : 1;
  const paginatedDepartments = departments.slice(
    (validPage - 1) * PAGE_SIZE,
    validPage * PAGE_SIZE
  );

  function goToPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("name");
    params.delete("leader");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Sync updated department data to open modal if active
  const activePositionsDept = positionsDepartment
    ? departments.find((d) => d.id === positionsDepartment.id) ?? positionsDepartment
    : null;

  if (isPending) {
    return (
      <MetalCard className="flex flex-col items-center justify-center py-24">
        <Spinner size="lg" />
        <p className="mt-3 text-xs text-muted-foreground">
          {t("admin.department.loadingLeaders")}
        </p>
      </MetalCard>
    );
  }

  if (isError) {
    return (
      <MetalCard className="flex flex-col items-center justify-center gap-3 py-20 text-rose-400">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-sm text-rose-300">{t("admin.department.loadError")}</p>
      </MetalCard>
    );
  }

  if (departments.length === 0) {
    const hasFilters = Boolean(name || leader);
    return (
      <MetalCard className="flex flex-col items-center justify-center gap-3 py-20 text-center px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-400">
          <Building2 className="h-6 w-6" />
        </div>
        <p className="text-base font-semibold text-foreground">
          {hasFilters
            ? t("admin.department.noMatchingDepartments")
            : t("admin.department.noDepartments")}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-2 text-xs font-medium text-muted transition hover:bg-card hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 cursor-pointer select-none"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>{t("admin.department.clearFilters")}</span>
          </button>
        )}
      </MetalCard>
    );
  }

  return (
    <>
      <Table
        columns={COLUMNS}
        className="
          bg-card dark:bg-[linear-gradient(145deg,#101827_0%,#1a2235_20%,#0f172a_55%,#050816_100%)]
          shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,.45)]
          hover:shadow-md dark:hover:shadow-[0_20px_50px_rgba(21,174,245,.15)]
          transition-shadow duration-500
        "
      >
        <Table.Header>
          <div>{t("admin.department.colDepartment")}</div>
          <div>{t("admin.department.colDescription")}</div>
          <div>{t("admin.department.colPositionsCount")}</div>
          <div>{t("admin.department.colLeader")}</div>
          <Table.ReloadButton onReload={refetch} isReloading={isFetching} />
        </Table.Header>

        <Table.Body
          data={paginatedDepartments}
          render={(dept) => (
            <DepartmentRow
              key={dept.id}
              department={dept}
              leaders={leaders}
              leadersLoading={leadersPending}
              leadersError={leadersError}
              assignedLeaderIds={Object.keys(draftLeaderDepts).length > 0 ? deptAssignedLeaderIds[dept.id] : undefined}
              onLeaderToggle={(leader) => handleToggleLeaderForDept(dept, leader)}
              isDirty={isDeptDirty(dept)}
              onOpenEdit={(d) => setEditingDepartment(d)}
              onOpenPositions={(d) => setPositionsDepartment(d)}
              onOpenDelete={(d) => setDeletingDepartment(d)}
            />
          )}
        />

        {totalPages > 1 && (
          <Table.Footer>
            <div className="flex w-full items-center justify-between gap-4 text-sm">
              <p className="text-muted">
                {t("admin.department.pagination", {
                  page: validPage,
                  totalPages,
                  total,
                })}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={validPage <= 1}
                  onClick={() => goToPage(validPage - 1)}
                  className="rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-muted dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-foreground px-3 py-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={validPage >= totalPages}
                  onClick={() => goToPage(validPage + 1)}
                  className="rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-muted dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-foreground px-3 py-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Table.Footer>
        )}
      </Table>

      {/* Edit Department Modal */}
      <EditDepartmentModal
        isOpen={Boolean(editingDepartment)}
        onClose={() => setEditingDepartment(null)}
        department={editingDepartment}
      />

      {/* Manage Positions Modal */}
      <ManagePositionsModal
        isOpen={Boolean(activePositionsDept)}
        onClose={() => setPositionsDepartment(null)}
        department={activePositionsDept}
      />

      {/* Delete Confirmation Modal */}
      {deletingDepartment && (
        <Modal
          isOpen={Boolean(deletingDepartment)}
          onClose={() => setDeletingDepartment(null)}
          size="sm"
        >
          <div className="p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-foreground">
              {t("admin.department.deleteTitle")}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("admin.department.deleteConfirm", {
                name: deletingDepartment.name,
              })}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingDepartment(null)}
                disabled={isDeleting}
                className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-card hover:text-foreground disabled:opacity-50 cursor-pointer"
              >
                {t("admin.department.cancel")}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => deleteDepartment(deletingDepartment.id)}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-500 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <Trash2 className="h-4 w-4 shrink-0" />
                )}
                <span>{t("admin.department.delete")}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      <BatchSaveBar
        dirtyCount={dirtyCount}
        isSaving={isSaving}
        onSave={handleBatchSave}
        onDiscard={handleDiscard}
      />
    </>
  );
}
