"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "react-hot-toast";
import { useUpdateLeader } from "@/hooks/leader/useUpdateLeader";
import type { Department } from "@/types/department";
import { MAX_LEADER_DEPARTMENTS, type Leader } from "@/types/leader";

type LeaderDepartmentSelectProps = {
    leader: Leader;
    departments: Department[];
    draftDepartmentIds?: string[];
    onDraftChange?: (departmentIds: string[]) => void;
    isDirty?: boolean;
};

export default function LeaderDepartmentSelect({
    leader,
    departments,
    draftDepartmentIds,
    onDraftChange,
    isDirty,
}: LeaderDepartmentSelectProps) {
    const t = useTranslations();
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const listboxId = useId();

    const { mutate: updateLeader, isPending } = useUpdateLeader();

    // Use draftDepartmentIds if provided, fallback to leader.departments
    const selectedIds = draftDepartmentIds !== undefined
        ? draftDepartmentIds
        : leader.departments.map((department) => department.id);
    const selectedIdSet = new Set(selectedIds);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
            setOpen(false);
            return;
        }

        const spaceBelow = vh - rect.bottom;
        const openUpward = spaceBelow < 280 && rect.top > 280;
        const popoverWidth = Math.min(320, vw - 16);
        const left = Math.max(8, Math.min(rect.left, vw - popoverWidth - 8));
        const maxHeight = openUpward
            ? Math.min(320, Math.max(120, rect.top - 16))
            : Math.min(320, Math.max(120, spaceBelow - 16));

        setDropdownStyle({
            position: "fixed",
            top: openUpward ? undefined : rect.bottom + 6,
            bottom: openUpward ? vh - rect.top + 6 : undefined,
            left,
            width: popoverWidth,
            maxHeight,
            zIndex: 9999,
        });
    }, []);

    useEffect(() => {
        if (open) {
            updatePosition();
            window.addEventListener("scroll", updatePosition, true);
            window.addEventListener("resize", updatePosition);
        }
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;
        function handleOutside(event: MouseEvent | TouchEvent) {
            const target = event.target as Node;
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                triggerRef.current &&
                !triggerRef.current.contains(target)
            ) {
                setOpen(false);
            }
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setOpen(false);
                triggerRef.current?.focus();
            }
        }

        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("touchstart", handleOutside, { passive: true });
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("touchstart", handleOutside);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    const handleToggle = (departmentId: string) => {
        const selected = selectedIdSet.has(departmentId);
        if (!selected && selectedIds.length >= MAX_LEADER_DEPARTMENTS) {
            toast.error(
                t("admin.leaders.maxDepartments", { n: MAX_LEADER_DEPARTMENTS }),
            );
            return;
        }

        const nextIds = selected
            ? selectedIds.filter((id) => id !== departmentId)
            : [...selectedIds, departmentId];

        if (onDraftChange) {
            onDraftChange(nextIds);
        } else {
            updateLeader({
                id: leader.id,
                payload: { departmentIds: nextIds, position: null },
            });
        }
    };

    const getDeptName = (id: string) => {
        return (
            departments.find((d) => d.id === id)?.name ??
            leader.departments.find((d) => d.id === id)?.name ??
            ""
        );
    };

    const label = (() => {
        if (selectedIds.length === 0) return t("admin.leaders.notSet");
        if (selectedIds.length === 1) return getDeptName(selectedIds[0]) || t("admin.leaders.notSet");
        return t("admin.leaders.multiDepartments", { n: selectedIds.length });
    })();

    const titleText =
        selectedIds.map(getDeptName).filter(Boolean).join(", ") ||
        t("admin.leaders.notSet");

    const filteredDepartments = departments.filter((d) => {
        if (!searchQuery.trim()) return true;
        return d.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const isDirtyEffective = isDirty ?? (draftDepartmentIds !== undefined && (
        draftDepartmentIds.length !== leader.departments.length ||
        draftDepartmentIds.some((id) => !leader.departments.some((d) => d.id === id))
    ));

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                aria-label={`Departments managed by ${leader.user.fullName ?? leader.user.email}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listboxId}
                onClick={() => {
                    updatePosition();
                    setOpen((current) => !current);
                }}
                disabled={isPending}
                className={`flex w-full items-center justify-between gap-1.5 text-left transition hover:text-cyan-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/50 rounded-lg py-1 px-1.5 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
                    isDirtyEffective ? "ring-1 ring-amber-400/40 bg-amber-400/5" : "text-muted"
                }`}
            >
                {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-400" />
                ) : (
                    <>
                        <span
                            className={`min-w-0 flex items-center gap-1.5 truncate text-xs sm:text-sm ${
                                selectedIds.length === 0
                                    ? "italic text-muted"
                                    : "font-medium text-foreground"
                            } ${isDirtyEffective ? "text-amber-500 dark:text-amber-300 font-semibold" : ""}`}
                            title={titleText}
                        >
                            {isDirtyEffective && (
                                <span
                                    className="h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                                    title={t("batchSave.unsavedChange")}
                                />
                            )}
                            <span className="truncate">{label}</span>
                        </span>
                        <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ${
                                open ? "rotate-180" : ""
                            }`}
                        />
                    </>
                )}
            </button>

            {open &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        id={listboxId}
                        ref={dropdownRef}
                        role="listbox"
                        aria-label="Managed departments"
                        aria-multiselectable="true"
                        style={dropdownStyle}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                event.preventDefault();
                                setOpen(false);
                                triggerRef.current?.focus();
                            }
                        }}
                        className="rounded-2xl border border-border bg-card/95 dark:border-white/10 dark:bg-[#0c1322]/95 p-2 shadow-xl dark:shadow-[0_16px_48px_rgba(0,0,0,.6)] backdrop-blur-2xl animate-fadeIn"
                    >
                        {/* Header & Quick search */}
                        <div className="px-2 pt-1 pb-2">
                            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                                {t("admin.leaders.selectDepartments", { n: MAX_LEADER_DEPARTMENTS })}
                            </p>
                            {departments.length > 5 && (
                                <div className="relative mb-2">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t("admin.leaders.searchDepartmentDropdown")}
                                        className="w-full rounded-lg border border-border dark:border-white/10 bg-card/60 py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted outline-none focus:border-cyan-400/50"
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Department Options */}
                        <div className="max-h-[220px] overflow-y-auto space-y-1 scrollbar-dropdown pr-1">
                            {filteredDepartments.length === 0 ? (
                                <p className="px-3 py-3 text-xs italic text-muted text-center">
                                    {t("admin.leaders.noDepartmentsAvailable")}
                                </p>
                            ) : (
                                filteredDepartments.map((department) => {
                                    const selected = selectedIdSet.has(department.id);
                                    const limitReached =
                                        !selected &&
                                        selectedIds.length >= MAX_LEADER_DEPARTMENTS;

                                    return (
                                        <button
                                            key={department.id}
                                            type="button"
                                            role="option"
                                            aria-selected={selected}
                                            aria-disabled={limitReached}
                                            disabled={isPending || limitReached}
                                            onClick={() => handleToggle(department.id)}
                                            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors cursor-pointer disabled:opacity-50 ${
                                                selected
                                                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 font-semibold"
                                                    : limitReached
                                                      ? "cursor-not-allowed text-muted/40 border border-transparent"
                                                      : "text-muted hover:bg-slate-100 dark:hover:bg-white/5 hover:text-foreground border border-transparent"
                                            }`}
                                        >
                                            <span className="min-w-0 flex-1 truncate text-xs sm:text-sm">
                                                {department.name}
                                            </span>
                                            {selected && (
                                                <Check className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
