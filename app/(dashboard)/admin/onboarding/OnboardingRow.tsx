"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
    MoreVertical,
    Eye,
    XCircle,
    CheckCircle2,
    Trash2,
    Ban,
    RefreshCw,
    Copy,
    Loader2,
} from "lucide-react";

import { useRevokeInvite } from "@/hooks/application/useRevokeInvite";
import { useReviewApplication } from "@/hooks/application/useReviewApplication";
import { useDeleteApplication } from "@/hooks/application/useDeleteApplication";
import { useCreateInvite } from "@/hooks/application/useCreateInvite";
import { useAssignApplication } from "@/hooks/application/useAssignApplication";
import { useDepartments } from "@/hooks/department/useDepartments";
import { usePositions } from "@/hooks/department/usePositions";
import { useRBAC } from "@/hooks/rbac/useRBAC";
import type { ApplicationInviteRow } from "@/types/application";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import InlineSelect from "@/components/ui/InlineSelect";
import { toast } from "react-hot-toast";

const INVITE_COLORS: Record<string, string> = {
    UNUSED: "border-sky-300 text-sky-700 bg-sky-100/80 dark:border-sky-500/30 dark:text-sky-400 dark:bg-sky-500/10",
    ACTIVE: "border-sky-300 text-sky-700 bg-sky-100/80 dark:border-sky-500/30 dark:text-sky-400 dark:bg-sky-500/10",
    USED: "border-emerald-300 text-emerald-700 bg-emerald-100/80 dark:border-emerald-500/30 dark:text-emerald-400 dark:bg-emerald-500/10",
    EXPIRED: "border-amber-300 text-amber-800 bg-amber-100/80 dark:border-amber-500/30 dark:text-amber-400 dark:bg-amber-500/10",
    REVOKED: "border-rose-300 text-rose-700 bg-rose-100/80 dark:border-red-500/30 dark:text-red-400 dark:bg-red-500/10",
};

const APP_COLORS: Record<string, string> = {
    PENDING: "border-amber-300 text-amber-800 bg-amber-100/80 dark:border-amber-500/30 dark:text-amber-400 dark:bg-amber-500/10",
    APPROVED: "border-emerald-300 text-emerald-700 bg-emerald-100/80 dark:border-emerald-500/30 dark:text-emerald-400 dark:bg-emerald-500/10",
    REJECTED: "border-rose-300 text-rose-700 bg-rose-100/80 dark:border-red-500/30 dark:text-red-400 dark:bg-red-500/10",
};

function formatDate(dateStr: string, locale: string) {
    return new Date(dateStr).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
        month: "short",
        day: "numeric",
    });
}

export interface OnboardingDraft {
    departmentId?: string | null;
    positionId?: string | null;
}

interface Props {
    invite: ApplicationInviteRow;
    draft?: OnboardingDraft;
    onDraftChange?: (patch: Partial<OnboardingDraft>) => void;
}

export default function OnboardingRow({ invite, draft, onDraftChange }: Props) {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const { can, canAny } = useRBAC();

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    const [copied, setCopied] = useState(false);

    const { mutate: revokeInvite, isPending: revoking } = useRevokeInvite();
    const { mutate: reviewApp, isPending: reviewing } = useReviewApplication();
    const { mutate: deleteApp, isPending: deleting } = useDeleteApplication();
    const { mutate: createInvite, isPending: resending } = useCreateInvite();
    const { mutate: assignApplication, isPending: assigning } =
        useAssignApplication();

    const application = invite.application;
    const appStatus = application?.status ?? null;
    const canAssign = can("APPLICATION_ASSIGN") && invite.status === "USED" && appStatus === "PENDING";

    const initialDeptId =
        application?.department?.id ??
        ((application as Record<string, unknown>)?.departmentId as string | null | undefined) ??
        null;

    const initialPosId =
        application?.position?.id ??
        ((application as Record<string, unknown>)?.positionId as string | null | undefined) ??
        null;

    const [localDeptId, setLocalDeptId] = useState<string | null | undefined>(undefined);
    const [localPosId, setLocalPosId] = useState<string | null | undefined>(undefined);

    const [prevInviteId, setPrevInviteId] = useState(invite.id);
    if (invite.id !== prevInviteId) {
        setPrevInviteId(invite.id);
        setLocalDeptId(undefined);
        setLocalPosId(undefined);
    }

    const assignedDepartmentId =
        draft?.departmentId !== undefined
            ? draft.departmentId
            : localDeptId !== undefined
            ? localDeptId
            : initialDeptId;

    const assignedPositionId =
        draft?.positionId !== undefined
            ? draft.positionId
            : localPosId !== undefined
            ? localPosId
            : initialPosId;

    const isDeptDirty =
        draft?.departmentId !== undefined && draft.departmentId !== initialDeptId;
    const isPosDirty =
        draft?.positionId !== undefined && draft.positionId !== initialPosId;

    const { data: departmentData } = useDepartments();
    const departments = departmentData?.data ?? [];
    const { data: positionData } = usePositions(
        assignedDepartmentId ?? undefined,
    );
    const positions = positionData?.data ?? [];

    const isBusy = revoking || reviewing || deleting || resending || assigning;

    const canRevoke = canAny(["APPLICATION_INVITE_REVOKE", "APPLICATION_DELETE"]);
    const canReview = canAny(["APPLICATION_REVIEW", "APPLICATION_UPDATE"]);
    const canDelete = can("APPLICATION_DELETE");
    const canResend = canAny(["APPLICATION_INVITE_CREATE", "APPLICATION_CREATE"]);
    const canView = canAny(["APPLICATION_READ", "APPLICATION_INVITE_READ"]);

    const hasMenuActions =
        ((invite.status === "ACTIVE" || invite.status === "UNUSED") && (canView || canRevoke)) ||
        (invite.status === "USED" && appStatus === "PENDING" && (canView || canReview)) ||
        (invite.status === "USED" && appStatus === "APPROVED" && canView) ||
        (invite.status === "USED" && appStatus === "REJECTED" && (canView || canDelete)) ||
        ((invite.status === "EXPIRED" || invite.status === "REVOKED") && (canView || canResend));

    const candidate = invite.application
        ? invite.application.fullName
        : invite.email;
    const department = application?.department?.name ?? "—";
    const position = application?.position?.name ?? "—";

    const updateMenuPosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Tự động đóng nếu nút trigger cuộn ra hoàn toàn ngoài màn hình
        if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
            setMenuOpen(false);
            return;
        }

        const MENU_WIDTH = Math.min(195, vw - 24);
        const ESTIMATED_HEIGHT = 160;
        const spaceBelow = vh - rect.bottom;
        const spaceAbove = rect.top;

        // Tự động lật ngược lên trên (flip) khi không gian bên dưới không đủ và bên trên thoáng hơn
        const openUpward = spaceBelow < ESTIMATED_HEIGHT && spaceAbove > spaceBelow;

        // Giới hạn chiều cao tối đa kẹp trong viewport có bật cuộn theo chuẩn AGENTS.md
        const maxHeight = openUpward
            ? Math.min(260, Math.max(100, spaceAbove - 16))
            : Math.min(260, Math.max(100, spaceBelow - 16));

        // Căn lề ngang chống tràn cả mép trái lẫn mép phải (đặc biệt khi cuộn ngang bảng hoặc mobile)
        const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, vw - MENU_WIDTH - 8));

        setMenuStyle({
            position: "fixed",
            top: openUpward ? undefined : rect.bottom + 6,
            bottom: openUpward ? vh - rect.top + 6 : undefined,
            left,
            width: MENU_WIDTH,
            maxHeight,
            overflowY: "auto",
            zIndex: 9999,
        });
    }, [setMenuOpen]);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!menuOpen) {
            updateMenuPosition();
            setMenuOpen(true);
        } else {
            setMenuOpen(false);
        }
    };

    useEffect(() => {
        if (!menuOpen) return;
        updateMenuPosition();
        window.addEventListener("scroll", updateMenuPosition, true);
        window.addEventListener("resize", updateMenuPosition);
        return () => {
            window.removeEventListener("scroll", updateMenuPosition, true);
            window.removeEventListener("resize", updateMenuPosition);
        };
    }, [menuOpen, updateMenuPosition]);

    useEffect(() => {
        if (!menuOpen) return;
        function handleClickOutside(e: MouseEvent | TouchEvent) {
            const target = e.target as Node;
            if (
                menuRef.current &&
                !menuRef.current.contains(target) &&
                triggerRef.current &&
                !triggerRef.current.contains(target)
            ) {
                setMenuOpen(false);
            }
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setMenuOpen(false);
                triggerRef.current?.focus();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside, { passive: true });
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [menuOpen]);

    function handleDepartmentChange(departmentId: string | null) {
        if (!application || !canAssign) return;
        if (onDraftChange) {
            onDraftChange({
                departmentId,
                positionId: null,
            });
            return;
        }
        setLocalDeptId(departmentId);
        setLocalPosId(null);
        assignApplication(
            {
                id: application.id,
                payload: { departmentId, positionId: null },
            },
            {
                onError: () => {
                    setLocalDeptId(undefined);
                    setLocalPosId(undefined);
                },
            },
        );
    }

    function handlePositionChange(positionId: string | null) {
        if (!application || !canAssign || !assignedDepartmentId) return;
        if (onDraftChange) {
            onDraftChange({ positionId });
            return;
        }
        setLocalPosId(positionId);
        assignApplication(
            {
                id: application.id,
                payload: { departmentId: assignedDepartmentId, positionId },
            },
            {
                onError: () => {
                    setLocalPosId(undefined);
                },
            },
        );
    }

    function handleCopyLink() {
        const link = `${window.location.origin}/onboarding/${invite.token ?? ""}/policies`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function handleRevoke(onClose?: () => void) {
        revokeInvite(invite.id, {
            onSuccess: () => {
                toast.success(t("admin.onboarding.revokeSuccess"));
                onClose?.();
            },
            onError: () => toast.error(t("admin.onboarding.revokeError")),
        });
    }

    function handleReview(status: "APPROVED" | "REJECTED", onClose?: () => void) {
        if (!invite.application) return;
        if (
            status === "APPROVED" &&
            (!assignedDepartmentId || !assignedPositionId)
        ) {
            toast.error(t("admin.onboarding.assignDeptPositionFirst"));
            return;
        }
        reviewApp(
            { id: invite.application.id, payload: { status } },
            {
                onSuccess: () => {
                    if (status === "APPROVED") {
                        toast.success(t("admin.onboarding.approveSuccess"));
                    } else {
                        toast.success(t("admin.onboarding.rejectSuccess"));
                    }
                    onClose?.();
                },
                onError: () => {
                    if (status === "APPROVED") {
                        toast.error(t("admin.onboarding.approveError"));
                    } else {
                        toast.error(t("admin.onboarding.rejectError"));
                    }
                },
            },
        );
    }

    function handleDelete(onClose?: () => void) {
        if (!invite.application) return;
        deleteApp(invite.application.id, {
            onSuccess: () => {
                toast.success(t("admin.onboarding.deleteSuccess"));
                onClose?.();
            },
            onError: () => toast.error(t("admin.onboarding.deleteError")),
        });
    }

    function handleView() {
        setMenuOpen(false);
        const params = new URLSearchParams(window.location.search);
        params.set("Id", invite.id);
        params.set("view", "modal");
        router.push(`/admin/onboarding?${params.toString()}`);
    }

    return (
        <Modal>
            <Table.Row>
                {/* Candidate */}
                <div className="min-w-0 pr-2">
                    <p
                        className="truncate text-sm font-semibold text-foreground cursor-pointer hover:text-cyan-400 transition"
                        onClick={handleView}
                        title={candidate}
                    >
                        {candidate}
                    </p>
                    {!invite.application && (
                        <p className="truncate text-xs text-muted" title={invite.email}>
                            {invite.email}
                        </p>
                    )}
                    {application?.preferredDepartment && (
                        <p className="truncate text-xs text-muted/80">
                            {t("admin.onboarding.prefers")}: {application.preferredDepartment}
                            {application.preferredPosition
                                ? ` · ${application.preferredPosition}`
                                : ""}
                        </p>
                    )}
                </div>

                {/* Department */}
                <div className="min-w-0 text-sm text-muted pr-2">
                    {canAssign ? (
                        <InlineSelect
                            ariaLabel={t("admin.onboarding.assignedDepartment")}
                            value={assignedDepartmentId}
                            fallbackLabel={
                                departments.find((d) => d.id === assignedDepartmentId)?.name ??
                                application?.department?.name ??
                                undefined
                            }
                            isDirty={isDeptDirty}
                            placeholder={
                                application?.preferredDepartment
                                    ? t("admin.onboarding.assignWith", {
                                          name: application.preferredDepartment,
                                      })
                                    : t("admin.onboarding.assignDepartment")
                            }
                            loading={assigning}
                            disabled={assigning}
                            onChange={handleDepartmentChange}
                            options={[
                                { value: null, label: t("admin.onboarding.notSet") },
                                ...(application?.department && !departments.some((d) => d.id === application.department?.id)
                                    ? [{ value: application.department.id, label: application.department.name }]
                                    : []),
                                ...departments.map((item) => ({
                                    value: item.id,
                                    label: item.name,
                                })),
                            ]}
                        />
                    ) : (
                        department
                    )}
                </div>

                {/* Position */}
                <div className="min-w-0 text-sm text-muted pr-2">
                    {canAssign ? (
                        <InlineSelect
                            ariaLabel={t("admin.onboarding.assignedPosition")}
                            value={assignedPositionId}
                            fallbackLabel={
                                positions.find((p) => p.id === assignedPositionId)?.name ??
                                application?.position?.name ??
                                undefined
                            }
                            isDirty={isPosDirty}
                            placeholder={
                                assignedDepartmentId
                                    ? application?.preferredPosition
                                        ? t("admin.onboarding.assignWith", {
                                              name: application.preferredPosition,
                                          })
                                        : t("admin.onboarding.assignPosition")
                                    : t("admin.onboarding.departmentFirst")
                            }
                            loading={assigning}
                            disabled={!assignedDepartmentId || assigning}
                            onDisabledClick={() =>
                                toast.error(t("admin.onboarding.selectDeptFirst"))
                            }
                            onChange={handlePositionChange}
                            options={[
                                { value: null, label: t("admin.onboarding.notSet") },
                                ...(application?.position && !positions.some((p) => p.id === application.position?.id)
                                    ? [{ value: application.position.id, label: application.position.name }]
                                    : []),
                                ...positions.map((item) => ({
                                    value: item.id,
                                    label: item.name,
                                })),
                            ]}
                        />
                    ) : (
                        position
                    )}
                </div>

                {/* Invite Status */}
                <div>
                    <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wider whitespace-nowrap ${
                            INVITE_COLORS[invite.status] ?? "border-zinc-700 text-zinc-400"
                        }`}
                    >
                        {t(`admin.onboarding.inviteStatus_${invite.status}`)}
                    </span>
                </div>

                {/* Application Status */}
                <div>
                    {appStatus ? (
                        <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wider whitespace-nowrap ${
                                APP_COLORS[appStatus] ?? "border-zinc-700 text-zinc-400"
                            }`}
                        >
                            {t(`admin.onboarding.appStatus_${appStatus}`)}
                        </span>
                    ) : (
                        <span className="text-xs text-muted">—</span>
                    )}
                </div>

                {/* Sent At */}
                <div className="text-xs sm:text-sm text-muted">
                    {formatDate(invite.createdAt, locale)}
                </div>

                {/* Actions (with createPortal to avoid clipping inside table) */}
                <div className="relative flex items-center justify-end">
                    {hasMenuActions && (
                        <button
                            ref={triggerRef}
                            type="button"
                            aria-label="Actions menu"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            onClick={toggleMenu}
                            disabled={isBusy}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted transition hover:border-border dark:hover:border-white/10 hover:bg-card hover:text-foreground active:scale-95 disabled:opacity-50"
                        >
                            {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <MoreVertical className="h-4 w-4" />
                            )}
                        </button>
                    )}

                    {hasMenuActions &&
                        menuOpen &&
                        !isBusy &&
                        typeof document !== "undefined" &&
                        createPortal(
                            <div
                                id={menuId}
                                ref={menuRef}
                                role="menu"
                                aria-label="Onboarding actions"
                                style={menuStyle}
                                className="rounded-2xl border border-border dark:border-white/10 bg-card/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,.55)] backdrop-blur-2xl [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10"
                            >
                                {/* ACTIVE / UNUSED: View + Copy link + Revoke */}
                                {(invite.status === "ACTIVE" || invite.status === "UNUSED") && (
                                    <>
                                        {canView && (
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={handleView}
                                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-foreground"
                                            >
                                                <Eye className="h-4 w-4 shrink-0 text-cyan-400" />
                                                {t("admin.onboarding.viewDetails")}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                handleCopyLink();
                                                setMenuOpen(false);
                                            }}
                                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-foreground"
                                        >
                                            <Copy className="h-4 w-4 shrink-0 text-sky-400" />
                                            {copied
                                                ? t("admin.onboarding.copied")
                                                : t("admin.onboarding.copyLink")}
                                        </button>

                                        {canRevoke && (
                                            <Modal.Open opens={`revoke-${invite.id}`}>
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={() => setMenuOpen(false)}
                                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10"
                                                >
                                                    <Ban className="h-4 w-4 shrink-0" />
                                                    {t("admin.onboarding.revoke")}
                                                </button>
                                            </Modal.Open>
                                        )}
                                    </>
                                )}

                                {/* USED + PENDING: View + Approve + Reject */}
                                {invite.status === "USED" &&
                                    appStatus === "PENDING" && (
                                        <>
                                            {canView && (
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={handleView}
                                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-foreground"
                                                >
                                                    <Eye className="h-4 w-4 shrink-0 text-cyan-400" />
                                                    {t("admin.onboarding.viewApplication")}
                                                </button>
                                            )}

                                            {canReview && (
                                                <>
                                                    <Modal.Open opens={`approve-${invite.id}`}>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            disabled={
                                                                !assignedDepartmentId ||
                                                                !assignedPositionId
                                                            }
                                                            title={
                                                                !assignedDepartmentId ||
                                                                !assignedPositionId
                                                                    ? t(
                                                                          "admin.onboarding.assignFirstTooltip",
                                                                      )
                                                                    : undefined
                                                            }
                                                            onClick={() => setMenuOpen(false)}
                                                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                                                            {t("admin.onboarding.approve")}
                                                        </button>
                                                    </Modal.Open>

                                                    <Modal.Open opens={`reject-${invite.id}`}>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={() => setMenuOpen(false)}
                                                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10"
                                                        >
                                                            <XCircle className="h-4 w-4 shrink-0" />
                                                            {t("admin.onboarding.reject")}
                                                        </button>
                                                    </Modal.Open>
                                                </>
                                            )}
                                        </>
                                    )}

                                {/* USED + APPROVED: View */}
                                {invite.status === "USED" &&
                                    appStatus === "APPROVED" &&
                                    canView && (
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={handleView}
                                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-foreground"
                                        >
                                            <Eye className="h-4 w-4 shrink-0 text-cyan-400" />
                                            {t("admin.onboarding.viewApplication")}
                                        </button>
                                    )}

                                {/* USED + REJECTED: View + Delete */}
                                {invite.status === "USED" &&
                                    appStatus === "REJECTED" && (
                                        <>
                                            {canView && (
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={handleView}
                                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-foreground"
                                                >
                                                    <Eye className="h-4 w-4 shrink-0 text-cyan-400" />
                                                    {t("admin.onboarding.viewApplication")}
                                                </button>
                                            )}

                                            {canDelete && (
                                                <Modal.Open opens={`delete-${invite.id}`}>
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={() => setMenuOpen(false)}
                                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10"
                                                    >
                                                        <Trash2 className="h-4 w-4 shrink-0" />
                                                        {t("admin.onboarding.delete")}
                                                    </button>
                                                </Modal.Open>
                                            )}
                                        </>
                                    )}

                                {/* EXPIRED / REVOKED: View + Resend */}
                                {(invite.status === "EXPIRED" ||
                                    invite.status === "REVOKED") && (
                                    <>
                                        {canView && (
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={handleView}
                                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-foreground"
                                            >
                                                <Eye className="h-4 w-4 shrink-0 text-cyan-400" />
                                                {t("admin.onboarding.viewDetails")}
                                            </button>
                                        )}

                                        {canResend && (
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    createInvite(
                                                        { email: invite.email },
                                                        {
                                                            onSuccess: () =>
                                                                toast.success(
                                                                    t(
                                                                        "admin.onboarding.createSuccess",
                                                                    ),
                                                                ),
                                                            onError: () =>
                                                                toast.error(
                                                                    t(
                                                                        "admin.onboarding.createError",
                                                                    ),
                                                                ),
                                                        },
                                                    );
                                                }}
                                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-foreground"
                                            >
                                                <RefreshCw className="h-4 w-4 shrink-0 text-cyan-400" />
                                                {t("admin.onboarding.resendInvite")}
                                            </button>
                                        )}
                                    </>
                                )}

                                {/* Fallback View Details if none of the specific statuses matched */}
                                {!["ACTIVE", "UNUSED", "USED", "EXPIRED", "REVOKED"].includes(invite.status) &&
                                    canView && (
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={handleView}
                                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-foreground"
                                        >
                                            <Eye className="h-4 w-4 shrink-0 text-cyan-400" />
                                            {t("admin.onboarding.viewDetails")}
                                        </button>
                                    )}
                            </div>,
                            document.body,
                        )}
                </div>
            </Table.Row>

            {/* ─── Confirm Modals ─────────────────────────────── */}
            <Modal.Window name={`revoke-${invite.id}`} size="sm">
                <ConfirmContent
                    title={t("admin.onboarding.revokeTitle")}
                    message={t("admin.onboarding.revokeMessage", { email: invite.email })}
                    actionLabel={t("admin.onboarding.revoke")}
                    actionVariant="danger"
                    onAction={(onClose) => handleRevoke(onClose)}
                />
            </Modal.Window>

            <Modal.Window name={`approve-${invite.id}`} size="sm">
                <ConfirmContent
                    title={t("admin.onboarding.approveTitle")}
                    message={t("admin.onboarding.approveMessage", { name: candidate })}
                    actionLabel={t("admin.onboarding.approve")}
                    actionVariant="success"
                    onAction={(onClose) => handleReview("APPROVED", onClose)}
                />
            </Modal.Window>

            <Modal.Window name={`reject-${invite.id}`} size="sm">
                <ConfirmContent
                    title={t("admin.onboarding.rejectTitle")}
                    message={t("admin.onboarding.rejectMessage", { name: candidate })}
                    actionLabel={t("admin.onboarding.reject")}
                    actionVariant="danger"
                    onAction={(onClose) => handleReview("REJECTED", onClose)}
                />
            </Modal.Window>

            <Modal.Window name={`delete-${invite.id}`} size="sm">
                <ConfirmContent
                    title={t("admin.onboarding.deleteTitle")}
                    message={t("admin.onboarding.deleteMessage", { name: candidate })}
                    actionLabel={t("admin.onboarding.delete")}
                    actionVariant="danger"
                    onAction={(onClose) => handleDelete(onClose)}
                />
            </Modal.Window>
        </Modal>
    );
}

/* ─── Confirm modal body ─────────────────────────────────────── */

function ConfirmContent({
    title,
    message,
    actionLabel,
    actionVariant,
    onAction,
    onCloseModal,
}: {
    title: string;
    message: string;
    actionLabel: string;
    actionVariant: "danger" | "success";
    onAction: (onClose?: () => void) => void;
    onCloseModal?: () => void;
}) {
    const t = useTranslations();
    const [loading, setLoading] = useState(false);

    const colorClasses =
        actionVariant === "danger"
            ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/20"
            : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20";

    function handleClick() {
        setLoading(true);
        onAction(() => {
            setLoading(false);
            onCloseModal?.();
        });
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-foreground">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                    {message}
                </p>
            </div>

            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onCloseModal}
                    disabled={loading}
                    className="rounded-xl border border-border dark:border-white/10 bg-card px-5 py-2.5 text-sm font-medium text-muted transition-all hover:border-border-strong hover:text-foreground active:scale-95 disabled:opacity-50"
                >
                    {t("admin.onboarding.cancel")}
                </button>

                <button
                    type="button"
                    onClick={handleClick}
                    disabled={loading}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 ${colorClasses}`}
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t("admin.onboarding.processing")}
                        </span>
                    ) : (
                        actionLabel
                    )}
                </button>
            </div>
        </div>
    );
}
