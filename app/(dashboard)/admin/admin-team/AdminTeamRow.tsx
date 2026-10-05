"use client";

import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { MoreVertical, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

import type { User } from "@/types/user";
import { updateUserService } from "@/services/user.service";
import { deleteUserService } from "@/services/user.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import InlineSelect from "@/components/ui/InlineSelect";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRBAC } from "@/hooks/rbac/useRBAC";

type AdminTeamRowProps = {
    admin: User;
};

export default function AdminTeamRow({ admin }: AdminTeamRowProps) {
    const t = useTranslations();
    const locale = useLocale();
    const { state } = useAuth();
    const { can } = useRBAC();
    const canUpdate = can("USER_UPDATE");
    const canDelete = can("USER_DELETE");
    const currentUser = state.user;
    const [menuOpen, setMenuOpen] = useState(false);
    const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
    const hasAvatar = Boolean(
        admin.avatarUrl && failedAvatarUrl !== admin.avatarUrl
    );
    const menuRef = useRef<HTMLDivElement>(null);

    const queryClient = useQueryClient();

    const { mutate: toggleActive, isPending: togglingActive } = useMutation({
        mutationFn: (isActive: boolean) =>
            updateUserService(admin.id, { isActive }),
        onSuccess: () => {
            toast.success(t("admin.adminTeam.statusUpdated"));
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: () => toast.error(t("admin.adminTeam.statusUpdateError")),
    });

    const { mutate: deleteAdmin, isPending: deleting } = useMutation({
        mutationFn: () => deleteUserService(admin.id),
        onSuccess: () => {
            toast.success(t("admin.adminTeam.deleted"));
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: () => toast.error(t("admin.adminTeam.deleteError")),
    });

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const joinedDate = new Date(admin.createdAt).toLocaleDateString(
        locale === "vi" ? "vi-VN" : "en-US",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
        },
    );

    return (
        <Modal>
            <Table.Row>
                {/* Admin info */}
                <div className="flex items-center gap-3 min-w-0">
                    {hasAvatar ? (
                        <Image
                            src={admin.avatarUrl!}
                            alt={admin.fullName ?? ""}
                            width={40}
                            height={40}
                            unoptimized
                            onError={() => setFailedAvatarUrl(admin.avatarUrl ?? null)}
                            className="h-10 w-10 rounded-lg object-cover"
                        />
                    ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-800 text-sm font-bold text-slate-200">
                            {(admin.fullName ?? admin.email)
                                .charAt(0)
                                .toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                            {admin.fullName ?? admin.email}
                        </p>
                        <p className="truncate text-xs text-muted">
                            {admin.email}
                        </p>
                    </div>
                </div>

                {/* Role */}
                <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-100/80 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300">
                        {admin.role?.name ?? "—"}
                    </span>
                </div>

                {/* Status */}
                <div>
                    {canUpdate ? (
                        <InlineSelect
                            ariaLabel={t("admin.adminTeam.colStatus")}
                            value={admin.isActive ? "true" : "false"}
                            placeholder={t("admin.adminTeam.colStatus")}
                            loading={togglingActive}
                            disabled={togglingActive}
                            onChange={(val) => {
                                if (val !== null) toggleActive(val === "true");
                            }}
                            options={[
                                { value: "true", label: t("admin.adminTeam.active") },
                                { value: "false", label: t("admin.adminTeam.inactive") },
                            ]}
                            renderTrigger={(label) => (
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                        admin.isActive
                                            ? "border-emerald-300 bg-emerald-100/80 text-emerald-700 hover:border-emerald-400 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:border-emerald-400/50"
                                            : "border-rose-300 bg-rose-100/80 text-rose-700 hover:border-rose-400 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:border-red-400/50"
                                    }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                            admin.isActive
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
                                admin.isActive
                                    ? "border-emerald-300 bg-emerald-100/80 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                                    : "border-rose-300 bg-rose-100/80 text-rose-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300"
                            }`}
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                    admin.isActive
                                        ? "bg-emerald-500 dark:bg-emerald-400"
                                        : "bg-rose-500 dark:bg-red-400"
                                }`}
                            />
                            {admin.isActive ? t("admin.adminTeam.active") : t("admin.adminTeam.inactive")}
                        </span>
                    )}
                </div>

                {/* Joined */}
                <div className="text-sm text-muted">{joinedDate}</div>

                {/* Actions */}
                <div className="relative" ref={menuRef}>
                    {currentUser?.id !== admin.id && canDelete && (
                        <>
                            <button
                                type="button"
                                aria-label="Actions"
                                onClick={() => setMenuOpen((prev) => !prev)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/60 text-muted transition hover:border-border-strong hover:bg-card hover:text-foreground dark:border-transparent dark:text-slate-400 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-2xl border border-border bg-card/95 p-1.5 shadow-xl dark:border-white/10 dark:bg-[#0f172a] dark:shadow-[0_16px_48px_rgba(0,0,0,.55)] backdrop-blur-2xl">
                                    <Modal.Open
                                        opens={`delete-admin-${admin.id}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-rose-600 dark:text-red-400 transition hover:bg-rose-50 dark:hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            {t("admin.adminTeam.delete")}
                                        </button>
                                    </Modal.Open>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Table.Row>

            <Modal.Window
                name={`delete-admin-${admin.id}`}
                size="sm"
            >
                <DeleteConfirm
                    name={admin.fullName ?? admin.email}
                    deleting={deleting}
                    onConfirm={(onCloseModal) => {
                        deleteAdmin();
                        onCloseModal?.();
                    }}
                />
            </Modal.Window>
        </Modal>
    );
}

function DeleteConfirm({
    name,
    deleting,
    onConfirm,
    onCloseModal,
}: {
    name: string;
    deleting: boolean;
    onConfirm: (close?: () => void) => void;
    onCloseModal?: () => void;
}) {
    const t = useTranslations();
    return (
        <div className="px-2 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 dark:text-red-400">
                <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
                {t("admin.adminTeam.deleteTitle")}
            </h3>
            <p className="mt-2 text-sm text-muted">
                {t("admin.adminTeam.deleteConfirm", { name })}
            </p>
            <div className="mt-6 flex justify-center gap-3">
                <button
                    onClick={onCloseModal}
                    disabled={deleting}
                    className="rounded-xl border border-border bg-card px-5 py-2 text-sm text-muted hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white disabled:opacity-50"
                >
                    {t("admin.adminTeam.cancel")}
                </button>
                <button
                    onClick={() => onConfirm(onCloseModal)}
                    disabled={deleting}
                    className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                >
                    {t("admin.adminTeam.delete")}
                </button>
            </div>
        </div>
    );
}
