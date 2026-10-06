"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Layers, CheckCircle2, Users, AlertTriangle } from "lucide-react";
import { useTaskGroups } from "@/hooks/task-group/useTaskGroups";
import { extractTaskGroups, getTaskGroupMemberId } from "@/types/task-group";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";

export default function TaskGroupStats() {
  const t = useTranslations();
  const { data, isLoading, isError } = useTaskGroups();

  const taskGroups = useMemo(() => extractTaskGroups(data?.data), [data?.data]);

  const totalGroups = taskGroups.length;
  const activeGroups = taskGroups.filter((g) => g.status === "ACTIVE").length;

  const memberSet = new Set<string>();
  taskGroups.forEach((group) => {
    group.members?.forEach((m) => {
      const id = getTaskGroupMemberId(m);
      if (id) memberSet.add(id);
    });
  });
  const totalMembers = memberSet.size;

  const cards = [
    {
      title: t("leader.taskGroups.totalGroups"),
      value: totalGroups,
      icon: Layers,
      containerClass: "border-sky-300 bg-sky-100/80 text-sky-700 hover:bg-sky-200/80 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300",
    },
    {
      title: t("leader.taskGroups.activeGroups"),
      value: activeGroups,
      icon: CheckCircle2,
      containerClass: "border-emerald-300 bg-emerald-100/80 text-emerald-700 hover:bg-emerald-200/80 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    {
      title: t("leader.taskGroups.totalMembers"),
      value: totalMembers,
      icon: Users,
      containerClass: "border-purple-300 bg-purple-100/80 text-purple-700 hover:bg-purple-200/80 dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-300",
    },
  ];

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 backdrop-blur-xl shadow-inner">
        <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
        <p className="text-sm text-rose-300">
          {t("leader.taskGroups.loadStatsError")}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const isOdd = cards.length % 2 !== 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isFirstAndOdd = isOdd && idx === 0;

        return (
          <MetalCard
            key={card.title}
            className={`group p-4 sm:p-5 lg:p-6 ${
              isFirstAndOdd ? "col-span-2 md:col-span-1" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted truncate">
                  {card.title}
                </p>
                <h3 className="chrome-text mt-2 sm:mt-4 text-2xl sm:text-4xl lg:text-5xl font-bold leading-none">
                  {card.value}
                </h3>
                <div className="mt-3 sm:mt-4 h-[2px] w-10 sm:w-16 rounded-full bg-gradient-to-r from-primary-light/70 to-transparent" />
              </div>
              <div
                className={`
                  flex h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 shrink-0 items-center justify-center
                  rounded-xl sm:rounded-2xl border ${card.containerClass}
                  shadow-sm dark:shadow-lg transition-all duration-500
                  group-hover:rotate-6 group-hover:scale-110
                `}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              </div>
            </div>
          </MetalCard>
        );
      })}
    </div>
  );
}
