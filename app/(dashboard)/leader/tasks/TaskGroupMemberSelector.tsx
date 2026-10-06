"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRBAC } from "@/hooks/rbac/useRBAC";
import { useInterns } from "@/hooks/intern/useInterns";

interface Props {
  departmentId?: string | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function TaskGroupMemberSelector({
  departmentId,
  selectedIds,
  onChange,
}: Props) {
  const t = useTranslations("leader.taskGroups");
  const { user, can } = useRBAC();
  const hasGlobalInternManage = can("INTERN_DELETE") || can("USER_ROLE_ASSIGN");
  const { data, isLoading } = useInterns({
    status: "ACTIVE",
    departmentId: departmentId || undefined,
    leaderId: hasGlobalInternManage ? undefined : user?.id,
    sortBy: "fullName",
    order: "asc",
    limit: 100,
  });
  const interns = data?.data ?? [];

  const toggle = (id: string, alternateId?: string) => {
    const isSelected =
      selectedIds.includes(id) ||
      (alternateId ? selectedIds.includes(alternateId) : false);
    if (isSelected) {
      onChange(selectedIds.filter((mId) => mId !== id && mId !== alternateId));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Users className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          {t("memberSelectorTitle")}
        </label>
        <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold">
          {t("selectedCount", { count: selectedIds.length })}
        </span>
      </div>
      <div className="max-h-48 space-y-1 overflow-y-auto scrollbar-dropdown rounded-xl border border-border bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03] p-2">
        {isLoading ? (
          <p className="px-2 py-3 text-center text-xs text-muted">
            {t("loadingInterns")}
          </p>
        ) : interns.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted">
            {t("noInternsFound")}
          </p>
        ) : (
          interns.map((intern) => {
            const memberId = intern.userId || intern.id;
            const isChecked =
              selectedIds.includes(intern.id) ||
              (intern.userId ? selectedIds.includes(intern.userId) : false);
            return (
              <label
                key={intern.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(memberId, intern.id)}
                  className="h-4 w-4 rounded border-border dark:border-white/20 bg-transparent accent-sky-500"
                />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {intern.fullName}
                </span>
                <span className="block truncate text-[11px] text-muted">
                  {intern.user.email}
                  {intern.position?.name ? ` · ${intern.position.name}` : ""}
                </span>
              </span>
              </label>
            );
          })
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        {t("aiConstraintNote")}
      </p>
    </div>
  );
}
