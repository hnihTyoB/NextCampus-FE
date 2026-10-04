"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, Mail, UserPlus, RotateCcw } from "lucide-react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useApplicationInvites } from "@/hooks/application/useApplicationInvites";
import { useBatchAssignApplications } from "@/hooks/application/useBatchAssignApplications";
import type { GetApplicationInvitesParams } from "@/types/application";

import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import BatchSaveBar from "@/components/ui/BatchSaveBar";
import OnboardingRow, { type OnboardingDraft } from "./OnboardingRow";

const COLUMNS =
  "minmax(200px, 1.4fr) minmax(140px, 1.1fr) minmax(140px, 1.1fr) 140px 130px 115px 44px";

export default function OnboardingTable() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const params: GetApplicationInvitesParams = useMemo(() => {
    const p: GetApplicationInvitesParams = {};
    const email = searchParams.get("email");
    const inviteStatus = searchParams.get("inviteStatus");
    const applicationStatus = searchParams.get("applicationStatus");
    const department = searchParams.get("departmentId");
    const position = searchParams.get("positionId");
    const createdFrom = searchParams.get("createdFrom");
    const createdTo = searchParams.get("createdTo");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    if (email) p.email = email;
    if (inviteStatus)
      p.inviteStatus =
        inviteStatus as GetApplicationInvitesParams["inviteStatus"];
    if (applicationStatus)
      p.applicationStatus =
        applicationStatus as GetApplicationInvitesParams["applicationStatus"];
    if (department) p.departmentId = department;
    if (position) p.positionId = position;
    if (createdFrom) p.createdFrom = createdFrom;
    if (createdTo) p.createdTo = createdTo;
    if (page) p.page = Number(page);
    if (limit) p.limit = Number(limit);

    return p;
  }, [searchParams]);

  const { data, isPending, isError, refetch, isFetching } =
    useApplicationInvites(params);

  const [drafts, setDrafts] = useState<Record<string, OnboardingDraft>>({});
  const { mutateAsync: batchAssignApplications, isPending: isSaving } = useBatchAssignApplications();

  const invites = data?.data ?? [];
  const meta = data?.meta;

  const handleDraftChange = (inviteId: string, patch: Partial<OnboardingDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [inviteId]: {
        ...prev[inviteId],
        ...patch,
      },
    }));
  };

  const dirtyInvites = useMemo(() => {
    const list: Array<{
      inviteId: string;
      applicationId: string;
      departmentId: string | null;
      positionId: string | null;
    }> = [];

    for (const inv of invites) {
      if (!inv.application) continue;
      const initialDeptId =
        inv.application.department?.id ??
        ((inv.application as Record<string, unknown>)?.departmentId as string | null | undefined) ??
        null;
      const initialPosId =
        inv.application.position?.id ??
        ((inv.application as Record<string, unknown>)?.positionId as string | null | undefined) ??
        null;

      const d = drafts[inv.id];
      if (!d) continue;

      const effectiveDeptId = d.departmentId !== undefined ? d.departmentId : initialDeptId;
      const effectivePosId = d.positionId !== undefined ? d.positionId : initialPosId;

      const isDeptDirty = d.departmentId !== undefined && d.departmentId !== initialDeptId;
      const isPosDirty = d.positionId !== undefined && d.positionId !== initialPosId;

      if (isDeptDirty || isPosDirty) {
        list.push({
          inviteId: inv.id,
          applicationId: inv.application.id,
          departmentId: effectiveDeptId,
          positionId: effectivePosId,
        });
      }
    }
    return list;
  }, [invites, drafts]);

  const dirtyCount = dirtyInvites.length;

  async function handleBatchSave() {
    if (dirtyInvites.length === 0) return;
    try {
      await batchAssignApplications(
        dirtyInvites.map((item) => ({
          id: item.applicationId,
          departmentId: item.departmentId,
          positionId: item.positionId,
        }))
      );
      setDrafts({});
      refetch();
    } catch {
      // Error handled by mutation hook
    }
  }

  function handleDiscard() {
    setDrafts({});
  }

  const hasFilters = Boolean(
    searchParams.get("email") ||
    searchParams.get("inviteStatus") ||
    searchParams.get("applicationStatus") ||
    searchParams.get("departmentId") ||
    searchParams.get("positionId") ||
    searchParams.get("createdFrom") ||
    searchParams.get("createdTo"),
  );

  function goToPage(page: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(page));
    router.push(`${pathname}?${p.toString()}`);
  }

  function clearAllFilters() {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("email");
    p.delete("inviteStatus");
    p.delete("applicationStatus");
    p.delete("departmentId");
    p.delete("positionId");
    p.delete("createdFrom");
    p.delete("createdTo");
    p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  }

  if (isPending) {
    return (
      <MetalCard className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </MetalCard>
    );
  }

  if (isError) {
    return (
      <MetalCard className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-sm text-rose-300">
          {t("admin.onboarding.loadTableError")}
        </p>
      </MetalCard>
    );
  }

  if (invites.length === 0) {
    return (
      <MetalCard className="flex flex-col items-center justify-center gap-3 py-20 text-center px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
          <Mail className="h-6 w-6" />
        </div>
        <p className="text-base font-medium text-foreground">
          {t("admin.onboarding.noInvites")}
        </p>
        <p className="text-xs sm:text-sm text-muted max-w-md">
          {t("admin.onboarding.noInvitesDescription")}
        </p>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearAllFilters}
            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-border dark:border-white/10 bg-card/60 px-4 py-2 text-xs font-medium text-muted transition hover:bg-card hover:text-foreground active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("admin.onboarding.clearFilters")}
          </button>
        ) : (
          <Modal.Open opens="invite-intern">
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/20 active:scale-95"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {t("admin.onboarding.inviteIntern")}
            </button>
          </Modal.Open>
        )}
      </MetalCard>
    );
  }

  return (
    <Modal>
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
          <div>{t("admin.onboarding.colCandidate")}</div>
          <div>{t("admin.onboarding.colDept")}</div>
          <div>{t("admin.onboarding.colPosition")}</div>
          <div>{t("admin.onboarding.colInvite")}</div>
          <div>{t("admin.onboarding.colApp")}</div>
          <div>{t("admin.onboarding.colSent")}</div>
          <Table.ReloadButton onReload={refetch} isReloading={isFetching} />
        </Table.Header>

        <Table.Body
          data={invites}
          render={(invite) => (
            <OnboardingRow
              key={invite.id}
              invite={invite}
              draft={drafts[invite.id]}
              onDraftChange={(patch) => handleDraftChange(invite.id, patch)}
            />
          )}
        />

        {meta && meta.totalPages > 1 && (
          <Table.Footer>
            <div className="flex w-full items-center justify-between gap-4 text-sm">
              <p className="text-muted">
                {t("admin.onboarding.pagination", {
                  page: meta.page,
                  totalPages: meta.totalPages,
                  total: meta.total,
                })}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={meta.page <= 1}
                  onClick={() => goToPage(meta.page - 1)}
                  aria-label="Previous page"
                  className="rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-muted dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-foreground px-3 py-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => goToPage(meta.page + 1)}
                  aria-label="Next page"
                  className="rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-muted dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-foreground px-3 py-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Table.Footer>
        )}
      </Table>

      <BatchSaveBar
        dirtyCount={dirtyCount}
        isSaving={isSaving}
        onSave={handleBatchSave}
        onDiscard={handleDiscard}
      />
    </Modal>
  );
}
