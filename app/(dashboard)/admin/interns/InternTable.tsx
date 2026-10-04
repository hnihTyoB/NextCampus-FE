"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, Users, RotateCcw, UserPlus } from "lucide-react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useInterns } from "@/hooks/intern/useInterns";
import { useBatchUpdateInterns } from "@/hooks/intern/useBatchUpdateInterns";
import type { InternQueryParams, BatchUpdateInternItem } from "@/types/intern";

import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import BatchSaveBar from "@/components/ui/BatchSaveBar";
import InternRow, { type InternDraft } from "./InternRow";

const COLUMNS =
    "minmax(180px,1.3fr) minmax(150px,1.1fr) minmax(120px,0.9fr) minmax(90px,0.6fr) 130px 135px 145px 48px";

export default function InternTable() {
    const t = useTranslations();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const [drafts, setDrafts] = useState<Record<string, InternDraft>>({});
    const { mutateAsync: batchUpdateInterns, isPending: isSaving } = useBatchUpdateInterns();

    const params: InternQueryParams = useMemo(() => {
        const p: InternQueryParams = {};

        const fullName = searchParams.get("fullName");
        const department = searchParams.get("department");
        const position = searchParams.get("position");
        const status = searchParams.get("status");
        const leaderId = searchParams.get("leaderId");
        const leader = searchParams.get("leader");
        const page = searchParams.get("page");
        const limit = searchParams.get("limit");

        if (fullName) p.fullName = fullName;
        if (department) p.department = department;
        if (position) p.position = position;
        if (status) p.status = status as InternQueryParams["status"];
        if (leaderId) p.leaderId = leaderId;
        if (leader) p.leader = leader;
        if (page) p.page = Number(page);
        if (limit) p.limit = Number(limit);

        return p;
    }, [searchParams]);

    const { data, isPending, isError, refetch, isFetching } =
        useInterns(params);

    const interns = data?.data ?? [];
    const meta = data?.meta;

    const hasFilters = Boolean(
        searchParams.get("fullName") ||
        searchParams.get("department") ||
        searchParams.get("position") ||
        searchParams.get("leader") ||
        searchParams.get("status")
    );

    function goToPage(page: number) {
        const p = new URLSearchParams(searchParams.toString());
        p.set("page", String(page));
        router.push(`${pathname}?${p.toString()}`);
    }

    function clearAllFilters() {
        const p = new URLSearchParams(searchParams.toString());
        p.delete("fullName");
        p.delete("department");
        p.delete("position");
        p.delete("leader");
        p.delete("status");
        p.set("page", "1");
        router.push(`${pathname}?${p.toString()}`);
    }

    const dirtyInterns = useMemo(() => {
        const dirtyMap = new Map<string, InternDraft>();
        for (const [internId, draft] of Object.entries(drafts)) {
            const original = interns.find((i) => i.id === internId);
            if (!original) continue;

            const leaderChanged = draft.leaderId !== undefined && draft.leaderId !== original.leaderId;
            const deptChanged = draft.departmentId !== undefined && draft.departmentId !== (original.department?.id ?? null);
            const posChanged = draft.positionId !== undefined && draft.positionId !== (original.position?.id ?? null);
            const statusChanged = draft.status !== undefined && draft.status !== original.status;

            if (leaderChanged || deptChanged || posChanged || statusChanged) {
                dirtyMap.set(internId, draft);
            }
        }
        return dirtyMap;
    }, [drafts, interns]);

    const dirtyCount = dirtyInterns.size;

    const handleBatchSave = async () => {
        try {
            const items: BatchUpdateInternItem[] = [];
            for (const [internId, draft] of dirtyInterns.entries()) {
                const original = interns.find((i) => i.id === internId);
                if (!original) continue;

                items.push({
                    id: internId,
                    leaderId: draft.leaderId !== undefined ? draft.leaderId : original.leaderId,
                    departmentId: draft.departmentId !== undefined ? draft.departmentId : (original.department?.id ?? null),
                    positionId: draft.positionId !== undefined ? draft.positionId : (original.position?.id ?? null),
                    status: draft.status !== undefined ? draft.status : original.status,
                });
            }

            await batchUpdateInterns(items);
            setDrafts({});
            refetch();
        } catch {
            // Error handled by mutation hook
        }
    };

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
                    {t("admin.interns.loadError")}
                </p>
            </MetalCard>
        );
    }

    if (interns.length === 0) {
        return (
            <MetalCard className="flex flex-col items-center justify-center gap-3 py-20 text-center px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
                    <Users className="h-6 w-6" />
                </div>
                <p className="text-base font-medium text-foreground">
                    {t("admin.interns.noInterns")}
                </p>
                {hasFilters ? (
                    <button
                        type="button"
                        onClick={clearAllFilters}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl border border-border dark:border-white/10 bg-card/60 px-4 py-2 text-xs font-medium text-muted transition hover:bg-card hover:text-foreground active:scale-95"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t("admin.interns.clearFilters")}
                    </button>
                ) : (
                    <Modal.Open opens="invite-intern">
                        <button
                            type="button"
                            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/20 active:scale-95"
                        >
                            <UserPlus className="h-3.5 w-3.5" />
                            {t("admin.interns.addIntern")}
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
                    <div>{t("admin.interns.colIntern")}</div>
                    <div>{t("admin.interns.colLeader")}</div>
                    <div>{t("admin.interns.colDepartment")}</div>
                    <div>{t("admin.interns.colPosition")}</div>
                    <div>{t("admin.interns.colDuration")}</div>
                    <div>{t("admin.interns.colStatus")}</div>
                    <div>{t("admin.interns.colDiscord")}</div>
                    <Table.ReloadButton onReload={refetch} isReloading={isFetching} />
                </Table.Header>

                <Table.Body
                    data={interns}
                    render={(intern) => (
                        <InternRow
                            key={intern.id}
                            intern={intern}
                            draft={drafts[intern.id]}
                            onDraftChange={(patch) =>
                                setDrafts((prev) => ({
                                    ...prev,
                                    [intern.id]: {
                                        ...prev[intern.id],
                                        ...patch,
                                    },
                                }))
                            }
                        />
                    )}
                />

                {meta && meta.totalPages > 1 && (
                    <Table.Footer>
                        <div className="flex w-full items-center justify-between gap-4 text-sm">
                            <p className="text-muted">
                                {t("admin.interns.pagination", { page: meta.page, totalPages: meta.totalPages, total: meta.total })}
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    aria-label="Previous page"
                                    disabled={meta.page <= 1}
                                    onClick={() => goToPage(meta.page - 1)}
                                    className="rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-muted dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-foreground px-3 py-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <button
                                    type="button"
                                    aria-label="Next page"
                                    disabled={meta.page >= meta.totalPages}
                                    onClick={() => goToPage(meta.page + 1)}
                                    className="rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-muted dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-foreground px-3 py-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </Table.Footer>
                )}
            </Table>

            <BatchSaveBar
                count={dirtyCount}
                isSaving={isSaving}
                onSave={handleBatchSave}
                onDiscard={() => setDrafts({})}
            />
        </Modal>
    );
}
