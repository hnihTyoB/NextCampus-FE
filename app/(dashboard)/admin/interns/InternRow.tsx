"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { MoreVertical, Eye, Trash2, Circle, Loader2, Mail } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { useState, useRef, useEffect, useCallback, useMemo, useId } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "react-hot-toast";

import type { Intern } from "@/types/intern";
import { useDeleteIntern } from "@/hooks/intern/useDeleteIntern";
import { useLeaders } from "@/hooks/leader/useLeaders";
import { useUpdateIntern } from "@/hooks/intern/useUpdateIntern";
import { usePositions } from "@/hooks/department/usePositions";
import { useRemindInternDiscord } from "@/hooks/intern/useRemindInternDiscord";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import InlineSelect from "@/components/ui/InlineSelect";
import { useRBAC } from "@/hooks/rbac/useRBAC";

export type InternDraft = {
    leaderId?: string | null;
    departmentId?: string | null;
    positionId?: string | null;
    status?: Intern["status"];
};

type InternRowProps = {
    intern: Intern;
    draft?: InternDraft;
    onDraftChange?: (patch: Partial<InternDraft>) => void;
};

export default function InternRow({ intern, draft, onDraftChange }: InternRowProps) {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const { can } = useRBAC();
    const canAssignLeader = can("INTERN_ASSIGN_LEADER") || can("INTERN_UPDATE");
    const canUpdateIntern = can("INTERN_UPDATE");
    const canDeleteIntern = can("INTERN_DELETE");
    const canViewIntern = can("INTERN_READ");
    const canRemindDiscord = !intern.discordUserId && intern.status === "ACTIVE" && canUpdateIntern;
    const hasAnyAction = canViewIntern || canDeleteIntern || canRemindDiscord;

    const { mutate: deleteIntern, isPending: isDeleting } = useDeleteIntern();
    const remindMutation = useRemindInternDiscord();
    const { data: leadersData } = useLeaders();
    const { mutate: updateIntern } = useUpdateIntern();
    const [updatingField, setUpdatingField] = useState<
        "department" | "position" | "leader" | "status" | null
    >(null);
    const leaders = useMemo(() => leadersData?.data ?? [], [leadersData?.data]);

    const currentLeaderId = draft?.leaderId !== undefined ? draft.leaderId : intern.leaderId;
    const currentDepartmentId = draft?.departmentId !== undefined ? draft.departmentId : (intern.department?.id ?? null);
    const currentPositionId = draft?.positionId !== undefined ? draft.positionId : (intern.position?.id ?? null);
    const currentStatus = draft?.status !== undefined ? draft.status : intern.status;

    const selectedLeader = useMemo(() => {
        return currentLeaderId ? leaders.find((l) => l.userId === currentLeaderId) : null;
    }, [currentLeaderId, leaders]);

    const allowedDepartments = useMemo(() => {
        return selectedLeader ? selectedLeader.departments : [];
    }, [selectedLeader]);

    const { data: posData } = usePositions(currentDepartmentId ?? undefined);
    const positions = posData?.data ?? [];

    // Standardized 3-Dots Portal Action Menu (Rule 76-82 of AGENTS.md)
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    const updateMenuPosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
            setMenuOpen(false);
            return;
        }

        const MENU_WIDTH = Math.min(170, vw - 24);
        const ESTIMATED_HEIGHT = 120;
        const spaceBelow = vh - rect.bottom;
        const spaceAbove = rect.top;

        const openUpward = spaceBelow < ESTIMATED_HEIGHT && spaceAbove > spaceBelow;

        const maxHeight = openUpward
            ? Math.min(260, Math.max(100, spaceAbove - 16))
            : Math.min(260, Math.max(100, spaceBelow - 16));

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
    }, []);

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

    const endDate = new Date(intern.startDate);
    endDate.setMonth(endDate.getMonth() + intern.duration);

    const fmtDate = (d: Date) =>
        d.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-GB", {
            month: "short",
            year: "numeric",
        });

    const statusBadge: Record<string, string> = {
        ACTIVE: "border-emerald-300 bg-emerald-100/80 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
        COMPLETED: "border-blue-300 bg-blue-100/80 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300",
        DROPPED: "border-rose-300 bg-rose-100/80 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300",
    };

    const handleLeaderChange = useCallback(
        (newLeaderId: string | null) => {
            const selectedLdr = newLeaderId
                ? leaders.find((l) => l.userId === newLeaderId)
                : null;
            const hasSingleDepartment = selectedLdr?.departments?.length === 1;
            const newDeptId = hasSingleDepartment ? selectedLdr.departments[0].id : null;

            if (onDraftChange) {
                onDraftChange({
                    leaderId: newLeaderId,
                    departmentId: newDeptId,
                    positionId: null,
                });
                return;
            }

            setUpdatingField("leader");
            updateIntern(
                {
                    id: intern.id,
                    payload: {
                        leaderId: newLeaderId,
                        ...(hasSingleDepartment ? {
                            departmentId: selectedLdr.departments[0].id,
                        } : {
                            departmentId: null,
                            positionId: null,
                        }),
                    },
                },
                { onSettled: () => setUpdatingField(null) },
            );
        },
        [intern.id, leaders, updateIntern, onDraftChange],
    );

    const handlePositionChange = useCallback(
        (newPositionId: string | null) => {
            if (onDraftChange) {
                onDraftChange({ positionId: newPositionId });
                return;
            }
            setUpdatingField("position");
            updateIntern(
                {
                    id: intern.id,
                    payload: { positionId: newPositionId || undefined },
                },
                { onSettled: () => setUpdatingField(null) },
            );
        },
        [intern.id, updateIntern, onDraftChange],
    );

    const handleDepartmentChange = useCallback(
        (newDepartmentId: string | null) => {
            if (onDraftChange) {
                onDraftChange({
                    departmentId: newDepartmentId,
                    positionId: null,
                });
                return;
            }
            setUpdatingField("department");
            updateIntern(
                {
                    id: intern.id,
                    payload: {
                        departmentId: newDepartmentId,
                        positionId: null,
                    },
                },
                { onSettled: () => setUpdatingField(null) },
            );
        },
        [intern.id, updateIntern, onDraftChange],
    );

    const handleStatusChange = useCallback(
        (newStatus: Intern["status"]) => {
            if (onDraftChange) {
                onDraftChange({ status: newStatus });
                return;
            }
            setUpdatingField("status");
            updateIntern(
                {
                    id: intern.id,
                    payload: { status: newStatus },
                },
                { onSettled: () => setUpdatingField(null) },
            );
        },
        [intern.id, updateIntern, onDraftChange],
    );

    const isLeaderDirty = draft?.leaderId !== undefined && draft.leaderId !== intern.leaderId;
    const isDeptDirty = draft?.departmentId !== undefined && draft.departmentId !== (intern.department?.id ?? null);
    const isPosDirty = draft?.positionId !== undefined && draft.positionId !== (intern.position?.id ?? null);
    const isStatusDirty = draft?.status !== undefined && draft.status !== intern.status;

    const handleRemindDiscord = useCallback(async () => {
        setMenuOpen(false);
        try {
            await remindMutation.mutateAsync(intern.id);
            toast.success(
                t("admin.interns.remindDiscordSuccess", { name: intern.fullName }),
            );
        } catch {
            toast.error(t("admin.interns.remindDiscordFailed"));
        }
    }, [intern.id, intern.fullName, remindMutation, t]);

    return (
        <Modal>
            <Table.Row>
                {/* Intern info */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-main to-primary-light text-sm font-bold text-white shadow-sm dark:from-slate-700 dark:to-slate-800 dark:ring-1 dark:ring-white/10">
                        {intern.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p
                            className="truncate text-sm font-medium text-foreground cursor-pointer hover:text-cyan-400 transition"
                            onClick={() =>
                                router.push(`/admin/interns/${intern.id}`)
                            }
                        >
                            {intern.fullName}
                        </p>
                        <p className="truncate text-xs text-muted">
                            {intern.user.email}
                        </p>
                    </div>
                </div>

                {/* Leader */}
                <div className="text-sm text-muted">
                    {canAssignLeader ? (
                        <InlineSelect
                            ariaLabel="Leader"
                            value={currentLeaderId}
                            fallbackLabel={
                                selectedLeader?.user?.fullName ??
                                selectedLeader?.user?.email ??
                                intern.leader?.fullName ??
                                intern.leader?.email ??
                                undefined
                            }
                            placeholder={t("admin.interns.notSet")}
                            loading={updatingField === "leader"}
                            isDirty={isLeaderDirty}
                            onChange={handleLeaderChange}
                            options={[
                                { value: null, label: t("admin.interns.notSet") },
                                ...(intern.leader && intern.leaderId && !leaders.some((l) => l.userId === intern.leaderId)
                                    ? [{
                                        value: intern.leaderId,
                                        label: intern.leader.fullName ? `${intern.leader.fullName} (${intern.leader.email})` : intern.leader.email,
                                    }]
                                    : []),
                                ...leaders.map((l) => ({
                                    value: l.userId,
                                    label: l.user.fullName ? `${l.user.fullName} (${l.user.email})` : l.user.email,
                                })),
                            ]}
                        />
                    ) : (
                        <span className="truncate font-medium text-foreground">
                            {selectedLeader?.user?.fullName ?? selectedLeader?.user?.email ?? intern.leader?.fullName ?? intern.leader?.email ?? t("admin.interns.notSet")}
                        </span>
                    )}
                </div>

                {/* Department */}
                <div className="text-sm text-muted">
                    {canUpdateIntern ? (
                        <InlineSelect
                            ariaLabel="Department"
                            value={currentDepartmentId}
                            fallbackLabel={
                                allowedDepartments.find((d) => d.id === currentDepartmentId)?.name ??
                                intern.department?.name ??
                                undefined
                            }
                            placeholder={t("admin.interns.notSet")}
                            loading={updatingField === "department"}
                            disabled={!currentLeaderId}
                            isDirty={isDeptDirty}
                            onDisabledClick={() => toast.error(t("admin.interns.selectLeaderFirst"))}
                            onChange={handleDepartmentChange}
                            options={[
                                { value: null, label: t("admin.interns.notSet") },
                                ...(intern.department && !allowedDepartments.some((d) => d.id === intern.department?.id)
                                    ? [{ value: intern.department.id, label: intern.department.name }]
                                    : []),
                                ...allowedDepartments.map((d) => ({
                                    value: d.id,
                                    label: d.name,
                                })),
                            ]}
                        />
                    ) : (
                        <span className="truncate font-medium text-foreground">
                            {intern.department?.name ?? t("admin.interns.notSet")}
                        </span>
                    )}
                </div>

                {/* Position */}
                <div className="text-sm text-muted">
                    {canUpdateIntern ? (
                        <InlineSelect
                            ariaLabel="Position"
                            value={currentPositionId}
                            fallbackLabel={
                                positions.find((p) => p.id === currentPositionId)?.name ??
                                intern.position?.name ??
                                undefined
                            }
                            placeholder={t("admin.interns.notSet")}
                            loading={updatingField === "position"}
                            disabled={!currentDepartmentId}
                            isDirty={isPosDirty}
                            onDisabledClick={() => toast.error(t("admin.interns.departmentRequired"))}
                            onChange={handlePositionChange}
                            options={[
                                { value: null, label: t("admin.interns.notSet") },
                                ...(intern.position && !positions.some((p) => p.id === intern.position?.id)
                                    ? [{ value: intern.position.id, label: intern.position.name }]
                                    : []),
                                ...positions.map((p) => ({
                                    value: p.id,
                                    label: p.name,
                                })),
                            ]}
                        />
                    ) : (
                        <span className="truncate text-muted">
                            {intern.position?.name ?? t("admin.interns.notSet")}
                        </span>
                    )}
                </div>

                {/* Duration */}
                <div className="text-sm text-muted">
                    <p className="text-foreground font-medium">{fmtDate(new Date(intern.startDate))}</p>
                    <p className="text-xs text-muted/70">→ {fmtDate(endDate)}</p>
                </div>

                {/* Status */}
                <div>
                    {canUpdateIntern ? (
                        <InlineSelect
                            ariaLabel="Status"
                            value={currentStatus}
                            placeholder={t("admin.interns.colStatus")}
                            loading={updatingField === "status"}
                            isDirty={isStatusDirty}
                            onChange={(val) => handleStatusChange(val as Intern["status"])}
                            options={[
                                { value: "ACTIVE", label: t("admin.interns.active") },
                                { value: "COMPLETED", label: t("admin.interns.completed") },
                                { value: "DROPPED", label: t("admin.interns.dropped") },
                            ]}
                            renderTrigger={(label) => (
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                                        statusBadge[currentStatus] ?? ""
                                    }`}
                                >
                                    <Circle className="h-2 w-2 fill-current" />
                                    {label}
                                </span>
                            )}
                        />
                    ) : (
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                                statusBadge[currentStatus] ?? ""
                            }`}
                        >
                            <Circle className="h-2 w-2 fill-current" />
                            {currentStatus === "ACTIVE"
                                ? t("admin.interns.active")
                                : currentStatus === "COMPLETED"
                                  ? t("admin.interns.completed")
                                  : t("admin.interns.dropped")}
                        </span>
                    )}
                </div>

                {/* Discord Status Column */}
                <div className="flex items-center">
                    {intern.discordRoleGranted ? (
                        <span
                            title={intern.discordUserId ? `Discord ID: ${intern.discordUserId}` : undefined}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/80 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300 shadow-sm"
                        >
                            <SiDiscord className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span className="truncate max-w-[95px]">{t("admin.interns.discordGranted")}</span>
                        </span>
                    ) : intern.discordUserId ? (
                        <span
                            title={`Discord ID: ${intern.discordUserId}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/80 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300 shadow-sm"
                        >
                            <SiDiscord className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span className="truncate max-w-[95px]">{t("admin.interns.discordPending")}</span>
                        </span>
                    ) : (
                        <span
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100/80 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-muted"
                        >
                            <SiDiscord className="h-3 w-3 shrink-0 opacity-40" />
                            <span className="truncate max-w-[95px]">{t("admin.interns.discordUnlinked")}</span>
                        </span>
                    )}
                </div>

                {/* Standardized Actions Column with Portal Action Menu */}
                <div className="flex items-center justify-end">
                    {hasAnyAction && (
                        <button
                            ref={triggerRef}
                            type="button"
                            id={`intern-action-trigger-${menuId}`}
                            aria-label="Thao tác"
                            aria-expanded={menuOpen}
                            aria-haspopup="true"
                            onClick={toggleMenu}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted transition hover:border-border hover:bg-slate-100 hover:text-foreground dark:hover:border-white/10 dark:hover:bg-white/5 active:scale-95 cursor-pointer"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>
                    )}

                    {hasAnyAction && menuOpen &&
                        createPortal(
                            <div
                                ref={menuRef}
                                id={`intern-action-menu-${menuId}`}
                                role="menu"
                                style={menuStyle}
                                className="rounded-2xl border border-border bg-card/95 dark:border-white/10 dark:bg-[#0c1322]/95 p-1.5 shadow-xl dark:shadow-[0_16px_48px_rgba(0,0,0,.6)] backdrop-blur-2xl animate-fadeIn"
                            >
                                {canViewIntern && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            router.push(`/admin/interns/${intern.id}`);
                                        }}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground transition hover:bg-slate-100 dark:hover:bg-white/10 hover:text-cyan-600 dark:hover:text-cyan-400 active:scale-98 cursor-pointer"
                                    >
                                        <Eye className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
                                        {t("admin.interns.view")}
                                    </button>
                                )}

                                {canRemindDiscord && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={handleRemindDiscord}
                                        disabled={remindMutation.isPending}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-amber-600 dark:text-amber-400 transition hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 active:scale-98 cursor-pointer disabled:opacity-50"
                                    >
                                        {remindMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                        ) : (
                                            <Mail className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                        )}
                                        {t("admin.interns.remindDiscord")}
                                    </button>
                                )}

                                {canDeleteIntern && (
                                    <Modal.Open opens={`delete-intern-${intern.id}`}>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 active:scale-98 cursor-pointer"
                                        >
                                            <Trash2 className="h-4 w-4 shrink-0" />
                                            {t("admin.interns.delete")}
                                        </button>
                                    </Modal.Open>
                                )}
                            </div>,
                            document.body,
                        )}
                </div>
            </Table.Row>

            {/* Delete confirm modal */}
            <Modal.Window name={`delete-intern-${intern.id}`} size="sm">
                <DeleteConfirm
                    name={intern.fullName}
                    isDeleting={isDeleting}
                    onConfirm={(onCloseModal) => {
                        deleteIntern(intern.id, {
                            onSuccess: () => onCloseModal?.(),
                        });
                    }}
                />
            </Modal.Window>
        </Modal>
    );
}

/* ─── DeleteConfirm ──────────────────────────────────────────── */

function DeleteConfirm({
    name,
    isDeleting,
    onConfirm,
    onCloseModal,
}: {
    name: string;
    isDeleting?: boolean;
    onConfirm: (onCloseModal?: () => void) => void;
    onCloseModal?: () => void;
}) {
    const t = useTranslations();
    return (
        <div className="px-2 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-inner">
                <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
                {t("admin.interns.deleteTitle")}
            </h3>
            <p className="mt-2 text-sm text-muted">
                {t("admin.interns.deleteConfirm", { name })}
            </p>
            <div className="mt-6 flex justify-center gap-3">
                <button
                    type="button"
                    onClick={onCloseModal}
                    disabled={isDeleting}
                    className="rounded-xl border border-border dark:border-white/10 bg-card/40 px-5 py-2 text-sm text-muted hover:text-foreground hover:bg-card active:scale-[0.98] transition disabled:opacity-50"
                >
                    {t("admin.interns.cancel")}
                </button>
                <button
                    type="button"
                    onClick={() => onConfirm(onCloseModal)}
                    disabled={isDeleting}
                    className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-500 active:scale-[0.98] transition disabled:opacity-50 shadow-sm"
                >
                    {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("admin.interns.delete")}
                </button>
            </div>
        </div>
    );
}
