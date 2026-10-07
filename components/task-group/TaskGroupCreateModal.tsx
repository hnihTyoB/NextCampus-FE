"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Layers, Loader2, X, Search, Check, AlertCircle } from "lucide-react";
import { useCreateTaskGroup } from "@/hooks/task-group/useCreateTaskGroup";
import { useDepartments } from "@/hooks/department/useDepartments";
import { useInterns } from "@/hooks/intern/useInterns";
import Select, { type SelectOption } from "@/components/ui/Select";
import type { TaskGroupStatus } from "@/types/task-group";

interface TaskGroupCreateModalProps {
  onCloseModal?: () => void;
}

export default function TaskGroupCreateModal({
  onCloseModal,
}: TaskGroupCreateModalProps) {
  const t = useTranslations();
  const { mutate: createGroup, isPending } = useCreateTaskGroup();
  const { data: deptData } = useDepartments();
  const { data: internsData } = useInterns({ limit: 100 });

  const departments = useMemo(() => deptData?.data ?? [], [deptData]);
  const allInterns = useMemo(() => internsData?.data ?? [], [internsData]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [status, setStatus] = useState<TaskGroupStatus>("ACTIVE");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchIntern, setSearchIntern] = useState("");
  const [maxWorkloadDays, setMaxWorkloadDays] = useState(14);
  const [nameError, setNameError] = useState("");

  const effectiveDepartmentId =
    departmentId || (departments.length > 0 ? departments[0].id : "");

  const deptOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("leader.taskGroups.selectDept") },
      ...departments.map((dept) => ({
        value: dept.id,
        label: dept.name,
      })),
    ],
    [departments, t],
  );

  const statusOptions: SelectOption[] = useMemo(
    () => [
      { value: "ACTIVE", label: t("leader.taskGroups.statusActive") },
      { value: "COMPLETED", label: t("leader.taskGroups.statusCompleted") },
      { value: "ARCHIVED", label: t("leader.taskGroups.statusArchived") },
    ],
    [t],
  );

  const filteredInterns = useMemo(() => {
    return allInterns.filter((intern) => {
      if (!intern.user?.isActive && intern.status !== "ACTIVE") return false;
      const matchesSearch =
        intern.fullName.toLowerCase().includes(searchIntern.toLowerCase()) ||
        (intern.user?.email || "").toLowerCase().includes(searchIntern.toLowerCase());
      const matchesDept = !departmentId || intern.department?.id === departmentId;
      return matchesSearch && matchesDept;
    });
  }, [allInterns, searchIntern, departmentId]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(t("leader.taskGroups.nameRequired"));
      return;
    }
    setNameError("");

    createGroup(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        departmentId: effectiveDepartmentId || null,
        status,
        memberIds: selectedMemberIds,
        maxWorkloadDays,
      },
      {
        onSuccess: () => {
          onCloseModal?.();
        },
      },
    );
  };

  return (
    <div className="px-2 py-4 text-left">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-400 shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {t("leader.taskGroups.createTitle")}
        </h2>
      </div>
      <p className="text-xs text-muted mb-5">
        {t("leader.taskGroups.createDescription")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
            {t("leader.taskGroups.nameLabel")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
            }}
            placeholder={t("leader.taskGroups.namePlaceholder")}
            className={`
              w-full rounded-xl border bg-card px-4 py-2.5 sm:py-3
              h-[42px] sm:h-[46px] text-sm text-foreground shadow-xs
              outline-none transition-all duration-200 placeholder:text-muted
              ${
                nameError
                  ? "border-destructive focus:ring-2 focus:ring-destructive/30"
                  : "border-border hover:border-border-strong focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              }
            `}
          />
          {nameError && (
            <p className="text-xs text-destructive flex items-center gap-1.5 mt-0.5 animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{nameError}</span>
            </p>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
            {t("leader.taskGroups.descLabel")}
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("leader.taskGroups.descPlaceholder")}
            className="w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground shadow-xs outline-none transition hover:border-border-strong focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 placeholder:text-muted resize-none"
          />
        </div>

        {/* Department & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t("leader.taskGroups.deptLabel")}
            placeholder={t("leader.taskGroups.selectDept")}
            options={deptOptions}
            value={effectiveDepartmentId}
            onChange={(val) => setDepartmentId(val)}
            searchable={departments.length > 6}
          />

          <Select
            label={t("leader.taskGroups.statusLabel")}
            options={statusOptions}
            value={status}
            onChange={(val) => setStatus(val as TaskGroupStatus)}
          />
        </div>

        {/* Max workload days */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
            {t("leader.taskGroups.maxWorkloadLabel")}
          </label>
          <input
            type="number"
            min={1}
            max={90}
            value={maxWorkloadDays}
            onChange={(e) =>
              setMaxWorkloadDays(parseInt(e.target.value, 10) || 14)
            }
            className="w-full rounded-xl border border-border bg-card px-4 h-[42px] sm:h-[46px] text-sm text-foreground shadow-xs outline-none transition hover:border-border-strong focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Member allocation multi-select */}
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center justify-between">
            <span>{t("leader.taskGroups.selectMembersLabel")}</span>
            <span className="text-xs text-cyan-400 font-semibold">
              ({selectedMemberIds.length})
            </span>
          </label>

          {/* Selected chips */}
          {selectedMemberIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1 max-h-24 overflow-y-auto p-2 bg-card/80 border border-border rounded-xl">
              {selectedMemberIds.map((id) => {
                const intern = allInterns.find((i) => i.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-400/20 px-2.5 py-1 text-xs text-cyan-300 shadow-xs"
                  >
                    <span>{intern?.fullName || id}</span>
                    <button
                      type="button"
                      onClick={() => toggleMember(id)}
                      className="hover:text-rose-400 transition"
                      aria-label="Remove member"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Search intern input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchIntern}
              onChange={(e) => setSearchIntern(e.target.value)}
              placeholder={t("leader.taskGroups.searchInternPlaceholder")}
              className="w-full rounded-xl border border-border bg-card/60 h-[38px] pl-9 pr-3 text-xs text-foreground shadow-xs outline-none transition hover:border-border-strong focus:border-cyan-400 placeholder:text-muted"
            />
          </div>

          {/* Interns list searchable and scrollable */}
          <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-border bg-card/40 p-1.5 custom-scrollbar">
            {filteredInterns.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center italic">
                {t("leader.taskGroups.noMembers")}
              </p>
            ) : (
              filteredInterns.map((intern) => {
                const isSelected = selectedMemberIds.includes(intern.id);
                return (
                  <div
                    key={intern.id}
                    onClick={() => toggleMember(intern.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs select-none ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-medium"
                        : "text-foreground/80 hover:bg-card border border-transparent"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-medium text-foreground truncate">
                        {intern.fullName}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        {intern.position?.name ||
                          intern.department?.name ||
                          intern.user?.email}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
          <button
            type="button"
            onClick={onCloseModal}
            disabled={isPending}
            className="h-[42px] sm:h-[46px] rounded-xl border border-border bg-card px-5 text-sm font-medium text-muted hover:text-foreground hover:border-border-strong active:scale-95 transition disabled:opacity-50"
          >
            {t("leader.taskGroups.cancel")}
          </button>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="h-[42px] sm:h-[46px] inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-(--primary-main) to-(--primary-light) px-6 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("leader.taskGroups.creating")}</span>
              </>
            ) : (
              <span>{t("leader.taskGroups.createGroup")}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
