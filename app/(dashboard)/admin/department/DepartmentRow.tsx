"use client";

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import {
  MoreVertical,
  Trash2,
  Edit3,
  Settings,
  Briefcase,
  Building2,
} from "lucide-react";
import { Department } from "@/types/department";
import { Leader } from "@/types/leader";
import { useRBAC } from "@/hooks/rbac/useRBAC";
import { useTranslations } from "next-intl";
import Table from "@/components/ui/Table";
import DepartmentLeaderSelect from "./DepartmentLeaderSelect";

type DepartmentRowProps = {
  department: Department;
  leaders: Leader[];
  leadersLoading: boolean;
  leadersError: boolean;
  assignedLeaderIds?: Set<string>;
  onLeaderToggle?: (leader: Leader) => void;
  isDirty?: boolean;
  onOpenEdit: (dept: Department) => void;
  onOpenPositions: (dept: Department) => void;
  onOpenDelete: (dept: Department) => void;
};

export default function DepartmentRow({
  department,
  leaders,
  leadersLoading,
  leadersError,
  assignedLeaderIds,
  onLeaderToggle,
  isDirty,
  onOpenEdit,
  onOpenPositions,
  onOpenDelete,
}: DepartmentRowProps) {
  const t = useTranslations();
  const { can } = useRBAC();
  const canEdit = can("DEPARTMENT_UPDATE");
  const canPositions = can("POSITION_READ") || can("DEPARTMENT_UPDATE");
  const canDelete = can("DEPARTMENT_DELETE");
  const hasAnyAction = canEdit || canPositions || canDelete;

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
    const ESTIMATED_HEIGHT = 160;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;

    const openUpward = spaceBelow < ESTIMATED_HEIGHT && spaceAbove > spaceBelow;

    const maxHeight = openUpward
      ? Math.min(260, Math.max(100, spaceAbove - 16))
      : Math.min(260, Math.max(100, spaceBelow - 16));

    const left = Math.max(
      8,
      Math.min(rect.right - MENU_WIDTH, vw - MENU_WIDTH - 8)
    );

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
    document.addEventListener("touchstart", handleClickOutside, {
      passive: true,
    });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <Table.Row className="group transition-colors duration-150 hover:bg-card/40">
      {/* 1. Department Name */}
      <div className="text-sm font-semibold text-foreground min-w-0 pr-4 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-cyan-400 shrink-0" />
        <span className="truncate group-hover:text-cyan-400 transition-colors">
          {department.name}
        </span>
      </div>

      {/* 2. Description */}
      <div
        className="text-xs text-muted min-w-0 pr-4 truncate line-clamp-1"
        title={department.description || t("admin.department.defaultDescription")}
      >
        {department.description || t("admin.department.defaultDescription")}
      </div>

      {/* 3. Positions Count (Interactive Clickable Badge) */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onOpenPositions(department)}
          title={t("admin.department.positionsOf", { name: department.name })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-400 ring-1 ring-inset ring-cyan-500/20 transition hover:bg-cyan-500/20 active:scale-95 cursor-pointer"
        >
          <Briefcase className="h-3 w-3 shrink-0" />
          <span>
            {t("admin.department.positionsCount", {
              count: department.positions.length,
            })}
          </span>
        </button>
      </div>

      {/* 4. Leaders Select */}
      <div className="text-sm min-w-0 pr-4">
        <DepartmentLeaderSelect
          department={department}
          leaders={leaders}
          loading={leadersLoading}
          error={leadersError}
          assignedLeaderIds={assignedLeaderIds}
          onLeaderToggle={onLeaderToggle}
          isDirty={isDirty}
        />
      </div>

      {/* 5. Actions Dropdown */}
      <div className="relative text-right">
        {hasAnyAction && (
          <>
            <button
              ref={triggerRef}
              type="button"
              aria-label="Department actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={`dept-actions-${menuId}`}
              onClick={toggleMenu}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card/60 text-muted transition hover:border-border-strong hover:bg-card hover:text-foreground active:scale-95 cursor-pointer"
            >
              <MoreVertical className="h-4 w-4 shrink-0" />
            </button>

            {menuOpen &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  id={`dept-actions-${menuId}`}
                  ref={menuRef}
                  role="menu"
                  style={menuStyle}
                  className="rounded-2xl border border-border bg-card/95 dark:border-white/10 dark:bg-[#0c1322]/95 p-1.5 shadow-xl dark:shadow-[0_16px_48px_rgba(0,0,0,.6)] backdrop-blur-2xl animate-fadeIn text-left"
                >
                  {canEdit && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenEdit(department);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground transition hover:bg-slate-100 dark:hover:bg-white/10 active:scale-98 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                      <span>{t("admin.department.editDepartment")}</span>
                    </button>
                  )}

                  {canPositions && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenPositions(department);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-foreground transition hover:bg-emerald-50 dark:hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-emerald-300 active:scale-98 cursor-pointer"
                    >
                      <Settings className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{t("admin.department.positions")}</span>
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenDelete(department);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-700 dark:hover:text-rose-300 active:scale-98 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{t("admin.department.delete")}</span>
                    </button>
                  )}
                </div>,
                document.body
              )}
          </>
        )}
      </div>
    </Table.Row>
  );
}
