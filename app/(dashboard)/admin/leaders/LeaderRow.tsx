"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { MoreVertical, Eye, Trash2, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import type { Leader } from "@/types/leader";
import { useDeleteLeader } from "@/hooks/leader/useDeleteLeader";
import { useUpdateLeader } from "@/hooks/leader/useUpdateLeader";
import { useDepartments } from "@/hooks/department/useDepartments";
import { updateUserService } from "@/services/user.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import InlineSelect from "@/components/ui/InlineSelect";
import LeaderDepartmentSelect from "./LeaderDepartmentSelect";
import { useRBAC } from "@/hooks/rbac/useRBAC";

export type LeaderDraft = {
    departmentIds?: string[];
    position?: string | null;
    isActive?: boolean;
};

type LeaderRowProps = {
    leader: Leader;
    draft?: LeaderDraft;
    onDraftChange?: (patch: Partial<LeaderDraft>) => void;
};

export default function LeaderRow({ leader, draft, onDraftChange }: LeaderRowProps) {
    const t = useTranslations();
    const router = useRouter();
    const { can } = useRBAC();
    const canUpdateLeader = can("LEADER_UPDATE");
    const canUpdateUser = can("USER_UPDATE");
    const canDeleteLeader = can("LEADER_DELETE");
    const canViewLeader = can("LEADER_READ");
    const hasAnyAction = canViewLeader || canDeleteLeader;

    const { mutate: deleteLeader, isPending: isDeleting } = useDeleteLeader();
    const { mutate: updateLeader } = useUpdateLeader();
    const { data: deptData } = useDepartments();
    const departments = deptData?.data ?? [];
    
    // Effective departments based on draft
    const effectiveDepartmentIds = draft?.departmentIds !== undefined
        ? draft.departmentIds
        : leader.departments.map((department) => department.id);
    const managedDepartmentIds = new Set(effectiveDepartmentIds);

    const availablePositions = departments
        .filter((department) => managedDepartmentIds.has(department.id))
        .flatMap((department) => department.positions)
        .filter(
            (position, index, positions) =>
                positions.findIndex((item) => item.name === position.name) === index,
        );

    const [updatingField, setUpdatingField] = useState<"position" | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
    const hasAvatar = Boolean(
        leader.user.avatarUrl && failedAvatarUrl !== leader.user.avatarUrl
    );
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

        const MENU_WIDTH = Math.min(160, vw - 24);
        const ESTIMATED_HEIGHT = 160;
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

    const handlePositionChange = useCallback(
        (newPos: string | null) => {
            if (onDraftChange) {
                onDraftChange({ position: newPos || null });
                return;
            }
            setUpdatingField("position");
            updateLeader(
                {
                    id: leader.id,
                    payload: { position: newPos || null },
                },
                { onSettled: () => setUpdatingField(null) },
            );
        },
        [leader.id, updateLeader, onDraftChange],
    );

    const queryClient = useQueryClient();
    const { mutate: toggleActive, isPending: togglingActive } = useMutation({
        mutationFn: (isActive: boolean) =>
            updateUserService(leader.userId, { isActive }),
        onSuccess: () => {
            toast.success(t("admin.leaders.statusUpdated"));
            queryClient.invalidateQueries({ queryKey: ["leaders"] });
        },
        onError: () => toast.error(t("admin.leaders.statusUpdateError")),
    });

    const handleStatusChange = useCallback(
        (val: string | null) => {
            if (val === null) return;
            const newActive = val === "true";
            if (onDraftChange) {
                onDraftChange({ isActive: newActive });
                return;
            }
            toggleActive(newActive);
        },
        [onDraftChange, toggleActive],
    );

    const currentPosition = draft?.position !== undefined ? draft.position : leader.position;
    const isPositionDirty = draft?.position !== undefined && draft.position !== leader.position;
    const currentActive = draft?.isActive !== undefined ? draft.isActive : leader.user.isActive;
    const isStatusDirty = draft?.isActive !== undefined && draft.isActive !== leader.user.isActive;

    return (
        <Modal>
            <Table.Row>
                {/* Leader info */}
                <div className="flex items-center gap-3 min-w-0 pr-2">
                    {hasAvatar ? (
                        <Image
                            src={leader.user.avatarUrl!}
                            alt={leader.user.fullName ?? ""}
                            width={40}
                            height={40}
                            unoptimized
                            onError={() => setFailedAvatarUrl(leader.user.avatarUrl ?? null)}
                            className="h-10 w-10 rounded-xl object-cover shrink-0"
                        />
                    ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-blue-800 text-sm font-bold text-white shadow-sm">
                            {(leader.user.fullName ?? leader.user.email)
                                .charAt(0)
                                .toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p
                            className="truncate text-sm font-semibold text-foreground cursor-pointer hover:text-cyan-400 transition"
                            onClick={() =>
                                router.push(`/admin/leaders/${leader.id}`)
                            }
                            title={leader.user.fullName ?? leader.user.email}
                        >
                            {leader.user.fullName ?? leader.user.email}
                        </p>
                        <p className="truncate text-xs text-muted" title={leader.user.email}>
                            {leader.user.email}
                        </p>
                    </div>
                </div>

                {/* Department */}
                <div className="text-sm min-w-0 pr-2">
                    {canUpdateLeader ? (
                        <LeaderDepartmentSelect
                            leader={leader}
                            departments={departments}
                            draftDepartmentIds={draft?.departmentIds}
                            onDraftChange={(deptIds) => onDraftChange?.({ departmentIds: deptIds, position: null })}
                        />
                    ) : (
                        <span className="truncate text-foreground font-medium" title={leader.departments.map((d) => d.name).join(", ") || "—"}>
                            {leader.departments.map((d) => d.name).join(", ") || "—"}
                        </span>
                    )}
                </div>

                {/* Position */}
                <div className="text-sm min-w-0 pr-2">
                    {canUpdateLeader ? (
                        <InlineSelect
                            ariaLabel={t("admin.leaders.colPosition")}
                            value={currentPosition}
                            fallbackLabel={currentPosition ?? undefined}
                            placeholder={t("admin.leaders.notSet")}
                            loading={updatingField === "position"}
                            disabled={managedDepartmentIds.size === 0}
                            isDirty={isPositionDirty}
                            onDisabledClick={() => toast.error(t("admin.leaders.selectDepartmentFirst"))}
                            onChange={handlePositionChange}
                            options={[
                                { value: null, label: t("admin.leaders.notSet") },
                                ...(currentPosition && !availablePositions.some((pos) => pos.name === currentPosition)
                                    ? [{ value: currentPosition, label: currentPosition }]
                                    : []),
                                ...availablePositions.map((pos) => ({
                                    value: pos.name,
                                    label: pos.name,
                                })),
                            ]}
                        />
                    ) : (
                        <span className="truncate text-muted" title={leader.position ?? "—"}>
                            {leader.position ?? "—"}
                        </span>
                    )}
                </div>

                {/* Intern Count */}
                <div className="flex items-center justify-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-lg bg-cyan-100/80 text-cyan-700 font-semibold text-xs border border-cyan-300 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20">
                        {leader.internCount ?? 0}
                    </span>
                </div>

                {/* Status */}
                <div>
                    {canUpdateUser ? (
                        <InlineSelect
                            ariaLabel={t("admin.leaders.colStatus")}
                            value={currentActive ? "true" : "false"}
                            placeholder={t("admin.leaders.colStatus")}
                            loading={togglingActive}
                            disabled={togglingActive}
                            isDirty={isStatusDirty}
                            onChange={handleStatusChange}
                            options={[
                                { value: "true", label: t("admin.leaders.active") },
                                { value: "false", label: t("admin.leaders.inactive") },
                            ]}
                            renderTrigger={(label) => (
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                        currentActive
                                            ? "border-emerald-300 bg-emerald-100/80 text-emerald-700 hover:border-emerald-400 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:border-emerald-400/50"
                                            : "border-rose-300 bg-rose-100/80 text-rose-700 hover:border-rose-400 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:border-red-400/50"
                                    }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                            currentActive
                                                ? "bg-emerald-500 dark:bg-emerald-400"
                                                : "bg-rose-500 dark:bg-red-400"
                                        }`}
                                    />
                                    {label}
                                </span>
                            )}
                        />
                    ) : (
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                                leader.user.isActive
                                    ? "border-emerald-300 bg-emerald-100/80 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                                    : "border-rose-300 bg-rose-100/80 text-rose-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300"
                            }`}
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                    leader.user.isActive
                                        ? "bg-emerald-500 dark:bg-emerald-400"
                                        : "bg-rose-500 dark:bg-red-400"
                                }`}
                            />
                            {leader.user.isActive ? t("admin.leaders.active") : t("admin.leaders.inactive")}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="relative flex items-center justify-end">
                    {hasAnyAction && (
                        <button
                            ref={triggerRef}
                            type="button"
                            aria-label="Actions menu"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            onClick={toggleMenu}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted transition hover:border-border dark:hover:border-white/10 hover:bg-card hover:text-foreground active:scale-95"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>
                    )}

                    {hasAnyAction && menuOpen &&
                        typeof document !== "undefined" &&
                        createPortal(
                            <div
                                id={menuId}
                                ref={menuRef}
                                role="menu"
                                aria-label="Leader actions"
                                style={menuStyle}
                                className="rounded-2xl border border-border dark:border-white/10 bg-card/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,.55)] backdrop-blur-2xl"
                            >
                                {canViewLeader && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            router.push(`/admin/leaders/${leader.id}`);
                                        }}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-foreground"
                                    >
                                        <Eye className="h-4 w-4 shrink-0 text-cyan-400" />
                                        {t("admin.leaders.view")}
                                    </button>
                                )}

                                {canDeleteLeader && (
                                    <Modal.Open opens={`delete-leader-${leader.id}`}>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10"
                                        >
                                            <Trash2 className="h-4 w-4 shrink-0" />
                                            {t("admin.leaders.delete")}
                                        </button>
                                    </Modal.Open>
                                )}
                            </div>,
                            document.body,
                        )}
                </div>
            </Table.Row>

            <Modal.Window name={`delete-leader-${leader.id}`} size="sm">
                <DeleteConfirm
                    name={leader.user.fullName ?? leader.user.email}
                    isDeleting={isDeleting}
                    onConfirm={(onCloseModal) => {
                        deleteLeader(leader.id, {
                            onSuccess: () => onCloseModal?.(),
                        });
                    }}
                />
            </Modal.Window>
        </Modal>
    );
}

function DeleteConfirm({
    name,
    isDeleting,
    onConfirm,
    onCloseModal,
}: {
    name: string;
    isDeleting?: boolean;
    onConfirm: (close?: () => void) => void;
    onCloseModal?: () => void;
}) {
    const t = useTranslations();
    return (
        <div className="px-2 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
                <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
                {t("admin.leaders.deleteTitle")}
            </h3>
            <p className="mt-2 text-sm text-muted">
                {t("admin.leaders.deleteConfirm", { name })}
            </p>
            <div className="mt-6 flex justify-center gap-3">
                <button
                    type="button"
                    onClick={onCloseModal}
                    disabled={isDeleting}
                    className="rounded-xl border border-border dark:border-white/10 bg-card/40 px-5 py-2 text-sm text-muted hover:text-foreground hover:bg-card active:scale-[0.98] disabled:opacity-50"
                >
                    {t("admin.leaders.cancel")}
                </button>
                <button
                    type="button"
                    onClick={() => onConfirm(onCloseModal)}
                    disabled={isDeleting}
                    className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-500 active:scale-[0.98] disabled:opacity-50 shadow-sm"
                >
                    {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("admin.leaders.delete")}
                </button>
            </div>
        </div>
    );
}

