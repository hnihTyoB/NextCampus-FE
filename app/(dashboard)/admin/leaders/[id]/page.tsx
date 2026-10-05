"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams, usePathname, notFound } from "next/navigation";
import Image from "next/image";
import {
    ArrowLeft,
    Mail,
    Phone,
    Building2,
    User,
    Users,
    Briefcase,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Eye,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { useLeaderDetail } from "@/hooks/leader/useLeaderDetail";
import { useUpdateLeader } from "@/hooks/leader/useUpdateLeader";
import { useDepartments } from "@/hooks/department/useDepartments";
import { useInterns } from "@/hooks/intern/useInterns";
import { updateUserService } from "@/services/user.service";
import type { Leader } from "@/types/leader";

import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import Table from "@/components/ui/Table";
import InlineSelect from "@/components/ui/InlineSelect";
import LeaderDepartmentSelect from "../LeaderDepartmentSelect";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useRBAC } from "@/hooks/rbac/useRBAC";

function formatDate(dateStr: string, locale: string = "vi") {
    try {
        return new Date(dateStr).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
}

export default function LeaderDetailPage() {
    return (
        <ProtectedRoute requiredPermissions={["LEADER_READ"]}>
            <LeaderDetailContent />
        </ProtectedRoute>
    );
}

function LeaderDetailContent() {
    const t = useTranslations();
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { can } = useRBAC();
    const { data, isLoading, isError } = useLeaderDetail(params.id);
    const leader = data?.data;

    if (isLoading) {
        return (
            <MetalCard className="flex items-center justify-center py-32">
                <Spinner size="lg" />
            </MetalCard>
        );
    }

    if (isError || !leader) {
        notFound();
    }

    return (
        <div className="space-y-6">
            {/* Top Back Action */}
            <button
                type="button"
                onClick={() => router.push("/admin/leaders")}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground transition-all py-2 px-3.5 rounded-xl border border-border/60 dark:border-white/10 bg-card/60 hover:bg-card active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
            >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                {t("admin.leaders.details.back")}
            </button>

            {/* Leader Profile Header Banner */}
            <LeaderHeader leader={leader} />

            {/* Information Grid: Contact & Managed Departments */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <LeaderInfo leader={leader} />
                <DepartmentCard leader={leader} />
            </div>

            {/* Managed Interns Table */}
            {can("INTERN_READ") && <InternsCard leader={leader} />}
        </div>
    );
}

function LeaderHeader({ leader }: { leader: Leader }) {
    const t = useTranslations();
    const queryClient = useQueryClient();
    const { can } = useRBAC();
    const canUpdateUser = can("USER_UPDATE");
    const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
    const hasAvatar = Boolean(
        leader.user.avatarUrl && failedAvatarUrl !== leader.user.avatarUrl
    );

    const { mutate: toggleActive, isPending: togglingActive } = useMutation({
        mutationFn: (isActive: boolean) =>
            updateUserService(leader.userId, { isActive }),
        onSuccess: () => {
            toast.success(t("admin.leaders.statusUpdated"));
            queryClient.invalidateQueries({ queryKey: ["leader"] });
            queryClient.invalidateQueries({ queryKey: ["leaders"] });
        },
        onError: () => toast.error(t("admin.leaders.statusUpdateError")),
    });

    return (
        <MetalCard>
            <div className="p-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-4 min-w-0 w-full">
                        {hasAvatar ? (
                            <Image
                                src={leader.user.avatarUrl!}
                                alt={leader.user.fullName ?? ""}
                                width={64}
                                height={64}
                                unoptimized
                                onError={() => setFailedAvatarUrl(leader.user.avatarUrl ?? null)}
                                className="h-16 w-16 rounded-2xl object-cover shrink-0 border border-border dark:border-white/10"
                            />
                        ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-800 text-2xl font-bold text-white shadow-sm">
                                {(leader.user.fullName ?? leader.user.email)
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h1
                                className="text-2xl sm:text-3xl font-bold text-foreground truncate"
                                title={leader.user.fullName ?? leader.user.email}
                            >
                                {leader.user.fullName ?? leader.user.email}
                            </h1>
                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                                    <Mail className="h-4 w-4 shrink-0 text-cyan-400" />
                                    <span className="truncate" title={leader.user.email}>
                                        {leader.user.email}
                                    </span>
                                </div>
                                {leader.phone && (
                                    <>
                                        <span className="text-muted/40 shrink-0">•</span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Phone className="h-4 w-4 shrink-0 text-cyan-400" />
                                            <span>{leader.phone}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0">
                        {canUpdateUser ? (
                            <InlineSelect
                                ariaLabel={t("admin.leaders.colStatus")}
                                value={leader.user.isActive ? "true" : "false"}
                                placeholder={t("admin.leaders.colStatus")}
                                loading={togglingActive}
                                disabled={togglingActive}
                                onChange={(val) => {
                                    if (val !== null) toggleActive(val === "true");
                                }}
                                options={[
                                    { value: "true", label: t("admin.leaders.active") },
                                    { value: "false", label: t("admin.leaders.inactive") },
                                ]}
                                renderTrigger={(label) => (
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                            leader.user.isActive
                                                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/50"
                                                : "border-red-400/30 bg-red-500/10 text-red-300 hover:border-red-400/50"
                                        }`}
                                    >
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${
                                                leader.user.isActive
                                                    ? "bg-emerald-400"
                                                    : "bg-red-400"
                                            }`}
                                        />
                                        {label}
                                    </span>
                                )}
                            />
                        ) : (
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                                    leader.user.isActive
                                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                                        : "border-red-400/30 bg-red-500/10 text-red-300"
                                }`}
                            >
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                        leader.user.isActive
                                            ? "bg-emerald-400"
                                            : "bg-red-400"
                                    }`}
                                />
                                {leader.user.isActive ? t("admin.leaders.active") : t("admin.leaders.inactive")}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </MetalCard>
    );
}

function LeaderInfo({ leader }: { leader: Leader }) {
    const t = useTranslations();
    const { can } = useRBAC();
    const canUpdateLeader = can("LEADER_UPDATE");
    const { mutate: updateLeader } = useUpdateLeader();
    const { data: deptData } = useDepartments();
    const departments = deptData?.data ?? [];
    const managedDepartmentIds = new Set(
        leader.departments.map((department) => department.id),
    );
    const availablePositions = departments
        .filter((department) => managedDepartmentIds.has(department.id))
        .flatMap((department) => department.positions)
        .filter(
            (position, index, positions) =>
                positions.findIndex((item) => item.name === position.name) === index,
        );

    const [updatingPosition, setUpdatingPosition] = useState(false);

    const handlePositionChange = useCallback(
        (posName: string | null) => {
            if (leader.departments.length === 0) {
                toast.error(t("admin.leaders.selectDepartmentFirst"));
                return;
            }
            setUpdatingPosition(true);
            updateLeader(
                {
                    id: leader.id,
                    payload: { position: posName || null },
                },
                {
                    onSettled: () => setUpdatingPosition(false),
                },
            );
        },
        [leader.id, leader.departments.length, t, updateLeader],
    );

    return (
        <MetalCard>
            <div className="p-6">
                <div className="flex items-center gap-2.5 mb-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110">
                        <User className="h-4 w-4 shrink-0" />
                    </div>
                    <h2 className="text-lg font-semibold metal-text">
                        {t("admin.leaders.details.contactInfo")}
                    </h2>
                </div>

                <div className="divide-y divide-border/40 dark:divide-white/5">
                    <InfoRow
                        icon={<Mail className="h-4 w-4 shrink-0" />}
                        label={t("admin.leaders.details.email")}
                        value={leader.user.email}
                    />

                    <InfoRow
                        icon={<Phone className="h-4 w-4 shrink-0" />}
                        label={t("admin.leaders.details.phone")}
                        value={leader.phone ?? "—"}
                    />

                    <div className="flex items-center justify-between py-3.5">
                        <div className="flex items-center gap-3 text-sm text-muted">
                            <Briefcase className="h-4 w-4 shrink-0" />
                            <span>{t("admin.leaders.details.position")}</span>
                        </div>
                        <div className="min-w-0 max-w-[220px] text-sm text-right">
                            {canUpdateLeader ? (
                                <InlineSelect
                                    ariaLabel={t("admin.leaders.details.position")}
                                    value={leader.position}
                                    placeholder={t("admin.leaders.notSet")}
                                    loading={updatingPosition}
                                    disabled={leader.departments.length === 0}
                                    onDisabledClick={() => toast.error(t("admin.leaders.selectDepartmentFirst"))}
                                    onChange={handlePositionChange}
                                    options={[
                                        { value: null, label: t("admin.leaders.notSet") },
                                        ...availablePositions.map((pos) => ({
                                            value: pos.name,
                                            label: pos.name,
                                        })),
                                    ]}
                                />
                            ) : (
                                <span className="text-sm font-medium text-foreground">
                                    {leader.position ?? "—"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </MetalCard>
    );
}

function DepartmentCard({ leader }: { leader: Leader }) {
    const t = useTranslations();
    const locale = useLocale();
    const { can } = useRBAC();
    const canUpdateLeader = can("LEADER_UPDATE");
    const { data: deptData } = useDepartments();
    const departments = deptData?.data ?? [];

    return (
        <MetalCard>
            <div className="p-6">
                <div className="flex items-center gap-2.5 mb-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110">
                        <Building2 className="h-4 w-4 shrink-0" />
                    </div>
                    <h2 className="text-lg font-semibold metal-text">
                        {t("admin.leaders.details.colDept")}
                    </h2>
                </div>

                <div className="divide-y divide-border/40 dark:divide-white/5">
                    <div className="flex items-center justify-between gap-4 py-3.5">
                        <div className="flex items-center gap-3 text-sm text-muted shrink-0">
                            <Building2 className="h-4 w-4 shrink-0" />
                            <span>{t("admin.leaders.details.departments")}</span>
                        </div>
                        <div className="min-w-0 max-w-[260px] text-sm">
                            {canUpdateLeader ? (
                                <LeaderDepartmentSelect
                                    leader={leader}
                                    departments={departments}
                                />
                            ) : (
                                <span className="text-sm font-medium text-foreground">
                                    {leader.departments.map((d) => d.name).join(", ") || "—"}
                                </span>
                            )}
                        </div>
                    </div>

                    <InfoRow
                        icon={<Users className="h-4 w-4 shrink-0" />}
                        label={t("admin.leaders.details.internsManaged")}
                        value={
                            <span className="inline-flex items-center justify-center min-w-[28px] px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-semibold text-xs border border-cyan-500/20">
                                {leader.internCount ?? 0}
                            </span>
                        }
                    />

                    <InfoRow
                        icon={<Calendar className="h-4 w-4 shrink-0" />}
                        label={t("admin.leaders.details.joinedDate")}
                        value={formatDate(leader.createdAt, locale)}
                    />
                </div>
            </div>
        </MetalCard>
    );
}

const INTERN_COLUMNS =
    "minmax(260px,2.5fr) minmax(180px,1.8fr) minmax(180px,1.8fr) 140px 48px";

function InternsCard({ leader }: { leader: Leader }) {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const page = Number(searchParams.get("page") ?? "1");

    const { data, isLoading, refetch, isFetching } = useInterns({
        leaderId: leader.userId,
        page,
        limit: 10,
    });
    const interns = data?.data ?? [];
    const meta = data?.meta;

    function goToPage(newPage: number) {
        const p = new URLSearchParams(searchParams.toString());
        p.set("page", String(newPage));
        router.push(`${pathname}?${p.toString()}`);
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 transition-all duration-500 hover:rotate-6 hover:scale-110">
                    <Users className="h-4 w-4 shrink-0" />
                </div>
                <h2 className="text-lg font-semibold metal-text">
                    {t("admin.leaders.details.managedInternsTitle", {
                        count: meta?.total ?? interns.length,
                    })}
                </h2>
            </div>

            <Table
                columns={INTERN_COLUMNS}
                className="
                    bg-card dark:bg-[linear-gradient(145deg,#101827_0%,#1a2235_20%,#0f172a_55%,#050816_100%)]
                    shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,.45)]
                    hover:shadow-md dark:hover:shadow-[0_20px_50px_rgba(21,174,245,.15)]
                    transition-shadow duration-500
                "
            >
                <Table.Header>
                    <div>{t("admin.leaders.details.colIntern")}</div>
                    <div>{t("admin.leaders.details.colDept")}</div>
                    <div>{t("admin.leaders.details.colPosition")}</div>
                    <div>{t("admin.leaders.details.colStatus")}</div>
                    <Table.ReloadButton onReload={refetch} isReloading={isFetching} />
                </Table.Header>

                <Table.Body
                    data={interns}
                    isLoading={isLoading}
                    emptyMessage={t("admin.leaders.details.noInterns")}
                    emptyDescription={t("admin.leaders.details.noInternsDesc")}
                    render={(intern) => (
                        <Table.Row key={intern.id}>
                            {/* Intern Info */}
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-700/80 to-blue-900/80 text-xs font-bold text-white border border-cyan-500/20 shadow-sm">
                                    {(intern.fullName ?? intern.user.email)
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p
                                        className="truncate text-sm font-semibold text-foreground cursor-pointer hover:text-cyan-400 transition"
                                        onClick={() => router.push(`/admin/interns/${intern.id}`)}
                                        title={intern.fullName ?? intern.user.email}
                                    >
                                        {intern.fullName ?? intern.user.email}
                                    </p>
                                    <p
                                        className="truncate text-xs text-muted"
                                        title={intern.user.email}
                                    >
                                        {intern.user.email}
                                    </p>
                                </div>
                            </div>

                            {/* Department */}
                            <div className="text-sm min-w-0 pr-2">
                                <span className="truncate text-foreground font-medium" title={intern.department?.name ?? "—"}>
                                    {intern.department?.name ?? "—"}
                                </span>
                            </div>

                            {/* Position */}
                            <div className="text-sm min-w-0 pr-2">
                                <span className="truncate text-muted" title={intern.position?.name ?? "—"}>
                                    {intern.position?.name ?? "—"}
                                </span>
                            </div>

                            {/* Status */}
                            <div>
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                                        intern.status === "ACTIVE"
                                            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                                            : intern.status === "COMPLETED"
                                              ? "border-sky-400/30 bg-sky-500/10 text-sky-300"
                                              : "border-rose-400/30 bg-rose-500/10 text-rose-300"
                                    }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                            intern.status === "ACTIVE"
                                                ? "bg-emerald-400"
                                                : intern.status === "COMPLETED"
                                                  ? "bg-sky-400"
                                                  : "bg-rose-400"
                                        }`}
                                    />
                                    {intern.status === "ACTIVE"
                                        ? t("admin.interns.active")
                                        : intern.status === "COMPLETED"
                                          ? t("admin.interns.completed")
                                          : t("admin.interns.dropped")}
                                </span>
                            </div>

                            {/* Action */}
                            <div className="flex items-center justify-end">
                                <button
                                    type="button"
                                    onClick={() => router.push(`/admin/interns/${intern.id}`)}
                                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-border dark:border-white/10 bg-card/60 text-muted transition hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-400 active:scale-95"
                                    title={t("admin.leaders.details.actions")}
                                    aria-label={t("admin.leaders.details.actions")}
                                >
                                    <Eye className="h-4 w-4 shrink-0" />
                                </button>
                            </div>
                        </Table.Row>
                    )}
                />

                {meta && meta.totalPages > 1 && (
                    <Table.Footer>
                        <div className="flex w-full items-center justify-between gap-4 text-sm">
                            <p className="text-muted">
                                {t("admin.interns.pagination", {
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
        </div>
    );
}

function InfoRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-3 text-sm text-muted">
                {icon}
                <span>{label}</span>
            </div>
            <span className="text-sm font-medium text-foreground">{value}</span>
        </div>
    );
}
