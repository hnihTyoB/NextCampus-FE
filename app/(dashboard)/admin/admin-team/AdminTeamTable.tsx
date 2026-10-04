"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

import { useUsers } from "@/hooks/user/useUsers";
import type { UserQueryParams } from "@/types/user";

import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import AdminTeamRow from "./AdminTeamRow";

const COLUMNS =
    "minmax(240px, 2.5fr) minmax(130px, 1.2fr) minmax(120px, 1fr) minmax(140px, 1.2fr) 40px";

export default function AdminTeamTable() {
    const t = useTranslations();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const params: UserQueryParams = useMemo(() => {
        const p: UserQueryParams = {
            portalType: "ADMIN",
        };

        const fullName = searchParams.get("fullName");
        const roleName = searchParams.get("roleName");
        const isActive = searchParams.get("isActive");
        const page = searchParams.get("page");
        const limit = searchParams.get("limit");

        if (fullName) p.fullName = fullName;
        if (roleName) p.roleName = roleName;
        if (isActive) p.isActive = isActive === "true";
        if (page) p.page = Number(page);
        if (limit) p.limit = Number(limit);

        return p;
    }, [searchParams]);

    const { data, isPending, isError, refetch, isFetching } =
        useUsers(params);

    const admins = data?.data ?? [];
    const meta = data?.meta;

    function goToPage(page: number) {
        const p = new URLSearchParams(searchParams.toString());
        p.set("page", String(page));
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
                <AlertTriangle className="h-8 w-8 text-red-400" />
                <p className="text-sm text-slate-400">
                    {t("admin.adminTeam.loadError")}
                </p>
            </MetalCard>
        );
    }

    if (admins.length === 0) {
        return (
            <MetalCard className="flex flex-col items-center justify-center gap-3 py-20">
                <p className="text-sm text-slate-500">{t("admin.adminTeam.noAdmins")}</p>
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
                    <div>{t("admin.adminTeam.colAdmin")}</div>
                    <div>{t("admin.adminTeam.colRole")}</div>
                    <div>{t("admin.adminTeam.colStatus")}</div>
                    <div>{t("admin.adminTeam.colJoined")}</div>
                    <Table.ReloadButton onReload={refetch} isReloading={isFetching} />
                </Table.Header>

                <Table.Body
                    data={admins}
                    render={(admin) => (
                        <AdminTeamRow key={admin.id} admin={admin} />
                    )}
                />

                {meta && meta.totalPages > 1 && (
                    <Table.Footer>
                        <div className="flex w-full items-center justify-between gap-4 text-sm">
                            <p className="text-muted">
                                {t("admin.adminTeam.pagination", { page: meta.page, totalPages: meta.totalPages, total: meta.total })}
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    aria-label="Previous page"
                                    disabled={meta.page <= 1}
                                    onClick={() => goToPage(meta.page - 1)}
                                    className="rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-muted dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-foreground px-3 py-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <button
                                    type="button"
                                    aria-label="Next page"
                                    disabled={meta.page >= meta.totalPages}
                                    onClick={() => goToPage(meta.page + 1)}
                                    className="rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-muted dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-foreground px-3 py-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </Table.Footer>
                )}
            </Table>
        </Modal>
    );
}
