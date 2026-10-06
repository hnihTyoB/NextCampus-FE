"use client";

import { useMemo } from "react";
import { Users, Layers, Building } from "lucide-react";
import { useTranslations } from "next-intl";
import MetalCard from "@/components/ui/MetalCard";
import type { TaskGroup, TaskGroupTask } from "@/types/task-group";
import {
  getTaskGroupMemberId,
  getTaskGroupMemberName,
  getTaskGroupMemberAvatar,
} from "@/types/task-group";

interface SquadOverviewBannerProps {
  group: TaskGroup;
  tasks: TaskGroupTask[];
}

export default function SquadOverviewBanner({ group, tasks }: SquadOverviewBannerProps) {
  const t = useTranslations("intern.tasks");

  const stats = useMemo(() => {
    const total = tasks.length;
    let completed = 0;

    tasks.forEach((task) => {
      const status = task.assignment?.status;
      if (status === "DONE") completed++;
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percent };
  }, [tasks]);

  return (
    <MetalCard className="p-6 group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-indigo-950/20">
      <div className="space-y-5">
        {/* Header: Group info + Department */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Users className="h-3.5 w-3.5 shrink-0" />
                {t("squadOverview")}
              </span>
              {group.department && (
                <span className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-surface-elevated px-3 py-1 text-xs font-medium text-muted dark:border-white/10">
                  <Building className="h-3.5 w-3.5 shrink-0" />
                  {group.department.name}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold metal-text mt-1">{group.name}</h3>
            {group.description && (
              <p className="text-sm text-muted line-clamp-2 max-w-3xl">{group.description}</p>
            )}
          </div>

          {/* Members Avatar Stack */}
          {group.members && group.members.length > 0 && (
            <div className="flex flex-col gap-1.5 lg:items-end">
              <span className="text-xs font-medium text-muted flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {t("squadMembers")} ({group.members.length})
              </span>
              <div className="flex items-center -space-x-2.5 py-2 overflow-visible">
                {group.members.map((member, idx) => {
                  const avatar = getTaskGroupMemberAvatar(member);
                  const name = getTaskGroupMemberName(member);
                  const positionName =
                    member.intern?.position?.name ||
                    member.user?.internshipProfile?.position?.name ||
                    "Intern";
                  const memberId = getTaskGroupMemberId(member) || `member-${idx}`;
                  const initials = name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={memberId}
                      title={`${name} (${positionName})`}
                      className="relative group shrink-0 transition-transform duration-200 hover:scale-110 hover:z-20 cursor-pointer"
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm ring-2 ring-indigo-500/30 dark:border-slate-900 dark:ring-indigo-400/40"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-indigo-600 to-purple-600 text-[11px] font-bold text-white shadow-sm ring-2 ring-indigo-500/30 dark:border-slate-900 dark:ring-indigo-400/40">
                          {initials}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
              {t("squadProgress")}
            </span>
            <span className="text-cyan-600 dark:text-cyan-300 font-mono text-sm">{stats.percent}% ({stats.completed}/{stats.total})</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800/80 border border-border/40 dark:border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 shadow-sm dark:shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all duration-500"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>
      </div>
    </MetalCard>
  );
}
