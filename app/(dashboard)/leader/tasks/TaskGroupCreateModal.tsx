"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Layers, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useCreateTaskGroup } from "@/hooks/task-group/useCreateTaskGroup";
import { useDepartments } from "@/hooks/department/useDepartments";
import type { CreateTaskGroupPayload } from "@/types/task-group";
import TaskGroupMemberSelector from "./TaskGroupMemberSelector";

interface Props {
  onCloseModal?: () => void;
}

export default function TaskGroupCreateModal({ onCloseModal }: Props) {
  const t = useTranslations("taskGroups");
  const createTaskGroup = useCreateTaskGroup();
  const { data: deptData, isLoading: deptsLoading } = useDepartments();
  const departments = useMemo(() => deptData?.data ?? [], [deptData?.data]);
  const [departmentId, setDepartmentId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateTaskGroupPayload>({
    defaultValues: {
      departmentId: "",
      maxWorkloadDays: 10,
      maxActiveTasks: null,
      requireAllMembers: false,
    },
  });

  const effectiveDepartmentId =
    departmentId || (departments.length > 0 ? departments[0].id : "");

  const onSubmit = (data: CreateTaskGroupPayload) => {
    createTaskGroup.mutate(
      {
        ...data,
        departmentId: effectiveDepartmentId || null,
        memberIds,
      },
      {
        onSuccess: () => {
          reset();
          setDepartmentId("");
          setMemberIds([]);
          onCloseModal?.();
        },
      },
    );
  };

  const isPending = createTaskGroup.isPending;

  return (
    <div className="flex flex-col">
      {/* Sticky Header (Rule 44 Compliant: Icon + Heading inside a dedicated flex container) */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl pb-4 pt-1 -mt-1 border-b border-border dark:border-white/10 pr-10 sm:pr-12">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100 border border-purple-300 text-purple-700 dark:bg-purple-500/15 dark:border-purple-500/30 dark:text-purple-300 shadow-sm dark:shadow-[0_0_12px_rgba(168,85,247,0.2)]">
              <Layers className="h-5 w-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold metal-text truncate">
                {t("createTitle")}
              </h3>
              <p className="text-xs text-muted mt-0.5 truncate">
                {t("createDescription")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-5 space-y-4 text-left"
      >
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
            {t("nameLabel")}
          </label>
          <input
            type="text"
            placeholder={t("namePlaceholder")}
            {...register("name", { required: t("nameRequired") })}
            className={`w-full h-[42px] sm:h-[46px] rounded-xl border bg-card px-4 text-xs sm:text-sm text-foreground outline-none transition placeholder:text-muted ${
              errors.name
                ? "border-red-400/60 focus:border-red-400"
                : "border-border focus:border-primary-light/40"
            }`}
          />
          {errors.name && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-red-400 animate-fadeIn">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
            {t("deptLabel")}
          </label>
          <Select
            value={effectiveDepartmentId}
            onChange={(val) => {
              setValue("departmentId", val);
              setDepartmentId(val);
              setMemberIds([]);
            }}
            disabled={deptsLoading}
            placeholder={t("selectDept")}
            options={[
              { value: "", label: t("allDepartments") },
              ...departments.map((d) => ({
                value: d.id,
                label: d.name,
              })),
            ]}
          />
        </div>

        <TaskGroupMemberSelector
          departmentId={departmentId}
          selectedIds={memberIds}
          onChange={setMemberIds}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
              {t("maxWorkloadLabel")}
            </label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              {...register("maxWorkloadDays", { valueAsNumber: true })}
              className="w-full h-[42px] sm:h-[46px] rounded-xl border border-border bg-card px-4 text-xs sm:text-sm text-foreground outline-none transition focus:border-primary-light/40"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
              Số task active tối đa
            </label>
            <input
              type="number"
              min={1}
              placeholder="Không giới hạn"
              {...register("maxActiveTasks", {
                setValueAs: (value) => (value === "" || value === null || value === undefined) ? null : Number(value),
              })}
              className="w-full h-[42px] sm:h-[46px] rounded-xl border border-border bg-card px-4 text-xs sm:text-sm text-foreground outline-none transition focus:border-primary-light/40 placeholder:text-muted"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-slate-50/70 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.05] p-3 transition-colors">
          <input
            type="checkbox"
            {...register("requireAllMembers")}
            className="mt-0.5 h-4 w-4 rounded accent-purple-500"
          />
          <span className="select-none">
            <span className="block text-xs sm:text-sm font-medium text-foreground">Dùng đủ thành viên</span>
            <span className="block text-xs text-muted mt-0.5">
              Khi xác nhận, mỗi thành viên phải tham gia ít nhất một task với vai trò Owner hoặc Support.
            </span>
          </span>
        </label>

        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
            {t("descLabel")}
          </label>
          <textarea
            rows={2}
            placeholder={t("descPlaceholder")}
            {...register("description")}
            className="w-full rounded-xl border border-border bg-card p-3 text-xs sm:text-sm text-foreground outline-none transition focus:border-primary-light/40 placeholder:text-muted resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border dark:border-white/10">
          <Button
            type="button"
            variant="glass"
            onClick={onCloseModal}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending} disabled={isPending}>
            {!isPending && <Layers className="h-4 w-4 mr-2" />}
            {t("createGroup")}
          </Button>
        </div>
      </form>
    </div>
  );
}
